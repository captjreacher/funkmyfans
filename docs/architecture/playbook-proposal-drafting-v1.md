# Playbook Proposal Drafting v1

Creator Intelligence Projection v1 imports FYV-style creator intelligence as immutable source snapshots and projects FMF-owned opportunities into `creator_intelligence_opportunity_projections`.

Playbook Proposal Drafting v1 adds a review artifact layer only:

- Intelligence informs proposals.
- Proposals are stored in `creator_playbook_proposals`.
- Proposals reference the creator, immutable intelligence snapshot, and selected opportunity projection.
- Proposal payloads describe a proposed journey, voice, guardrails, steps, forks, endpoints, rationale, confidence, and source references.
- Accepted proposals are still not executable automation.

The proposal table is intentionally separate from active runtime tables:

- It does not write `of_message_scripts`.
- It does not write `of_message_script_steps`.
- It does not write `of_automation_rules`.
- It does not write `of_automation_runs`.
- It does not create `of_conversation_instances` or outbound messages.

`POST /api/creators/:id/intelligence/opportunities/:opportunityId/proposals` creates a deterministic draft proposal from one available opportunity. It is idempotent for active drafts by returning the existing draft for the same creator and opportunity. A new draft can be created after the previous one is dismissed.

`PATCH /api/playbook-proposals/:proposalId` only changes proposal state to `accepted` or `dismissed`. Acceptance records operator intent for a later sprint. Runtime conversion, script generation, activation, queue execution, and auto-send behavior remain explicitly out of scope.

Runtime conversion is a later sprint that should define a separate, auditable path from accepted proposal to script/playbook/runtime assets.
