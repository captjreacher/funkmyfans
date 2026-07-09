// NODE-1F deterministic acceptance check.
//
// Exercises the full Journey → Node Contract seam against the canonical Emma
// journey AND the graceful-degradation paths hardened in NODE-1F:
//   - unknown/unsupported node class renders a safe fallback (journeyClassMeta)
//   - a node with no contract does not throw during derivation
//   - a missing referenced script degrades to reference_missing (no crash)
//   - evidence-based readiness never over-claims
//
// Pure logic — no browser, no backend. Requires workspace deps installed
// (imports the real derivation + class-meta), so run it where npm deps exist:
//   npx tsx apps/creator-cockpit/scripts/node1f-acceptance-check.ts

import { EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE, type JourneyNode } from "@funkmyfans/of-types";
import { deriveJourneyNodeCapability } from "../src/lib/journeyContracts";
import { JOURNEY_CLASS_FALLBACK_META, journeyClassMeta } from "../src/lib/journey";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> got: ${detail}` : ""}`);
}
function noThrow(name: string, fn: () => void): void {
  try {
    fn();
    check(name, true);
  } catch (err) {
    check(name, false, String(err));
  }
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
const evidence = { scriptExists: (id: string) => id === refScriptId, sourceChannelLabel: "OnlyFans · Emma on OnlyFans" };

console.log("— Emma / moonsiren New Subscriber acceptance —");
const of = deriveJourneyNodeCapability(onlyfans, evidence);
check("OnlyFans = channel/source, no flow, ready", of.capabilityType === "Channel / source entry point" && !of.hasNodeFlow && of.readiness === "ready", `${of.capabilityType}/${of.readiness}`);
check("OnlyFans entry surfaces the new-subscriber signal", of.entrySummary.includes("New subscriber"), of.entrySummary);
const c = deriveJourneyNodeCapability(chat, evidence);
check("Chat = automated conversation, ready (referenced flow exists)", c.capabilityType === "Automated conversation" && c.hasNodeFlow && c.readiness === "ready", `${c.capabilityType}/${c.readiness}`);
const h = deriveJourneyNodeCapability(human, evidence);
check("Human = manual intervention, human-owned", h.readiness === "manual" && h.isHumanHandoff && h.owner === "human", `${h.readiness}/${h.owner}`);

console.log("\n— Graceful degradation (NODE-1F hardening) —");
check("Missing referenced script degrades to reference_missing", deriveJourneyNodeCapability(chat, { scriptExists: () => false }).readiness === "reference_missing");

const unknownNode = { ...onlyfans, class: "quantum" } as unknown as JourneyNode;
check("Unknown class → safe fallback meta (no crash)", journeyClassMeta((unknownNode as { class: string }).class).label === JOURNEY_CLASS_FALLBACK_META.label);
noThrow("Unknown class → derivation does not throw", () => deriveJourneyNodeCapability(unknownNode, evidence));
check("Unknown class → capabilityType falls back", deriveJourneyNodeCapability(unknownNode, evidence).capabilityType === "Bounded capability", deriveJourneyNodeCapability(unknownNode, evidence).capabilityType);
check("Unknown class → readiness unknown (never over-claims)", deriveJourneyNodeCapability(unknownNode, evidence).readiness === "unknown");

const noContract = { ...chat, contract: undefined } as unknown as JourneyNode;
noThrow("Node without a contract → derivation does not throw", () => deriveJourneyNodeCapability(noContract, evidence));
check("Node without a contract → safe entry summary", deriveJourneyNodeCapability(noContract, evidence).entrySummary === "Journey entry point", deriveJourneyNodeCapability(noContract, evidence).entrySummary);

console.log("\n— Older NODE-1C graph shape (minimal node, no groups/extra fields) —");
const olderNode = {
  id: "legacy-channel",
  class: "channel",
  label: "Legacy Channel",
  position: { x: 0, y: 0 },
  contract: { inputs: [], outputs: [], destinations: [{ key: "in", label: "Inbound" }] },
  config: { channel: "onlyfans" }
} as unknown as JourneyNode;
noThrow("Older minimal node derives without throwing", () => deriveJourneyNodeCapability(olderNode, {}));
check("Older channel with no account → needs_configuration (deterministic)", deriveJourneyNodeCapability(olderNode, {}).readiness === "needs_configuration", deriveJourneyNodeCapability(olderNode, {}).readiness);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
