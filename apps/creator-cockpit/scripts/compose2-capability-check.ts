// COMPOSE-2 deterministic capability-layer check.
//
// Exercises the SEMANTIC layer added in COMPOSE-2 without any browser or
// backend: the code-backed Capability Registry, the canonical interpretation
// signal vocabulary + mappings, and the four capabilityRef/nodeFlowRef
// compatibility states. These modules are dependency-free (type-only imports
// from @funkmyfans/of-types), so this check runs both under Node's type
// stripping (node apps/creator-cockpit/scripts/compose2-capability-check.ts)
// and under tsx in CI.
//
// deriveJourneyNodeCapability + the Emma reference journey are additionally
// covered by node1e/node1f (which import the derivation + of-types) and by the
// CI typecheck/build.

import {
  CAPABILITY_CATALOGUE,
  capabilityBindingState,
  capabilityKeys,
  getCapability,
  getCapabilityByRef,
  hasCapability,
  listCapabilities
} from "../src/lib/capabilityRegistry.ts";
import {
  CANONICAL_INTERPRETATION_SIGNALS,
  CONVERSATION_INTENT_TO_CANONICAL,
  INTERPRETATION_SIGNAL_META,
  NSP4_TO_CANONICAL,
  canonicalFromConversationIntent,
  canonicalFromNsp4,
  isCanonicalInterpretationSignal
} from "../src/lib/interpretationSignals.ts";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}

const canonicalSet = new Set<string>(CANONICAL_INTERPRETATION_SIGNALS);

// ── 1. Registry: seeding, deterministic lookup, graceful unknown handling ────
// COMPOSE-2 seeded 6 capabilities. Later sprints may ADD capabilities (COMPOSE-3
// adds identity_resolution), so this guards that the 6 COMPOSE-2 capabilities are
// all still present rather than pinning an exact count/order.
check("registry seeds at least the 6 COMPOSE-2 capabilities", CAPABILITY_CATALOGUE.length >= 6, `size=${CAPABILITY_CATALOGUE.length}`);
check("listCapabilities matches catalogue", listCapabilities().length === CAPABILITY_CATALOGUE.length);
const expectedKeys = [
  "channel_source_entry",
  "new_subscriber_welcome_discovery",
  "make_offer_ppv",
  "silence_follow_up",
  "boundary_safety_response",
  "human_handoff"
];
const presentKeys = new Set<string>(capabilityKeys());
check("the 6 COMPOSE-2 capability keys are all present", expectedKeys.every((k) => presentKeys.has(k)), capabilityKeys().join(","));
check("lookup is deterministic (same ref twice)", getCapability("human_handoff") === getCapability("human_handoff"));
check("unknown key -> undefined", getCapability("does_not_exist") === undefined);
check("empty/nullish key -> undefined", getCapability("") === undefined && getCapability(null) === undefined && getCapability(undefined) === undefined);
check("getCapabilityByRef(undefined) -> undefined", getCapabilityByRef(undefined) === undefined);
check("getCapabilityByRef(unknown key) -> undefined", getCapabilityByRef({ capabilityKey: "nope" }) === undefined);
check("getCapabilityByRef ignores version (resolves by key)", getCapabilityByRef({ capabilityKey: "make_offer_ppv", version: 99 })?.capabilityKey === "make_offer_ppv");
check("hasCapability true/false", hasCapability("silence_follow_up") === true && hasCapability("nope") === false);

// ── 2. Per-descriptor invariants ─────────────────────────────────────────────
for (const descriptor of CAPABILITY_CATALOGUE) {
  check(`[${descriptor.capabilityKey}] has label + one-line responsibility`, Boolean(descriptor.label) && Boolean(descriptor.description));
  check(`[${descriptor.capabilityKey}] version is a positive integer`, Number.isInteger(descriptor.version) && descriptor.version >= 1);
  check(`[${descriptor.capabilityKey}] declares at least one input + output key`, descriptor.inputKeys.length > 0 && descriptor.outputKeys.length > 0);
  for (const signal of descriptor.supportedInterpretationSignals ?? []) {
    check(`[${descriptor.capabilityKey}] signal "${signal}" is canonical`, canonicalSet.has(signal), signal);
  }
}
const human = getCapability("human_handoff")!;
check("human_handoff is human-owned + requiresHuman", human.owner === "human" && human.requiresHuman === true);
check("human_handoff needs no concrete node flow (implementationRefs empty/undefined)", (human.implementationRefs?.length ?? 0) === 0);
const channel = getCapability("channel_source_entry")!;
check("channel_source_entry is channel-owned + adapter-backed", channel.owner === "channel" && channel.category === "channel" && (channel.implementationRefs?.length ?? 0) === 0);
const welcome = getCapability("new_subscriber_welcome_discovery")!;
check("welcome is automation + conversation category", welcome.owner === "automation" && welcome.category === "conversation");

// ── 3. Canonical interpretation vocabulary + mappings ────────────────────────
check("21 canonical signals, all unique", CANONICAL_INTERPRETATION_SIGNALS.length === 21 && canonicalSet.size === 21);
check("every canonical signal has group+scope meta", CANONICAL_INTERPRETATION_SIGNALS.every((s) => Boolean(INTERPRETATION_SIGNAL_META[s])));
const nsp4Keys = Object.keys(NSP4_TO_CANONICAL);
check("all 16 NSP-4 response classes mapped", nsp4Keys.length === 16, `count=${nsp4Keys.length}`);
check("every NSP-4 mapping lands in the canonical set", nsp4Keys.every((k) => canonicalSet.has(NSP4_TO_CANONICAL[k as keyof typeof NSP4_TO_CANONICAL])));
const intentKeys = Object.keys(CONVERSATION_INTENT_TO_CANONICAL);
check("all 12 ConversationIntent values mapped", intentKeys.length === 12, `count=${intentKeys.length}`);
check("every ConversationIntent mapping lands in the canonical set", intentKeys.every((k) => canonicalSet.has(CONVERSATION_INTENT_TO_CANONICAL[k as keyof typeof CONVERSATION_INTENT_TO_CANONICAL])));
check("NSP-4 purchase_intent -> purchase_intent", canonicalFromNsp4("purchase_intent") === "purchase_intent");
check("NSP-4 explicit_or_unsupported_request -> unsupported_request", canonicalFromNsp4("explicit_or_unsupported_request") === "unsupported_request");
check("NSP-4 one_to_one_request -> custom_request", canonicalFromNsp4("one_to_one_request") === "custom_request");
check("Intent buying_signal -> purchase_intent", canonicalFromConversationIntent("buying_signal") === "purchase_intent");
check("Intent goodbye -> disengaged", canonicalFromConversationIntent("goodbye") === "disengaged");
check("unknown NSP-4 / intent -> undefined", canonicalFromNsp4("???") === undefined && canonicalFromConversationIntent("???") === undefined);
check("isCanonicalInterpretationSignal guards", isCanonicalInterpretationSignal("purchase_intent") && !isCanonicalInterpretationSignal("buying_signal"));

// ── 4. The four capabilityRef/nodeFlowRef compatibility states ───────────────
const capAndFlow = { capabilityRef: { capabilityKey: "new_subscriber_welcome_discovery" }, nodeFlowRef: { kind: "script" as const, scriptId: "s1" } };
const capOnly = { capabilityRef: { capabilityKey: "human_handoff" } };
const flowOnly = { nodeFlowRef: { kind: "script" as const, scriptId: "s2" } };
const unbound = {};
check("state A: capability + flow", capabilityBindingState(capAndFlow) === "capability_and_flow");
check("state B: capability only", capabilityBindingState(capOnly) === "capability_only");
check("state C: flow only", capabilityBindingState(flowOnly) === "flow_only");
check("state D: unbound", capabilityBindingState(unbound) === "unbound");
check("state A resolves a descriptor", getCapabilityByRef(capAndFlow.capabilityRef)?.category === "conversation");
check("state B resolves a human descriptor with no flow needed", getCapabilityByRef(capOnly.capabilityRef)?.requiresHuman === true);

// ── 5. Reference journey (Emma) capability keys resolve ──────────────────────
// Emma: OnlyFans (channel_source_entry) -> New Subscriber Chat
// (new_subscriber_welcome_discovery, WITH nodeFlowRef) -> Human Handoff (human_handoff, no flow).
check("Emma channel key resolves", getCapability("channel_source_entry")?.category === "channel");
check("Emma conversation key resolves", Boolean(getCapability("new_subscriber_welcome_discovery")));
check("Emma human key resolves + is human-owned", getCapability("human_handoff")?.owner === "human");

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} — COMPOSE-2 capability-layer check`);
if (failures > 0) process.exit(1);
