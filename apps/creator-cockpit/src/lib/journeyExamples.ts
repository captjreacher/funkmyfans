// Journey fixtures for NODE-1B. These are UI-level illustrative journeys used
// to drive the workspace without persistence (NODE-1C owns storage). The Emma
// acceptance case reuses the canonical NODE-1A example from @funkmyfans/of-types.

import { EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE, type OfMessageScript, type PlaybookJourney } from "@funkmyfans/of-types";
import { CONVERSATION_SURFACE_STAGES, deriveJourneyFromScript, isEmmaPlaybook, playbookTitle } from "./journey";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Bind the canonical Emma journey to a real script so drilling into the
 * Conversation node opens the existing New Subscriber Funnel builder underneath
 * (via nodeFlowRef). Execution of that script is unchanged.
 */
export function bindEmmaJourney(script: OfMessageScript, creatorName: string | null): PlaybookJourney {
  const journey = clone(EMMA_NEW_SUBSCRIBER_JOURNEY_EXAMPLE);
  journey.id = `journey-${script.id}`;
  journey.creatorId = script.creator_id;
  journey.title = playbookTitle(script);
  journey.description = creatorName ? `${creatorName}'s first automation` : journey.description;
  journey.status = script.builder_config?.workspace?.archivedAt ? "archived" : script.status === "active" ? "active" : "draft";
  journey.version = script.version_number ?? journey.version;
  for (const node of journey.graph.nodes) {
    if (node.class === "conversation") {
      node.nodeFlowRef = { kind: "script", scriptId: script.id, scriptVersion: script.version_number ?? undefined };
    }
    if (node.class === "channel" && creatorName) {
      node.config.accountLabel = `${creatorName} on ${node.config.channel === "onlyfans" ? "OnlyFans" : node.config.channel}`;
    }
  }
  return journey;
}

/** Selector used by the workspace: Emma acceptance case, else a derived journey. */
export function buildPlaybookJourney(script: OfMessageScript, creatorName: string | null): PlaybookJourney {
  if (isEmmaPlaybook(script, creatorName)) return bindEmmaJourney(script, creatorName);
  return deriveJourneyFromScript(script, creatorName);
}

/**
 * A larger, illustrative journey used for preview/design validation. Exercises
 * multiple entry points (two Channels), an Identity node, branching out of a
 * Conversation node, a Human node, and two spatial groups.
 *
 *   Instagram ─┐
 *              ├─► Identity Resolution ─► Qualification Chat ─┬─► OnlyFans Conversion
 *   Web chat ──┘                                             └─► Human Review
 */
export const INSTAGRAM_QUALIFICATION_JOURNEY_EXAMPLE: PlaybookJourney = {
  id: "journey-demo-instagram-qualification",
  creatorId: "creator-demo",
  title: "Instagram → OnlyFans Qualification",
  description: "Cross-channel acquisition, identity resolution, qualification and conversion.",
  status: "draft",
  version: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  graph: {
    schemaVersion: 1,
    selectedNodeId: "node-qualification-chat",
    groups: [
      { id: "acquisition", label: "Acquisition", colorKey: "#38bdf8" },
      { id: "conversion", label: "Conversion", colorKey: "#e66a8d" }
    ],
    nodes: [
      {
        id: "node-instagram",
        class: "channel",
        label: "Instagram",
        position: { x: 60, y: 110 },
        group: "acquisition",
        contract: {
          inputs: [],
          outputs: [{ key: "provisional_ig_ref", label: "Provisional Instagram reference" }],
          destinations: [{ key: "inbound", label: "Inbound DM" }]
        },
        config: { channel: "instagram", accountLabel: "Creator on Instagram", provisionalIdentityKey: "ig_handle" }
      },
      {
        id: "node-web-chat",
        class: "channel",
        label: "Web Chat",
        position: { x: 60, y: 330 },
        group: "acquisition",
        contract: {
          inputs: [],
          outputs: [{ key: "provisional_web_ref", label: "Provisional web reference" }],
          destinations: [{ key: "inbound", label: "Inbound chat" }]
        },
        config: { channel: "web_chat", accountLabel: "Link-in-bio chat", provisionalIdentityKey: "web_session" }
      },
      {
        id: "node-identity",
        class: "identity",
        label: "Identity Resolution",
        position: { x: 380, y: 220 },
        group: "acquisition",
        contract: {
          inputs: [{ key: "provisional_ref", label: "Provisional reference", required: true }],
          outputs: [{ key: "subscriber_id", label: "Canonical subscriber" }],
          destinations: [
            { key: "resolved", label: "Resolved" },
            { key: "needs_review", label: "Needs review" }
          ]
        },
        config: { resolution: "match_or_create", blockUntilResolved: true }
      },
      {
        id: "node-qualification-chat",
        class: "conversation",
        label: "Qualification Chat",
        position: { x: 720, y: 220 },
        group: "conversion",
        nodeFlowRef: { kind: "script", scriptId: "demo-script-qualification", scriptVersion: 1 },
        contract: {
          inputs: [{ key: "subscriber_id", label: "Canonical subscriber", required: true }],
          outputs: [
            { key: "conversation_state", label: "Conversation state" },
            { key: "intent", label: "Detected intent" }
          ],
          destinations: [
            { key: "qualified", label: "Qualified" },
            { key: "needs_review", label: "Needs review" }
          ]
        },
        config: { minTurns: 3, maxTurns: 6, surface: [...CONVERSATION_SURFACE_STAGES] }
      },
      {
        id: "node-onlyfans-conversion",
        class: "conversation",
        label: "OnlyFans Conversion",
        position: { x: 1060, y: 110 },
        group: "conversion",
        nodeFlowRef: { kind: "script", scriptId: "demo-script-conversion", scriptVersion: 1 },
        contract: {
          inputs: [{ key: "intent", label: "Detected intent", required: true }],
          outputs: [{ key: "conversion_outcome", label: "Conversion outcome" }],
          destinations: [{ key: "terminal", label: "Ended" }]
        },
        config: { minTurns: 3, maxTurns: 5, surface: [...CONVERSATION_SURFACE_STAGES] }
      },
      {
        id: "node-human-review",
        class: "human",
        label: "Human Review",
        position: { x: 1060, y: 360 },
        group: "conversion",
        contract: {
          inputs: [{ key: "conversation_state", label: "Conversation state", required: true }],
          outputs: [{ key: "queue_item", label: "Queue item" }],
          destinations: [{ key: "queued", label: "Queued for operator" }]
        },
        config: { mode: "review", queueKey: "qualification_review" }
      }
    ],
    connections: [
      { id: "edge-ig-identity", from: { nodeId: "node-instagram", port: "inbound" }, to: { nodeId: "node-identity" }, label: "Instagram" },
      { id: "edge-web-identity", from: { nodeId: "node-web-chat", port: "inbound" }, to: { nodeId: "node-identity" }, label: "Web chat" },
      { id: "edge-identity-qualification", from: { nodeId: "node-identity", port: "resolved" }, to: { nodeId: "node-qualification-chat" }, label: "Resolved" },
      { id: "edge-qualification-conversion", from: { nodeId: "node-qualification-chat", port: "qualified" }, to: { nodeId: "node-onlyfans-conversion" }, label: "Qualified" },
      { id: "edge-qualification-human", from: { nodeId: "node-qualification-chat", port: "needs_review" }, to: { nodeId: "node-human-review" }, label: "Needs review" }
    ],
    viewport: { x: 0, y: 0, zoom: 0.75 }
  }
};
