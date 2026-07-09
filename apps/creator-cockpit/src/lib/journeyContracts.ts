// NODE-1E: derive a JourneyNodeCapability ("Journey Node Contract") for a node.
//
// The capability is a DERIVED, capability-facing view of a journey node. It is
// computed deterministically from the node's class, declared IO contract,
// config and nodeFlowRef, plus a single evidence probe (does a referenced
// script exist?). It is never persisted into the JourneyGraph, so NODE-1C
// stored graphs stay backwards compatible and no migration is required.
//
// Readiness is deterministic and evidence-based: the ONLY runtime-adjacent
// signal consulted is referenced-script existence. It never infers live
// operational health or runtime readiness.

import type {
  JourneyNode,
  JourneyNodeCapability,
  JourneyNodeClass,
  JourneyNodeOwner,
  JourneyNodeReadiness
} from "@funkmyfans/of-types";
import { channelLabel } from "./journey";

export interface JourneyContractContext {
  /**
   * Evidence probe: does the script referenced by a nodeFlowRef exist?
   * Returns true/false when known, undefined when it cannot be determined here.
   * This is the ONLY runtime-adjacent evidence the contract layer consults; it
   * never inspects operational health or live runtime state.
   */
  scriptExists?: (scriptId: string) => boolean | undefined;
  /**
   * The journey's entry channel/source label, applied to downstream nodes so a
   * Conversation or Human capability can show where its journey originates.
   */
  sourceChannelLabel?: string;
}

// Human-readable capability names per class. Falls back gracefully for any
// class not mapped here (older/newer graphs), so unknown nodes still render.
const CAPABILITY_TYPE_LABEL: Record<JourneyNodeClass, string> = {
  channel: "Channel / source entry point",
  identity: "Identity resolution",
  onboarding: "Creator onboarding",
  process: "Automated process",
  conversation: "Automated conversation",
  human: "Manual intervention / queue"
};

const OWNER_BY_CLASS: Record<JourneyNodeClass, JourneyNodeOwner> = {
  channel: "channel",
  identity: "system",
  onboarding: "system",
  process: "automation",
  conversation: "automation",
  human: "human"
};

/** Display metadata for readiness (badge label + tone). A UI concern, kept in the app. */
export const READINESS_META: Record<JourneyNodeReadiness, { label: string; tone: string }> = {
  ready: { label: "Ready", tone: "#34d399" },
  needs_configuration: { label: "Needs setup", tone: "#f59e0b" },
  reference_missing: { label: "Missing flow", tone: "#f87171" },
  manual: { label: "Manual", tone: "#f472b6" },
  unknown: { label: "Unknown", tone: "#94a3b8" }
};

export const OWNER_LABEL: Record<JourneyNodeOwner, string> = {
  channel: "Channel / transport",
  system: "System",
  automation: "Automation",
  human: "Human operator"
};

function sourceFor(node: JourneyNode, ctx: JourneyContractContext): string | undefined {
  if (node.class === "channel") {
    const label = channelLabel(node.config.channel);
    return node.config.accountLabel ? `${label} · ${node.config.accountLabel}` : label;
  }
  return ctx.sourceChannelLabel;
}

function entrySummary(node: JourneyNode): string {
  if (node.class === "channel") {
    const signal = node.contract.destinations[0]?.label;
    return signal ? `Journey entry — detects “${signal}”` : "Journey entry point";
  }
  const inputs = node.contract.inputs;
  if (!inputs.length) return "Journey entry point";
  const required = inputs.filter((input) => input.required);
  const chosen = (required.length ? required : inputs).map((input) => input.label);
  return `${required.length ? "Requires" : "Accepts"} ${chosen.join(", ")}`;
}

function exitSummary(node: JourneyNode): string {
  const destinations = node.contract.destinations;
  if (!destinations.length) return "Terminal — no onward destination";
  const verb = node.class === "channel" ? "Hands off via" : "Exits via";
  return `${verb} ${destinations.map((destination) => destination.label).join(", ")}`;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function deriveReadiness(
  node: JourneyNode,
  ctx: JourneyContractContext
): { readiness: JourneyNodeReadiness; detail: string; warnings: string[] } {
  const warnings: string[] = [];

  // A human capability is manual by design — there is nothing automated to validate.
  if (node.class === "human") {
    return {
      readiness: "manual",
      detail: "Manual step — a human takes over here. There is no automated node flow to validate.",
      warnings
    };
  }

  const ref = node.nodeFlowRef;
  if (ref && ref.kind === "script") {
    const exists = ctx.scriptExists?.(ref.scriptId);
    if (exists === true) {
      return { readiness: "ready", detail: `References an existing node flow (script ${shortId(ref.scriptId)}).`, warnings };
    }
    if (exists === false) {
      warnings.push(`Referenced node flow script "${ref.scriptId}" was not found.`);
      return { readiness: "reference_missing", detail: "The referenced node flow could not be found.", warnings };
    }
    // Existence could not be determined in this context — do not assert readiness.
    return { readiness: "unknown", detail: "Referenced node flow existence could not be verified here.", warnings };
  }

  // No nodeFlowRef on the node.
  if (node.class === "conversation") {
    warnings.push("No node flow is bound to this conversation capability.");
    return { readiness: "needs_configuration", detail: "This conversation has no node flow bound yet.", warnings };
  }
  if (node.class === "channel") {
    // A channel needs no node flow; readiness reflects declared configuration
    // (a structural signal), never live transport health.
    if (node.config.accountLabel) {
      return { readiness: "ready", detail: "Channel / source entry point — no node flow required.", warnings };
    }
    warnings.push("No account or source is configured for this channel.");
    return { readiness: "needs_configuration", detail: "This channel has no account or source configured.", warnings };
  }

  // identity / onboarding / process with no bound flow: no evidence to assert readiness.
  return { readiness: "unknown", detail: "No node flow is referenced; readiness is not determined for this capability.", warnings };
}

/**
 * Derive the capability contract for a single journey node. Pure and
 * deterministic given the node and the (optional) evidence context.
 */
export function deriveJourneyNodeCapability(
  node: JourneyNode,
  ctx: JourneyContractContext = {}
): JourneyNodeCapability {
  const { readiness, detail, warnings } = deriveReadiness(node, ctx);
  return {
    nodeId: node.id,
    label: node.label,
    nodeClass: node.class,
    capabilityType: CAPABILITY_TYPE_LABEL[node.class] ?? "Bounded capability",
    source: sourceFor(node, ctx),
    entrySummary: entrySummary(node),
    exitSummary: exitSummary(node),
    nodeFlowRef: node.nodeFlowRef,
    hasNodeFlow: Boolean(node.nodeFlowRef),
    owner: OWNER_BY_CLASS[node.class] ?? "system",
    isHumanHandoff: node.class === "human",
    readiness,
    readinessDetail: detail,
    warnings: warnings.length ? warnings : undefined
  };
}

/**
 * Derive a { nodeId -> capability } map for a journey graph. Memoize the result
 * against the journey identity + evidence in the caller so canvas node identity
 * stays stable across drags (a fresh map each render would reset positions).
 */
export function deriveJourneyCapabilities(
  nodes: readonly JourneyNode[],
  ctx: JourneyContractContext = {}
): Record<string, JourneyNodeCapability> {
  const map: Record<string, JourneyNodeCapability> = {};
  for (const node of nodes) map[node.id] = deriveJourneyNodeCapability(node, ctx);
  return map;
}
