import "dotenv/config";

import fixture from "../apps/creator-cockpit/fixtures/moonsiren-creator-intelligence-package-v1.json";
import type { CreatorIntelligenceWorkspaceData, OfCreator } from "@funkmyfans/of-types";

type JsonRecord = Record<string, unknown>;

const baseUrl = normalizeBaseUrl(process.env.COCKPIT_BASE_URL ?? process.argv[2] ?? "http://127.0.0.1:8787");

async function main() {
  const failures: string[] = [];

  console.log(`[intelligence-smoke] base ${baseUrl}`);

  const creators = await readJson<{ creators: OfCreator[] }>("/api/creators", failures);
  if (!creators) {
    reportFailures(failures);
    return;
  }

  const targetCreator =
    creators.creators.find((creator) => creator.username.toLowerCase().includes("moonsiren")) ??
    creators.creators.find((creator) => creator.display_name?.toLowerCase().includes("moonsiren")) ??
    creators.creators[0] ??
    null;

  if (!targetCreator) {
    failures.push("No creator was available to validate the intelligence projection");
    reportFailures(failures);
    return;
  }

  const playbooksBefore = await readJson<{ scripts: unknown[] }>(`/api/creators/${targetCreator.id}/scripts`, failures);
  const beforeWorkspace = await readJson<CreatorIntelligenceWorkspaceData>(`/api/creators/${targetCreator.id}/intelligence`, failures);
  if (!playbooksBefore || !beforeWorkspace) {
    reportFailures(failures);
    return;
  }

  const importedWorkspace = await postJson<CreatorIntelligenceWorkspaceData>(
    `/api/creators/${targetCreator.id}/intelligence/import-fixture`,
    failures
  );
  if (!importedWorkspace) {
    reportFailures(failures);
    return;
  }

  const reimportedWorkspace = await postJson<CreatorIntelligenceWorkspaceData>(
    `/api/creators/${targetCreator.id}/intelligence/import-fixture`,
    failures
  );
  if (!reimportedWorkspace) {
    reportFailures(failures);
    return;
  }

  const afterWorkspace = await readJson<CreatorIntelligenceWorkspaceData>(`/api/creators/${targetCreator.id}/intelligence`, failures);
  const playbooksAfter = await readJson<{ scripts: unknown[] }>(`/api/creators/${targetCreator.id}/scripts`, failures);

  if (!afterWorkspace || !playbooksAfter) {
    reportFailures(failures);
    return;
  }

  validateWorkspaceAgainstFixture(importedWorkspace, failures);
  validateWorkspaceAgainstFixture(afterWorkspace, failures);

  if (beforeWorkspace.snapshots.length > afterWorkspace.snapshots.length) {
    failures.push("Snapshot count went backwards after import");
  }

  if (playbooksBefore.scripts.length !== playbooksAfter.scripts.length) {
    failures.push("Importing intelligence triggered a playbook change");
  }

  if (importedWorkspace.latest_snapshot?.id !== reimportedWorkspace.latest_snapshot?.id) {
    failures.push("Re-importing the same fixture should reuse the same immutable snapshot");
  }

  const latestSnapshot = afterWorkspace.latest_snapshot;
  if (!latestSnapshot) {
    failures.push("Latest snapshot was not returned after import");
  } else {
    if (latestSnapshot.package_payload.package_state !== fixture.package_state) {
      failures.push("Imported snapshot package state did not match the fixture");
    }
    for (const expectedOpportunity of fixture.available_opportunities) {
      const actualOpportunity = latestSnapshot.package_payload.available_opportunities.find(
        (opportunity) => opportunity.source_opportunity_reference === expectedOpportunity.source_opportunity_reference
      );
      if (!actualOpportunity) {
        failures.push(`Imported package payload lost opportunity ${expectedOpportunity.source_opportunity_reference}`);
        continue;
      }
      if (actualOpportunity.title !== expectedOpportunity.title) failures.push(`Opportunity title mismatch for ${expectedOpportunity.source_opportunity_reference}`);
      if (actualOpportunity.priority !== expectedOpportunity.priority) failures.push(`Opportunity priority mismatch for ${expectedOpportunity.source_opportunity_reference}`);
      if (actualOpportunity.confidence !== expectedOpportunity.confidence) failures.push(`Opportunity confidence mismatch for ${expectedOpportunity.source_opportunity_reference}`);
    }
  }

  const allowedProjectionStates = new Set(["available", "accepted", "dismissed"]);
  const forbiddenStates = new Set(["active", "generated", "playbook"]);
  for (const opportunity of afterWorkspace.opportunities) {
    if (!allowedProjectionStates.has(opportunity.projection_state)) {
      failures.push(`Unexpected FMF projection state: ${opportunity.projection_state}`);
    }
    if (forbiddenStates.has(opportunity.projection_state)) {
      failures.push(`FYV state leaked into FMF projection state: ${opportunity.projection_state}`);
    }
    if (opportunity.intelligence_snapshot_id !== afterWorkspace.latest_snapshot?.id) {
      failures.push("Projected opportunity does not reference the imported snapshot");
    }
  }

  const expectedOpportunityRefs = new Set(fixture.available_opportunities.map((opportunity) => opportunity.source_opportunity_reference));
  const actualOpportunityRefs = new Set(afterWorkspace.opportunities.map((opportunity) => opportunity.source_opportunity_reference));
  if (expectedOpportunityRefs.size !== actualOpportunityRefs.size) {
    failures.push(`Expected ${expectedOpportunityRefs.size} projected opportunities, got ${actualOpportunityRefs.size}`);
  }
  for (const reference of expectedOpportunityRefs) {
    if (!actualOpportunityRefs.has(reference)) {
      failures.push(`Missing projected opportunity reference ${reference}`);
    }
  }

  if (failures.length) {
    reportFailures(failures);
    return;
  }

  console.log(`[intelligence-smoke] creator=${targetCreator.username} snapshots=${afterWorkspace.snapshots.length} opportunities=${afterWorkspace.opportunities.length}`);
  console.log("[intelligence-smoke] creator intelligence projection passed");
}

async function readJson<T>(path: string, failures: string[]): Promise<T | null> {
  const response = await fetch(new URL(path, baseUrl));
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    failures.push(`${path}: expected HTTP 200, got ${response.status} - ${trim(text)}`);
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

async function postJson<T>(path: string, failures: string[]): Promise<T | null> {
  const response = await fetch(new URL(path, baseUrl), { method: "POST" });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    failures.push(`${path}: expected HTTP 200, got ${response.status} - ${trim(text)}`);
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

function validateWorkspaceAgainstFixture(workspace: CreatorIntelligenceWorkspaceData, failures: string[]) {
  if (!workspace.summary) {
    failures.push("Creator intelligence summary was missing");
    return;
  }

  if (workspace.summary.source_product !== fixture.source_product) failures.push("Summary source_product did not match fixture");
  if (workspace.summary.contract_version !== fixture.contract_version) failures.push("Summary contract_version did not match fixture");
  if (workspace.summary.intelligence_version !== fixture.intelligence_version) failures.push("Summary intelligence_version did not match fixture");
  if (workspace.summary.source_package_reference !== fixture.source_package_reference) failures.push("Summary source_package_reference did not match fixture");
  if (workspace.summary.source_assessment_reference !== fixture.source_assessment_reference) failures.push("Summary source_assessment_reference did not match fixture");
  if (workspace.summary.package_state !== fixture.package_state) failures.push("Summary package_state did not match fixture");
  if (workspace.summary.primary_vertical !== fixture.primary_vertical) failures.push("Summary primary_vertical did not match fixture");
  if (workspace.summary.archetype_journey !== fixture.archetype_journey) failures.push("Summary archetype_journey did not match fixture");
  if (workspace.summary.derived_scenario !== fixture.derived_scenario) failures.push("Summary derived_scenario did not match fixture");
  if (workspace.summary.intelligence_summary !== fixture.intelligence_summary) failures.push("Summary intelligence_summary did not match fixture");

  if (!workspace.latest_snapshot) {
    failures.push("Latest snapshot missing from workspace");
    return;
  }

  if (workspace.latest_snapshot.source_package_reference !== fixture.source_package_reference) {
    failures.push("Latest snapshot source_package_reference did not match fixture");
  }

  if (workspace.latest_snapshot.package_payload.package_state !== fixture.package_state) {
    failures.push("Latest snapshot package state did not match fixture");
  }
}

function reportFailures(failures: string[]) {
  console.error("\nCreator intelligence smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
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
