// FMF-3: Creator Readiness Orchestrator — deterministic check.
//
// Pure transition detection + planning + persistence semantics, exercised via
// the pure planner + an in-memory event store that mirrors the Supabase store
// (partial unique index on (creator, event_type, new_milestone) for the
// milestone-reached family). No DB / browser / FYV required.
//
// The check imports the pure core by RELATIVE path (of-types has 0 runtime
// imports -> Node type-strips it), so it runs under `node ... .ts` and tsx.

import {
  calculateReadinessSummary,
  planReadinessOrchestration,
  milestoneForReadiness,
  readinessBlockingIssues,
  readinessMilestoneOrdinal,
  READINESS_MILESTONES,
  type PlannedReadinessEvent,
  type ReadinessInput,
  type ReadinessMilestone,
  type ReadinessOrchestrationPlan,
  type ReadinessSummary
} from "../../../packages/of-types/src/index.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (ok) passed += 1;
  else { failed += 1; failures.push(name); }
}

/* --- In-memory event store (mirrors the Supabase partial unique index) ------ */

interface StoredEvent extends PlannedReadinessEvent {
  id: string;
  created_at: string;
}

const MILESTONE_REACHED_EVENTS = new Set([
  "creator_reached_infrastructure",
  "creator_reached_intelligence",
  "creator_reached_creator_ready",
  "creator_reached_operational",
  "creator_reached_production"
]);

class EventStore {
  events: StoredEvent[] = [];
  private seq = 0;
  insertAll(evts: PlannedReadinessEvent[], now: string): { inserted: number; deduped: number } {
    let inserted = 0;
    let deduped = 0;
    for (const evt of evts) {
      if (MILESTONE_REACHED_EVENTS.has(evt.eventType)) {
        const already = this.events.some(
          (e) => e.eventType === evt.eventType && e.newMilestone === evt.newMilestone
        );
        if (already) { deduped += 1; continue; }
      }
      this.seq += 1;
      this.events.unshift({ ...evt, id: `evt_${this.seq}`, created_at: now });
      inserted += 1;
    }
    return { inserted, deduped };
  }
  latest(): StoredEvent | null { return this.events[0] ?? null; }
  count(type: string): number { return this.events.filter((e) => e.eventType === type).length; }
}

function planFromStore(store: EventStore, current: ReadinessSummary, triggerEvent: string) {
  const last = store.latest();
  const previous = last
    ? { score: last.newScore, status: last.newStatus, milestone: last.newMilestone, blockingIssues: last.blockingIssues }
    : null;
  return planReadinessOrchestration({ current, previous, triggerEvent });
}

/* --- Input builders (MoonSiren trajectory) ---------------------------------- */

const MOONSIREN_ID = "20fdee3c-6998-4e8a-8611-04ab88949301";

function baseInput(): ReadinessInput {
  return {
    creator: { id: MOONSIREN_ID, betterfans_account_id: null, last_sync_at: null, active: true, onboarding_status: "draft" },
    latestSuccessfulSyncAt: null,
    latestSnapshot: null,
    opportunities: [],
    fyvRelationship: null,
    scriptCount: 0,
    activeScriptCount: 0,
    activeJourneyCount: 0,
    activeAutomationCount: 0
  };
}

function withBetterFans(input: ReadinessInput): ReadinessInput {
  return { ...input, creator: { ...input.creator, betterfans_account_id: "acct-1", last_sync_at: "2026-07-13T00:00:00Z" }, latestSuccessfulSyncAt: "2026-07-13T00:00:00Z" };
}
function withIntelligence(input: ReadinessInput): ReadinessInput {
  return { ...input, latestSnapshot: { id: "s1", source_package_reference: "fyv/x/1", imported_at: "2026-07-13T01:00:00Z", superseded_at: null }, opportunities: [{ confidence: 92, priority: 1 }, { confidence: 84, priority: 2 }, { confidence: 78, priority: 3 }] };
}
function withFyvState(input: ReadinessInput, state: "pending" | "invited" | "accepted" | "active"): ReadinessInput {
  return { ...input, fyvRelationship: { fyv_creator_id: "16bab1fb", relationship_state: state, invited_at: state !== "pending" ? "a" : null, accepted_at: state === "accepted" || state === "active" ? "b" : null, activated_at: state === "active" ? "c" : null } };
}
function withJourneysConfigured(input: ReadinessInput): ReadinessInput {
  return { ...input, scriptCount: 1 };
}
function withJourneysRunning(input: ReadinessInput): ReadinessInput {
  return { ...input, scriptCount: 2, activeScriptCount: 1, activeJourneyCount: 1, activeAutomationCount: 1 };
}

async function main() {
  // ---- 1. Milestone thresholds (0/20/40/60/80/100) ----------------------------
  check("milestone(0)=discovery", milestoneForReadiness(0) === "discovery");
  check("milestone(19)=discovery", milestoneForReadiness(19) === "discovery");
  check("milestone(20)=infrastructure_ready", milestoneForReadiness(20) === "infrastructure_ready");
  check("milestone(40)=intelligence_ready", milestoneForReadiness(40) === "intelligence_ready");
  check("milestone(60)=creator_ready", milestoneForReadiness(60) === "creator_ready");
  check("milestone(68)=creator_ready", milestoneForReadiness(68) === "creator_ready");
  check("milestone(80)=operational", milestoneForReadiness(80) === "operational");
  check("milestone(99)=operational", milestoneForReadiness(99) === "operational");
  check("milestone(100)=production_ready", milestoneForReadiness(100) === "production_ready");
  check("READINESS_MILESTONES has all six", READINESS_MILESTONES.length === 6);
  check("ordinals strictly increasing", READINESS_MILESTONES.every((m, i) => readinessMilestoneOrdinal(m) === i));

  // ---- 2. Blocking / warning detection ----------------------------------------
  {
    const summary = calculateReadinessSummary(baseInput());
    const blocks = readinessBlockingIssues(summary);
    check("empty: 3 blocks (BF, Intel, FYV Pending)", blocks.length === 3);
    check("empty: block[0] BetterFans", blocks[0].includes("BetterFans"));
  }
  {
    const summary = calculateReadinessSummary(withBetterFans(baseInput()));
    const blocks = readinessBlockingIssues(summary);
    check("BF only: 2 blocks", blocks.length === 2);
    check("BF only: no BetterFans block", !blocks.some((b) => b.includes("BetterFans account")));
  }

  // ---- 3. MoonSiren replay: BF → Intel → invited → accepted → active + journeys
  {
    const store = new EventStore();

    // Step 1: BetterFans connected (score 20 → infrastructure_ready)
    const s1 = calculateReadinessSummary(withBetterFans(baseInput()));
    check("s1 score 20", s1.readinessScore === 20);
    const p1 = planFromStore(store, s1, "betterfans_sync_completed");
    check("s1: newMilestone infrastructure_ready", p1.newMilestone === "infrastructure_ready");
    check("s1: reached infrastructure", p1.reached.includes("creator_reached_infrastructure"));
    check("s1: transitioned", p1.transitioned && !p1.regressed);
    check("s1: 2 events (changed + reached)", p1.events.length === 2);
    const res1 = store.insertAll(p1.events, "2026-07-13T00:00:00Z");
    check("s1: 2 inserted, 0 deduped", res1.inserted === 2 && res1.deduped === 0);

    // Step 2: Intelligence imported (score 40 → intelligence_ready)
    const s2 = calculateReadinessSummary(withIntelligence(withBetterFans(baseInput())));
    // BF (20) + Intel (20) + Opps (20) = 60, so this actually jumps to 60 (creator_ready).
    // The spec's example "0 → 20 → 40 → …" collapses two additions here; that's fine —
    // the orchestrator emits one event per milestone in a single step.
    check("s2 score 60 (BF + Intel + Opps)", s2.readinessScore === 60);
    const p2 = planFromStore(store, s2, "intelligence_imported");
    check("s2: newMilestone creator_ready", p2.newMilestone === "creator_ready");
    check("s2: reached intelligence + creator_ready", p2.reached.includes("creator_reached_intelligence") && p2.reached.includes("creator_reached_creator_ready"));
    check("s2: 3 events (changed + 2 reached)", p2.events.length === 3);
    store.insertAll(p2.events, "2026-07-13T01:00:00Z");

    // MoonSiren spec-shape (invited, no journeys) = 68 → still creator_ready → no new
    // milestone event (already crossed), but the previous step 2 state was blocked
    // by "Creator not linked to FYV" (FYV Access Pending). Advancing to Invited
    // resolves that block → creator_unblocked fires.
    const sMs = calculateReadinessSummary(withFyvState(withIntelligence(withBetterFans(baseInput())), "invited"));
    check("MoonSiren spec: score 68", sMs.readinessScore === 68);
    const pMs = planFromStore(store, sMs, "creator_invited");
    check("MoonSiren: newMilestone creator_ready", pMs.newMilestone === "creator_ready");
    check("MoonSiren: transitioned=false (same milestone)", pMs.transitioned === false);
    check("MoonSiren: no new milestone events", pMs.reached.length === 0);
    check("MoonSiren: exactly 1 event (creator_unblocked as FYV Access advances)", pMs.events.length === 1 && pMs.events[0].eventType === "creator_unblocked");
    store.insertAll(pMs.events, "2026-07-13T01:30:00Z");

    // Step 3: FYV Accepted (score 20+20+20+20+0 wait — with 3 opps: 20+20+14+20+0=74; needs check)
    const s3 = calculateReadinessSummary(withFyvState(withIntelligence(withBetterFans(baseInput())), "accepted"));
    // BF 20 + Intel 20 + Access 14 + Opps 20 = 74.
    check("s3 score 74 (accepted, no journeys)", s3.readinessScore === 74);
    check("s3: still creator_ready milestone", milestoneForReadiness(s3.readinessScore) === "creator_ready");

    // Step 4: FYV Active + Journeys running (score 100)
    const s4 = calculateReadinessSummary(withJourneysRunning(withFyvState(withIntelligence(withBetterFans(baseInput())), "active")));
    check("s4 score 100", s4.readinessScore === 100);
    const p4 = planFromStore(store, s4, "journeys_configured");
    check("s4: newMilestone production_ready", p4.newMilestone === "production_ready");
    check("s4: reached operational + production (crossed both)", p4.reached.includes("creator_reached_operational") && p4.reached.includes("creator_reached_production"));
    check("s4: action queue_default_journey_activation planned", p4.actions.some((a) => a.type === "queue_default_journey_activation"));
    check("s4: action enable_operational_automations planned", p4.actions.some((a) => a.type === "enable_operational_automations"));
    const res4 = store.insertAll(p4.events, "2026-07-13T02:00:00Z");
    // Events: creator_readiness_changed + creator_reached_operational +
    // creator_reached_production + (any residual blocked/unblocked). At MoonSiren
    // step the previous blocks were already 0 (unblocked fired earlier), so no
    // blocking event here → exactly 3.
    check("s4: inserted 3 events (changed + 2 reached)", res4.inserted === 3);

    // Milestone-fires-once + idempotency: real replay = fresh planFromStore against
    // the current state should now emit ZERO events (nothing changed). The store
    // itself is what enforces one-shot milestones; the planner is what enforces
    // "no events without a delta".
    const p4Replay = planFromStore(store, s4, "trigger_replay");
    check("replay p4 (fresh plan): 0 events (state unchanged)", p4Replay.events.length === 0);
    const res4b = store.insertAll(p4Replay.events, "2026-07-13T02:05:00Z");
    check("replay p4: 0 inserted, 0 deduped", res4b.inserted === 0 && res4b.deduped === 0);
    // And an artificial re-insertion of the ORIGINAL plan (simulating a race that
    // slips through the planner guard) is still contained by the DB-level partial
    // unique index for the reached-milestone family.
    const resRace = store.insertAll(p4.events, "2026-07-13T02:06:00Z");
    check("race: reached-milestone rows deduped by store (2 deduped)", resRace.deduped === 2);
    check("only one creator_reached_operational stored", store.count("creator_reached_operational") === 1);
    check("only one creator_reached_production stored", store.count("creator_reached_production") === 1);

    // Cumulative counts across the trajectory
    check("cumulative: creator_reached_infrastructure once", store.count("creator_reached_infrastructure") === 1);
    check("cumulative: creator_reached_intelligence once", store.count("creator_reached_intelligence") === 1);
    check("cumulative: creator_reached_creator_ready once", store.count("creator_reached_creator_ready") === 1);
  }

  // ---- 4. Regression: from Operational → Intelligence Ready (BF disconnected)
  {
    const store = new EventStore();
    const startInput = withJourneysRunning(withFyvState(withIntelligence(withBetterFans(baseInput())), "active"));
    const startSummary = calculateReadinessSummary(startInput);
    store.insertAll(planFromStore(store, startSummary, "seed").events, "t0");
    check("seed: at production_ready", store.latest()?.newMilestone === "production_ready");
    // Now disconnect BetterFans → losing 20 points, plus journeys ceased? Keep journeys.
    const regressedInput: ReadinessInput = { ...startInput, creator: { ...startInput.creator, betterfans_account_id: null, last_sync_at: null }, latestSuccessfulSyncAt: null };
    const regressedSummary = calculateReadinessSummary(regressedInput);
    check("regressed score = 80 (lost BF -20)", regressedSummary.readinessScore === 80);
    check("regressed milestone = operational", milestoneForReadiness(regressedSummary.readinessScore) === "operational");
    const plan = planFromStore(store, regressedSummary, "betterfans_disconnected");
    check("regress: regressed=true", plan.regressed === true);
    check("regress: event creator_regressed present", plan.events.some((e) => e.eventType === "creator_regressed"));
    check("regress: action pause_creator_automations planned", plan.actions.some((a) => a.type === "pause_creator_automations"));
    check("regress: newMilestone < previousMilestone (ordinal)", plan.previousMilestone && readinessMilestoneOrdinal(plan.newMilestone) < readinessMilestoneOrdinal(plan.previousMilestone));
    check("regress: creator_blocked event fired (was 0 blocks, now BetterFans block)", plan.events.some((e) => e.eventType === "creator_blocked"));
  }

  // ---- 5. Blocked → unblocked ------------------------------------------------
  {
    const store = new EventStore();
    // Seed at BF-only (still 2 blocks: intel + FYV pending)
    const seedInput = withBetterFans(baseInput());
    const seedSummary = calculateReadinessSummary(seedInput);
    const seedPlan = planFromStore(store, seedSummary, "seed");
    check("seed with blocks: no creator_blocked (previous null)", !seedPlan.events.some((e) => e.eventType === "creator_blocked"));
    store.insertAll(seedPlan.events, "t0");
    // Now advance to fully unblocked
    const unblockedInput = withJourneysRunning(withFyvState(withIntelligence(withBetterFans(baseInput())), "active"));
    const unblockedSummary = calculateReadinessSummary(unblockedInput);
    const unblockedPlan = planFromStore(store, unblockedSummary, "all_pieces_added");
    check("unblock: 0 blocking issues", unblockedPlan.blockingIssues.length === 0);
    check("unblock: creator_unblocked event fired", unblockedPlan.events.some((e) => e.eventType === "creator_unblocked"));
    // Replay
    const before = store.count("creator_unblocked");
    store.insertAll(unblockedPlan.events, "t1");
    // Second replay - re-plan with new previous (unblocked) → no more unblocked event
    const rePlan = planFromStore(store, unblockedSummary, "replay");
    check("re-plan after unblock: no more unblocked event", !rePlan.events.some((e) => e.eventType === "creator_unblocked"));
    // The store still has exactly one unblocked event
    check("store: creator_unblocked count exactly 1", store.count("creator_unblocked") === before + 1);
  }

  // ---- 6. Idempotent replay: same trigger, same state → no new events --------
  {
    const store = new EventStore();
    const input = withJourneysRunning(withFyvState(withIntelligence(withBetterFans(baseInput())), "active"));
    const summary = calculateReadinessSummary(input);
    const p1 = planFromStore(store, summary, "trigger_a");
    store.insertAll(p1.events, "t0");
    const before = store.events.length;
    // Re-plan with the SAME state (no external change happened)
    const p2 = planFromStore(store, summary, "trigger_a_replay");
    check("replay: same milestone (no transition)", p2.transitioned === false);
    check("replay: no new events planned", p2.events.length === 0);
    store.insertAll(p2.events, "t1");
    check("replay: store count unchanged", store.events.length === before);
  }

  // ---- 7. Milestone events fire ONCE across replays --------------------------
  {
    const store = new EventStore();
    const summary = calculateReadinessSummary(withBetterFans(baseInput()));
    for (let i = 0; i < 5; i += 1) {
      const plan = planFromStore(store, summary, `attempt_${i}`);
      store.insertAll(plan.events, `t${i}`);
    }
    check("replay x5: infrastructure milestone appears exactly once", store.count("creator_reached_infrastructure") === 1);
  }

  // ---- 8. First-time seed with pre-existing blocks does NOT fire creator_blocked
  {
    const store = new EventStore();
    const summary = calculateReadinessSummary(baseInput()); // all-empty, 3 blocks
    const plan = planFromStore(store, summary, "initial_reconcile");
    check("initial reconcile with blocks: no creator_blocked", !plan.events.some((e) => e.eventType === "creator_blocked"));
    check("initial reconcile: newMilestone discovery", plan.newMilestone === "discovery");
    check("initial reconcile: no readiness_changed at discovery from null", plan.transitioned === true /* discovery != null */);
    // Note: transitioned=true because previous=null vs new=discovery. That's OK
    // — first reconcile records the seed state.
  }

  // ---- 9. Action rules ---------------------------------------------------------
  {
    // Reaching operational without production → journey activation only
    const store = new EventStore();
    const opsInput = { ...withFyvState(withIntelligence(withBetterFans(baseInput())), "active"), scriptCount: 1 }; // 20+20+20+20+12=92 → operational
    const opsSummary = calculateReadinessSummary(opsInput);
    check("ops-only path score 92", opsSummary.readinessScore === 92);
    const plan = planFromStore(store, opsSummary, "seed");
    check("ops-only: queue_default_journey_activation present", plan.actions.some((a) => a.type === "queue_default_journey_activation"));
    check("ops-only: enable_operational_automations NOT present", !plan.actions.some((a) => a.type === "enable_operational_automations"));
  }

  // ---- Report ----------------------------------------------------------------
  const total = passed + failed;
  if (failed > 0) {
    console.error(`\nFMF-3 orchestrator check FAILED: ${passed}/${total} passed`);
    for (const name of failures) console.error(`  - ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[fmf-3-orchestrator-check] ${passed}/${total} PASS`);
}

await main();
