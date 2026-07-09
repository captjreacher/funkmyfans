// COMPOSE-2: Capability Registry (semantic metadata; NOT a runtime engine).
//
// A code-backed, deterministic registry that maps a capabilityKey to a typed
// CapabilityDescriptor. It answers "what reusable capability is this?" — it does
// NOT execute anything, does NOT store scripts, and does NOT replace nodeFlowRef.
// Concrete Node Flow implementations are attached per-creator at the Journey node
// via nodeFlowRef; the registry only records semantic identity + contract.
//
// The catalogue is seeded from the COMPOSE-1 decomposition (docs/architecture/
// compose-1-capability-decomposition-and-composition-contract.md §7): C1–C5 plus
// the Channel/source entry the reference journey binds. No network, no DB, no
// migration — a v0.1 semantic taxonomy.

import type { CapabilityBindingState, CapabilityDescriptor, CapabilityKey, CapabilityRef, JourneyNode } from "@funkmyfans/of-types";

// Ordered catalogue. Order is presentation-only; lookup is via the Map below.
export const CAPABILITY_CATALOGUE: readonly CapabilityDescriptor[] = [
  {
    capabilityKey: "channel_source_entry",
    version: 1,
    label: "Channel / source entry",
    description: "Transport-only journey entry: receives a channel event and emits a provisional, transport-scoped reference. Owns no canonical identity or onboarding.",
    category: "channel",
    owner: "channel",
    status: "stable",
    requiresHuman: false,
    inputKeys: ["event_context"],
    // COMPOSE-3: a channel entry also emits provisional identity evidence
    // alongside the canonical event — the input the Identity capability consumes.
    outputKeys: ["next_event", "provisional_identity"],
    // Adapter-backed; a channel has no Node Flow script (ADR-0002 Channel row).
    implementationRefs: []
  },
  {
    capabilityKey: "new_subscriber_welcome_discovery",
    version: 1,
    label: "New Subscriber Welcome & Discovery",
    description: "Bounded welcome + one interpreted discovery follow-up (≤6 turns). Establishes conversation state and latest interpretation, then exits or hands off. Does not classify inline or run the 44-step tree.",
    category: "conversation",
    owner: "automation",
    status: "stable",
    requiresHuman: false,
    inputKeys: ["event_context", "identity_context", "relationship_context", "interpretation_signals"],
    outputKeys: ["conversation_action", "interpretation_input", "outcome", "human_handoff_request"],
    supportedInterpretationSignals: [
      "greeting",
      "warm_enthusiastic",
      "compliment",
      "flirtatious",
      "shares_preference",
      "curious_about_creator",
      "content_interest",
      "off_topic",
      "not_ready",
      "silence",
      "disengaged"
    ],
    supportedOpportunityTypes: ["Relationship Building", "Content Delivery", "New Subscriber"]
  },
  {
    capabilityKey: "make_offer_ppv",
    version: 1,
    label: "Make Offer (PPV)",
    description: "Bounded commercial offer: presents a PPV/upsell offer and handles the immediate reply (accept / objection / not-ready). Reusable wherever an offer is warranted, not just new-subscriber.",
    category: "commerce",
    owner: "automation",
    status: "stable",
    requiresHuman: false,
    inputKeys: ["interpretation_signals", "opportunity_context", "relationship_context", "creator_context"],
    outputKeys: ["conversation_action", "opportunity_signal", "outcome", "human_handoff_request"],
    supportedInterpretationSignals: ["purchase_intent", "ppv_interest", "price_objection", "custom_request", "not_ready"],
    supportedOpportunityTypes: ["PPV Opportunity", "Upsell Opportunity", "Custom Content Request", "Payment Follow-up"]
  },
  {
    capabilityKey: "silence_follow_up",
    version: 1,
    label: "Silence Follow-up",
    description: "Bounded re-engagement after silence: at most one low-pressure nudge, then a clean no-response outcome. Reusable across new-subscriber, lapsed-fan, renewal-risk and stalled conversations.",
    category: "engagement",
    owner: "automation",
    status: "stable",
    requiresHuman: false,
    inputKeys: ["conversation_context", "relationship_context"],
    outputKeys: ["conversation_action", "next_event", "outcome"],
    supportedInterpretationSignals: ["silence", "warm_enthusiastic", "disengaged"],
    supportedOpportunityTypes: ["Conversation Stall", "Low Engagement Fan", "Win-back"]
  },
  {
    capabilityKey: "boundary_safety_response",
    version: 1,
    label: "Boundary / Safety Response",
    description: "Bounded safety handling: redirects boundary-testing or unsupported requests within policy, and escalates to human review when repeated. Cross-cutting; reusable in every conversational journey.",
    category: "safety",
    owner: "automation",
    status: "stable",
    requiresHuman: false,
    inputKeys: ["interpretation_signals", "conversation_context"],
    outputKeys: ["conversation_action", "human_handoff_request", "outcome"],
    supportedInterpretationSignals: ["boundary_testing", "unsupported_request", "complaint"],
    supportedOpportunityTypes: ["Safety Review", "Compliance Review", "AI Escalation"]
  },
  {
    capabilityKey: "human_handoff",
    version: 1,
    label: "Human Handoff",
    description: "Prepares a Queue item carrying the NSP-5 minimum handoff payload and routes to an operator. Human-owned: there is no automated Node Flow to validate.",
    category: "human",
    owner: "human",
    status: "stable",
    requiresHuman: true,
    inputKeys: [
      "conversation_context",
      "interpretation_signals",
      "opportunity_context",
      "relationship_context",
      "identity_context",
      "creator_context"
    ],
    outputKeys: ["human_handoff_request"],
    supportedOpportunityTypes: ["Manual Escalation", "AI Escalation", "Priority Reply"]
  },
  {
    // COMPOSE-3: a system-owned identity capability, distinct from a Channel's
    // transport entry. It consumes provisional identity evidence and resolves it
    // to a canonical subscriber/relationship on exact same-platform evidence, or
    // leaves it safely unresolved. It owns NO relationship intelligence (that is
    // Hermes/FYV) and performs NO interpretation. It is a deterministic system
    // seam with no per-creator Node Flow, so an Identity node binding it is
    // capability_only unless a concrete flow is later attached.
    capabilityKey: "identity_resolution",
    version: 1,
    label: "Identity Resolution",
    description: "Resolves provisional, transport-scoped identity evidence to a canonical subscriber/relationship on exact same-platform evidence, or leaves it safely unresolved. Owns no relationship intelligence and no interpretation.",
    category: "identity",
    owner: "system",
    status: "experimental",
    requiresHuman: false,
    inputKeys: ["provisional_identity", "event_context", "creator_context"],
    outputKeys: ["identity_context", "relationship_update"],
    // Deterministic system seam; the resolution is code-backed, not a Node Flow.
    implementationRefs: []
  }
];

const REGISTRY: ReadonlyMap<string, CapabilityDescriptor> = new Map(
  CAPABILITY_CATALOGUE.map((descriptor): [string, CapabilityDescriptor] => [descriptor.capabilityKey, descriptor])
);

/** Deterministic lookup by key. Returns undefined for unknown keys (graceful). */
export function getCapability(capabilityKey: string | null | undefined): CapabilityDescriptor | undefined {
  if (!capabilityKey) return undefined;
  return REGISTRY.get(capabilityKey);
}

/**
 * Resolve a CapabilityRef to its descriptor. Version is advisory in v0.1: a ref
 * resolves by key regardless of version, so older/newer version refs degrade to
 * the current descriptor rather than failing. Returns undefined when the ref is
 * absent or its key is not in the registry.
 */
export function getCapabilityByRef(ref: CapabilityRef | null | undefined): CapabilityDescriptor | undefined {
  return getCapability(ref?.capabilityKey);
}

/** True when the key resolves to a seeded capability. */
export function hasCapability(capabilityKey: string | null | undefined): boolean {
  return Boolean(getCapability(capabilityKey));
}

/** All seeded descriptors, in catalogue order. */
export function listCapabilities(): CapabilityDescriptor[] {
  return [...CAPABILITY_CATALOGUE];
}

/** The seeded capability keys (typed), in catalogue order. */
export function capabilityKeys(): CapabilityKey[] {
  return CAPABILITY_CATALOGUE.map((descriptor) => descriptor.capabilityKey);
}

/**
 * The four COMPOSE-2 capability/flow compatibility states for a node. A node's
 * `capabilityRef` (WHAT reusable capability) and `nodeFlowRef` (WHICH concrete
 * Node Flow) are independent, so all four combinations are valid and must
 * degrade safely. Pure and dependency-free so it is deterministically testable.
 */
export function capabilityBindingState(node: Pick<JourneyNode, "capabilityRef" | "nodeFlowRef">): CapabilityBindingState {
  const hasCapability = Boolean(node.capabilityRef);
  const hasFlow = Boolean(node.nodeFlowRef);
  if (hasCapability && hasFlow) return "capability_and_flow";
  if (hasCapability) return "capability_only";
  if (hasFlow) return "flow_only";
  return "unbound";
}
