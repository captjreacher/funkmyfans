import "dotenv/config";

import type { CreatorIntelligenceWorkspaceData, CreatorPlaybookProposal, OfAutomationRun, OfCreator, OfCreatorAutomationScenario, OfMessageScript } from "@funkmyfans/of-types";

const baseUrl = normalizeBaseUrl(process.env.COCKPIT_BASE_URL ?? process.argv[2] ?? "http://127.0.0.1:8787");

async function main() {
  const failures: string[] = [];
  console.log(`[proposal-smoke] base ${baseUrl}`);

  const creators = await readJson<{ creators: OfCreator[] }>("/api/creators", failures);
  if (!creators) return reportFailures(failures);

  const targetCreator =
    creators.creators.find((creator) => creator.username.toLowerCase().includes("moonsiren")) ??
    creators.creators.find((creator) => creator.display_name?.toLowerCase().includes("moonsiren")) ??
    creators.creators[0] ??
    null;

  if (!targetCreator) {
    failures.push("No creator was available to validate playbook proposal drafting");
    return reportFailures(failures);
  }

  const scriptsBefore = await readJson<{ scripts: OfMessageScript[] }>(`/api/creators/${targetCreator.id}/scripts`, failures);
  const automationBefore = await readJson<{ rules: unknown[] }>(`/api/automation/workspace`, failures);
  const runsBefore = await readJson<{ runs: OfAutomationRun[] }>(`/api/creators/${targetCreator.id}/automation-runs`, failures);
  const scenariosBefore = await readJson<{ scenarios: OfCreatorAutomationScenario[] }>(`/api/creators/${targetCreator.id}/automation-scenarios`, failures);
  if (!scriptsBefore || !automationBefore || !runsBefore || !scenariosBefore) return reportFailures(failures);

  await postJson<CreatorIntelligenceWorkspaceData>(`/api/creators/${targetCreator.id}/intelligence/import-fixture`, failures);
  const workspace = await readJson<CreatorIntelligenceWorkspaceData>(`/api/creators/${targetCreator.id}/intelligence`, failures);
  if (!workspace) return reportFailures(failures);

  const opportunity = workspace.opportunities.find((item) => item.source_opportunity_reference === "welcome_runway_new_subscriber" && item.projection_state === "available");
  if (!opportunity) {
    failures.push("No available MoonSiren welcome opportunity was found");
    return reportFailures(failures);
  }

  const beforeProposals = await readJson<{ proposals: CreatorPlaybookProposal[] }>(`/api/creators/${targetCreator.id}/playbook-proposals`, failures);
  if (!beforeProposals) return reportFailures(failures);
  const beforeDrafts = draftCount(beforeProposals.proposals, opportunity.id);

  const firstCreate = await postJson<{ proposal: CreatorPlaybookProposal }>(
    `/api/creators/${targetCreator.id}/intelligence/opportunities/${opportunity.id}/proposals`,
    failures
  );
  const secondCreate = await postJson<{ proposal: CreatorPlaybookProposal }>(
    `/api/creators/${targetCreator.id}/intelligence/opportunities/${opportunity.id}/proposals`,
    failures
  );
  if (!firstCreate || !secondCreate) return reportFailures(failures);

  if (firstCreate.proposal.id !== secondCreate.proposal.id) {
    failures.push("Re-running proposal creation created a duplicate draft instead of returning the existing draft");
  }
  if (firstCreate.proposal.proposal_state !== "draft") failures.push("Created proposal was not in draft state");
  if (firstCreate.proposal.proposal_title !== "New Subscriber Welcome") failures.push("Proposal title was not deterministic");
  if (firstCreate.proposal.proposal_payload.creator_voice_notes.join(" ").toLowerCase().includes("girl-next-door") === false) {
    failures.push("Proposal payload did not include girl-next-door creator voice notes");
  }
  if (firstCreate.proposal.proposal_payload.steps.length < 3 || firstCreate.proposal.proposal_payload.steps.length > 4) {
    failures.push(`Expected proposal payload to have 3-4 steps, got ${firstCreate.proposal.proposal_payload.steps.length}`);
  }
  if (!firstCreate.proposal.proposal_payload.forks.length) failures.push("Proposal payload did not include forks");
  if (!firstCreate.proposal.proposal_payload.endpoints.length) failures.push("Proposal payload did not include endpoints");

  const afterCreateProposals = await readJson<{ proposals: CreatorPlaybookProposal[] }>(`/api/creators/${targetCreator.id}/playbook-proposals`, failures);
  if (!afterCreateProposals) return reportFailures(failures);
  const afterDrafts = draftCount(afterCreateProposals.proposals, opportunity.id);
  if (afterDrafts !== Math.max(1, beforeDrafts)) {
    failures.push(`Expected exactly one draft proposal for the selected opportunity, got ${afterDrafts}`);
  }

  const accepted = await patchJson<{ proposal: CreatorPlaybookProposal }>(`/api/playbook-proposals/${firstCreate.proposal.id}`, { state: "accepted" }, failures);
  if (!accepted) return reportFailures(failures);
  if (accepted.proposal.proposal_state !== "accepted") failures.push("Proposal state did not change to accepted");

  const scriptsAfter = await readJson<{ scripts: OfMessageScript[] }>(`/api/creators/${targetCreator.id}/scripts`, failures);
  const automationAfter = await readJson<{ rules: unknown[] }>(`/api/automation/workspace`, failures);
  const runsAfter = await readJson<{ runs: OfAutomationRun[] }>(`/api/creators/${targetCreator.id}/automation-runs`, failures);
  const scenariosAfter = await readJson<{ scenarios: OfCreatorAutomationScenario[] }>(`/api/creators/${targetCreator.id}/automation-scenarios`, failures);
  if (!scriptsAfter || !automationAfter || !runsAfter || !scenariosAfter) return reportFailures(failures);

  if (scriptsAfter.scripts.length !== scriptsBefore.scripts.length) failures.push("Proposal drafting or acceptance changed script/playbook row count");
  if (automationAfter.rules.length !== automationBefore.rules.length) failures.push("Proposal drafting or acceptance changed automation rule count");
  if (runsAfter.runs.length !== runsBefore.runs.length) failures.push("Proposal drafting or acceptance changed automation run count");
  if (scenariosAfter.scenarios.length !== scenariosBefore.scenarios.length) failures.push("Proposal drafting or acceptance changed automation scenario count");

  if (failures.length) return reportFailures(failures);

  console.log(`[proposal-smoke] creator=${targetCreator.username} opportunity=${opportunity.id} proposal=${accepted.proposal.id}`);
  console.log("[proposal-smoke] playbook proposal drafting passed");
}

function draftCount(proposals: CreatorPlaybookProposal[], opportunityId: string) {
  return proposals.filter((proposal) => proposal.creator_intelligence_opportunity_projection_id === opportunityId && proposal.proposal_state === "draft").length;
}

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

async function requestJson<T>(path: string, init: RequestInit, expectedStatus: number | number[], failures: string[]): Promise<T | null> {
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
  console.error("\nPlaybook proposal smoke failed:");
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
