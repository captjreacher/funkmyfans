// NODE-1E deterministic contract check.
//
// Exercises deriveJourneyNodeCapability against the canonical Emma journey and a
// few edge cases. It proves the capability contract semantics and, critically,
// that readiness is evidence-based (referenced-script existence only) and
// degrades gracefully. Pure logic — no browser, no backend.
//
// Run:  npx tsx apps/creator-cockpit/scripts/node1e-contract-check.ts

import { EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE, type JourneyNode } from "@funkmyfans/of-types";
import { deriveJourneyNodeCapability } from "../src/lib/journeyContracts";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> got: ${detail}` : ""}`);
}

const nodes = EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE.graph.nodes;
const byId = (id: string): JourneyNode => {
  const node = nodes.find((item) => item.id === id);
  if (!node) throw new Error(`Emma example is missing node ${id}`);
  return node;
};
const onlyfans = byId("node-onlyfans-channel");
const chat = byId("node-new-subscriber-chat");
const human = byId("node-human-handoff");

const refScriptId = chat.nodeFlowRef?.kind === "script" ? chat.nodeFlowRef.scriptId : "";
const evidencePresent = {
  scriptExists: (id: string) => id === refScriptId,
  sourceChannelLabel: "OnlyFans · Emma on OnlyFans"
};

console.log("— Case 1: referenced node flow EXISTS (the live Emma case) —");
const of = deriveJourneyNodeCapability(onlyfans, evidencePresent);
check("OnlyFans capabilityType = Channel / source entry point", of.capabilityType === "Channel / source entry point", of.capabilityType);
check("OnlyFans needs no node flow", of.hasNodeFlow === false);
check("OnlyFans source shows OnlyFans", (of.source ?? "").includes("OnlyFans"), of.source);
check("OnlyFans entry mentions the detected signal", of.entrySummary.includes("New subscriber"), of.entrySummary);
check("OnlyFans readiness = ready (configured, no flow needed)", of.readiness === "ready", of.readiness);
check("OnlyFans owner = channel", of.owner === "channel", of.owner);

const c = deriveJourneyNodeCapability(chat, evidencePresent);
check("Chat capabilityType = Automated conversation", c.capabilityType === "Automated conversation", c.capabilityType);
check("Chat references a node flow", c.hasNodeFlow === true);
check("Chat readiness = ready when referenced flow exists", c.readiness === "ready", c.readiness);
check("Chat is not a human handoff", c.isHumanHandoff === false);
check("Chat has no warnings when the flow exists", !c.warnings, JSON.stringify(c.warnings));

const h = deriveJourneyNodeCapability(human, evidencePresent);
check("Human capabilityType = Manual intervention / queue", h.capabilityType === "Manual intervention / queue", h.capabilityType);
check("Human readiness = manual", h.readiness === "manual", h.readiness);
check("Human marks a handoff", h.isHumanHandoff === true);
check("Human owner = human", h.owner === "human", h.owner);

console.log("\n— Case 2: referenced node flow MISSING (graceful degradation) —");
const cMissing = deriveJourneyNodeCapability(chat, { scriptExists: () => false });
check("Chat readiness = reference_missing when the flow is absent", cMissing.readiness === "reference_missing", cMissing.readiness);
check("Chat warns when the flow is absent", Boolean(cMissing.warnings?.length));

console.log("\n— Case 3: conversation with NO nodeFlowRef —");
const chatNoRef = { ...chat, nodeFlowRef: undefined } as JourneyNode;
const cNoRef = deriveJourneyNodeCapability(chatNoRef, evidencePresent);
check("Chat readiness = needs_configuration with no ref", cNoRef.readiness === "needs_configuration", cNoRef.readiness);

console.log("\n— Case 4: existence UNVERIFIABLE (no probe) never over-claims —");
const cUnknown = deriveJourneyNodeCapability(chat, {});
check("Chat readiness = unknown when existence cannot be verified", cUnknown.readiness === "unknown", cUnknown.readiness);

console.log("\n— Invariants —");
check("Derivation does not mutate the source node", chat.nodeFlowRef?.kind === "script" && chat.nodeFlowRef.scriptId === refScriptId);
check("nodeFlowRef carried through is the reference only (no flow contents)", JSON.stringify(c.nodeFlowRef) === JSON.stringify(chat.nodeFlowRef));

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
