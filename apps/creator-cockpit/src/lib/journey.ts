// Journey-level domain helpers for the Playbooks workspace (NODE-1B).
//
// These helpers sit ABOVE the existing script runtime. They render and derive
// the canonical journey model from ADR-0002 (Playbook Journey -> Node -> Node
// Flow). They introduce no execution behaviour: a Conversation node references
// an existing OfMessageScript by id via nodeFlowRef, and the existing runtime
// continues to compile and execute that script unchanged.

import type { Node } from "@xyflow/react";
import { Cog, Fingerprint, HelpCircle, MessageSquare, Radio, UserCheck, UserPlus, type LucideIcon } from "lucide-react";
import type {
  JourneyChannelKind,
  JourneyNode,
  JourneyNodeCapability,
  JourneyNodeClass,
  JourneyNodeDestination,
  OfMessageScript,
  PlaybookJourney
} from "@funkmyfans/of-types";

export type JourneyClassMeta = {
  label: string;
  icon: LucideIcon;
  accent: string;
  blurb: string;
};

// Restrained, class-distinct accents for the six canonical node classes.
export const JOURNEY_CLASS_META: Record<JourneyNodeClass, JourneyClassMeta> = {
  channel: { label: "Channel", icon: Radio, accent: "#38bdf8", blurb: "Transport only" },
  identity: { label: "Identity", icon: Fingerprint, accent: "#a78bfa", blurb: "Provisional identity, resolution & linking" },
  onboarding: { label: "Onboarding", icon: UserPlus, accent: "#34d399", blurb: "Creator setup, permissions & configuration" },
  process: { label: "Process", icon: Cog, accent: "#f59e0b", blurb: "Bounded operational or commercial activity" },
  conversation: { label: "Conversation", icon: MessageSquare, accent: "#e66a8d", blurb: "Bounded conversation, normally 3–6 turns" },
  human: { label: "Human", icon: UserCheck, accent: "#f472b6", blurb: "Handoff, review or intervention" }
};

// Safe fallback for a node whose class is not one of the six canonical classes
// (e.g. an older or malformed persisted graph). Lets the canvas and drawer
// degrade gracefully instead of crashing on an undefined meta lookup (NODE-1F).
export const JOURNEY_CLASS_FALLBACK_META: JourneyClassMeta = {
  label: "Node",
  icon: HelpCircle,
  accent: "#94a3b8",
  blurb: "Bounded capability"
};

/** Resolve class meta with a safe fallback for unknown/unsupported classes. */
export function journeyClassMeta(cls: JourneyNodeClass | string): JourneyClassMeta {
  return (JOURNEY_CLASS_META as Record<string, JourneyClassMeta>)[cls] ?? JOURNEY_CLASS_FALLBACK_META;
}

export const CONVERSATION_SURFACE_STAGES = ["source", "opening", "reply", "decision", "response", "exit"] as const;

export function channelLabel(kind: JourneyChannelKind): string {
  switch (kind) {
    case "instagram":
      return "Instagram";
    case "onlyfans":
      return "OnlyFans";
    case "email":
      return "Email";
    case "web_chat":
      return "Web chat";
    default:
      return kind;
  }
}

function humanModeLabel(mode: "handoff" | "review" | "intervention"): string {
  if (mode === "handoff") return "Human handoff";
  if (mode === "review") return "Human review";
  return "Human intervention";
}

// A concise, journey-level purpose line for a node card. Never exposes runtime steps.
export function journeyNodePurpose(node: JourneyNode): string {
  switch (node.class) {
    case "channel":
      return `${channelLabel(node.config.channel)} · transport only`;
    case "identity":
      return `Resolve & link · ${node.config.resolution.replace(/_/g, " ")}`;
    case "onboarding":
      return `Creator setup · ${node.config.scope.replace(/_/g, " ")}`;
    case "process":
      return node.config.activityKey ? `Activity · ${node.config.activityKey.replace(/_/g, " ")}` : "Bounded activity";
    case "conversation": {
      const min = node.config.minTurns ?? 3;
      const max = node.config.maxTurns ?? 6;
      return `Conversation · ${min}–${max} turns`;
    }
    case "human":
      return node.config.queueKey
        ? `${humanModeLabel(node.config.mode)} · ${node.config.queueKey.replace(/_/g, " ")}`
        : humanModeLabel(node.config.mode);
    default:
      return "";
  }
}

// ── React Flow node/data types for the spatial journey canvas ───────────────

export type JourneyRFData = {
  journeyNode: JourneyNode;
  inbound: number;
  outbound: number;
  destinations: JourneyNodeDestination[];
  isEntry: boolean;
  onOpen: (id: string) => void;
  /** Derived capability metadata (NODE-1E). Optional so the canvas renders without it. */
  capability?: JourneyNodeCapability;
};
export type JourneyRFNode = Node<JourneyRFData, "journeyNode">;

export type JourneyGroupData = { label: string; accent: string };
export type JourneyGroupRFNode = Node<JourneyGroupData, "journeyGroup">;

export type AnyJourneyRFNode = JourneyRFNode | JourneyGroupRFNode;

// ── Journey derivation (no persistence — NODE-1C owns storage) ──────────────

function isArchived(script: OfMessageScript): boolean {
  return Boolean(script.builder_config?.workspace?.archivedAt);
}

/** Emma / moonsiren's New Subscriber funnel is the NODE-1A acceptance case. */
export function isEmmaPlaybook(script: OfMessageScript, creatorName: string | null): boolean {
  const name = (script.name ?? "").toLowerCase();
  const creator = (creatorName ?? "").toLowerCase();
  return creator.includes("moonsiren") || /new subscriber/.test(name);
}

export function channelKindFromTrigger(trigger: string | null | undefined): JourneyChannelKind {
  const value = (trigger ?? "").toLowerCase();
  if (value.includes("instagram") || value.includes("ig_")) return "instagram";
  if (value.includes("email") || value.includes("mail")) return "email";
  if (value.includes("web") || value.includes("chat") || value.includes("widget")) return "web_chat";
  return "onlyfans";
}

function scriptHasHumanHandoff(script: OfMessageScript): boolean {
  // Approval-gated playbooks route to a person; that is the journey-level signal
  // for a Human node. Deeper detection is not needed here (Emma is handled
  // explicitly, and richer inference belongs to NODE-1C/1D).
  return Boolean(script.requires_approval);
}

/**
 * Derive a minimal journey for any opened playbook when it is not the Emma
 * acceptance case: a Channel entry inferred from the trigger, a Conversation
 * node that references the existing script (nodeFlowRef), and a Human handoff
 * when the script requires approval. Positions are spatial, not a straight line.
 */
export function deriveJourneyFromScript(script: OfMessageScript, creatorName: string | null): PlaybookJourney {
  const channel = channelKindFromTrigger(script.trigger_event_type);
  const withHuman = scriptHasHumanHandoff(script);
  const now = script.updated_at ?? new Date().toISOString();

  const channelNode: JourneyNode = {
    id: "channel-entry",
    class: "channel",
    label: channelLabel(channel),
    position: { x: 60, y: 200 },
    contract: {
      inputs: [],
      outputs: [{ key: "provisional_subscriber_ref", label: "Provisional subscriber reference" }],
      destinations: [{ key: "inbound", label: "Inbound" }]
    },
    config: { channel, accountLabel: creatorName ?? undefined, provisionalIdentityKey: `${channel}_ref` }
  };

  const conversationNode: JourneyNode = {
    id: "conversation-main",
    class: "conversation",
    label: playbookTitle(script),
    position: { x: 400, y: 200 },
    nodeFlowRef: { kind: "script", scriptId: script.id, scriptVersion: script.version_number ?? undefined },
    contract: {
      inputs: [{ key: "provisional_subscriber_ref", label: "Provisional subscriber reference", required: true }],
      outputs: [
        { key: "conversation_state", label: "Conversation state" },
        { key: "latest_interpretation", label: "Latest interpretation" }
      ],
      destinations: withHuman
        ? [
            { key: "handoff", label: "Hand off to human" },
            { key: "terminal", label: "Ended" }
          ]
        : [{ key: "terminal", label: "Ended" }]
    },
    config: { minTurns: 3, maxTurns: 6, surface: [...CONVERSATION_SURFACE_STAGES] }
  };

  const nodes: JourneyNode[] = [channelNode, conversationNode];
  const connections = [
    { id: "edge-channel-conversation", from: { nodeId: channelNode.id, port: "inbound" }, to: { nodeId: conversationNode.id }, label: "Inbound" }
  ];

  if (withHuman) {
    const humanNode: JourneyNode = {
      id: "human-handoff",
      class: "human",
      label: "Human Handoff",
      position: { x: 740, y: 200 },
      contract: {
        inputs: [{ key: "conversation_state", label: "Conversation state", required: true }],
        outputs: [{ key: "queue_item", label: "Queue item" }],
        destinations: [{ key: "queued", label: "Queued for operator" }]
      },
      config: { mode: "handoff", queueKey: "review_queue" }
    };
    nodes.push(humanNode);
    connections.push({
      id: "edge-conversation-human",
      from: { nodeId: conversationNode.id, port: "handoff" },
      to: { nodeId: humanNode.id },
      label: "Handoff"
    });
  }

  return {
    id: `journey-${script.id}`,
    creatorId: script.creator_id,
    title: playbookTitle(script),
    description: script.description ?? undefined,
    status: isArchived(script) ? "archived" : script.status === "active" ? "active" : "draft",
    version: script.version_number ?? 1,
    createdAt: script.created_at ?? now,
    updatedAt: now,
    graph: {
      schemaVersion: 1,
      selectedNodeId: conversationNode.id,
      nodes,
      connections,
      viewport: { x: 0, y: 0, zoom: 0.9 }
    }
  };
}

export function playbookTitle(script: OfMessageScript): string {
  return (script.name ?? "Journey").replace(/\bScripts\b/g, "Conversation Flows").replace(/\bScript\b/g, "Flow");
}
