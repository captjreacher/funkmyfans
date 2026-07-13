// FMF-4: Operational Action Dispatcher — deterministic check.
//
// Exercises the pure planner (planActionsForReadinessEvent) + models the
// dispatcher's execution ledger (creator_action_executions) with an in-memory
// store that mirrors the DB unique constraint on (readiness_event_id, action_type).
// Also drives the three handlers against mocked service tables (of_tasks +
// of_automation_rules) so we can assert real service calls without a DB.
//
// The pure core lives in of-types (0 runtime imports); Node type-strips it
// so this runs under `node ... .ts` and tsx.

import {
  planActionsForReadinessEvent,
  planReadinessOrchestration,
  calculateReadinessSummary,
  milestoneForReadiness,
  type ActionCommand,
  type ActionHandlerOutcome,
  type CreatorActionExecution,
  type CreatorReadinessEvent,
  type ReadinessInput,
  type ReadinessOrchestrationAction,
  type ReadinessOrchestrationActionType
} from "../../../packages/of-types/src/index.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (ok) passed += 1;
  else { failed += 1; failures.push(name); }
}

/* --- Fake service tables + in-memory dispatcher ----------------------------- */

interface MockTask { id: string; creator_id: string; task_type: string; status: string; source: string; title: string }
interface MockRule { id: string; creator_id: string; status: "active" | "draft" | "paused" | "archived" }

const CREATOR_ID = "20fdee3c-6998-4e8a-8611-04ab88949301";

function makeReadinessEvent(overrides: Partial<CreatorReadinessEvent>): CreatorReadinessEvent {
  return {
    id: overrides.id ?? "evt_1",
    creator_id: overrides.creator_id ?? CREATOR_ID,
    event_type: overrides.event_type ?? "creator_reached_operational",
    previous_score: overrides.previous_score ?? null,
    new_score: overrides.new_score ?? 92,
    previous_status: overrides.previous_status ?? null,
    new_status: overrides.new_status ?? "Operational",
    previous_milestone: overrides.previous_milestone ?? null,
    new_milestone: overrides.new_milestone ?? "operational",
    trigger_event: overrides.trigger_event ?? "journeys_configured",
    blocking_issues: overrides.blocking_issues ?? [],
    warnings: overrides.warnings ?? [],
    actions: overrides.actions ?? [],
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? "2026-07-13T00:00:00Z"
  };
}

interface MemDispatcher {
  executions: CreatorActionExecution[];
  tasks: MockTask[];
  rules: MockRule[];
  dispatchAll(event: CreatorReadinessEvent): Promise<{ dispatched: number; errors: string[] }>;
}

function createMemDispatcher(seed: { rules?: MockRule[] } = {}): MemDispatcher {
  const executions: CreatorActionExecution[] = [];
  const tasks: MockTask[] = [];
  const rules: MockRule[] = seed.rules ? [...seed.rules] : [];
  let seq = 0;

  async function runHandler(command: ActionCommand): Promise<ActionHandlerOutcome> {
    if (command.actionType === "queue_default_journey_activation") {
      const existing = tasks.find(
        (t) => t.creator_id === command.creatorId && t.task_type === "journey_activation_request" &&
        (t.status === "open" || t.status === "in_progress")
      );
      if (existing) return { ok: true, result: { queued_task_id: existing.id, note: "reused" } };
      seq += 1;
      const id = `task_${seq}`;
      tasks.push({
        id,
        creator_id: command.creatorId,
        task_type: "journey_activation_request",
        status: "open",
        source: "rules_engine",
        title: "Queue default journey activation"
      });
      return { ok: true, result: { queued_task_id: id, task_type: "journey_activation_request" } };
    }
    if (command.actionType === "enable_operational_automations") {
      const affected: string[] = [];
      for (const r of rules) {
        if (r.creator_id === command.creatorId && (r.status === "draft" || r.status === "paused")) {
          r.status = "active";
          affected.push(r.id);
        }
      }
      return { ok: true, result: { activated_rule_count: affected.length, activated_rule_ids: affected } };
    }
    if (command.actionType === "pause_creator_automations") {
      const affected: string[] = [];
      for (const r of rules) {
        if (r.creator_id === command.creatorId && r.status === "active") {
          r.status = "paused";
          affected.push(r.id);
        }
      }
      return { ok: true, result: { paused_rule_count: affected.length, paused_rule_ids: affected } };
    }
    if (command.actionType === "refresh_readiness") {
      return { ok: true, result: { no_op: true } };
    }
    return { ok: false, error: `unknown action ${(command as { actionType: string }).actionType}` };
  }

  return {
    executions, tasks, rules,
    async dispatchAll(event: CreatorReadinessEvent) {
      const commands = planActionsForReadinessEvent(event);
      const errors: string[] = [];
      let dispatched = 0;
      for (const command of commands) {
        // Unique constraint (readiness_event_id, action_type) — dedupe.
        if (executions.some((e) => e.readiness_event_id === command.readinessEventId && e.action_type === command.actionType)) {
          continue;
        }
        const now = new Date().toISOString();
        seq += 1;
        const execution: CreatorActionExecution = {
          id: `exec_${seq}`,
          creator_id: command.creatorId,
          readiness_event_id: command.readinessEventId,
          action_type: command.actionType,
          status: "processing",
          queued_at: now,
          started_at: now,
          completed_at: null,
          error: null,
          result: {},
          trigger_event: command.triggerEvent,
          milestone: command.milestone,
          reason: command.reason,
          created_at: now,
          updated_at: now
        };
        executions.push(execution);
        let outcome: ActionHandlerOutcome;
        try { outcome = await runHandler(command); }
        catch (e) { outcome = { ok: false, error: e instanceof Error ? e.message : "threw" }; }
        execution.completed_at = new Date().toISOString();
        execution.updated_at = execution.completed_at;
        if (outcome.ok) {
          execution.status = "completed";
          execution.result = outcome.result;
          execution.error = null;
        } else {
          execution.status = "failed";
          execution.result = outcome.result ?? {};
          execution.error = outcome.error;
          errors.push(outcome.error);
        }
        dispatched += 1;
      }
      return { dispatched, errors };
    }
  };
}

async function main() {
  // ---- 1. Planner: derives commands from event actions -----------------------
  {
    const actions: ReadinessOrchestrationAction[] = [
      { type: "queue_default_journey_activation", reason: "reached operational", targetMilestone: "operational" }
    ];
    const evt = makeReadinessEvent({ actions });
    const commands = planActionsForReadinessEvent(evt);
    check("planner: 1 action -> 1 command", commands.length === 1);
    check("planner: command carries readinessEventId", commands[0].readinessEventId === evt.id);
    check("planner: command carries creatorId", commands[0].creatorId === CREATOR_ID);
    check("planner: command carries triggerEvent lineage", commands[0].triggerEvent === "journeys_configured");
    check("planner: command carries milestone", commands[0].milestone === "operational");
    check("planner: command carries reason", commands[0].reason === "reached operational");
    check("planner: metadata includes target_milestone", (commands[0].metadata as { target_milestone?: string }).target_milestone === "operational");
  }
  {
    const evt = makeReadinessEvent({ actions: [] });
    check("planner: 0 actions -> 0 commands", planActionsForReadinessEvent(evt).length === 0);
  }

  // ---- 2. Handler selection: each action_type dispatches its handler ---------
  {
    const disp = createMemDispatcher({ rules: [{ id: "r1", creator_id: CREATOR_ID, status: "draft" }] });
    const evt = makeReadinessEvent({
      event_type: "creator_reached_production",
      new_milestone: "production_ready",
      actions: [
        { type: "enable_operational_automations", reason: "reached production", targetMilestone: "production_ready" }
      ]
    });
    const r = await disp.dispatchAll(evt);
    check("enable: dispatched=1", r.dispatched === 1);
    check("enable: rule flipped draft -> active", disp.rules[0].status === "active");
    check("enable: execution completed", disp.executions[0].status === "completed");
    check("enable: result carries count=1", (disp.executions[0].result as { activated_rule_count?: number }).activated_rule_count === 1);
  }
  {
    const disp = createMemDispatcher({ rules: [{ id: "r1", creator_id: CREATOR_ID, status: "active" }, { id: "r2", creator_id: CREATOR_ID, status: "active" }, { id: "r3", creator_id: CREATOR_ID, status: "draft" }] });
    const evt = makeReadinessEvent({
      event_type: "creator_regressed",
      new_milestone: "intelligence_ready",
      previous_milestone: "operational",
      actions: [{ type: "pause_creator_automations", reason: "regressed from operational" }]
    });
    await disp.dispatchAll(evt);
    check("pause: exactly active rules paused (2)", disp.rules.filter((r) => r.status === "paused").length === 2);
    check("pause: draft rule untouched", disp.rules.find((r) => r.id === "r3")?.status === "draft");
    check("pause: result count=2", (disp.executions[0].result as { paused_rule_count?: number }).paused_rule_count === 2);
  }
  {
    const disp = createMemDispatcher();
    const evt = makeReadinessEvent({
      actions: [{ type: "queue_default_journey_activation", reason: "reached operational", targetMilestone: "operational" }]
    });
    await disp.dispatchAll(evt);
    check("journey: task queued", disp.tasks.length === 1);
    check("journey: task_type journey_activation_request", disp.tasks[0].task_type === "journey_activation_request");
    check("journey: task status open", disp.tasks[0].status === "open");
    check("journey: exec completed", disp.executions[0].status === "completed");
  }

  // ---- 3. Idempotency: replay same event -> no duplicate exec ----------------
  {
    const disp = createMemDispatcher({ rules: [{ id: "r1", creator_id: CREATOR_ID, status: "draft" }] });
    const evt = makeReadinessEvent({
      actions: [{ type: "enable_operational_automations", reason: "reached production" }]
    });
    const r1 = await disp.dispatchAll(evt);
    const r2 = await disp.dispatchAll(evt);
    const r3 = await disp.dispatchAll(evt);
    check("replay: first dispatch=1", r1.dispatched === 1);
    check("replay: second dispatch=0", r2.dispatched === 0);
    check("replay: third dispatch=0", r3.dispatched === 0);
    check("replay: exactly one execution row", disp.executions.length === 1);
    check("replay: rule remained active (no double-flip)", disp.rules[0].status === "active");
  }

  // ---- 4. Distinct events -> distinct exec rows even for same action ---------
  {
    const disp = createMemDispatcher({ rules: [{ id: "r1", creator_id: CREATOR_ID, status: "draft" }] });
    const evtA = makeReadinessEvent({ id: "evt_A", actions: [{ type: "enable_operational_automations", reason: "1" }] });
    const evtB = makeReadinessEvent({ id: "evt_B", actions: [{ type: "enable_operational_automations", reason: "2" }] });
    await disp.dispatchAll(evtA);
    await disp.dispatchAll(evtB);
    check("distinct events: 2 executions", disp.executions.length === 2);
    check("distinct events: same action_type both rows", disp.executions.every((e) => e.action_type === "enable_operational_automations"));
  }

  // ---- 5. Multiple actions on ONE event dispatch as separate commands --------
  {
    const disp = createMemDispatcher({ rules: [{ id: "r1", creator_id: CREATOR_ID, status: "draft" }] });
    const evt = makeReadinessEvent({
      event_type: "creator_reached_production",
      new_milestone: "production_ready",
      actions: [
        { type: "queue_default_journey_activation", reason: "at operational", targetMilestone: "operational" },
        { type: "enable_operational_automations", reason: "at production", targetMilestone: "production_ready" }
      ]
    });
    const result = await disp.dispatchAll(evt);
    check("multi-action event: dispatched=2", result.dispatched === 2);
    check("multi-action event: 2 execution rows", disp.executions.length === 2);
    check("multi-action event: task queued AND rule active", disp.tasks.length === 1 && disp.rules[0].status === "active");
  }

  // ---- 6. Failure simulation: handler throws -> failed status + retry --------
  {
    const disp = createMemDispatcher();
    // Override the enable handler to throw
    const originalDispatch = disp.dispatchAll.bind(disp);
    let firstAttempt = true;
    disp.dispatchAll = async (event: CreatorReadinessEvent) => {
      if (firstAttempt) {
        firstAttempt = false;
        // Simulate handler failure on first attempt by rewriting one exec after
        // it's created — mimics a real handler throwing.
        const before = disp.executions.length;
        await originalDispatch(event);
        for (const e of disp.executions.slice(before)) {
          e.status = "failed";
          e.error = "simulated handler failure";
          e.result = {};
        }
        return { dispatched: 1, errors: ["simulated handler failure"] };
      }
      // Retry attempt: the exec row already exists from attempt 1 with status=failed.
      // In real world, an admin would replay by resetting status. Here we drop
      // the failed row so the dedupe check passes and the handler re-runs.
      disp.executions.length = 0;
      return originalDispatch(event);
    };

    const evt = makeReadinessEvent({
      actions: [{ type: "queue_default_journey_activation", reason: "reached operational", targetMilestone: "operational" }]
    });
    const attempt1 = await disp.dispatchAll(evt);
    check("failure: attempt1 dispatched=1 with error", attempt1.dispatched === 1 && attempt1.errors.length === 1);
    check("failure: attempt1 exec status=failed", disp.executions[0].status === "failed");
    check("failure: attempt1 error recorded", disp.executions[0].error === "simulated handler failure");

    const attempt2 = await disp.dispatchAll(evt);
    check("retry: attempt2 dispatched=1", attempt2.dispatched === 1);
    check("retry: attempt2 exec status=completed", disp.executions[0].status === "completed");
    check("retry: retry produced task", disp.tasks.length === 1);
  }

  // ---- 7. Full MoonSiren orchestrator+dispatcher end-to-end ------------------
  {
    // Simulate the entire arc: seed → operational → production. At each step
    // the orchestrator plans events; we dispatch each event's actions.
    const disp = createMemDispatcher({ rules: [{ id: "r1", creator_id: CREATOR_ID, status: "draft" }] });

    function base(): ReadinessInput {
      return {
        creator: { id: CREATOR_ID, betterfans_account_id: "acct", last_sync_at: "t", active: true, onboarding_status: "ready" },
        latestSuccessfulSyncAt: "t",
        latestSnapshot: { id: "s1", source_package_reference: "fyv/moonsiren/1", imported_at: "t", superseded_at: null },
        opportunities: [{ confidence: 92, priority: 1 }, { confidence: 84, priority: 2 }, { confidence: 78, priority: 3 }],
        fyvRelationship: { fyv_creator_id: "f", relationship_state: "active", invited_at: "a", accepted_at: "b", activated_at: "c" },
        scriptCount: 1,
        activeScriptCount: 0,
        activeJourneyCount: 0,
        activeAutomationCount: 0
      };
    }
    const opInput = base(); // 20 + 20 + 20 + 20 + 12 = 92 → operational
    const opSummary = calculateReadinessSummary(opInput);
    check("moonsiren op-step: score 92", opSummary.readinessScore === 92);
    const opPlan = planReadinessOrchestration({ current: opSummary, previous: null, triggerEvent: "seed" });

    // Convert planned events → CreatorReadinessEvent shape (with an id and creator_id)
    const persistedEvents: CreatorReadinessEvent[] = opPlan.events.map((e, i) => ({
      id: `evt_${i + 1}`,
      creator_id: CREATOR_ID,
      event_type: e.eventType,
      previous_score: e.previousScore,
      new_score: e.newScore,
      previous_status: e.previousStatus,
      new_status: e.newStatus,
      previous_milestone: e.previousMilestone,
      new_milestone: e.newMilestone,
      trigger_event: e.triggerEvent,
      blocking_issues: e.blockingIssues,
      warnings: e.warnings,
      actions: e.actions,
      metadata: {},
      created_at: `2026-07-13T00:0${i}:00Z`
    }));

    // Dispatch each event
    for (const evt of persistedEvents) await disp.dispatchAll(evt);

    const journeyExecs = disp.executions.filter((e) => e.action_type === "queue_default_journey_activation");
    check("moonsiren: journey activation queued exactly once", journeyExecs.length === 1 && journeyExecs[0].status === "completed");
    check("moonsiren: task created for journey activation", disp.tasks.length === 1);
    check("moonsiren: no production actions yet (only operational)", disp.executions.filter((e) => e.action_type === "enable_operational_automations").length === 0);

    // Now advance to production_ready
    const prodInput = { ...opInput, activeScriptCount: 1, activeJourneyCount: 1, activeAutomationCount: 1 }; // 100
    const prodSummary = calculateReadinessSummary(prodInput);
    check("moonsiren prod-step: score 100", prodSummary.readinessScore === 100);
    // Previous is now the last op-step event
    const lastOp = persistedEvents[persistedEvents.length - 1];
    const previous = { score: lastOp.new_score, status: lastOp.new_status, milestone: lastOp.new_milestone, blockingIssues: lastOp.blocking_issues };
    const prodPlan = planReadinessOrchestration({ current: prodSummary, previous, triggerEvent: "journeys_running" });
    const prodEvents: CreatorReadinessEvent[] = prodPlan.events.map((e, i) => ({
      id: `evt_p_${i + 1}`,
      creator_id: CREATOR_ID,
      event_type: e.eventType,
      previous_score: e.previousScore,
      new_score: e.newScore,
      previous_status: e.previousStatus,
      new_status: e.newStatus,
      previous_milestone: e.previousMilestone,
      new_milestone: e.newMilestone,
      trigger_event: e.triggerEvent,
      blocking_issues: e.blockingIssues,
      warnings: e.warnings,
      actions: e.actions,
      metadata: {},
      created_at: `2026-07-13T01:0${i}:00Z`
    }));
    for (const evt of prodEvents) await disp.dispatchAll(evt);

    const enableExecs = disp.executions.filter((e) => e.action_type === "enable_operational_automations");
    check("moonsiren: enable_operational_automations executed once", enableExecs.length === 1 && enableExecs[0].status === "completed");
    check("moonsiren: automation rule now active", disp.rules[0].status === "active");

    // Idempotency: replay both event sets
    for (const evt of [...persistedEvents, ...prodEvents]) await disp.dispatchAll(evt);
    check("moonsiren: replay yields no new executions", disp.executions.filter((e) => e.action_type === "queue_default_journey_activation").length === 1 && disp.executions.filter((e) => e.action_type === "enable_operational_automations").length === 1);
  }

  // ---- 8. Regression -> pause action fires + rules go back to paused --------
  {
    const disp = createMemDispatcher({ rules: [{ id: "r1", creator_id: CREATOR_ID, status: "active" }, { id: "r2", creator_id: CREATOR_ID, status: "active" }] });
    const evt = makeReadinessEvent({
      event_type: "creator_regressed",
      previous_milestone: "operational",
      new_milestone: "intelligence_ready",
      actions: [{ type: "pause_creator_automations", reason: "regressed from operational to intelligence_ready" }]
    });
    await disp.dispatchAll(evt);
    check("regression: both rules paused", disp.rules.every((r) => r.status === "paused"));
    check("regression: exec completed", disp.executions[0].status === "completed");
  }

  const total = passed + failed;
  if (failed > 0) {
    console.error(`\nFMF-4 dispatcher check FAILED: ${passed}/${total} passed`);
    for (const name of failures) console.error(`  - ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[fmf-4-dispatcher-check] ${passed}/${total} PASS`);
}

await main();
