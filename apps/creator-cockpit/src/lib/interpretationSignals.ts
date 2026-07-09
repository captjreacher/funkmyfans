// COMPOSE-2: ONE canonical interpretation-signal vocabulary + mappings.
//
// COMPOSE-1 found TWO interpretation vocabularies in the codebase:
//   A. NSP-4 inline response categories (worker.ts classifyNewSubscriberReply,
//      16 keys), routed on `response_class` / `next_response_class`.
//   B. The DB-backed ConversationIntent model (of-types, 12 values) used by the
//      conversation-intelligence engine.
//
// This module defines the SINGLE canonical signal set capability contracts use
// and maps BOTH existing vocabularies onto it. It is NOT a third interpretation
// system and NOT a producer: no classifier is changed here. COMPOSE-4 will wire
// producers/consumers to this vocabulary. A signal is what a message MEANS —
// distinct from an Opportunity (what to act on) and a Capability (work done).

import type { CanonicalInterpretationSignal, ConversationIntent } from "@funkmyfans/of-types";

/** The 16 NSP-4 inline response-class keys (the seed's route tables). */
export type Nsp4ResponseClass =
  | "warm_enthusiastic"
  | "short_low_effort"
  | "compliment"
  | "flirtatious"
  | "curious_about_creator"
  | "asks_for_content"
  | "purchase_intent"
  | "price_objection"
  | "not_ready"
  | "silent_no_reply"
  | "boundary_testing"
  | "explicit_or_unsupported_request"
  | "off_topic"
  | "no_interest_disengaged"
  | "shares_preference"
  | "one_to_one_request";

/** The full canonical vocabulary (union superset of A and B). */
export const CANONICAL_INTERPRETATION_SIGNALS: readonly CanonicalInterpretationSignal[] = [
  "greeting",
  "warm_enthusiastic",
  "compliment",
  "flirtatious",
  "shares_preference",
  "curious_about_creator",
  "casual_chat",
  "off_topic",
  "disengaged",
  "content_interest",
  "purchase_intent",
  "ppv_interest",
  "custom_request",
  "subscription_question",
  "price_objection",
  "not_ready",
  "boundary_testing",
  "unsupported_request",
  "complaint",
  "support_request",
  "silence"
];

/** Map every NSP-4 inline response class → canonical signal. */
export const NSP4_TO_CANONICAL: Record<Nsp4ResponseClass, CanonicalInterpretationSignal> = {
  warm_enthusiastic: "warm_enthusiastic",
  short_low_effort: "greeting",
  compliment: "compliment",
  flirtatious: "flirtatious",
  curious_about_creator: "curious_about_creator",
  asks_for_content: "content_interest",
  purchase_intent: "purchase_intent",
  price_objection: "price_objection",
  not_ready: "not_ready",
  silent_no_reply: "silence",
  boundary_testing: "boundary_testing",
  explicit_or_unsupported_request: "unsupported_request",
  off_topic: "off_topic",
  no_interest_disengaged: "disengaged",
  shares_preference: "shares_preference",
  one_to_one_request: "custom_request"
};

/** Map every existing ConversationIntent → canonical signal (no new intent values). */
export const CONVERSATION_INTENT_TO_CANONICAL: Record<ConversationIntent, CanonicalInterpretationSignal> = {
  greeting: "greeting",
  flirting: "flirtatious",
  buying_signal: "purchase_intent",
  ppv_interest: "ppv_interest",
  custom_request: "custom_request",
  sexting: "flirtatious",
  casual_chat: "casual_chat",
  support: "support_request",
  complaint: "complaint",
  price_objection: "price_objection",
  subscription_question: "subscription_question",
  goodbye: "disengaged"
};

export type InterpretationSignalGroup = "relational" | "commercial" | "safety" | "support" | "lifecycle";
export type InterpretationSignalScope = "channel_independent" | "onlyfans_specific";

/** Group + channel scope for each canonical signal (classification per COMPOSE-1 §8). */
export const INTERPRETATION_SIGNAL_META: Record<
  CanonicalInterpretationSignal,
  { group: InterpretationSignalGroup; scope: InterpretationSignalScope }
> = {
  greeting: { group: "relational", scope: "channel_independent" },
  warm_enthusiastic: { group: "relational", scope: "channel_independent" },
  compliment: { group: "relational", scope: "channel_independent" },
  flirtatious: { group: "relational", scope: "channel_independent" },
  shares_preference: { group: "relational", scope: "channel_independent" },
  curious_about_creator: { group: "relational", scope: "channel_independent" },
  casual_chat: { group: "relational", scope: "channel_independent" },
  off_topic: { group: "relational", scope: "channel_independent" },
  disengaged: { group: "lifecycle", scope: "channel_independent" },
  content_interest: { group: "commercial", scope: "onlyfans_specific" },
  purchase_intent: { group: "commercial", scope: "onlyfans_specific" },
  ppv_interest: { group: "commercial", scope: "onlyfans_specific" },
  custom_request: { group: "commercial", scope: "onlyfans_specific" },
  subscription_question: { group: "commercial", scope: "onlyfans_specific" },
  price_objection: { group: "commercial", scope: "onlyfans_specific" },
  not_ready: { group: "commercial", scope: "channel_independent" },
  boundary_testing: { group: "safety", scope: "channel_independent" },
  unsupported_request: { group: "safety", scope: "channel_independent" },
  complaint: { group: "support", scope: "channel_independent" },
  support_request: { group: "support", scope: "channel_independent" },
  silence: { group: "lifecycle", scope: "channel_independent" }
};

/** Canonical signal for an NSP-4 response class (undefined for unknown input). */
export function canonicalFromNsp4(responseClass: string | null | undefined): CanonicalInterpretationSignal | undefined {
  if (!responseClass) return undefined;
  return NSP4_TO_CANONICAL[responseClass as Nsp4ResponseClass];
}

/** Canonical signal for a ConversationIntent (undefined for unknown input). */
export function canonicalFromConversationIntent(intent: string | null | undefined): CanonicalInterpretationSignal | undefined {
  if (!intent) return undefined;
  return CONVERSATION_INTENT_TO_CANONICAL[intent as ConversationIntent];
}

/** True when the value is a known canonical signal. */
export function isCanonicalInterpretationSignal(value: string | null | undefined): value is CanonicalInterpretationSignal {
  return Boolean(value) && CANONICAL_INTERPRETATION_SIGNALS.includes(value as CanonicalInterpretationSignal);
}
