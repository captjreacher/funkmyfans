# NSP-2 Builder Capability Gap Review

Status: design review artifact

Source of truth: `docs/playbooks/new-subscriber-conversation-map-v0.1.md`

## Purpose

This document reviews the current Playbook Builder against the accepted NSP-1 New Subscriber conversation map.

The goal is to determine the minimum Builder capability required to represent NSP-1 faithfully.

This is review only. It does not implement Builder, runtime, database, queue, archetype, billing, or production data changes.

## Current Builder Capability Summary

### Authoring Surfaces

There are two relevant authoring surfaces:

- The newer visual Playbooks flow builder in `apps/creator-cockpit/src/pages/Playbooks.tsx`.
- The older script/playbook sequence editor in `apps/creator-cockpit/src/pages/Scripts.tsx` and `apps/creator-cockpit/src/components/ScriptBuilderPanel.tsx`.

The visual flow builder is the better fit for NSP-1. It supports node authoring, connections, validation, save/publish, and builder simulation.

The older sequence editor exposes more raw step fields in places, including message generation mode and stop rules, but it is less faithful for authored flow shape and, in one component path, does not preserve full workspace config. NSP-1 implementation should choose one authoring surface and avoid relying on mixed behavior.

### Persistence Model

Playbooks/scripts are stored as:

- `of_message_scripts` for the script/playbook container.
- `of_message_script_steps` for ordered steps.
- `of_message_scripts.builder_config` for variables and workspace metadata.
- `builder_config.workspace.visualBuilder` for the visual flow graph.

Step model currently supports:

- `message`
- `follow_up`
- `question`
- `branch`
- `wait`
- `set_variable`
- `end`

Step metadata currently supports useful extensions:

- `kind`
- `label`
- `nodeKey`
- `variableKey`
- `variableValue`
- `waitForReply`
- `waitForPurchase`
- `branchRules`
- `messageGenerationMode`
- `ppvTitle`
- `ppvPrice`
- `stopConditions`
- `notes`

### Visual Builder Nodes

The visual builder exposes node types grouped as conversation, AI, logic, human, commerce, and timing.

Relevant node types already exist:

- message
- ask question
- wait
- draft reply
- generate response
- analyse conversation
- classify intent
- if/else
- branch
- switch
- filter
- approve
- assign
- pause
- escalate
- PPV offer
- bundle
- custom content
- renew subscription
- delay
- schedule
- expiry
- end

This is enough vocabulary to describe most NSP-1 concepts, but not all of it compiles faithfully today.

### Branch Semantics

The stored step metadata supports multiple `branchRules`. The runtime evaluates rules in order and routes to the first matching rule. If none match, it uses fallback or the next step.

However, the visual flow compiler currently reduces branch-like nodes to one `yes` rule plus a `no` fallback. The visual UI also exposes branch handles as yes/no or fallback path. This means the underlying model can represent response-class routing, but the visual Builder cannot author it cleanly as a multi-class switch today.

### Message Steps

Message, follow-up, and question steps render templates with variables and create outbound messages.

Question steps are special: after sending, runtime enters `waiting_reply`.

Message generation has an existing `messageGenerationMode` concept with `template` and `ai_generated`. Visual builder sets AI-category nodes as `ai_generated`; the older editor exposes a per-step selector.

### Wait And Timing Steps

Runtime supports:

- delay waits with `waiting_delay`
- reply waits through question steps with `waiting_reply`
- purchase waits through `waitForPurchase`
- retry delays after failed sends

The visual builder has wait, delay, schedule, and expiry nodes. In the current compiler, wait maps to a wait step, delay/expiry map to follow-up/wait-ish timing behavior, and question steps drive reply waits.

There is no Builder-specific guardrail limiting the number of silence follow-ups.

### PPV Steps

The visual builder has a PPV offer node and runtime recognizes PPV metadata through `ppvTitle`, `ppvPrice`, and offer-like message text.

Runtime supports waiting for purchase status through `waitForPurchase`.

Nothing requires every path to include PPV. The current seeded New Subscriber Funnel forces a PPV path by design, but the Builder model can route around PPV if branches are authored that way.

### Simulation Behavior

Builder simulation can:

- start a simulation against a selected script
- display timeline state
- send a simulated subscriber reply
- simulate purchase success/failure
- approve AI through queue item actions
- send a manual operator reply
- ignore a queue item

This is enough to simulate NSP-1 branches if the playbook can be authored and compiled into the stored step model.

Simulation currently depends on runtime semantics and queue item creation; it is not a separate Builder-only engine.

### Validation

Visual builder validation currently checks:

- one trigger
- missing required fields
- unconnected nodes
- no outgoing paths
- approval destination on approval nodes
- yes/no paths for branch nodes
- reachability
- cycles as warnings

This validation is useful but too binary for NSP-1 multi-class response routing. It currently expects branch nodes to have yes/no paths even when a switch-like node should have many named branches.

### Activation Behavior

The visual builder can save, publish, and toggle active/inactive status. Publishing saves the compiled flow and then marks the script active.

Automation activation/rule ownership remains outside the Builder. NSP-1 should not require changing seed logic or rule seeding.

### Existing Outcome, Handoff, Queue, And Review Concepts

Existing concepts:

- Conversation runtime statuses include `waiting_reply`, `waiting_approval`, `completed`, `cancelled`, and `failed`.
- Conversation instances have `completion_reason`.
- Runtime creates queue items for approval/human review needs in the canonical conversation queue.
- Queue owns work items and operator actions.
- Creator/agency settings and outbound policy decide approval downgrade and auto-send safety.

Missing:

- A compact terminal `outcomeKey` such as `ppv_interest` or `nurture_follow_up_later` on end/handoff nodes.
- A clear mapping from terminal playbook outcome to a Conversation Opportunity.

That mapping should not live wholly in the Builder.

## Gap-By-Gap Decisions

### 1. Response-Class Routing

Decision: REQUIRED BEFORE NSP IMPLEMENTATION

#### Current Capability

The model and runtime can evaluate multiple `branchRules` on a branch step.

The visual builder has `classify_intent`, `branch`, and `switch` node types, and condition fields can reference variables.

The visual compiler and UI are the limiting parts:

- visual branch authoring is effectively yes/no
- compiler emits one branch rule for branch-like nodes
- validation expects yes/no paths
- there is no response-class option set for NSP-1 classes

#### NSP-1 Requirement

NSP-1 requires routing after a fan reply by classes such as:

- warm / enthusiastic
- short / low effort
- compliment
- flirtatious
- curious about creator
- asks for content
- purchase intent
- price objection
- boundary-testing
- off-topic
- no interest / disengaged

The playbook does not need a new runtime interpretation engine inside the Builder. It needs to author a route based on a variable such as `response_class`, where Conversation Interpretation or an AI/classifier step supplies the value.

#### Gap

The missing Builder capability is multi-class authoring, not the idea of branching itself.

The visual Builder cannot yet author a switch node with many labelled response-class paths and compile those labels into multiple `branchRules`.

#### Ownership

- Builder: author a classifier/switch shape and compile multiple branch rules.
- Playbook model: store response-class variable and branch metadata.
- Conversation Interpretation: own actual interpretation of fan messages.
- Runtime: evaluate stored branch rules, which it already largely does.

#### Minimum Change

Add a focused visual Builder capability:

- Let `switch` or `branch` nodes define multiple named cases.
- Compile each case into `metadata.branchRules`.
- Allow a fallback path.
- Provide a select list or reusable constants for NSP response-class values.
- Relax validation so switch nodes do not require yes/no paths.

Do not create a full conversation taxonomy system in the Builder.

### 2. Multi-Turn Conversation State

Decision: OWNED ELSEWHERE, WITH A SMALL BUILDER DEPENDENCY

#### Current Capability

Runtime already stores conversation variables, current step, next step, waiting reason, waiting status, and resume events.

Question steps can wait for replies. Resume events populate variables such as last reply text and actor. Set-variable steps can set variables. Branch steps can route based on variables.

Simulation can send replies into a waiting conversation.

#### NSP-1 Requirement

NSP-1 requires:

- opening message
- fan response classification
- creator response
- next fan response classification
- next creator response
- outcome or further fork

This requires state such as `response_class`, `next_response_class`, `fan_preference`, `purchase_intent`, and maybe `no_response_followup_count`.

#### Gap

The current runtime has the generic state container, but NSP-1 needs an interpretation/resume convention that turns each inbound reply into the expected response-class variable before the next branch.

The Builder only needs to express where those classification points occur and which variable is read.

#### Ownership

- Conversation Interpretation: classify inbound messages.
- Runtime/compiler: pass classification outputs into conversation variables on resume.
- Builder: place classifier nodes and branch nodes in the playbook.
- Playbook model: store variable names and branch conditions.

#### Minimum Change

No broad Builder state system is required now.

The smallest Builder dependency is the same as response-class routing: a way to author classifier output variable names and branch on them. Runtime and Conversation Interpretation own reliable population of those variables.

### 3. Explicit Outcome Metadata

Decision: REQUIRED BEFORE NSP IMPLEMENTATION

#### Current Capability

Visual `end` nodes have an `outcome` config field. Conversation instances have `completion_reason`.

Runtime marks completion with a textual reason, such as "End conversation step reached."

The revenue journey model has `expected_outcome`, but that is not terminal playbook outcome metadata.

#### NSP-1 Requirement

NSP-1 needs terminal or handoff outcomes:

- engaged relationship
- profile/content exploration
- conversion opportunity detected
- PPV interest
- subscription upsell opportunity
- one-to-one opportunity
- nurture / follow up later
- no response
- closed / disengaged
- human review required

To build and simulate NSP-1, the minimum requirement is to see which terminal outcome a path reached.

#### Gap

The outcome value is not clearly compiled into step metadata or surfaced in runtime completion history. It is currently visual-builder config only unless preserved in `visualBuilder`.

There is no reliable `outcomeKey` on the stored end step.

#### Ownership

- Builder: author outcome key/label on end and handoff nodes.
- Playbook model: persist outcome metadata on the terminal step.
- Runtime: copy outcome key/label into completion reason/history.
- Conversation Opportunity and Queue: own any later mapping from outcome to operational work.

#### Minimum Change

Add terminal metadata only:

- `metadata.outcomeKey`
- `metadata.outcomeLabel` or reuse `label`
- optional `metadata.handoffType`

Runtime should record this as completion/handoff context. It does not need to create Opportunities in this sprint.

### 4. Archetype Selection

Decision: DEFER FOR BUILDER; SIMPLE PLAYBOOK METADATA IS ENOUGH NOW

#### Current Capability

`builder_config.workspace.styleKey` exists.

The Scripts page can select registry-backed playbook styles. Current registry styles are tone/generation modes, not creator archetypes.

There is no first-class archetype model.

#### NSP-1 Requirement

NSP-1 requires the playbook to use the Girl Next Door baseline and not claim historical MoonSiren enrichment.

It does not require entitlement, billing, or a full archetype system.

#### Gap

There is no clean `archetypeKey`. Overloading `styleKey` risks confusing creator archetype with playbook tone style.

#### Ownership

- Future Archetype model: first-class archetype taxonomy.
- Creator settings: creator defaults and AI behavior.
- Builder/Playbook model: may store selected archetype metadata for a playbook.
- Billing/entitlement: out of scope.

#### Minimum Change

For NSP implementation, store simple metadata in `builder_config.workspace`, such as:

```json
{
  "archetypeKey": "girl_next_door",
  "archetypeSource": "nsp_1_baseline"
}
```

This can be added as generic playbook metadata when implementation begins, but it is not a Builder capability blocker for authoring the map if messages are fixed templates.

If NSP-1 uses AI-generated branch responses, the archetype must be passed to the generation prompt by runtime/prompting, not interpreted by the Builder.

### 5. Human Review Semantics

Decision: ALREADY SUPPORTED FOR MINIMUM NSP, OWNED ELSEWHERE FOR POLICY

#### Current Capability

Builder node types include:

- approve
- assign
- pause
- escalate

Runtime creates approval queue items when outbound policy downgrades a step to approval. It records `waiting_approval`, creates an outbound draft, and creates a visible queue item in the conversation queue.

Creator and agency settings already influence approval policy:

- AI mode
- approval mode
- PPV approval
- custom request approval
- high-value/VIP approval
- restricted keywords
- quiet hours
- daily caps

#### NSP-1 Requirement

NSP-1 needs boundary, unsupported request, custom scope/pricing, and low-confidence paths to stop automation or require human review.

The Builder should represent the path; Queue should own the work item.

#### Gap

Minimum path representation exists. The gap is semantic clarity:

- Human review reason should be visible in node metadata.
- A review path should stop or pause automation instead of continuing to follow-ups.
- Boundary classification belongs to Conversation Interpretation.

#### Ownership

- Builder: author a human review/handoff node with reason metadata.
- Runtime: pause/wait and create queue item when review is needed.
- Queue: own assignment and operator workflow.
- Creator settings/outbound policy: own approval rules.
- Conversation Interpretation: own boundary/unsupported classification.

#### Minimum Change

No new Builder primitive is required.

For faithful NSP implementation, use existing approve/pause/escalate nodes and persist reason metadata such as `reviewReason = unsupported_request` or `custom_scope_review`.

If the existing visual compiler maps these human nodes to ordinary message/wait steps without enough metadata, improve metadata preservation in the focused Builder sprint.

### 6. Silence And Timing Guardrails

Decision: DEFER BUILDER GUARDRAILS; REQUIRED RULES CAN BE AUTHORED NOW

#### Current Capability

Builder and runtime support:

- delay steps
- wait steps
- question steps that wait for reply
- waiting statuses
- simulation reply controls
- max sends per fan at script level

#### NSP-1 Requirement

NSP-1 silence logic:

- first no-response follow-up
- optional second no-response follow-up
- stop after two unanswered creator messages after opening

#### Gap

The current Builder can author the follow-up sequence, but it does not enforce a "maximum two silence follow-ups" rule or reason about silence paths as a first-class concept.

Runtime also does not appear to expose a dedicated no-response counter for this playbook.

#### Ownership

- Builder: optional validation warning for too many silence follow-ups.
- Runtime: actual waiting/resume/timeout semantics.
- Playbook model: can encode stop conditions and explicit end path.

#### Minimum Change

For this single playbook, use existing wait/delay/end primitives and author the silence path explicitly.

Do not block NSP implementation on guardrail validation. Add a future Builder warning only if repeated playbook authoring makes this error likely.

### 7. Non-Forced PPV Paths

Decision: ALREADY SUPPORTED AFTER RESPONSE-CLASS ROUTING IS FIXED

#### Current Capability

PPV offer nodes exist. Branches can route to or around PPV. End nodes can close non-PPV paths. Custom content and renew subscription nodes also exist.

The current seeded New Subscriber Funnel forces PPV quickly, but that is a seed design choice, not a Builder limitation.

#### NSP-1 Requirement

NSP-1 must allow:

- relationship building without sale
- content exploration
- PPV interest
- subscription upsell
- one-to-one opportunity
- nurture/follow-up
- closed/disengaged

#### Gap

No dedicated PPV gap exists. The only blocker is multi-class routing and outcome labeling.

#### Ownership

- Builder: author optional route paths.
- Runtime: execute selected path.
- Conversation Opportunity/Queue: own downstream revenue opportunities.

#### Minimum Change

No PPV-specific Builder change is required.

Use optional PPV routing from `purchase_intent` or content paths. Do not make PPV a required path.

### 8. Draft-vs-Template Handling

Decision: DEFER FOR THIS SINGLE PLAYBOOK IF USING TEMPLATES; REQUIRED IF USING AI-GENERATED BRANCH COPY

#### Current Capability

The model supports `messageGenerationMode = template | ai_generated`.

The older Scripts editor exposes this per step. The visual builder infers AI-generated mode from AI-category nodes and template mode from message nodes.

Runtime downgrades AI-generated low-confidence output to `draft_for_approval` when `ai_confidence < 75`, and outbound policy can require approval for many reasons.

However, current `set_variable` AI steps are not true LLM generation. Runtime resolves known placeholders such as `__derive_from_last_reply__` and `__draft_from_last_reply__` in a deterministic/scaffold way.

#### NSP-1 Requirement

NSP-1 examples are branch examples, not exact scripts for every fan sentence. A faithful high-end implementation would distinguish:

- fixed template messages
- classifier prompts
- archetype-guided draft responses
- human-review fallbacks

But NSP-1 can be implemented as a deterministic map with fixed Girl Next Door response templates for each response class.

#### Gap

The draft-vs-template problem is not mandatory for a first implementation if the playbook uses fixed branch templates.

It becomes required only if the implementation promises AI-authored personalized branch replies using archetype context.

#### Ownership

- Builder: expose generation mode and prompt text clearly.
- Runtime/prompting: actually generate drafts.
- Creator settings: approval and AI mode defaults.
- Conversation Interpretation: classification input.

#### Minimum Change

For first NSP implementation:

- Use template messages for branch responses.
- Use classifier/set-variable steps only for response class routing.
- Treat AI-authored copy as deferred.

If AI drafting is included in the first implementation, add a focused Builder and runtime prompt contract sprint. Do not bury it inside NSP playbook authoring.

## Special Questions

### 1. Does response-class routing require a new Builder primitive, or can existing branch conditions represent it?

Existing branch conditions and runtime `branchRules` can represent it.

The Builder does not need a new domain primitive, but the visual Builder needs a focused multi-case branch/switch authoring capability. The minimum is to let a switch node author multiple cases against `response_class` and compile them into existing `branchRules`.

### 2. Does multi-turn state require Builder work now, or is it primarily a future runtime concern?

It is primarily runtime and Conversation Interpretation work.

The Builder needs only to express classification points, variable names, waits/questions, and branches. It should not become the state engine.

### 3. What is the minimum outcome representation needed to build and simulate NSP-1?

Minimum:

- terminal `outcomeKey`
- human-readable outcome label
- optional handoff/review reason

This can live in terminal step metadata and conversation history/completion detail. It does not need full Opportunity creation in the first Builder sprint.

### 4. Can Archetype selection be simple Playbook metadata for now without implementing the full Archetype system?

Yes.

For NSP-1, `archetypeKey = girl_next_door` can be playbook metadata. Full archetype registry, entitlement, billing, and historical enrichment are out of scope.

### 5. How should human-review paths be represented without making the Builder own Queue?

Use existing human nodes:

- approve
- pause
- escalate
- assign, if needed

The Builder should store review intent and reason. Runtime creates queue items. Queue owns assignment, operator actions, and resolution.

### 6. Can existing wait steps represent silence follow-ups safely, or are additional guardrails required?

Existing waits/delays/questions can represent the silence path for this single playbook.

Additional Builder guardrails are useful but deferrable. The NSP-1 implementation can manually author exactly two follow-ups and then an end outcome.

### 7. Does PPV need a dedicated forced path, or can NSP-1 use optional routing based on detected interest?

NSP-1 should use optional routing based on detected interest.

No forced PPV path is required. The current seeded flow forces PPV by design, not because the Builder requires it.

### 8. What exactly is the draft-vs-template problem, and must it be solved before implementing this single playbook?

The problem is whether branch responses are fixed approved templates or AI-generated drafts guided by archetype, branch intent, and fan context.

It does not need to be solved before implementing this single playbook if NSP-1 uses fixed template responses per response class.

It must be solved before claiming archetype-guided AI message generation.

## Minimum Required Changes

Only two focused Builder/model capabilities are required before NSP-1 can be faithfully implemented in the Builder:

1. Multi-case response-class routing in the visual Builder.
2. Terminal outcome metadata that persists from Builder to stored steps and simulation/runtime history.

Everything else is either already supported, deferrable, or owned outside the Builder.

### Required Change 1: Multi-Case Switch Authoring

Smallest viable scope:

- Use the existing `switch` node type.
- Add a case list to node config.
- Each case has label, condition value, and target node.
- The switch reads one variable, initially `response_class`.
- Compile cases to `metadata.branchRules`.
- Compile fallback to `fallback_step_id` or next path.
- Update validation for switch nodes so many named cases are valid.

Do not introduce a new runtime branch model.

### Required Change 2: Terminal Outcome Metadata

Smallest viable scope:

- Add outcome key/label fields to end node config.
- Compile outcome fields into step metadata.
- Preserve outcome metadata on save/load.
- Show outcome in builder simulation timeline or completion panel.
- Runtime can copy outcome into `completion_reason` or history payload.

Do not create Conversation Opportunities automatically in this sprint.

## Deferred Capabilities

Safely deferred:

- First-class archetype registry and entitlement model.
- Billing and archetype access.
- Historical MoonSiren style enrichment.
- Builder guardrails for maximum silence follow-up count.
- Full response-class taxonomy registry beyond NSP-1 constants.
- Full prompt builder for archetype-guided AI-generated replies.
- Automatic mapping from terminal outcomes to Conversation Opportunities.
- Queue routing design beyond using existing review/approval queue behavior.
- Reporting dashboards for outcome conversion rates.

## Ownership Decisions

| Capability | Decision | Owner |
| --- | --- | --- |
| Response-class values | Required as authoring constants now; taxonomy later | Builder for constants, Conversation Interpretation for meaning |
| Response classification | Not Builder-owned | Conversation Interpretation |
| Branch execution | Already supported | Runtime/compiler |
| Multi-case branch authoring | Required | Builder |
| Multi-turn state | Mostly already present | Runtime and Conversation Interpretation |
| Outcome keys | Required minimum | Builder and Playbook model |
| Outcome-to-opportunity mapping | Deferred | Conversation Opportunity / Queue integration |
| Archetype selection | Simple metadata now | Playbook model, future Archetype model |
| Human review policy | Already exists outside Builder | Creator settings, agency settings, runtime policy |
| Queue work ownership | Outside Builder | Queue |
| Silence timeout execution | Outside Builder | Runtime |
| Silence guardrail validation | Deferred | Builder |
| PPV optional routing | Already supported | Builder/runtime |
| AI draft generation | Deferred for first template-based NSP | Runtime/prompting and Creator settings |

## Recommended Implementation Sequence

### Sprint 1: Focused Builder Fidelity Sprint

Goal:

- Make the existing Builder able to author and simulate NSP-1 faithfully using existing runtime primitives.

Scope:

1. Add multi-case `switch` authoring and compile it into existing `branchRules`.
2. Add NSP-1 response-class constants as local Builder options or playbook-template constants.
3. Add terminal outcome key/label metadata to end nodes.
4. Preserve outcome metadata through save/load.
5. Surface terminal outcome in builder simulation.
6. Verify that question -> reply -> classify -> switch -> response -> next question works in simulation.

Out of scope:

- New runtime branch model.
- New database tables.
- Archetype registry.
- Queue redesign.
- Auto Opportunity creation.
- AI-generated message drafting.

### Sprint 2: NSP-1 Playbook Implementation

Goal:

- Implement the accepted NSP-1 conversation map as a playbook using fixed Girl Next Door template copy and response-class routing.

Scope:

1. Create the New Subscriber conversation flow.
2. Use `archetypeKey = girl_next_door` as playbook metadata.
3. Use fixed templates for branch responses.
4. Use existing human review paths.
5. Use optional PPV routing only when purchase intent is detected.
6. Simulate major branches and terminal outcomes.

### Later Sprint: AI And Opportunity Enrichment

Only after the deterministic playbook works:

- Integrate Conversation Interpretation response classification as a formal service contract.
- Add archetype-guided AI drafting if needed.
- Map selected terminal outcomes into Conversation Opportunities.
- Add reporting and guardrail validation.

## Verdict

Can NSP-1 be implemented faithfully now?

YES - after one focused Builder sprint.

Reason:

The current model and runtime already contain most of the necessary primitives: steps, variables, branch rules, waits, reply waiting, purchase waiting, approval queue items, simulation actions, and PPV/custom/renewal nodes.

The blocker is narrower than a new architecture. The visual Builder needs to author and compile multi-class response routing, and it needs persistent terminal outcome metadata. With those two focused changes, NSP-1 can be implemented as a template-based Girl Next Door New Subscriber playbook without new database architecture, archetype entitlements, historical enrichment, queue redesign, or runtime reinvention.
