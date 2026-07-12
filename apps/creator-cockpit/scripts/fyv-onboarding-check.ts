// FYV -> FMF Creator Intelligence Package handoff — deterministic check.
//
// Proves the FMF boundary WITHOUT a browser or backend and WITHOUT changing
// runtime execution:
//
//   FYV creator.intelligence_package.published event
//     -> normalize/validate (published-only guard)                 [of-types]
//     -> resolve EXISTING creator (reject-on-unknown, never create) [store port]
//     -> advance relationship_state invited -> accepted            [of-types]
//     -> attach metadata.fyv_package pointer + persist deduped event [store]
//
// The pure lifecycle + event core lives in of-types and is imported by RELATIVE
// path (of-types has 0 runtime imports -> Node type-strips it), so this runs
// under `node .../fyv-onboarding-check.ts` and tsx. The in-memory store mirrors
// the Supabase store semantics (dedupe on provider_event_id; one atomic
// pointer+state mutation) so idempotency + no-double-transition are provable
// here. Uses MoonSiren ONLY as a fixture — no creator-specific behaviour.

import {
  canTransitionCreatorRelationship,
  relationshipCapabilities,
  nextRelationshipStateForPublishedPackage,
  normalizeCreatorIntelligencePackagePublishedEvent,
  buildFyvPackagePointer,
  ingestCreatorIntelligencePackagePublishedEvent,
  CREATOR_RELATIONSHIP_STATES,
  type CreatorRelationshipState,
  type CreatorIntelligenceEventStore,
  type CreatorRelationshipRecord,
  type FyvIngestionPersistResult
} from "../../../packages/of-types/src/index.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean) {
  if (condition) {
    passed += 1;
  } else {
    failed += 1;
    failures.push(name);
  }
}

/* --- In-memory store (mirrors createSupabaseCreatorIntelligenceEventStore) --- */

interface MemoryCreator {
  id: string;
  username: string;
  relationship_state: CreatorRelationshipState | null;
  relationship_state_changed_at: string | null;
  metadata: Record<string, unknown>;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function createMemoryStore(seedCreators: MemoryCreator[]) {
  const creators = seedCreators.map((creator) => ({ ...creator, metadata: { ...creator.metadata } }));
  const events = new Map<string, { id: string; creator_id: string }>();
  let creatorCreations = 0;
  let eventSeq = 0;

  const store: CreatorIntelligenceEventStore = {
    resolveCreatorByReference(reference: string): CreatorRelationshipRecord | null {
      const byId = isUuidLike(reference) ? creators.find((creator) => creator.id === reference) : undefined;
      const match = byId ?? creators.find((creator) => creator.username.toLowerCase() === reference.toLowerCase());
      return match ? { id: match.id, relationship_state: match.relationship_state } : null;
    },
    persistIngestion({ creator, event, nextState }): FyvIngestionPersistResult {
      const record = creators.find((entry) => entry.id === creator.id)!;

      // (1) Idempotency guard: already-persisted event => no re-transition.
      const existing = events.get(event.providerEventId);
      if (existing) {
        return {
          eventId: existing.id,
          deduped: true,
          relationshipState: record.relationship_state ?? nextState,
          transitioned: false
        };
      }

      // (2) Attach pointer + advance state (one atomic mutation).
      const transitioned = nextState !== (record.relationship_state ?? null);
      record.metadata = { ...record.metadata, fyv_package: buildFyvPackagePointer(event, { linkedAt: event.receivedAt }) };
      record.relationship_state = nextState;
      if (transitioned) record.relationship_state_changed_at = event.receivedAt;

      // (3) Record the deduped canonical event.
      eventSeq += 1;
      const eventId = `evt_${eventSeq}`;
      events.set(event.providerEventId, { id: eventId, creator_id: creator.id });

      return { eventId, deduped: false, relationshipState: nextState, transitioned };
    }
  };

  return {
    store,
    creators,
    events,
    creatorCount: () => creators.length,
    creatorCreations: () => creatorCreations,
    getCreator: (id: string) => creators.find((creator) => creator.id === id) ?? null
  };
}

const MOONSIREN_ID = "11111111-1111-4111-8111-111111111111";

function seedMoonSiren(relationship_state: CreatorRelationshipState | null = null): MemoryCreator {
  return { id: MOONSIREN_ID, username: "moonsiren", relationship_state, relationship_state_changed_at: null, metadata: {} };
}

const validEvent = {
  event_type: "creator.intelligence_package.published",
  source_product: "FYV",
  creator_reference: "moonsiren",
  package_reference: "fyv/moonsiren/intelligence-package/2026-07-05",
  source_assessment_reference: "fyv/moonsiren/assessment/2026-07-05",
  package_state: "published"
};

async function main() {
  // ---- Pure lifecycle: legal transitions -------------------------------------
  check("legal invited->accepted", canTransitionCreatorRelationship("invited", "accepted"));
  check("legal accepted->active", canTransitionCreatorRelationship("accepted", "active"));
  check("legal active->paused", canTransitionCreatorRelationship("active", "paused"));
  check("legal paused->active", canTransitionCreatorRelationship("paused", "active"));
  check("legal active->offboarded", canTransitionCreatorRelationship("active", "offboarded"));
  check("legal paused->offboarded", canTransitionCreatorRelationship("paused", "offboarded"));
  check("legal accepted->offboarded", canTransitionCreatorRelationship("accepted", "offboarded"));
  check("legal invited->offboarded", canTransitionCreatorRelationship("invited", "offboarded"));

  // ---- Pure lifecycle: illegal transitions -----------------------------------
  check("illegal invited->active", !canTransitionCreatorRelationship("invited", "active"));
  check("illegal invited->paused", !canTransitionCreatorRelationship("invited", "paused"));
  check("illegal accepted->paused", !canTransitionCreatorRelationship("accepted", "paused"));
  check("illegal accepted->invited (no regress)", !canTransitionCreatorRelationship("accepted", "invited"));
  check("illegal active->accepted (no regress)", !canTransitionCreatorRelationship("active", "accepted"));
  check("illegal active->invited (no regress)", !canTransitionCreatorRelationship("active", "invited"));
  check("illegal offboarded->active (terminal)", !canTransitionCreatorRelationship("offboarded", "active"));
  check("illegal offboarded->accepted (terminal)", !canTransitionCreatorRelationship("offboarded", "accepted"));
  check("illegal same-state accepted->accepted", !canTransitionCreatorRelationship("accepted", "accepted"));

  // ---- Event advance function (invited->accepted only, never activate) -------
  check("nextForPublished(null)=accepted", nextRelationshipStateForPublishedPackage(null) === "accepted");
  check("nextForPublished(invited)=accepted", nextRelationshipStateForPublishedPackage("invited") === "accepted");
  check("nextForPublished(accepted)=accepted (idempotent, NOT active)", nextRelationshipStateForPublishedPackage("accepted") === "accepted");
  check("nextForPublished(active)=active (no regress)", nextRelationshipStateForPublishedPackage("active") === "active");
  check("nextForPublished(paused)=paused", nextRelationshipStateForPublishedPackage("paused") === "paused");
  check("nextForPublished(offboarded)=offboarded", nextRelationshipStateForPublishedPackage("offboarded") === "offboarded");
  check("activation stays a legal (operator) transition, not an event one", canTransitionCreatorRelationship("accepted", "active"));

  // ---- Capabilities ----------------------------------------------------------
  const invitedCaps = relationshipCapabilities("invited");
  check("invited: no operational workflows", !invitedCaps.automationExecutionEnabled && !invitedCaps.onboardingAllowed);
  const acceptedCaps = relationshipCapabilities("accepted");
  check("accepted: onboarding allowed, automation not yet", acceptedCaps.onboardingAllowed && !acceptedCaps.automationExecutionEnabled);
  const activeCaps = relationshipCapabilities("active");
  check("active: workflows enabled", activeCaps.automationExecutionEnabled && !activeCaps.executionSuspended && !activeCaps.executionBlocked);
  const pausedCaps = relationshipCapabilities("paused");
  check("paused: execution suspended, automation off", pausedCaps.executionSuspended && !pausedCaps.automationExecutionEnabled);
  const offboardedCaps = relationshipCapabilities("offboarded");
  check("offboarded: execution blocked, no onboarding/automation", offboardedCaps.executionBlocked && !offboardedCaps.onboardingAllowed && !offboardedCaps.automationExecutionEnabled);
  check("relationship states are the five expected", CREATOR_RELATIONSHIP_STATES.join(",") === "invited,accepted,active,paused,offboarded");

  // ---- Validation guards -----------------------------------------------------
  const good = normalizeCreatorIntelligencePackagePublishedEvent(validEvent, { receivedAt: "2026-07-12T00:00:00.000Z" });
  check("valid event normalizes ok", good.ok === true);
  if (good.ok) {
    check("normalized providerEventId defaults to package_reference", good.event.providerEventId === validEvent.package_reference);
    check("normalized packageState is published", good.event.packageState === "published");
    check("normalized assessmentReference preserved", good.event.assessmentReference === validEvent.source_assessment_reference);
    check("normalized provider is fyv", good.event.provider === "fyv");
  }

  for (const state of ["identified", "draft", "superseded"]) {
    const res = normalizeCreatorIntelligencePackagePublishedEvent({ ...validEvent, package_state: state });
    check(`unpublished '${state}' rejected 422`, res.ok === false && res.statusCode === 422 && res.field === "package_state");
  }

  const missingPkg = normalizeCreatorIntelligencePackagePublishedEvent({ ...validEvent, package_reference: "" });
  check("missing package_reference rejected 400", missingPkg.ok === false && missingPkg.statusCode === 400 && missingPkg.field === "package_reference");

  const missingCreator = normalizeCreatorIntelligencePackagePublishedEvent({ ...validEvent, creator_reference: "" });
  check("missing creator_reference rejected 400", missingCreator.ok === false && missingCreator.statusCode === 400 && missingCreator.field === "creator_reference");

  const badType = normalizeCreatorIntelligencePackagePublishedEvent({ ...validEvent, event_type: "creator.something.else" });
  check("wrong event_type rejected 400", badType.ok === false && badType.statusCode === 400 && badType.field === "event_type");

  const badProduct = normalizeCreatorIntelligencePackagePublishedEvent({ ...validEvent, source_product: "MGRNZ" });
  check("wrong source_product rejected 400", badProduct.ok === false && badProduct.statusCode === 400 && badProduct.field === "source_product");

  const notObject = normalizeCreatorIntelligencePackagePublishedEvent("nope");
  check("non-object payload rejected 400", notObject.ok === false && notObject.statusCode === 400);

  // ---- Orchestrator + store: happy path (MoonSiren exists) -------------------
  {
    const mem = createMemoryStore([seedMoonSiren(null)]);
    const result = await ingestCreatorIntelligencePackagePublishedEvent(mem.store, validEvent, { receivedAt: "2026-07-12T00:00:00.000Z" });
    check("ingest ok", result.ok === true);
    if (result.ok) {
      check("ingest resolved MoonSiren id", result.creatorId === MOONSIREN_ID);
      check("ingest relationshipState = accepted", result.relationshipState === "accepted");
      check("ingest transitioned true", result.transitioned === true);
      check("ingest not deduped on first call", result.deduped === false);
    }
    const creator = mem.getCreator(MOONSIREN_ID)!;
    check("creator advanced to accepted", creator.relationship_state === "accepted");
    check("relationship_state_changed_at set", creator.relationship_state_changed_at === "2026-07-12T00:00:00.000Z");
    const pointer = creator.metadata.fyv_package as Record<string, unknown> | undefined;
    check("metadata.fyv_package attached", Boolean(pointer));
    check("pointer package_reference correct", pointer?.package_reference === validEvent.package_reference);
    check("pointer assessment_reference correct", pointer?.assessment_reference === validEvent.source_assessment_reference);
    check("pointer source_product FYV", pointer?.source_product === "FYV");
    check("pointer package_state published", pointer?.package_state === "published");
    check("pointer source_event_id = providerEventId", pointer?.source_event_id === validEvent.package_reference);
    check("exactly one event persisted", mem.events.size === 1);

    // ---- Duplicate replay: idempotent, no double transition ------------------
    const replay = await ingestCreatorIntelligencePackagePublishedEvent(mem.store, validEvent, { receivedAt: "2026-07-12T01:00:00.000Z" });
    check("replay ok", replay.ok === true);
    if (replay.ok) {
      check("replay deduped true", replay.deduped === true);
      check("replay transitioned false", replay.transitioned === false);
      check("replay relationshipState still accepted", replay.relationshipState === "accepted");
    }
    check("replay: still exactly one event", mem.events.size === 1);
    check("replay: creator still accepted", mem.getCreator(MOONSIREN_ID)!.relationship_state === "accepted");
    check("replay: changed_at unchanged (no re-transition)", mem.getCreator(MOONSIREN_ID)!.relationship_state_changed_at === "2026-07-12T00:00:00.000Z");
  }

  // ---- Unknown creator: reject, never create ---------------------------------
  {
    const mem = createMemoryStore([seedMoonSiren(null)]);
    const result = await ingestCreatorIntelligencePackagePublishedEvent(mem.store, { ...validEvent, creator_reference: "ghost-creator" });
    check("unknown creator rejected 404", result.ok === false && result.statusCode === 404 && result.field === "creator_reference");
    check("unknown creator: no creator created", mem.creatorCount() === 1);
    check("unknown creator: no event persisted", mem.events.size === 0);
  }

  // ---- Unpublished via orchestrator: reject, no writes -----------------------
  {
    const mem = createMemoryStore([seedMoonSiren(null)]);
    const result = await ingestCreatorIntelligencePackagePublishedEvent(mem.store, { ...validEvent, package_state: "identified" });
    check("orchestrator unpublished rejected 422", result.ok === false && result.statusCode === 422);
    check("orchestrator unpublished: creator unchanged", mem.getCreator(MOONSIREN_ID)!.relationship_state === null);
    check("orchestrator unpublished: no event persisted", mem.events.size === 0);
  }

  // ---- Missing package reference via orchestrator: reject, no writes ---------
  {
    const mem = createMemoryStore([seedMoonSiren(null)]);
    const result = await ingestCreatorIntelligencePackagePublishedEvent(mem.store, { ...validEvent, package_reference: "" });
    check("orchestrator missing package_reference rejected 400", result.ok === false && result.statusCode === 400);
    check("orchestrator missing pkg: no event persisted", mem.events.size === 0);
  }

  // ---- Already-active creator: event never regresses or activates ------------
  {
    const mem = createMemoryStore([seedMoonSiren("active")]);
    const result = await ingestCreatorIntelligencePackagePublishedEvent(mem.store, validEvent);
    check("active creator: ok", result.ok === true);
    if (result.ok) {
      check("active creator: stays active (no regress to accepted)", result.relationshipState === "active");
      check("active creator: not transitioned", result.transitioned === false);
    }
    check("active creator: event still recorded (pointer attached)", Boolean(mem.getCreator(MOONSIREN_ID)!.metadata.fyv_package) && mem.events.size === 1);
  }

  // ---- Invited creator: advances to accepted ---------------------------------
  {
    const mem = createMemoryStore([seedMoonSiren("invited")]);
    const result = await ingestCreatorIntelligencePackagePublishedEvent(mem.store, validEvent);
    check("invited creator advances to accepted", result.ok === true && result.ok && result.relationshipState === "accepted" && result.transitioned === true);
  }

  // ---- Report ----------------------------------------------------------------
  const total = passed + failed;
  if (failed > 0) {
    console.error(`\nFYV onboarding check FAILED: ${passed}/${total} passed`);
    for (const name of failures) console.error(`  - ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[fyv-onboarding-check] ${passed}/${total} PASS`);
}

await main();
