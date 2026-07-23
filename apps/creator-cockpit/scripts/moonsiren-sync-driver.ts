// ─────────────────────────────────────────────────────────────────────────────
// Production-equivalent sync-all driver.
// Exercises the ACTUAL sync-all pipeline (startOrContinueCreatorSyncAll,
// continueCreatorSyncAll, executeBoundedSyncAllStage, logSyncBatch, …) imported
// from apps/creator-cockpit/worker.ts against in-memory mocks for Supabase and
// BetterFans. Output mirrors the structured logs Cloudflare Workers emit so we
// can verify the post-fix behaviour is production-equivalent.
//
//   Start       → POST /api/creators/:creatorId/sync/all
//   Continue    → POST /api/creators/:creatorId/sync/all/continue
//
// The driver is a faithful reproduction of the frontend's while-loop:
//   Start once, then while status === "running" && (has_more ?? hasMore),
//   call Continue sequentially; never call Start again. The Continue endpoint
// internally calls the same startOrContinueCreatorSyncAll with source=
// "sync_all_continue" — the production code reuses the existing active run
// when one is present, so this matches the real flow exactly.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "node:crypto";
import {
  startOrContinueCreatorSyncAll
} from "../worker.js";
import { BetterFansOperationalClient } from "@funkmyfans/betterfans-client";

// ── Polyfill the small set of worker globals Node lacks ─────────────────────
const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
if (!g.crypto || typeof g.crypto.randomUUID !== "function") {
  g.crypto = { randomUUID: () => crypto.randomUUID() } as any;
}

// ── Configuration: a "reasonably large" MoonSiren-shaped dataset ────────────
//   800 subscribers × 360 chats ⇒ 1160 records across paginated fetches
//   With BATCH_RECORDS_LIMIT=50, this requires ≅ 30 /continue invocations and
//   surfaces the bounded-batch behaviour end-to-end without being pathological.
const DATASET_SUBSCRIBERS = 800;
const DATASET_CHATS = 360;
const MOONSIREN_CREATOR_ID = "66a82b1f-e736-4498-97e6-798c78ef8867";
const MOONSIREN_BF_ACCOUNT_ID = "moonsiren_prod_001";
const CREATOR_USERNAME = "moonsiren";
const CREATOR_DISPLAY_NAME = "MoonSiren";

// Hard cap (must match worker.ts constants; reported separately).
const HARD_LIMIT = 30; // SUBREQUEST_BUDGET_HARD_LIMIT in worker.ts
const RESERVED_PERSIST_SLOTS = 3; // mirror of production reservation

// ── Capture sync_all_batch logs by intercepting console.log ────────────────
type StructuredLog = {
  event: string;
  syncRunId: string;
  creatorId: string;
  stage: string;
  cursor: number;
  batchSize: number;
  itemsProcessedThisInvocation: number;
  cumulativeProcessed: number;
  providerRequests: number;
  databaseRequests: number;
  estimatedSubrequests: number;
  hasMore: boolean;
  elapsedMs: number;
};
const structuredLogs: StructuredLog[] = [];
const origLog = console.log.bind(console);
console.log = (...args: any[]) => {
  for (const arg of args) {
    if (typeof arg === "string" && arg.startsWith("{\"event\":\"sync_all_batch\"")) {
      try {
        structuredLogs.push(JSON.parse(arg) as StructuredLog);
        continue; // do not also echo to terminal — printed in summary
      } catch {
        /* fall through */
      }
    }
    origLog(...args);
  }
};

// ── In-memory Supabase mock (chainable query builder) ──────────────────────
// Mirrors the supabase-js PostgrestQueryBuilder surface used by worker.ts along
// the sync-all path: .from(table).select().eq().order().limit().maybeSingle(),
// .from(table).insert().select().single(), .from(table).update().eq().select()
// .single(), .from(table).upsert(payload, { onConflict }). Returns Promise<{
// data, error }> at every terminal position, or is itself thenable when
// awaited without an explicit terminal (.upsert(payload) await).
class MockSupabase {
  tables: Record<string, any[]> = {
    of_creators: [],
    of_subscribers: [],
    of_chats: [],
    of_sync_runs: [],
    of_creator_snapshots: []
  };
  // Track subrequest usage so the report can confirm budget headroom.
  invocationSubrequestCounts: { startResp: number; continueResp: number[] } = {
    startResp: 0,
    continueResp: []
  };

  from(table: string) {
    return new MockQuery(table, this);
  }

  insertMany(table: string, rows: any[]) {
    if (!this.tables[table]) this.tables[table] = [];
    this.tables[table].push(...rows);
  }
}

class MockQuery {
  private filters: ((row: any) => boolean)[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private mode: "select" | "insert" | "update" | "upsert" = "select";
  private insertRows: any[] = [];
  private updatePatch: any = null;
  private upsertRows: any[] = [];

  constructor(private table: string, private db: MockSupabase) {}

  // ── Chainable modifiers ────────────────────────────────────────────────
  select(_cols: string = "*"): MockQuery { return this; }
  eq(col: string, val: any): MockQuery     { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: any): MockQuery    { this.filters.push((r) => r[col] !== val); return this; }
  not(col: string, op: string, val: any): MockQuery {
    if (op === "ilike" || op === "like") {
      const needle = String(val).replace(/%/g, "");
      this.filters.push((r) => typeof r[col] === "string" && r[col].includes(needle));
    } else {
      this.filters.push((r) => r[col] !== val);
    }
    return this;
  }
  in(col: string, vals: any[]): MockQuery  { this.filters.push((r) => vals.includes(r[col])); return this; }
  order(col: string, opts: { ascending?: boolean } = {}): MockQuery {
    this.orderBy = { column: col, ascending: opts.ascending ?? true };
    return this;
  }
  limit(n: number): MockQuery              { this.limitN = n; return this; }
  insert(rows: any | any[]): MockQuery {
    this.mode = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: any): MockQuery            { this.mode = "update"; this.updatePatch = patch; return this; }
  upsert(rows: any | any[], _opts?: any): MockQuery {
    this.mode = "upsert";
    this.upsertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  // ── Terminals ──────────────────────────────────────────────────────────
  async single(): Promise<{ data: any; error: any }>             { return this.resolve(false); }
  async maybeSingle(): Promise<{ data: any; error: any }>        { return this.resolve(true); }
  then<TResult1 = any>(onfulfilled?: ((v: any) => TResult1 | PromiseLike<TResult1>) | null): PromiseLike<TResult1> {
    return Promise.resolve(this.resolve(false)).then(onfulfilled);
  }

  private async resolve(maybeEmpty: boolean): Promise<{ data: any; error: any }> {
    const rows = this.db.tables[this.table] ?? (this.db.tables[this.table] = []);

    if (this.mode === "insert") {
      const inserted: any[] = [];
      for (const row of this.insertRows) {
        const rec = { id: (row.id as string) ?? crypto.randomUUID(), created_at: new Date().toISOString(), ...row };
        // Mimic the partial unique index `of_sync_runs_one_active_sync_all_idx`:
        // only one running all-sync per creator is allowed at a time. When contended,
        // return a 23505 so the production race-recovery branch fires.
        if (
          this.table === "of_sync_runs" &&
          rec.status === "running" &&
          rec.sync_type === "all"
        ) {
          const existing = rows.find(
            (r) => r.sync_type === "all" && r.status === "running" && r.creator_id === rec.creator_id
          );
          if (existing) {
            return {
              data: null,
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "of_sync_runs_one_active_sync_all_idx"'
              }
            };
          }
        }
        rows.push(rec);
        inserted.push(rec);
      }
      return { data: inserted.length === 1 ? inserted[0] : inserted, error: null };
    }

    if (this.mode === "update") {
      const matched = rows.filter((r) => this.filters.every((f) => f(r)));
      const updated: any[] = matched.map((r) => ({ ...r, ...this.updatePatch, updated_at: new Date().toISOString() }));
      for (let i = 0; i < matched.length; i++) Object.assign(matched[i], updated[i]);
      return { data: updated.length === 1 ? updated[0] : updated, error: null };
    }

    if (this.mode === "upsert") {
      const out: any[] = [];
      for (const row of this.upsertRows) {
        const rec = { id: row.id ?? crypto.randomUUID(), updated_at: new Date().toISOString(), ...row };
        rows.push(rec);
        out.push(rec);
      }
      // Production upsert without explicit terminal returns the array of inserted rows.
      return { data: out, error: null };
    }

    // SELECT ─────────────────────────────────────────────────────────────
    let result = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result = [...result].sort((a, b) => {
        const av = a?.[column] ?? "";
        const bv = b?.[column] ?? "";
        return ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    if (this.limitN != null) result = result.slice(0, this.limitN);
    return {
      data: maybeEmpty ? (result[0] ?? null) : result.length === 1 ? result[0] : result,
      error: null
    };
  }
}

// ── Seed the mock DB with the MoonSiren creator row ────────────────────────
const supabase = new MockSupabase();
supabase.insertMany("of_creators", [
  {
    id: MOONSIREN_CREATOR_ID,
    betterfans_account_id: MOONSIREN_BF_ACCOUNT_ID,
    platform_provider: "betterfans",
    username: CREATOR_USERNAME,
    display_name: CREATOR_DISPLAY_NAME,
    status: "connected",
    onboarding_status: "ready",
    last_sync_at: null,
    bio: "Cozy moonlit chats from a quiet seaside studio",
    location: "Lisbon, Portugal",
    created_at: new Date().toISOString()
  }
]);

// ── Build the deterministic BetterFans dataset (MoonSiren at scale) ───────
function buildSubscribers(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const id = `sub_${String(i).padStart(6, "0")}`;
    const isExpired = i % 11 === 0;
    return {
      id,
      userId: id,
      username: `fan_${String(i).padStart(6, "0")}`,
      name: `Moonlounger ${i + 1}`,
      about: `Subscriber ${i + 1} — chats by moonlight.`,
      status: isExpired ? "expired" : "active",
      subscribedByData: {
        status: isExpired ? "expired" : "active",
        totalSumm: Number(((i * 7.43) % 480 + 35).toFixed(2)),
        renewedAt: new Date(Date.now() - i * 86400_000).toISOString()
      },
      totalSumm: Number(((i * 7.43) % 480 + 35).toFixed(2)),
      lastSeenAt: new Date(Date.now() - i * 3600_000).toISOString(),
      isExpired
    };
  });
}

function buildChats(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const userId = `user_${String(i).padStart(6, "0")}`;
    return {
      id: `chat_${String(i).padStart(6, "0")}`,
      userId,
      username: `chatter_${i + 1}`,
      name: `Chatter ${i + 1}`,
      lastMessageDate: new Date(Date.now() - i * 1800_000).toISOString(),
      hasUnreadMessages: i % 3 === 0,
      unreadCount: i % 3 === 0 ? ((i % 5) + 1) : 0,
      isPriority: i % 13 === 0,
      withUser: { id: userId, username: `chatter_${i + 1}`, name: `Chatter ${i + 1}` }
    };
  });
}

const SUBSCRIBER_DATASET = buildSubscribers(DATASET_SUBSCRIBERS);
const CHAT_DATASET = buildChats(DATASET_CHATS);

const providerSubreqCounter = { count: 0, perInvocation: [] as number[] };
const currentInvocationStart = { count: 0 };

BetterFansOperationalClient.prototype.getCreatorProfile = async function (_accountId: string) {
  providerSubreqCounter.count += 1; currentInvocationStart.count += 1;
  return {
    id: MOONSIREN_BF_ACCOUNT_ID,
    username: CREATOR_USERNAME,
    name: CREATOR_DISPLAY_NAME,
    about: "Cozy moonlit chats from a quiet seaside studio",
    location: "Lisbon, Portugal",
    postsCount: 142
  };
};
BetterFansOperationalClient.prototype.getStatsOverview = async function (_accountId: string) {
  providerSubreqCounter.count += 1; currentInvocationStart.count += 1;
  return {
    subscribersCount: DATASET_SUBSCRIBERS,
    activeSubscribersCount: Math.floor(DATASET_SUBSCRIBERS * 0.86),
    expiredSubscribersCount: Math.floor(DATASET_SUBSCRIBERS * 0.14),
    earnings: 14250.42,
    chatCount: DATASET_CHATS,
    priorityChatCount: Math.floor(DATASET_CHATS / 13),
    postsCount: 142
  };
};
BetterFansOperationalClient.prototype.getSubscribers = async function (_accountId: string, opts: { limit?: number; offset?: number } = {}) {
  providerSubreqCounter.count += 1; currentInvocationStart.count += 1;
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 100;
  return { list: SUBSCRIBER_DATASET.slice(offset, offset + limit) };
};
BetterFansOperationalClient.prototype.getChats = async function (_accountId: string, opts: { limit?: number; offset?: number } = {}) {
  providerSubreqCounter.count += 1; currentInvocationStart.count += 1;
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 100;
  return { list: CHAT_DATASET.slice(offset, offset + limit) };
};

// ── env shape: only the keys the sync-all code actually touches ────────────
const env = {
  BETTERFANS_API_KEY: "mock-key",
  BETTERFANS_BASE_URL: "http://mock.betterfans.local"
} as any;

// ── Helpers used by the driver but NOT imported from worker.ts ─────────────
function snapshotOfSyncRuns(label: string) {
  const runs = supabase.tables.of_sync_runs.map((r) => ({
    id: (r.id as string).slice(0, 8),
    creator: (r.creator_id as string).slice(0, 8),
    sync_type: r.sync_type,
    status: r.status,
    stage: r.current_stage ?? "—",
    cursor: r.cursor ?? 0,
    processed: r.processed_count ?? 0,
    records_processed: r.records_processed ?? 0,
    has_more: r.has_more,
    updated_at: (r.updated_at ?? "").slice(11, 23) /* HH:MM:SS.mmm */,
    started_at: (r.started_at ?? "").slice(11, 23),
    completed_at: (r.completed_at ?? "").slice(11, 23),
    last_error: r.last_error ?? null
  }));
  origLog(`│  ⌗ ${label}`);
  for (const r of runs) {
    origLog(
      `│    run ${r.id}  type=${r.sync_type}  status=${r.status}  stage=${r.stage}  cursor=${r.cursor}  processed=${r.processed}  has_more=${r.has_more}  updated=${r.updated_at || "—"}  completed=${r.completed_at || "—"}`
    );
  }
}

function divider() { origLog("│"); }

// ── Reproduce the production frontend's sequential continuation loop ────────
//   while (status === "running" && (has_more ?? hasMore)) { await Continue(...) }
async function runSession() {
  origLog("┌─────────────────────────────────────────────────────────────────────────────");
  origLog("│ POST /api/creators/" + MOONSIREN_CREATOR_ID + "/sync/all   (START)");
  origLog("│   payload: {}   source=sync_all");
  origLog("├─────────────────────────────────────────────────────────────────────────────");
  providerSubreqCounter.perInvocation.length = 0;
  const startResp = await startOrContinueCreatorSyncAll(supabase, env, MOONSIREN_CREATOR_ID, "sync_all");

  providerSubreqCounter.perInvocation.push(currentInvocationStart.count);
  currentInvocationStart.count = 0;

  origLog(`│ ← 200 OK   status=${startResp.status}  stage=${startResp.stage ?? startResp.current_stage}  processed=${startResp.processed}  has_more=${startResp.has_more ?? startResp.hasMore}`);
  divider();
  snapshotOfSyncRuns(`of_sync_runs AFTER START (1 invocation; new run fully initialized)`);
  divider();

  let continueCount = 0;
  let status = startResp.status;
  let hasMore = !!(startResp.has_more ?? startResp.hasMore);

  while (status === "running" && hasMore) {
    continueCount += 1;
    origLog("├─────────────────────────────────────────────────────────────────────────────");
    origLog(`│ POST /api/creators/${MOONSIREN_CREATOR_ID}/sync/all/continue   (CONTINUE #${continueCount})`);
    origLog("│   source=sync_all_continue");
    origLog("├─────────────────────────────────────────────────────────────────────────────");
    const resp = await startOrContinueCreatorSyncAll(supabase, env, MOONSIREN_CREATOR_ID, "sync_all_continue");

    providerSubreqCounter.perInvocation.push(currentInvocationStart.count);
    currentInvocationStart.count = 0;

    origLog(
      `│ ← 200 OK   status=${resp.status}  stage=${resp.stage ?? resp.current_stage}  processed=${resp.processed}  has_more=${resp.has_more ?? resp.hasMore}` +
      (resp.error ? `  error=${resp.error.code}` : "")
    );
    divider();
    snapshotOfSyncRuns(`of_sync_runs AFTER CONTINUE #${continueCount}`);
    divider();

    status = resp.status;
    hasMore = !!(resp.has_more ?? resp.hasMore);
    if (status !== "running") break;
  }

  // The latest of_sync_runs row in the table.
  const finalRows = supabase.tables.of_sync_runs;
  const finalRun = finalRows[finalRows.length - 1];

  return { startResp, continueCount, finalRun };
}

const { startResp, continueCount, finalRun } = await runSession();

// ── Bring captured structured logs back into the terminal output stream ────
console.log = origLog;

origLog("\n═══════════════════════  STRUCTURED WORKER LOGS  ═══════════════════════");
structuredLogs.forEach((log, i) => {
  origLog(
    `[invocation ${i + 1}]  ` +
    JSON.stringify({
      event: log.event,
      syncRunId: log.syncRunId.slice(0, 8),
      creatorId: log.creatorId.slice(0, 8),
      stage: log.stage,
      cursor: log.cursor,
      batchSize: log.batchSize,
      itemsProcessedThisInvocation: log.itemsProcessedThisInvocation,
      cumulativeProcessed: log.cumulativeProcessed,
      providerRequests: log.providerRequests,
      databaseRequests: log.databaseRequests,
      estimatedSubrequests: log.estimatedSubrequests,
      hasMore: log.hasMore,
      elapsedMs: log.elapsedMs
    })
  );
});

// ── Budget audit ────────────────────────────────────────────────────────────
const maxEstimated = structuredLogs.reduce((m, l) => Math.max(m, l.estimatedSubrequests), 0);
const maxProviderReq = structuredLogs.reduce((m, l) => Math.max(m, l.providerRequests + l.databaseRequests /* rough db-side */), 0);
const exceededBudget = structuredLogs.some((l) => l.estimatedSubrequests > HARD_LIMIT);
const exceededEffective = structuredLogs.some(
  (l) => l.providerRequests + l.databaseRequests + RESERVED_PERSIST_SLOTS > HARD_LIMIT
);

// ── Final of_sync_runs row (full untruncated record) ────────────────────────
origLog("\n═══════════════════════  FINAL of_sync_runs ROW  ═══════════════════════");
origLog(JSON.stringify(finalRun, null, 2));

// ── Coverage summary ────────────────────────────────────────────────────────
const subscriberRowsAfter = (supabase.tables.of_subscribers ?? []).length;
const chatRowsAfter = (supabase.tables.of_chats ?? []).length;
const snapshotRowsAfter = (supabase.tables.of_creator_snapshots ?? []).length;

origLog("\n═══════════════════════  SYNC-ALL RUN SUMMARY  ═══════════════════════");
origLog(`Dataset:               ${DATASET_SUBSCRIBERS} subscribers + ${DATASET_CHATS} chats = ${DATASET_SUBSCRIBERS + DATASET_CHATS} records`);
origLog(`Batch size (BATCH_RECORDS_LIMIT): 50`);
origLog(`Subrequest hard limit (worker.ts SUBREQUEST_BUDGET_HARD_LIMIT): ${HARD_LIMIT}`);
origLog(`Reserved persist slots (worker.ts RESERVED_PERSIST_SLOTS):     ${RESERVED_PERSIST_SLOTS}`);
origLog(`Stale threshold (worker.ts STALE_SYNC_THRESHOLD_MS):           ${5 * 60 * 1000} ms (5 min)`);
origLog("────────────────────────  RUN  ─────────────────────────");
origLog(`Total /sync/all requests:               1`);
origLog(`Total /continue requests:               ${continueCount}`);
origLog(`Total Worker invocations:               ${continueCount + 1}`);
origLog(`Final of_sync_runs.status:              ${finalRun.status}`);
origLog(`Final of_sync_runs.current_stage:       ${finalRun.current_stage}`);
origLog(`Final of_sync_runs.has_more:            ${finalRun.has_more}`);
origLog(`Final of_sync_runs.processed_count:     ${finalRun.processed_count}`);
origLog(`Final of_sync_runs.records_processed:   ${finalRun.records_processed}`);
origLog(`Final of_sync_runs.completed_at:        ${finalRun.completed_at}`);
origLog(`Final of_sync_runs.error_message:       ${finalRun.error_message ?? "—"}`);
origLog("────────────────────────  BUDGET  ─────────────────────");
origLog(`Max estimatedSubrequests/invocation:    ${maxEstimated}  (cap ${HARD_LIMIT})`);
origLog(`Max providerRequests in any invocation: ${Math.max(...structuredLogs.map((l) => l.providerRequests))}`);
origLog(`Max databaseRequests in any invocation: ${Math.max(...structuredLogs.map((l) => l.databaseRequests))}`);
origLog(`Estimated/cumulative higher than the soft persisted budget (≥${HARD_LIMIT - RESERVED_PERSIST_SLOTS + 1})?  ${exceededEffective ? "YES (problem)" : "no"}`);
origLog(`Never exceeded hard limit (${HARD_LIMIT})?              ${exceededBudget ? "❌ NO" : "✅ YES"}`);
origLog("────────────────────────  COVERAGE  ──────────────────");
origLog(`of_subscribers rows persisted:          ${subscriberRowsAfter} / ${DATASET_SUBSCRIBERS}${subscriberRowsAfter === DATASET_SUBSCRIBERS ? "  ✅" : "  ❌"}`);
origLog(`of_chats rows persisted:                ${chatRowsAfter} / ${DATASET_CHATS}${chatRowsAfter === DATASET_CHATS ? "  ✅" : "  ❌"}`);
origLog(`of_creator_snapshots rows persisted:    ${snapshotRowsAfter} / 2  (profile+stats)`);

if (exceededBudget || finalRun.status !== "success" || subscriberRowsAfter !== DATASET_SUBSCRIBERS || chatRowsAfter !== DATASET_CHATS) {
  origLog("\n❌ Driver run did not validate cleanly.");
  process.exitCode = 1;
} else {
  origLog("\n✅ Driver run validated: every invocation stayed within budget, every invocation persisted, the run terminated as success.");
}
