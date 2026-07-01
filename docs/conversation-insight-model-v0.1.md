# Conversation Insight Model v0.1

EXPLORATORY

NOT APPROVED

NOT PART OF THE ARCHITECTURE FREEZE

## Purpose

This document investigates whether Conversation Insight should become a first-class business concept before COP-2 begins.

The research question is deliberately open:

- Should Conversation Insight exist as a canonical business object?
- Or is the current architecture already sufficient without adding another layer?

This note does not modify the approved architecture.
It does not redefine the product.
It does not prescribe implementation.

## Background

The approved business hierarchy is currently:

Conversation

|

Conversation Interpretation

|

Conversation Opportunity

|

Queue

|

Playbook

|

Template

|

Script

|

HOST Runtime

The hypothesis under review is that not every discovery made during a conversation is immediately actionable.

Some discoveries become work.
Some become long-lived knowledge.
Some are only evidence for a later decision.

Conversation Insight is the candidate concept for that middle layer.

## Research Question

Should Conversation Insight exist as a first-class business object?

The answer may still be no.

It is entirely acceptable to conclude that the current architecture already covers the needed behavior through Conversation Interpretation, Subscriber Profile, and Conversation Opportunity.

## Candidate Model

If Conversation Insight were adopted, the candidate hierarchy would be:

Message

|

Conversation

|

Conversation Interpretation

|

Conversation Insight

|

Conversation Opportunity

|

Queue

|

Playbook

|

Template

|

Script

|

HOST Runtime

## Layer Responsibilities

| Layer | Responsibility |
| --- | --- |
| Message | The atomic inbound or outbound utterance or signal. |
| Conversation | The ongoing interaction record across messages and state. |
| Conversation Interpretation | The deterministic classification and normalization of what the conversation means. |
| Conversation Insight | A durable fact, signal, or learned understanding derived from the conversation that may or may not require action. |
| Conversation Opportunity | A business reason to do work now. |
| Queue | Operational ownership, prioritization, and work routing. |
| Playbook | The approved handling strategy for an opportunity. |
| Template | The reusable starting pattern for a playbook or script. |
| Script | The deterministic operational behavior for an approved playbook. |
| HOST Runtime | Execution of governed script behavior using HOST-owned primitives. |

## What Conversation Insight Would Be

If adopted, a Conversation Insight would be a durable business fact or interpretation derived from one or more messages in a conversation.

It would capture something that is useful to remember even if no immediate operational work is required.

Examples:

- A preference
- A recurring behavior
- A stable identity detail
- A long-lived risk signal
- A scheduling constraint
- A relationship characteristic
- A commercial habit

An Insight is not a queue item.
An Insight is not an opportunity.
An Insight is not a message.
An Insight is not the same thing as an event.

## Difference From Existing Concepts

### Conversation

- Conversation is the live interaction record.
- Conversation Insight would be a derived understanding about that interaction.
- Conversation is the container of context.
- Insight is one meaning extracted from the container.

### Event

- Event is the recorded signal that something happened.
- Insight is the interpretation of what that signal means over time.
- Events are temporal evidence.
- Insights are normalized meaning.

### Conversation Interpretation

- Conversation Interpretation classifies and normalizes what is happening now.
- Insight would persist what was learned.
- Interpretation is the process.
- Insight is the retained outcome of that process.

### Opportunity

- Opportunity is a business reason to do work.
- Insight may exist even when no work is needed.
- Opportunity is actionable.
- Insight may be informational only.

### Queue Item

- Queue Item owns operational work.
- Insight owns no work by itself.
- Queue Item should be generated from opportunities, not from arbitrary knowledge storage.

### Subscriber Profile

- Subscriber Profile is the broader record of the subscriber relationship.
- Insight might inform or enrich that profile.
- Insight should not automatically replace subscriber-owned facts unless ownership is explicit.

### Creator Profile

- Creator Profile is creator-scoped operational context.
- Insight might be relevant to a creator, but it is usually conversation-scoped first.
- Creator Profile should not absorb conversation-specific meaning without clear business intent.

## Lifetime

Conversation Insight is most plausibly one of the following:

- Persistent
- Derived
- Historical
- Knowledge
- Evidence

It is probably not purely transient if the concept is worth introducing at all.

### Why

- Persistent: useful insights should survive the conversation that revealed them.
- Derived: the insight is inferred from conversation signals rather than entered as a raw fact.
- Historical: the insight often matters because it was true at a moment in time.
- Knowledge: the value of the object is accumulated understanding, not just workflow routing.
- Evidence: some insights need provenance so they can be reviewed or challenged later.

The strongest candidate shape is a durable, provenance-backed knowledge object.

## Insight Categories

The following categories appear plausible for a first-class insight model:

- Identity
- Preference
- Behaviour
- Intent
- Sentiment
- Relationship
- Commercial
- Risk
- Compliance
- Scheduling
- Lifecycle
- Communication Style
- Payment Behaviour
- Purchase Behaviour
- Personal Context
- Creator Context
- Other

These categories are useful because they separate long-lived understanding from immediate operational action.

## Examples

The examples below show the same pattern:

Conversation

|

Interpretation

|

Insight

|

Opportunity, if one exists

### Example 1: "I get paid Friday."

- Conversation: The subscriber mentions a payday constraint.
- Interpretation: Payment-timing signal.
- Insight: Payment Behaviour / Scheduling insight, "prefers purchase timing after Friday payday."
- Opportunity: Payment Follow-up or Upsell Opportunity, if timing matters.

### Example 2: "I love cosplay."

- Conversation: The subscriber expresses a content preference.
- Interpretation: Preference signal.
- Insight: Preference insight, "likes cosplay-themed content."
- Opportunity: Custom Content Request, Content Delivery, or Promotion Campaign, if relevant.

### Example 3: "My birthday is next week."

- Conversation: The subscriber shares an upcoming milestone.
- Interpretation: Calendar or lifecycle cue.
- Insight: Scheduling / Lifecycle insight, "birthday is approaching next week."
- Opportunity: Birthday Opportunity.

### Example 4: "I'm broke."

- Conversation: The subscriber signals limited spending power.
- Interpretation: Commercial constraint.
- Insight: Commercial insight, "current purchasing capacity is low."
- Opportunity: Payment Follow-up, Renewal Recovery, or no immediate opportunity.

### Example 5: "I only buy customs."

- Conversation: The subscriber states a purchase preference.
- Interpretation: Commercial preference.
- Insight: Purchase Behaviour insight, "prefers custom content over generic offers."
- Opportunity: Custom Content Request or Upsell Opportunity.

### Example 6: "I've been away."

- Conversation: The subscriber indicates absence or lapse.
- Interpretation: Retention signal.
- Insight: Lifecycle insight, "recently inactive or returning after absence."
- Opportunity: Win-back or Inactive Subscriber.

### Example 7: "I'm nervous."

- Conversation: The subscriber expresses emotional state.
- Interpretation: Sentiment or relationship signal.
- Insight: Sentiment insight, "hesitant / low confidence state."
- Opportunity: Relationship Building, Support Request, or no immediate opportunity.

### Example 8: "I work nights."

- Conversation: The subscriber describes scheduling context.
- Interpretation: Scheduling signal.
- Insight: Scheduling insight, "best engagement window is likely outside daytime hours."
- Opportunity: Scheduled Follow-up.

### Example 9: "I travel a lot."

- Conversation: The subscriber describes recurring personal context.
- Interpretation: Personal context signal.
- Insight: Personal Context insight, "availability is intermittent due to travel."
- Opportunity: Scheduled Follow-up, Content Delivery, or no immediate opportunity.

### Example 10: "I hate voice messages."

- Conversation: The subscriber states communication preference.
- Interpretation: Communication style signal.
- Insight: Communication Style insight, "avoid voice messages."
- Opportunity: Fan Question, Support Request, or Relationship Building, depending on context.

### Example 11: "I need this before tomorrow."

- Conversation: The subscriber expresses urgency.
- Interpretation: Time-sensitive request.
- Insight: Scheduling / Operations insight, "deadline is urgent and near-term."
- Opportunity: Priority Reply or Creator Action Required.

### Example 12: "Don't send me that type of content."

- Conversation: The subscriber sets a boundary.
- Interpretation: Compliance and preference signal.
- Insight: Compliance / Preference insight, "content boundary established."
- Opportunity: Compliance Review or no opportunity if already resolved.

### Example 13: "This is my second account."

- Conversation: The subscriber reveals identity context.
- Interpretation: Identity signal.
- Insight: Identity insight, "relationship may be multi-account or duplicate-linked."
- Opportunity: Risk Review or Creator Follow-up if verification is needed.

### Example 14: "Can you do something custom for my friend?"

- Conversation: The subscriber requests tailored delivery.
- Interpretation: Commercial request.
- Insight: Commercial insight, "custom request may involve gift or third-party delivery."
- Opportunity: Custom Content Request.

### Example 15: "I only reply on weekends."

- Conversation: The subscriber reveals communication rhythm.
- Interpretation: Scheduling and communication style.
- Insight: Scheduling insight, "weekend is preferred reply window."
- Opportunity: Scheduled Follow-up.

### Example 16: No Opportunity Example

- Conversation: "I hate voice messages."
- Interpretation: Communication preference recognized.
- Insight: Communication style insight recorded.
- Opportunity: None.

This is one of the strongest arguments for a separate Insight concept.

## Insight Rules

The following are candidate rules if Conversation Insight were adopted:

- Insights may exist without Opportunities.
- Many Opportunities may reference one Insight.
- Insights survive completed Opportunities.
- Insights may expire if the underlying context changes.
- Insights may be manually confirmed.
- Insights may be manually rejected.
- Insights may change confidence over time.

These rules are conceptually useful, but they also introduce complexity.

## AI

AI execution is still outside v1.

The strongest case for Conversation Insight is that AI should assist with:

- Conversation Interpretation
- Insight generation

and not directly with Opportunity creation.

That would create a useful separation:

- AI helps discover meaning.
- Deterministic rules decide whether meaning becomes work.

### Deterministic Alternatives

The same outcome can often be achieved without a first-class Insight object by using:

- Conversation Interpretation outputs
- Subscriber Profile enrichment
- Conversation Opportunity creation
- Audit/history records

This is important because it means the platform may not need a new domain object to get the benefit.

## Relationship With Subscriber

The ownership question is one of the most important unresolved issues.

Possible ownership models:

### Conversation-owned

- Insight belongs to a single conversation.
- Pros: strong provenance, clear origin, less ambiguity.
- Cons: repeated facts across conversations are harder to unify.

### Subscriber-owned

- Insight belongs to the subscriber profile.
- Pros: accumulation across conversations, stronger memory.
- Cons: risk of overcommitting a broad fact from a single conversation.

### Creator-owned

- Insight belongs to the creator context.
- Pros: useful for creator-specific patterns and operating preferences.
- Cons: weak fit for subscriber-specific facts.

### Combination

- Insight is owned by Conversation but may be promoted into Subscriber or Creator context when validated.
- Pros: best matches the idea of discovery first, memory later.
- Cons: more governance and lifecycle complexity.

The combination model is the most flexible, but also the most expensive to govern.

## Relationship With HOST

Conversation Insight is best understood as a product-domain concept, not a HOST Kernel primitive.

It is not naturally a HOST runtime concern.
It is not a generic workflow primitive.
It is not an execution engine artifact.
It is not a registry primitive.

It is closer to knowledge than runtime.

Therefore, if adopted, it should likely be a product-domain object or a read-model-backed knowledge object, not a HOST primitive.

## Benefits

Potential advantages of a first-class Conversation Insight model include:

- Better CRM memory across conversations
- Better personalization
- Reduced duplicate work
- Knowledge accumulation
- Improved moderation context
- Better future AI support
- More useful commercial opportunities
- Better creator memory
- Cross-conversation learning

These are real benefits.

The main question is whether they require a new object, or whether they can be achieved with existing concepts and read models.

## Risks

Potential disadvantages include:

- Over-modelling
- Privacy exposure
- Stale knowledge
- Wrong inferences
- AI hallucination
- Complexity
- Storage growth
- Governance burden
- Ownership ambiguity
- Confusing business semantics

The biggest risk is creating a durable concept before the platform has enough clarity on who owns it and how it expires.

## Research Assessment

The evidence points in both directions:

### Reasons to add it

- It captures the important distinction between "meaning" and "work."
- It explains persistent knowledge that should outlive a single opportunity.
- It gives AI a safer place to help discover durable understanding.

### Reasons not to add it yet

- The current hierarchy already covers interpretation, opportunity, and profile enrichment.
- The more durable the concept becomes, the more governance it needs.
- Many candidate insights may be better represented as profile facts, timeline entries, or interpretation outputs.
- Introducing a new first-class object too early may create avoidable domain fragmentation.

## Recommendation

Keep under investigation.

### Why

Conversation Insight appears to be a real conceptual possibility, but the current architecture is not yet forced to introduce it.

The present model can already represent:

- meaning through Conversation Interpretation
- action through Conversation Opportunity
- memory through Subscriber Profile and history
- evidence through conversation and audit records

That makes the insight layer plausible, but not yet necessary.

The strongest argument for a future promotion is the need to preserve durable, reviewable, cross-conversation knowledge that is neither an opportunity nor a profile field.

The strongest argument against promotion is that this may simply be a naming and modelling convenience that can be satisfied by existing business objects.

For now, the prudent position is:

- do not approve it
- do not freeze it
- keep researching it before COP-2

## Decision

Keep under investigation.

## Closing Note

This document is intentionally exploratory.

It should be used to inform architectural discussion, not to justify implementation work.
