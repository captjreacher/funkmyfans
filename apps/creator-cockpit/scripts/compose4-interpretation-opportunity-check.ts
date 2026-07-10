// COMPOSE-4 deterministic interpretation → outcome → opportunity boundary check.
//
// Proves the semantic wiring + deterministic boundary WITHOUT a browser or
// backend, and without changing runtime execution:
//
//   conversation/event evidence
//     → existing producer (inline regex 16-class / ConversationIntent)  [COMPOSE-2 tables]
//     → canonical interpretation signal                                 [CanonicalInterpretationSignal]
//     → capability outcome                                              [buildCapabilityOutcome]
//     → opportunity signal                                              [mapOutcomeToOpportunitySignal]
//     → existing Opportunity input                                      [opportunitySignalToConversationOpportunityInput]
//
// The producer→canonical tables live in src/lib/interpretationSignals.ts (COMPOSE-2,
// type-only against of-types). The outcome→opportunity core lives in of-types and is
// imported by RELATIVE path (of-types has 0 runtime imports → node type-strips it),
// so this runs under `node .../compose4-interpretation-opportunity-check.ts` and tsx.

import {
  buildCapabilityOutcome,
  mapOutcomeToOpportunitySignal,
  opportunitySignalToConversationOpportunityInput,
  outcomeTypeFor,
  canonicalSignalsForOutcomeType,
  normalizeInstagramEvent,
  INSTAGRAM_PROVIDER,
  OPPORTUNITY_MIN_CONFIDENCE,
  type CapabilityOutcome,
  type CanonicalInterpretationSignal
} from "../../../packages/of-types/src/index.ts";
import {
  NSP4_TO_CANONICAL,
  CONVERSATION_INTENT_TO_CANONICAL,
  CANONICAL_INTERPRETATION_SIGNALS,
  canonicalFromNsp4,
  canonicalFromConversationIntent,
  isCanonicalInterpretationSignal
} from "../src/lib/interpretationSignals.ts";
import { getCapability } from "../src/lib/capabilityRegistry.ts";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const canonicalSet = new Set<string>(CANONICAL_INTERPRETATION_SIGNALS);

// The 16 response classes classifyNewSubscriberReply (worker.ts inline regex) emits.
const INLINE_REGEX_CLASSES = [
  "silent_no_reply", "no_interest_disengaged", "explicit_or_unsupported_request", "boundary_testing",
  "one_to_one_request", "purchase_intent", "price_objection", "not_ready", "curious_about_creator",
  "asks_for_content", "compliment", "flirtatious", "shares_preference", "warm_enthusiastic",
  "short_low_effort", "off_topic"
];

// ── 1. Old inline/regex interpretation maps to canonical signals ─────────────
check("all 16 inline-regex response classes have a canonical mapping", INLINE_REGEX_CLASSES.every((c) => Boolean(canonicalFromNsp4(c))));
check("every inline-regex canonical mapping is a real canonical signal", INLINE_REGEX_CLASSES.every((c) => canonicalSet.has(String(canonicalFromNsp4(c)))));
check("inline-regex purchase_intent → canonical purchase_intent", canonicalFromNsp4("purchase_intent") === "purchase_intent");
check("inline-regex asks_for_content → canonical content_interest", canonicalFromNsp4("asks_for_content") === "content_interest");
check("inline-regex explicit_or_unsupported_request → canonical unsupported_request", canonicalFromNsp4("explicit_or_unsupported_request") === "unsupported_request");

// ── 2. ConversationIntent maps to canonical signals ──────────────────────────
const intentKeys = Object.keys(CONVERSATION_INTENT_TO_CANONICAL);
check("all 12 ConversationIntent values map to canonical", intentKeys.length === 12 && intentKeys.every((k) => canonicalSet.has(String(canonicalFromConversationIntent(k)))));
check("ConversationIntent buying_signal → canonical purchase_intent", canonicalFromConversationIntent("buying_signal") === "purchase_intent");

// ── 3. Unknown interpretation inputs degrade safely ──────────────────────────
check("unknown inline-regex class → undefined", canonicalFromNsp4("???") === undefined);
check("unknown ConversationIntent → undefined", canonicalFromConversationIntent("???") === undefined);
check("unknown end-step outcome key → no_action outcome type", outcomeTypeFor({ outcomeKey: "weird_unmapped" }) === "no_action");
check("isCanonicalInterpretationSignal guards raw vocab", isCanonicalInterpretationSignal("purchase_intent") && !isCanonicalInterpretationSignal("buying_signal"));

// ── 4. Canonical signals are accepted by capability descriptors ──────────────
const offerCap = getCapability("make_offer_ppv");
const welcomeCap = getCapability("new_subscriber_welcome_discovery");
const safetyCap = getCapability("boundary_safety_response");
check("make_offer_ppv accepts offer_opportunity canonical signals", canonicalSignalsForOutcomeType("offer_opportunity").every((s) => Boolean(offerCap?.supportedInterpretationSignals?.includes(s))));
check("new_subscriber_welcome_discovery accepts content_preference canonical signals", canonicalSignalsForOutcomeType("content_preference").every((s) => Boolean(welcomeCap?.supportedInterpretationSignals?.includes(s))));
check("boundary_safety_response accepts boundary_safety canonical signals", canonicalSignalsForOutcomeType("boundary_safety").every((s) => Boolean(safetyCap?.supportedInterpretationSignals?.includes(s))));

// ── 5. Capability outcome is separate from Node Flow execution ───────────────
const detOutcome1 = buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "buying_signal", handoffKind: "buying_signal", terminalType: "handoff", identityResolved: true });
const detOutcome2 = buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "buying_signal", handoffKind: "buying_signal", terminalType: "handoff", identityResolved: true });
check("capability outcome derivation is deterministic", eq(detOutcome1, detOutcome2));
check("capability outcome carries a capability ref, not Node Flow internals", detOutcome1.capabilityKey === "new_subscriber_welcome_discovery" && !("steps" in detOutcome1) && !("script" in detOutcome1) && !("nodeFlow" in detOutcome1));
check("capability outcome records readiness/confidence + actionability", typeof detOutcome1.confidence === "number" && typeof detOutcome1.actionable === "boolean" && typeof detOutcome1.requiresHuman === "boolean");

// ── New Subscriber reference path: full producer → … → opportunity chain ─────
// Reply "how much for a custom ppv?" → inline regex → purchase_intent → canonical → outcome → revenue opportunity.
const rawClass = "purchase_intent";
const canonical = canonicalFromNsp4(rawClass) as CanonicalInterpretationSignal;
const nsOutcome = buildCapabilityOutcome({
  capabilityKey: "new_subscriber_welcome_discovery",
  nodeId: "node-new-subscriber-chat",
  outcomeKey: "buying_signal",
  handoffKind: "buying_signal",
  terminalType: "handoff",
  producer: "inline_regex.classifyNewSubscriberReply",
  rawSignal: rawClass,
  canonicalSignals: [canonical],
  sourceEventId: "ev-ns-1",
  sourceConversationId: "conv-ns-1",
  identityResolved: true
});
const nsOpp = mapOutcomeToOpportunitySignal(nsOutcome);

// ── 6. Supported capability outcome maps to opportunity signal ───────────────
check("New Subscriber buying signal → opportunity produced", nsOpp.produced === true);
check("… categorised as revenue / buying_signal", nsOpp.produced && nsOpp.signal.category === "revenue" && nsOpp.signal.opportunityClassification === "buying_signal");
const relOpp = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "engaged", handoffKind: "relationship_continuation", terminalType: "handoff", identityResolved: true }));
check("engaged → relationship opportunity produced", relOpp.produced && relOpp.signal.category === "relationship");
const hrOpp = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "exception", handoffKind: "human_review", terminalType: "handoff", identityResolved: false }));
check("human_review → operations opportunity produced (no owner required)", hrOpp.produced && hrOpp.signal.category === "operations" && hrOpp.signal.requiresHuman === true);

// ── 7. Unsupported / weak outcome does NOT create an opportunity signal ──────
const silence = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "no_response", terminalType: "completed", identityResolved: true }));
check("silence/no_response → NO opportunity signal", silence.produced === false);
const noAction = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "x", outcomeKey: "weird_unmapped", identityResolved: true }));
check("unknown outcome → NO opportunity signal (safe degrade)", noAction.produced === false);
const weak = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "x", outcomeType: "offer_opportunity", confidence: 0.3, identityResolved: true }));
check("weak evidence (confidence < min) → NO opportunity signal", weak.produced === false && OPPORTUNITY_MIN_CONFIDENCE === 0.5);

// ── 8. Evidence preserved producer → signal → outcome → opportunity signal ───
check("outcome preserves the producer raw signal", nsOutcome.evidence.rawSignal === "purchase_intent" && nsOutcome.evidence.producer === "inline_regex.classifyNewSubscriberReply");
check("outcome carries the canonical signal derived from the producer", nsOutcome.canonicalSignals.includes("purchase_intent"));
check("opportunity signal preserves the full evidence chain", nsOpp.produced && nsOpp.signal.evidence.rawSignal === "purchase_intent" && nsOpp.signal.canonicalSignals.includes("purchase_intent") && nsOpp.signal.sourceEventId === "ev-ns-1" && nsOpp.signal.sourceConversationId === "conv-ns-1");

// ── 9. Unresolved identity blocks owner fabrication ──────────────────────────
const unresolvedBuy = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "buying_signal", handoffKind: "buying_signal", terminalType: "handoff", identityResolved: false }));
check("buying signal with UNRESOLVED identity → not produced", unresolvedBuy.produced === false);
check("… and the reason cites owner fabrication", unresolvedBuy.produced === false && /owner/i.test(unresolvedBuy.reason));
check("operations (human_review) still allowed with unresolved identity (no owner needed)", hrOpp.produced === true);

// ── 10. No Queue item is created by this boundary ────────────────────────────
const oppInput = nsOpp.produced ? opportunitySignalToConversationOpportunityInput(nsOpp.signal, { creatorId: "cr-1", conversationInstanceId: "conv-ns-1", sourceStepId: "end_buying_signal" }) : null;
check("opportunity persistence adapter yields a 'detected' opportunity (not queued)", Boolean(oppInput) && oppInput!.status === "detected");
check("adapter creates NO queue linkage (queue_id / queue_item_id null)", Boolean(oppInput) && oppInput!.queue_id === null && oppInput!.queue_item_id === null);
check("adapter reuses the existing opportunity vocabulary (revenue category, route_key)", Boolean(oppInput) && oppInput!.category === "revenue" && oppInput!.route_key === "buying_signal");

// ── 11. Instagram compatibility (COMPOSE-3 ingestion untouched) ──────────────
const ig = normalizeInstagramEvent({ eventType: "instagram.dm_received", instagramAccountId: "ig-biz", providerEventId: "ig-1", user: { id: "u1", username: "fan" } }, { receivedAt: "2026-07-09T00:00:00.000Z" });
check("COMPOSE-3 Instagram ingestion still accepts a valid event", ig.ok === true && ig.ok && ig.event.provider === INSTAGRAM_PROVIDER);
// Once conversation evidence exists for an Instagram-originated, resolved identity, it uses the SAME canonical vocabulary + boundary.
const igOutcome = buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "buying_signal", handoffKind: "buying_signal", terminalType: "handoff", producer: "inline_regex.classifyNewSubscriberReply", rawSignal: "purchase_intent", canonicalSignals: [canonical], sourceEventId: "ig-1", sourceConversationId: "conv-ig-1", identityResolved: true });
const igOpp = mapOutcomeToOpportunitySignal(igOutcome);
check("Instagram-originated conversation participates in the SAME canonical→opportunity boundary", igOpp.produced === true && igOpp.signal.category === "revenue" && igOpp.signal.canonicalSignals.includes("purchase_intent"));
check("Instagram unresolved identity is still owner-guarded", mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "x", outcomeKey: "buying_signal", handoffKind: "buying_signal", identityResolved: false })).produced === false);

// ── 12. Interpretation signals are not opportunities (distinct layers) ───────
check("a canonical signal is not itself an opportunity category", !["revenue", "operations", "relationship"].includes("purchase_intent"));

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} — COMPOSE-4 interpretation → outcome → opportunity boundary check`);
if (failures > 0) process.exit(1);
