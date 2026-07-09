// COMPOSE-3 deterministic Instagram-entry + identity-resolution check.
//
// Proves the architectural path WITHOUT a browser or backend:
//   Instagram event
//     -> Channel: Instagram Entry (channel_source_entry)   [normalizeInstagramEvent]
//     -> provisional identity evidence                     [ProvisionalIdentity]
//     -> Identity Resolution (identity_resolution)          [resolveProvisionalIdentity]
//     -> downstream relationship context                   [projectRelationshipContextFromIdentity]
//
// The deterministic core lives in @funkmyfans/of-types and is dependency-free,
// so this check runs under Node's type stripping
// (node apps/creator-cockpit/scripts/compose3-instagram-identity-check.ts) and
// under tsx in CI. of-types is imported by RELATIVE path (not the bare package
// specifier) so no package resolution / node_modules is required in the sandbox.
// The Capability Registry + interpretation vocabulary are imported from src/lib
// (both type-only against of-types, hence dependency-free too).
//
// The HTTP ingestion route (POST /api/events/instagram), creator lookup, and
// of_events dedupe are exercised by the CI typecheck/build; the DB uniqueness
// that backs dedupe is the pre-existing unique index of_events (provider,
// provider_event_id) — see supabase/migrations/20260619000200_realtime_event_ingestion.sql.

import {
  INSTAGRAM_PROVIDER,
  INSTAGRAM_IDENTITY_JOURNEY_EXAMPLE,
  normalizeInstagramEvent,
  resolveProvisionalIdentity,
  projectRelationshipContextFromIdentity,
  type IdentityCandidate,
  type ProvisionalIdentity,
  type RelationshipContextProjection
} from "../../../packages/of-types/src/index.ts";
import { capabilityBindingState, getCapability, getCapabilityByRef } from "../src/lib/capabilityRegistry.ts";
import { CANONICAL_INTERPRETATION_SIGNALS } from "../src/lib/interpretationSignals.ts";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// ── Fixtures (deterministic) ────────────────────────────────────────────────
const VALID_IG_EVENT = {
  eventType: "instagram.dm_received",
  instagramAccountId: "ig-biz-emma",
  providerEventId: "ig-mid-1001",
  occurredAt: "2026-07-09T09:00:00.000Z",
  user: { id: "ig-user-777", username: "AceFan" },
  message: { text: "hey! love your latest post" }
};
const RECEIVED_AT = "2026-07-09T09:00:01.000Z";

// Existing canonical relationships used as resolution candidates. Note the
// deliberate traps: the same external id/username on OnlyFans and on a DIFFERENT
// creator — neither may match an Instagram/creator-emma provisional identity.
const CANDIDATES: IdentityCandidate[] = [
  { subscriberRelationshipId: "rel-ace", subscriberId: "sub-ace", creatorId: "creator-emma", platformProvider: "instagram", externalId: "ig-user-777", username: "acefan" },
  { subscriberRelationshipId: "rel-quiet", subscriberId: "sub-quiet", creatorId: "creator-emma", platformProvider: "instagram", externalId: "ig-user-888", username: "quietFan" },
  { subscriberRelationshipId: "rel-of", subscriberId: "sub-of", creatorId: "creator-emma", platformProvider: "onlyfans", externalId: "of-only-321", username: "ofonly" },
  { subscriberRelationshipId: "rel-other-creator", subscriberId: "sub-x", creatorId: "creator-other", platformProvider: "instagram", externalId: "ig-user-777", username: "acefan" }
];

const prov = (over: Partial<ProvisionalIdentity>): ProvisionalIdentity => ({
  sourcePlatform: INSTAGRAM_PROVIDER,
  externalId: null,
  username: null,
  creatorId: "creator-emma",
  creatorExternalId: "ig-biz-emma",
  sourceEventRef: "ig-mid-1001",
  evidenceAt: RECEIVED_AT,
  resolutionState: "provisional",
  ...over
});

// ── 1. identity_resolution resolves from the registry ────────────────────────
const identityCap = getCapability("identity_resolution");
check("identity_resolution resolves from the registry", Boolean(identityCap));
check("identity_resolution is identity category + system owner", identityCap?.category === "identity" && identityCap?.owner === "system", `${identityCap?.category}/${identityCap?.owner}`);
check("identity_resolution does not require a human", identityCap?.requiresHuman === false);
check("identity_resolution has no concrete Node Flow (implementationRefs empty)", (identityCap?.implementationRefs?.length ?? 0) === 0);
check("identity_resolution consumes provisional_identity", Boolean(identityCap?.inputKeys.includes("provisional_identity")));
check("identity_resolution emits identity_context", Boolean(identityCap?.outputKeys.includes("identity_context")));

// ── 2/3. Instagram is a Channel node using channel_source_entry ──────────────
const nodes = INSTAGRAM_IDENTITY_JOURNEY_EXAMPLE.graph.nodes;
const igNode = nodes.find((n) => n.class === "channel");
const identityNode = nodes.find((n) => n.class === "identity");
const welcomeNode = nodes.find((n) => n.class === "conversation");
const humanNode = nodes.find((n) => n.class === "human");
check("reference journey has an Instagram Channel node", igNode?.class === "channel" && igNode?.config.channel === "instagram");
check("the Channel node uses channel_source_entry", igNode?.capabilityRef?.capabilityKey === "channel_source_entry");
check("the Channel node emits a provisional identity output", Boolean(igNode?.contract.outputs.some((o) => o.key === "provisional_identity")));
check("the Channel node holds NO identity-resolution logic (distinct capability)", igNode?.capabilityRef?.capabilityKey !== "identity_resolution");

// ── 4. Instagram ingestion accepts a valid fixture ───────────────────────────
const good = normalizeInstagramEvent(VALID_IG_EVENT, { receivedAt: RECEIVED_AT });
check("valid Instagram fixture is accepted", good.ok === true);
check("normalized provider is instagram", good.ok && good.event.provider === INSTAGRAM_PROVIDER);
check("normalized event type preserved", good.ok && good.event.eventType === "instagram.dm_received");
check("normalization is deterministic (same input -> same output)", eq(normalizeInstagramEvent(VALID_IG_EVENT, { receivedAt: RECEIVED_AT }), normalizeInstagramEvent(VALID_IG_EVENT, { receivedAt: RECEIVED_AT })));

// ── 5. Invalid payloads fail deterministically ───────────────────────────────
const notObj = normalizeInstagramEvent("nope");
check("non-object payload -> 400", notObj.ok === false && notObj.statusCode === 400);
const noType = normalizeInstagramEvent({ instagramAccountId: "ig-biz-emma" });
check("missing event type -> 400 (field eventType)", noType.ok === false && noType.statusCode === 400 && noType.field === "eventType");
const noCreator = normalizeInstagramEvent({ eventType: "instagram.dm_received" });
check("missing creator reference -> 400 (field creatorId)", noCreator.ok === false && noCreator.statusCode === 400 && noCreator.field === "creatorId");
check("invalid payload failure is deterministic", eq(normalizeInstagramEvent("nope"), normalizeInstagramEvent("nope")));

// ── 6. Provider event id preserved (necessary condition for dedupe) ──────────
check("provider event id preserved from top-level", good.ok && good.event.providerEventId === "ig-mid-1001");
const nestedMid = normalizeInstagramEvent({ eventType: "instagram.dm_received", creatorId: "creator-emma", message: { mid: "mid-xyz" } }, { receivedAt: RECEIVED_AT });
check("provider event id preserved from nested message.mid", nestedMid.ok && nestedMid.event.providerEventId === "mid-xyz");

// ── 7. Source evidence is preserved ──────────────────────────────────────────
check("raw source evidence preserved verbatim", good.ok && eq(good.event.raw, VALID_IG_EVENT));
check("source provenance recorded (platform + account)", good.ok && good.event.source.platform === "instagram" && good.event.source.accountId === "ig-biz-emma");

// ── 8. A provisional identity is emitted without claiming resolution ─────────
check("provisional identity emitted", good.ok && Boolean(good.provisionalIdentity));
check("provisional identity is explicitly provisional (never claims resolution)", good.ok && good.provisionalIdentity.resolutionState === "provisional");
check("provisional identity carries the external evidence it had", good.ok && good.provisionalIdentity.externalId === "ig-user-777" && good.provisionalIdentity.username === "AceFan");
const noUserEvent = normalizeInstagramEvent({ eventType: "instagram.story_reply", creatorId: "creator-emma" }, { receivedAt: RECEIVED_AT });
check("provisional identity is still emitted with NO user evidence (nulls, not fabricated)", noUserEvent.ok && noUserEvent.provisionalIdentity.externalId === null && noUserEvent.provisionalIdentity.username === null && noUserEvent.provisionalIdentity.resolutionState === "provisional");

// ── 9. A known identity resolves deterministically ───────────────────────────
const byId = resolveProvisionalIdentity(prov({ externalId: "ig-user-777" }), CANDIDATES);
check("known external id resolves", byId.status === "resolved" && byId.method === "external_id_exact" && byId.confidence === 1);
check("resolution scoped to the right creator (not the same-id other-creator row)", byId.resolved?.subscriberRelationshipId === "rel-ace");
check("resolution is deterministic (same evidence -> same result)", eq(resolveProvisionalIdentity(prov({ externalId: "ig-user-777" }), CANDIDATES), byId));
const byName = resolveProvisionalIdentity(prov({ username: "AceFan" }), CANDIDATES);
check("known username resolves (case-insensitive, weaker confidence)", byName.status === "resolved" && byName.method === "username_exact" && byName.confidence === 0.9);

// ── 10. An unknown identity remains unresolved safely ────────────────────────
const unknown = resolveProvisionalIdentity(prov({ externalId: "ig-user-999", username: "ghost" }), CANDIDATES);
check("unknown identity is unresolved", unknown.status === "unresolved" && unknown.method === "none");
check("unresolved fabricates no contact/relationship", unknown.resolved === null);
check("unresolved records a warning", unknown.warnings.length > 0);
const crossPlatform = resolveProvisionalIdentity(prov({ externalId: "of-only-321" }), CANDIDATES);
check("cross-platform id is NOT matched (OnlyFans id vs Instagram evidence)", crossPlatform.status === "unresolved");
const noCreatorScope = resolveProvisionalIdentity(prov({ externalId: "ig-user-777", creatorId: null }), CANDIDATES);
check("missing creator context -> unresolved (cannot scope safely)", noCreatorScope.status === "unresolved" && noCreatorScope.warnings[0].includes("Creator context"));
check("empty candidate set -> unresolved (no throw)", resolveProvisionalIdentity(prov({ externalId: "ig-user-777" }), []).status === "unresolved");

// ── 11. Relationship context only through the established projection boundary ─
const projFields: (keyof RelationshipContextProjection)[] = ["identity_status", "identity_confidence", "downstream_usability", "known_sources", "relationship_posture", "relationship_signals", "commercial_signal_summary", "warnings"];
const resolvedProj = projectRelationshipContextFromIdentity(byId);
const unresolvedProj = projectRelationshipContextFromIdentity(unknown);
check("projection is a complete RelationshipContextProjection", projFields.every((f) => f in resolvedProj) && projFields.every((f) => f in unresolvedProj));
check("resolved projection is usable + exact", resolvedProj.identity_status === "exact" && resolvedProj.downstream_usability === "usable" && resolvedProj.identity_confidence === 1);
check("resolved projection records the known source", eq(resolvedProj.known_sources, ["instagram"]));
check("unresolved projection is safe + unusable + warned", unresolvedProj.identity_status === "unresolved" && unresolvedProj.downstream_usability === "unusable" && unresolvedProj.warnings.length > 0);
check("identity resolution does NOT fabricate relationship intelligence", resolvedProj.relationship_posture === null && eq(resolvedProj.relationship_signals, []) && resolvedProj.commercial_signal_summary === null);

// ── 12. capabilityRef remains independent of nodeFlowRef ─────────────────────
check("Instagram Channel node is capability_only (capabilityRef, no nodeFlowRef)", igNode ? capabilityBindingState(igNode) === "capability_only" : false);
check("Identity node is capability_only (identity_resolution, no Node Flow required)", identityNode ? capabilityBindingState(identityNode) === "capability_only" : false);
check("Identity node capabilityRef resolves independently of any flow", getCapabilityByRef(identityNode?.capabilityRef)?.capabilityKey === "identity_resolution");
check("Welcome node is capability_and_flow (both, independently)", welcomeNode ? capabilityBindingState(welcomeNode) === "capability_and_flow" : false);
check("Human review node is capability_only", humanNode ? capabilityBindingState(humanNode) === "capability_only" : false);
check("Identity node exposes resolved + unresolved paths", Boolean(identityNode?.contract.destinations.some((d) => d.key === "resolved")) && Boolean(identityNode?.contract.destinations.some((d) => d.key === "unresolved")));

// ── 13. No interpretation signal producer is replaced ────────────────────────
check("identity_resolution declares NO interpretation signals (it does not interpret)", (identityCap?.supportedInterpretationSignals?.length ?? 0) === 0);
check("canonical interpretation vocabulary is untouched (21 signals)", CANONICAL_INTERPRETATION_SIGNALS.length === 21);

// ── 14/15. No Opportunity / Queue creation in this path (capability guards) ──
check("identity_resolution emits no opportunity signal", !identityCap?.outputKeys.includes("opportunity_signal"));
check("identity_resolution emits no human-handoff/queue request", !identityCap?.outputKeys.includes("human_handoff_request"));
const channelCap = getCapability("channel_source_entry");
check("channel_source_entry emits no opportunity signal or interpretation input", !channelCap?.outputKeys.includes("opportunity_signal") && !channelCap?.outputKeys.includes("interpretation_input"));
check("channel_source_entry now advertises provisional_identity output", Boolean(channelCap?.outputKeys.includes("provisional_identity")));

// ── 16. Existing capability contract intact (COMPOSE-2 six still present) ─────
const six = ["channel_source_entry", "new_subscriber_welcome_discovery", "make_offer_ppv", "silence_follow_up", "boundary_safety_response", "human_handoff"];
check("the 6 COMPOSE-2 capabilities remain present", six.every((k) => Boolean(getCapability(k))));

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} — COMPOSE-3 Instagram-entry + identity-resolution check`);
if (failures > 0) process.exit(1);
