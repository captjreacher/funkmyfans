# NSP-5 - New Subscriber Operating Model Reset

Status: design only

## 1. Problem Statement

NSP-1 through NSP-4 proved that FunkMyFans can represent a complete deterministic conversation tree.

That proof is useful, but the current 44-step New Subscriber funnel is too large and too deterministic for the operating model we now want.

The desired behavior is not "script the entire conversation up front."
The desired behavior is:

Event
-> short Playbook
-> interpret response
-> establish conversation state or opportunity
-> queue handoff
-> AI suggests next response and direction
-> human or automation continues toward a Journey outcome

The deterministic Playbook should stop once it has established enough context to know:

1. what happened
2. the current conversation state
3. whether an Opportunity exists
4. what direction the conversation should move next

The open-ended conversation should not remain inside a large deterministic tree after that point.

## 2. Accepted Operating-Model Decision

The accepted operating model is:

- A short event-triggered Playbook starts the interaction.
- Conversation Interpretation classifies what the fan response means.
- Conversation state is updated or established.
- Opportunity is created only when business meaning exists.
- Queue owns work intake and operator attention.
- AI may suggest the next response and direction.
- Journey provides intended progression and outcomes.
- Human or automation continues from Queue toward the Journey outcome.

What this means in practice:

- Playbooks should be short and repeatable.
- Playbooks should not pre-author entire conversations.
- Queue should not interpret conversations.
- AI should not own Journey state.
- The 44-step funnel remains a design and validation artefact, not the default operating pattern.

## 3. Existing Architecture Findings

### What already exists

- Conversation is a distinct product domain and owns the interaction record and lifecycle.
- Conversation Interpretation is already the correct place for message meaning, classification, and normalization.
- Conversation Opportunity already exists as a separate business object and is the right place to capture actionable meaning.
- Queue Management already exists and owns work intake, priority, and assignment.
- Queue Item already exists as the work object that references conversation context.
- Playbook Studio and message scripts already exist as the place to author repeatable handling patterns.
- Journey exists as a separate routing and progression concept.
- The current funnel runtime already supports step types for message, question, wait, branch, approval, escalation, PPV offer, follow-up, and end.
- Terminal outcome metadata already exists as a concept in the builder/runtime model.
- The conversation intelligence layer already has persisted summary, intent, confidence, and recommendation fields.
- Creator expression context is already recognized as distinct from subscriber persona.

### What is still missing or not yet first-class

- A compact New Subscriber operating model that stops early instead of running a large deterministic tree.
- A clean, canonical response-class taxonomy for short-playbook routing.
- A fully explicit boundary between "interpretation" and "handoff" in the New Subscriber flow.
- A queue handoff payload that is intentionally designed for the next operator or AI decision.
- A first-class Journey steering model that guides direction without scripting every turn.
- A first-class creator archetype association model.
- Historical creator-authored enrichment as a validated input source for MoonSiren.

### Architectural interpretation

The approved architecture already gives us the right owning contexts:

- Conversation Interpretation interprets.
- Conversation Opportunity represents business meaning.
- Queue owns work.
- Playbooks define short repeatable structures.
- Journeys represent progression and outcomes.
- AI can suggest, but does not own state.

So the work here is not a new architecture.
It is a reset of the operating pattern to fit the architecture we already accept.

## 4. Proposed Short New Subscriber Playbook

### Goal

The minimum viable New Subscriber Playbook should:

- open the relationship warmly
- wait for one fan reply
- interpret the reply
- optionally perform one low-friction follow-up
- stop once enough meaning is established
- hand off to Queue when ongoing work is needed

### Target shape

- 2 to 3 conversational layers
- 5 to 12 authored steps
- one initial welcome
- one response interpretation point
- at most one deterministic follow-up where appropriate
- explicit handoff or stop

### Proposed step model

#### Step 1: Trigger

- Purpose: start the New Subscriber handling path.
- Action: trigger on the New Subscriber event.
- Expected signal: a fresh subscription or equivalent new-subscriber lifecycle event.
- Next decision: send welcome unless the conversation already exists and should resume instead.

#### Step 2: Welcome message

- Purpose: acknowledge the new subscriber and open the tone of the relationship.
- Action: send a short welcome message in the selected creator voice.
- Expected signal: fan receives a warm open.
- Next decision: wait for reply.

#### Step 3: Wait

- Purpose: give the fan a chance to respond before any interpretation or routing.
- Action: wait for one meaningful fan reply within the configured wait window.
- Expected signal: inbound reply or silence.
- Next decision: if reply arrives, interpret it; if silence persists, follow the no-response path.

#### Step 4: Interpret response

- Purpose: classify the reply into a small operational meaning set.
- Action: Conversation Interpretation determines what happened.
- Expected signal: one of the route classes below.
- Next decision: route to engaged, buying, exception, or no-response handling.

#### Step 5: Meaningful reply handling

- Purpose: update state from "new subscriber" to a clearer relationship state.
- Action: establish relationship state and determine whether an Opportunity exists.
- Expected signal: engaged relationship, buying signal, boundary issue, unsupported request, or low-confidence ambiguity.
- Next decision: either hand off to Queue or continue with one bounded follow-up.

#### Step 6: Optional deterministic follow-up

- Purpose: rescue a silent or low-information opening.
- Action: send one low-pressure follow-up only when silence or weak engagement justifies it.
- Expected signal: reply, continued silence, or disengagement.
- Next decision: either interpret the reply or stop.

#### Step 7: Handoff or stop

- Purpose: stop deterministic scripting once enough meaning is established.
- Action: create queue context or end the playbook.
- Expected signal: sufficient state for Queue or a clear terminal outcome.
- Next decision: Queue handles continuation, or the playbook closes.

### Answering the explicit design questions

1. What is the exact trigger?
- A new subscriber lifecycle event, ideally `subscriber_created` or the product-equivalent new-subscriber event already used by the platform.

2. When is the welcome sent?
- Immediately on the trigger, unless the conversation already exists and the operating rule is to resume rather than restart.

3. What happens if a conversation already exists?
- Do not create a duplicate deterministic welcome path.
- Resume the existing conversation state if the current relationship is already established.
- If the existing conversation is already active, the New Subscriber playbook should either defer or hand off into the appropriate existing Journey/state instead of replaying onboarding.

4. How long does the Playbook wait?
- Long enough for a meaningful reply, but only within a bounded wait window.
- The exact duration should be a product setting, not a hard-coded architecture rule.
- The design should support a short initial wait and, at most, one silence follow-up before stopping.

5. What counts as a meaningful reply?
- Warm or enthusiastic response
- Short but responsive acknowledgement
- Compliment
- Flirtatious reply
- Clear curiosity
- Preference signal
- Buying signal
- Boundary, safety, or unsupported request signal

6. When does the deterministic Playbook stop?
- After the first meaningful interpretation is established and the next step is no longer a scripted conversation turn.
- Also stop after the single allowed silence follow-up, after boundary escalation, or after a clear disengagement outcome.

7. What information must exist before Queue handoff?
- Creator
- Subscriber
- Conversation
- Triggering event
- Current Journey
- Journey direction
- Current conversation state
- Detected Opportunity, if any
- Latest interpretation
- Relevant relationship context
- Selected archetype or baseline, if available
- Recommended next objective
- Suggested response, if AI-generated or drafted
- Confidence
- Reason for Queue entry

## 5. Exact Handoff Boundary

The deterministic Playbook should stop at the point where the system knows enough to choose the next operational owner, but not enough to continue scripting the whole interaction.

That boundary is:

- welcome sent
- fan response interpreted
- conversation state established
- Opportunity detected or ruled out
- direction identified
- Queue handoff prepared, if continuation is needed

The Playbook should not continue into open-ended conversation after that point.

That work belongs to Queue, AI assistance, and operator judgment within the Journey context.

## 6. Queue Handoff Requirements

The Queue item must carry more than "fan replied."

### Minimum handoff payload

- creator
- subscriber
- conversation
- triggering event
- current Journey
- Journey direction
- current conversation state
- latest interpretation
- detected Opportunity, if any
- relevant relationship context
- selected archetype or baseline
- recommended next objective
- suggested response
- confidence
- reason for Queue entry

### Recommended additional context

- recent message snippet
- follow-up count
- silence state
- boundary or safety flags
- purchase intent flag
- no-response outcome flag
- terminal outcome, if the playbook already stopped

### Queue should not receive

- a requirement to re-interpret the conversation from scratch
- a full authored conversation tree
- an AI ownership transfer for Journey state

### Design intent

The Queue item should give the operator or downstream AI enough context to decide:

- send
- edit
- generate another
- change direction
- defer
- close

## 7. AI-Assisted Continuation Model

AI is valuable after handoff, but only as a helper.

### Intended AI role

- read the latest conversation state
- suggest the next best response
- suggest a directional objective
- provide a confidence score
- support operator choice

### AI should be able to use

- recent conversation
- creator
- selected archetype
- Journey
- current Journey direction
- Opportunity
- relationship intelligence
- the Playbook that initiated the conversation

### AI should not own

- Journey state
- Queue ownership
- Opportunity ownership
- conversation interpretation truth

### Suggested operator actions

- Send
- Edit
- Generate another
- Change direction
- Defer
- Close

### Practical interpretation

The AI should generate from context such as:

- "Current state: warm, responsive, lightly flirtatious"
- "Journey: New Subscriber"
- "Current direction: establish relationship"
- "Recommended next objective: learn one useful personal preference before introducing an offer"

The AI output should be a recommendation artifact, not the source of truth.

## 8. Journey Steering Model

Journey should provide direction, not pre-script every turn.

### Relationship between Journey, state, objective, and outcome

- Journey: the intended progression path
- Current state: the present operational posture of the conversation
- Next objective: the next useful thing to learn or do
- Outcome: the terminal or handoff result

### New Subscriber Journey directions to investigate

- engaged relationship
- profile/content exploration
- commercial interest
- PPV opportunity
- subscription upsell opportunity
- one-to-one opportunity
- nurture later
- disengaged
- human review

### Design principle

Journey should narrow what kind of continuation makes sense.

It should not become another 44-step tree.

### Example steering behavior

- If the reply is warm but not buying, steer toward relationship building.
- If the reply shows buying intent, steer toward commercial opportunity.
- If the reply shows uncertainty, steer toward nurture or exploration.
- If the reply is boundary-related, steer toward human review or close.

## 9. Reclassification of the Existing 44-Step Funnel

The existing 44-step funnel should not be deleted or edited in this sprint.

It should be reclassified as follows:

### 1. Keep in the short Playbook

- welcome message
- the initial response wait
- one response interpretation point
- one optional low-pressure follow-up
- one explicit stop or handoff step

### 2. Move to Conversation Interpretation

- fan-response classification
- meaning normalization
- boundary detection
- unsupported request detection
- buying-signal detection
- silence / no-response classification
- low-confidence or ambiguous response handling

### 3. Move to Queue handoff

- human review routes
- approval routes
- escalation routes
- operator ownership transfer
- conversation continuation that needs manual judgment

### 4. Move to AI response guidance

- response suggestions
- draft response generation
- next-best-response suggestions
- tone adaptation
- direction recommendations

### 5. Move to Journey direction / outcomes

- engaged relationship
- profile/content exploration
- PPV opportunity
- subscription upsell opportunity
- one-to-one opportunity
- nurture later
- disengaged
- human review

### 6. Retain only as test/reference material

- deterministic branch structure used to validate the original model
- old PPV-first sequencing
- step-order proof that the platform can execute a complete tree
- simulation/reference artifact for capability validation

### Classification summary

The 44-step funnel is best treated as evidence that the platform can run a deterministic tree.

It is not the right default operating pattern for New Subscriber handling going forward.

## 10. Minimum Implementation Sequence

This is still design-only, but the least risky implementation order is:

1. Confirm the short New Subscriber operating model and freeze it as the target pattern.
2. Define the canonical interpretation classes for new-subscriber replies.
3. Define the queue handoff payload and required context fields.
4. Define the Journey directions and terminal outcomes for New Subscriber.
5. Add AI suggestion behavior that reads context but does not own state.
6. Convert the existing 44-step funnel into a reference artefact rather than the default path.
7. Validate the new short playbook against the existing architecture boundaries.

## 11. Recommendation For The Next Sprint

Proceed with the next implementation sprint as a short-playbook reframe, not as a funnel expansion.

The next sprint should implement the minimum viable New Subscriber operating model with:

- a short welcome-first Playbook
- Conversation Interpretation at the reply boundary
- Queue handoff with full operational context
- AI-assisted next-response suggestions
- Journey direction and outcome steering

Do not extend the 44-step funnel.
Do not make Queue interpret conversations.
Do not make AI own Journey state.
Do not introduce another large deterministic tree.

The right next step is to operationalize the short model and leave the 44-step funnel as a reference and validation artefact.
