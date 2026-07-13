// FMF-2: Creator Readiness Dashboard — deterministic calculator check.
//
// Pure aggregation: given inputs (from existing repositories) the calculator
// yields a ReadinessSummary. Fully unit-testable without DB / browser / FYV.
// The check imports the pure core by RELATIVE path (of-types has 0 runtime
// imports -> Node type-strips it), so it runs under `node ... .ts` and tsx.

import {
  calculateReadinessSummary,
  READINESS_SECTION_WEIGHT,
  type ReadinessInput,
  type FmfCreatorFyvRelationshipState
} from "../../../packages/of-types/src/index.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (ok) passed += 1;
  else { failed += 1; failures.push(name); }
}

function base(): ReadinessInput {
  return {
    creator: { id: "20fdee3c-6998-4e8a-8611-04ab88949301", betterfans_account_id: null, last_sync_at: null, active: true, onboarding_status: "draft" },
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

const MOONSIREN_FMF_ID = "20fdee3c-6998-4e8a-8611-04ab88949301";

function moonSirenExample(): ReadinessInput {
  // As specified in the FMF-2 brief: BetterFans Connected, Intel Imported,
  // FYV Access Invited, Opportunities Generated (3), Journeys None → 68% / In Progress.
  return {
    creator: {
      id: MOONSIREN_FMF_ID,
      betterfans_account_id: "517509783",
      last_sync_at: "2026-07-05T00:00:00.000Z",
      active: true,
      onboarding_status: "ready"
    },
    latestSuccessfulSyncAt: "2026-07-05T00:00:00.000Z",
    latestSnapshot: {
      id: "snap-1",
      source_package_reference: "fyv/moonsiren/intelligence-package/2026-07-05",
      imported_at: "2026-07-05T00:00:00.000Z",
      superseded_at: null
    },
    opportunities: [
      { confidence: 92, priority: 1 },
      { confidence: 84, priority: 2 },
      { confidence: 78, priority: 3 }
    ],
    fyvRelationship: {
      fyv_creator_id: "16bab1fb-e6f0-4e19-9b3b-000000000001",
      relationship_state: "invited",
      invited_at: "2026-07-13T00:00:00.000Z",
      accepted_at: null,
      activated_at: null
    },
    scriptCount: 0,
    activeScriptCount: 0,
    activeJourneyCount: 0,
    activeAutomationCount: 0
  };
}

async function main() {
  // ---- 1. All empty -> 0% / Not Ready -----------------------------------------
  {
    const r = calculateReadinessSummary(base());
    check("empty: score 0", r.readinessScore === 0);
    check("empty: badge Not Ready", r.readinessStatus === "Not Ready");
    check("empty: BetterFans Not Connected", r.betterfans.status === "Not Connected" && r.betterfans.score === 0);
    check("empty: Intelligence Not Started", r.intelligence.status === "Not Started" && r.intelligence.score === 0);
    check("empty: FYV Access Pending", r.fyvAccess.status === "Pending" && r.fyvAccess.score === 0);
    check("empty: Opportunities Not Generated", r.opportunities.status === "Not Generated" && r.opportunities.score === 0);
    check("empty: Journeys None", r.journeys.status === "None" && r.journeys.score === 0);
    check("empty: nextAction points to BetterFans", (r.nextAction ?? "").includes("BetterFans"));
  }

  // ---- 2. All complete -> 100% / Production Ready ------------------------------
  {
    const input = base();
    input.creator.betterfans_account_id = "acct-1";
    input.creator.last_sync_at = "2026-07-13T00:00:00.000Z";
    input.latestSuccessfulSyncAt = "2026-07-13T00:00:00.000Z";
    input.latestSnapshot = { id: "s1", source_package_reference: "fyv/x/1", imported_at: "2026-07-13T00:00:00.000Z", superseded_at: null };
    input.opportunities = [{ confidence: 90, priority: 1 }];
    input.fyvRelationship = { fyv_creator_id: "fyv-1", relationship_state: "active", invited_at: "a", accepted_at: "b", activated_at: "c" };
    input.scriptCount = 2; input.activeScriptCount = 1; input.activeJourneyCount = 1; input.activeAutomationCount = 1;
    const r = calculateReadinessSummary(input);
    check("all-full: score 100", r.readinessScore === 100);
    check("all-full: badge Production Ready", r.readinessStatus === "Production Ready");
    check("all-full: nextAction is null", r.nextAction === null);
    check("all-full: FYV Access Active", r.fyvAccess.status === "Active" && r.fyvAccess.score === 20);
    check("all-full: Journeys Running", r.journeys.status === "Running" && r.journeys.score === 20);
  }

  // ---- 3. MoonSiren example -> 68% / In Progress ------------------------------
  {
    const r = calculateReadinessSummary(moonSirenExample());
    check("moonsiren: score exactly 68", r.readinessScore === 68);
    check("moonsiren: badge In Progress", r.readinessStatus === "In Progress");
    check("moonsiren: BetterFans Connected 20", r.betterfans.status === "Connected" && r.betterfans.score === 20);
    check("moonsiren: Intelligence Imported 20", r.intelligence.status === "Imported" && r.intelligence.score === 20);
    check("moonsiren: FYV Access Invited 8", r.fyvAccess.status === "Invited" && r.fyvAccess.score === 8);
    check("moonsiren: can_resend_invite = true", r.fyvAccess.can_resend_invite === true);
    check("moonsiren: Opportunities Generated (3)", r.opportunities.status === "Generated" && r.opportunities.count === 3 && r.opportunities.score === 20);
    check("moonsiren: Opportunities highest_confidence 92", r.opportunities.highest_confidence === 92);
    check("moonsiren: Opportunities highest_priority 1 (lower = better)", r.opportunities.highest_priority === 1);
    check("moonsiren: Journeys None 0", r.journeys.status === "None" && r.journeys.score === 0);
    check("moonsiren: nextAction hints at acceptance/resend", (r.nextAction ?? "").toLowerCase().includes("accept") || (r.nextAction ?? "").toLowerCase().includes("resend"));
  }

  // ---- 4. Missing BetterFans, everything else present -------------------------
  {
    const input = base();
    input.latestSnapshot = { id: "s1", source_package_reference: "fyv/x/1", imported_at: "2026-07-13T00:00:00.000Z", superseded_at: null };
    input.opportunities = [{ confidence: 80, priority: 1 }];
    input.fyvRelationship = { fyv_creator_id: "fyv-1", relationship_state: "active", invited_at: "a", accepted_at: "b", activated_at: "c" };
    input.scriptCount = 1; input.activeScriptCount = 1;
    const r = calculateReadinessSummary(input);
    check("missing-bf: BetterFans 0", r.betterfans.score === 0);
    check("missing-bf: score 80", r.readinessScore === 80);
    check("missing-bf: badge Operational", r.readinessStatus === "Operational");
    check("missing-bf: nextAction hints at BetterFans", (r.nextAction ?? "").includes("BetterFans"));
  }

  // ---- 5. Missing intelligence, everything else present -----------------------
  {
    const input = base();
    input.creator.betterfans_account_id = "acct-1";
    input.creator.last_sync_at = "2026-07-13T00:00:00.000Z";
    input.opportunities = [{ confidence: 80, priority: 1 }];
    input.fyvRelationship = { fyv_creator_id: "fyv-1", relationship_state: "active", invited_at: "a", accepted_at: "b", activated_at: "c" };
    input.scriptCount = 1; input.activeScriptCount = 1;
    const r = calculateReadinessSummary(input);
    check("missing-intel: Intelligence 0", r.intelligence.score === 0);
    check("missing-intel: nextAction hints at Intelligence", (r.nextAction ?? "").toLowerCase().includes("intelligence"));
  }

  // ---- 6. Missing relationship (no row) ---------------------------------------
  {
    const input = base();
    input.creator.betterfans_account_id = "acct-1";
    input.creator.last_sync_at = "2026-07-13T00:00:00.000Z";
    input.latestSnapshot = { id: "s1", source_package_reference: "fyv/x/1", imported_at: "2026-07-13T00:00:00.000Z", superseded_at: null };
    input.opportunities = [{ confidence: 80, priority: 1 }];
    input.scriptCount = 1; input.activeScriptCount = 1;
    // fyvRelationship stays null
    const r = calculateReadinessSummary(input);
    check("missing-rel: FYV Access Pending 0", r.fyvAccess.status === "Pending" && r.fyvAccess.score === 0);
    check("missing-rel: can_resend_invite false", r.fyvAccess.can_resend_invite === false);
    check("missing-rel: nextAction hints at Invite", (r.nextAction ?? "").toLowerCase().includes("invite"));
  }

  // ---- 7. Out-of-order states (Pending / Invited / Accepted / Active) ---------
  for (const state of ["pending", "invited", "accepted", "active"] as FmfCreatorFyvRelationshipState[]) {
    const input = base();
    input.fyvRelationship = { fyv_creator_id: "f", relationship_state: state, invited_at: null, accepted_at: null, activated_at: null };
    const r = calculateReadinessSummary(input);
    const expected: Record<FmfCreatorFyvRelationshipState, number> = { pending: 0, invited: 8, accepted: 14, active: 20 };
    check(`fyvAccess score ${state}=${expected[state]}`, r.fyvAccess.score === expected[state]);
  }

  // ---- 8. Intelligence Out of Date ---------------------------------------------
  {
    const input = base();
    input.latestSnapshot = { id: "s1", source_package_reference: "fyv/x/1", imported_at: "2026-07-01T00:00:00.000Z", superseded_at: "2026-07-12T00:00:00.000Z" };
    const r = calculateReadinessSummary(input);
    check("intel out-of-date status", r.intelligence.status === "Out of Date");
    check("intel out-of-date partial score", r.intelligence.score === Math.round(READINESS_SECTION_WEIGHT * 0.5));
  }

  // ---- 9. BetterFans Sync Required (account, no sync) -------------------------
  {
    const input = base();
    input.creator.betterfans_account_id = "acct-1"; // no last_sync_at, no successful sync
    const r = calculateReadinessSummary(input);
    check("bf sync required", r.betterfans.status === "Sync Required");
    check("bf sync required score", r.betterfans.score === Math.round(READINESS_SECTION_WEIGHT * 0.5));
    check("bf sync required nextAction", (r.nextAction ?? "").toLowerCase().includes("sync"));
  }

  // ---- 10. Journeys Configured (scripts exist but not active) -----------------
  {
    const input = base();
    input.scriptCount = 2; input.activeScriptCount = 0;
    const r = calculateReadinessSummary(input);
    check("journeys configured", r.journeys.status === "Configured");
    check("journeys configured partial score", r.journeys.score === Math.round(READINESS_SECTION_WEIGHT * 0.6));
  }

  // ---- 11. Score clamps + badge thresholds ------------------------------------
  {
    const input = base();
    // Give 40 points (below 40 threshold + 40): BF Connected (20) + Intel Imported (20) = 40 exactly.
    input.creator.betterfans_account_id = "acct-1";
    input.creator.last_sync_at = "2026-07-13T00:00:00.000Z";
    input.latestSnapshot = { id: "s1", source_package_reference: "fyv/x/1", imported_at: "2026-07-13T00:00:00.000Z", superseded_at: null };
    const r = calculateReadinessSummary(input);
    check("threshold 40 -> In Progress", r.readinessScore === 40 && r.readinessStatus === "In Progress");
  }
  {
    const input = base();
    input.creator.betterfans_account_id = "acct-1";
    input.creator.last_sync_at = "2026-07-13T00:00:00.000Z";
    input.latestSnapshot = { id: "s1", source_package_reference: "fyv/x/1", imported_at: "2026-07-13T00:00:00.000Z", superseded_at: null };
    input.opportunities = [{ confidence: 90, priority: 1 }];
    input.fyvRelationship = { fyv_creator_id: "f", relationship_state: "active", invited_at: "a", accepted_at: "b", activated_at: "c" };
    // Only journeys missing → 80 exactly → Operational.
    const r = calculateReadinessSummary(input);
    check("threshold 80 -> Operational", r.readinessScore === 80 && r.readinessStatus === "Operational");
  }

  // ---- 12. Highest priority uses MIN (lower = higher priority per fixture) ----
  {
    const input = base();
    input.opportunities = [{ confidence: 55, priority: 5 }, { confidence: 90, priority: 2 }, { confidence: 60, priority: 8 }];
    const r = calculateReadinessSummary(input);
    check("opps: highest_priority = min(5,2,8)=2", r.opportunities.highest_priority === 2);
    check("opps: highest_confidence = max(55,90,60)=90", r.opportunities.highest_confidence === 90);
  }

  const total = passed + failed;
  if (failed > 0) {
    console.error(`\nFMF-2 readiness check FAILED: ${passed}/${total} passed`);
    for (const name of failures) console.error(`  - ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[fmf-2-readiness-check] ${passed}/${total} PASS`);
}

await main();
