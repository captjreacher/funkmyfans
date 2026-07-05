import "dotenv/config";

import type { CreatorIntelligenceWorkspaceData, CreatorPlaybookProposal, OfMessageScript } from "@funkmyfans/of-types";

const baseUrl = normalizeBaseUrl(process.env.COCKPIT_BASE_URL ?? process.argv[2] ?? "http://127.0.0.1:8787");

async function main() {
  const failures: string[] = [];
  console.log(`[cip-3-smoke] base ${baseUrl}`);

  // 1. Find a creator with intelligence
  const creators = await readJson<{ creators: Array<{ id: string; username: string; display_name: string | null }> }>("/api/creators", failures);
  if (!creators) return reportFailures(failures);

  const targetCreator =
    creators.creators.find((creator) => creator.username.toLowerCase().includes("moonsiren")) ??
    creators.creators[0] ??
    null;
  if (!targetCreator) {
    failures.push("No creator available for CIP-3 smoke run");
    return reportFailures(failures);
  }

  // 2. Import intelligence fixture if needed
  await postJson<CreatorIntelligenceWorkspaceData>(`/api/creators/${targetCreator.id}/intelligence/import-fixture`, failures);

  const workspace = await readJson<CreatorIntelligenceWorkspaceData>(`/api/creators/${targetCreator.id}/intelligence`, failures);
  if (!workspace) return reportFailures(failures);

  const opportunity = workspace.opportunities.find(
    (item) => item.source_opportunity_reference === "welcome_runway_new_subscriber" && item.projection_state === "available"
  );
  if (!opportunity) {
    failures.push("No available welcome opportunity found");
    return reportFailures(failures);
  }

  // 3. Create proposal and accept it
  const proposalResult = await postJson<{ proposal: CreatorPlaybookProposal }>(
    `/api/creators/${targetCreator.id}/intelligence/opportunities/${opportunity.id}/proposals`,
    failures
  );
  if (!proposalResult) return reportFailures(failures);

  const proposal = proposalResult.proposal;
  console.log(`[cip-3-smoke] proposal ${proposal.id} created, state=${proposal.proposal_state}`);

  if (proposal.proposal_state !== "draft") {
    failures.push("Created proposal was not in draft state");
  }

  // Accept the proposal
  const acceptedResult = await patchJson<{ proposal: CreatorPlaybookProposal }>(
    `/api/playbook-proposals/${proposal.id}`,
    { state: "accepted" },
    failures
  );
  if (!acceptedResult) return reportFailures(failures);

  if (acceptedResult.proposal.proposal_state !== "accepted") {
    failures.push("Proposal state did not change to accepted");
    return reportFailures(failures);
  }
  console.log(`[cip-3-smoke] proposal ${proposal.id} accepted`);

  // Record pre-draft state for side-effect checks
  const scriptsBefore = await readJson<{ scripts: OfMessageScript[] }>(`/api/creators/${targetCreator.id}/scripts`, failures);
  if (!scriptsBefore) return reportFailures(failures);

  // 4. Create builder draft from accepted proposal
  const firstDraft = await postJson<{ script: OfMessageScript }>(
    `/api/playbook-proposals/${proposal.id}/builder-draft`,
    failures
  );
  if (!firstDraft) return reportFailures(failures);

  const draft = firstDraft.script;
  console.log(`[cip-3-smoke] builder draft created: ${draft.id} name="${draft.name}"`);

  // 4a. Confirm draft is inactive
  if (draft.status !== "inactive") {
    failures.push(`Builder draft expected to be inactive, got status "${draft.status}"`);
  }

  // 4b. Confirm draft has proposal source metadata
  const builderConfig = draft.builder_config as Record<string, unknown> | null;
  if (!builderConfig || builderConfig.source_proposal_id !== proposal.id) {
    failures.push("Builder draft missing source_proposal_id in builder_config");
  }
  if (!builderConfig || builderConfig.cip_version !== "cip-3") {
    failures.push("Builder draft missing or incorrect cip_version in builder_config");
  }
  if (!builderConfig?.intelligence_snapshot_id) {
    failures.push("Builder draft missing intelligence_snapshot_id");
  }
  if (!builderConfig?.opportunity_projection_id) {
    failures.push("Builder draft missing opportunity_projection_id");
  }

  // 4c. Confirm auto_send is disabled
  if (draft.auto_send_enabled !== false) {
    failures.push("Builder draft expected auto_send_enabled=false");
  }

  // 4d. Confirm action_mode is not auto_send
  if (draft.action_mode === "auto_send") {
    failures.push("Builder draft should not be auto_send");
  }

  // 5. Re-run and confirm no duplicate
  const secondDraft = await postJson<{ script: OfMessageScript }>(
    `/api/playbook-proposals/${proposal.id}/builder-draft`,
    failures
  );
  if (!secondDraft) return reportFailures(failures);

  if (secondDraft.script.id !== draft.id) {
    failures.push(
      `Re-running builder draft creation returned a different script (${secondDraft.script.id}) instead of the original (${draft.id})`
    );
  }
  console.log(`[cip-3-smoke] idempotency confirmed: ${secondDraft.script.id} === ${draft.id}`);

  // 6. Confirm no automation/runtime side effects
  const scriptsAfter = await readJson<{ scripts: OfMessageScript[] }>(`/api/creators/${targetCreator.id}/scripts`, failures);
  if (!scriptsAfter) return reportFailures(failures);

  const scriptIdsBefore = new Set(scriptsBefore.scripts.map((s) => s.id));
  for (const script of scriptsAfter.scripts) {
    if (!scriptIdsBefore.has(script.id) && script.id !== draft.id) {
      failures.push(`Unexpected new script created: ${script.id} "${script.name}"`);
    }
  }

  // 7. Reject non-accepted proposal
  // Create a second proposal for another opportunity but don't accept it
  const otherOpportunity = workspace.opportunities.find(
    (item) => item.source_opportunity_reference !== "welcome_runway_new_subscriber" && item.projection_state === "available"
  );
  if (otherOpportunity) {
    const otherProposalResult = await postJson<{ proposal: CreatorPlaybookProposal }>(
      `/api/creators/${targetCreator.id}/intelligence/opportunities/${otherOpportunity.id}/proposals`,
      failures
    );
    if (otherProposalResult) {
      const otherProposal = otherProposalResult.proposal;
      // Try to create builder draft from a draft (non-accepted) proposal — should fail
      const rejectResponse = await fetch(
        new URL(`/api/playbook-proposals/${otherProposal.id}/builder-draft`, baseUrl),
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }
      );
      if (rejectResponse.status !== 422) {
        failures.push(`Expected 422 when creating builder draft from non-accepted proposal, got ${rejectResponse.status}`);
      }
      console.log(`[cip-3-smoke] non-accepted proposal correctly rejected with ${rejectResponse.status}`);
    }
  }

  // 8. Also test GET (not just POST) on the endpoint
  const getDraft = await readJson<{ script: OfMessageScript }>(
    `/api/playbook-proposals/${proposal.id}/builder-draft`,
    failures
  );
  if (!getDraft) return reportFailures(failures);
  if (getDraft.script.id !== draft.id) {
    failures.push("GET /builder-draft should return the same draft as POST");
  }
  console.log(`[cip-3-smoke] GET returns same draft ${getDraft.script.id}`);

  if (failures.length) return reportFailures(failures);

  console.log(`[cip-3-smoke] creator=${targetCreator.username} proposal=${proposal.id} draft=${draft.id}`);
  console.log("[cip-3-smoke] CIP-3 proposal-to-builder-draft passed");
}

// --- Utilities (mirror playbook-proposal-smoke.ts pattern) ---

async function readJson<T>(path: string, failures: string[]): Promise<T | null> {
  return requestJson<T>(path, { method: "GET" }, 200, failures);
}

async function postJson<T>(path: string, failures: string[]): Promise<T | null> {
  return requestJson<T>(path, { method: "POST" }, [200, 201], failures);
}

async function patchJson<T>(path: string, body: Record<string, unknown>, failures: string[]): Promise<T | null> {
  return requestJson<T>(
    path,
    { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
    200,
    failures
  );
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  expectedStatus: number | number[],
  failures: string[]
): Promise<T | null> {
  const response = await fetch(new URL(path, baseUrl), init);
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  if (!expected.includes(response.status)) {
    failures.push(`${path}: expected HTTP ${expected.join(" or ")}, got ${response.status} - ${trim(text)}`);
    return null;
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    failures.push(`${path}: expected JSON response, got ${contentType || "missing content-type"}`);
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    failures.push(`${path}: could not parse JSON response: ${error instanceof Error ? error.message : "invalid JSON"}`);
    return null;
  }
}

function reportFailures(failures: string[]) {
  console.error("\nCIP-3 smoke failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function trim(value: string, max = 240) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}...` : compact;
}

await main();
