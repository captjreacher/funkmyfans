# New Subscriber Conversation Map v0.1

Status: NSP-1 design artifact

## 1. Purpose And Assumptions

This document defines one complete New Subscriber conversation map for MoonSiren using the Girl Next Door archetype baseline accepted from MSP-1.

The goal is to define the conversation before changing the Playbook Builder, runtime, database, or automation rules.

This document is design only.

It does not:

- implement the playbook
- change the current seeded New Subscriber Funnel
- change runtime behavior
- change database schema
- send messages
- enable auto-send
- implement billing
- implement archetype entitlements
- implement a first-class archetype system
- use historical chat records as evidence
- claim MoonSiren-specific historical style enrichment
- revisit script seed logic fixed in commit `3b42e4d`

### Entry Trigger

Trigger:

- A new subscriber enters the New Subscriber Funnel.

Primary playbook goal:

- Start the relationship warmly.
- Learn the fan's initial intent.
- Route the conversation toward relationship building, content discovery, a paid-content opportunity, or a soft exit.
- Avoid forcing a sale when the fan is not ready.

Operating assumptions:

- MoonSiren is the creator label used in the playbook.
- The selected expression archetype is Girl Next Door.
- Historical enrichment confidence is low, so all message examples stay close to the archetype baseline.
- AI output should be treated as draft or simulation guidance until a later implementation explicitly defines approval and send policy.
- Compliance, platform safety, and unsupported requests override conversion goals.

## 2. Girl Next Door Archetype Baseline Used

Girl Next Door is the creator expression baseline for this map.

Conversation should feel:

- warm
- casual
- approachable
- lightly playful
- naturally flirtatious
- interested rather than scripted
- commercially aware without immediate hard selling

Message guidance:

- Use short to medium messages.
- Prefer plain everyday language.
- Ask one natural question at a time.
- Make the fan feel noticed.
- Let flirtation escalate after the fan shows interest.
- Introduce paid content as an optional treat or natural next step.
- Keep boundaries kind, direct, and non-negotiable.
- Avoid luxury/VIP framing, dominance framing, corporate funnel language, and pressure-heavy sales copy.

Safe baseline phrases:

- "I am glad you are here."
- "Tell me what you are into."
- "No pressure, but I have something you might like."
- "You went quiet, so I thought I would check in."

## 3. Full Conversation Map

The model is:

Creator message
-> fan response class
-> creator response
-> next fan response class
-> next creator response
-> outcome or further fork

### Text Diagram

```text
ENTRY: new subscriber joins
  -> Opening welcome
    -> Warm / enthusiastic
      -> Reflect warmth + ask preference
        -> Shares preference
          -> Content exploration or relationship building
        -> Purchase intent
          -> PPV or one-to-one opportunity
        -> Flirtatious
          -> Light flirt + preference question
    -> Short / low effort
      -> Low-pressure question
        -> Still low effort
          -> Soft exit or nurture
        -> Engages
          -> Route by new class
    -> Compliment
      -> Accept compliment + ask what caught attention
        -> Specific attraction / preference
          -> Relationship building or content exploration
        -> Escalates to explicit request
          -> Boundary-safe routing
    -> Curious about creator
      -> Give light personal-style answer + ask about fan
        -> Shares self
          -> Engaged relationship
        -> Asks for content
          -> Profile/content exploration
    -> Asks for content
      -> Clarify vibe + offer teaser path
        -> Wants free browsing
          -> Profile/content exploration
        -> Purchase intent
          -> PPV opportunity
        -> Explicit request
          -> Boundary or human review
    -> Purchase intent
      -> Confirm interest + present soft offer
        -> Accepts
          -> PPV interest / conversion opportunity
        -> Price objection
          -> Lower-pressure option or nurture
        -> Asks custom / one-to-one
          -> One-to-one or human review
    -> Price objection / not ready
      -> Normalize + keep door open
        -> Later timing
          -> Nurture / scheduled follow-up
        -> No interest
          -> Closed / disengaged
    -> Boundary-testing / unsupported
      -> Kind boundary + redirect
        -> Respects boundary
          -> Continue light conversation
        -> Repeats/escalates
          -> Human review required or closed
    -> Off-topic
      -> Brief acknowledge + gentle redirect
        -> Returns to topic
          -> Route by new class
        -> Continues off-topic
          -> Soft exit
    -> Silent / no reply
      -> First no-response follow-up
        -> Still silent
          -> Second no-response follow-up
            -> Still silent
              -> No response outcome
```

## 4. Response-Class Definitions

Use only these response classes for NSP-1. They are reusable routing categories, not exact fan scripts.

| Response class | Definition | Primary routing purpose |
| --- | --- | --- |
| Warm / enthusiastic | The fan responds positively, with energy, gratitude, excitement, or eagerness. | Build rapport and ask what they want first. |
| Short / low effort | The fan replies with minimal content such as "hey", "ok", "nice", or a one-word answer. | Try one low-friction prompt before exiting or nurturing. |
| Compliment | The fan comments positively on the creator's look, page, content, or vibe. | Accept warmth and convert into preference discovery. |
| Flirtatious | The fan is playful, suggestive, or lightly teasing without making an unsupported request. | Mirror lightly and continue discovery. |
| Curious about creator | The fan asks about MoonSiren, her vibe, what she likes, or what is on the page. | Give a warm, bounded answer and invite the fan to share. |
| Shares preference | The fan names a vibe, content category, mood, or interaction preference. | Route to relationship building, content exploration, or offer fit. |
| Asks for content | The fan asks what content exists, where to start, or what they can see. | Guide browsing and detect paid-content readiness. |
| Asks for explicit or unsupported content | The fan asks for content or behavior that is not supported, unsafe, or requires policy review. | Boundary response, redirect, or human review. |
| Purchase intent | The fan asks price, says they want to buy, asks for PPV/custom, or shows clear spend readiness. | Present a soft offer or hand off to an offer path. |
| Price objection | The fan says it costs too much, asks for free content, asks for discount, or signals budget constraints. | Reduce pressure, offer lower-friction route, or nurture. |
| Not ready | The fan is interested but hesitant, distracted, or says maybe/later. | Keep door open and optionally schedule follow-up. |
| Silent / no reply | No fan response after the expected wait window. | Send limited follow-ups, then stop. |
| Boundary-testing | The fan pushes after a boundary or tries to negotiate unsupported behavior. | Restate boundary, escalate if repeated. |
| Off-topic | The fan moves to unrelated topics that do not build relationship or commercial intent. | Acknowledge once and redirect. |
| No interest / disengaged | The fan clearly declines, asks to stop, or gives repeated non-engagement. | Close politely and stop playbook. |

## 5. Branch-By-Branch Message Examples

These examples are paraphrased baseline examples. They are not historical MoonSiren messages.

### Opening

Creator message:

> Hey {{subscriber_name}}, I am glad you made it in. What kind of mood should I start you with: sweet, playful, or a little teasing?

Purpose:

- Acknowledge the new subscriber.
- Signal warmth and approachability.
- Ask a simple preference question.
- Create a routing point without selling immediately.

Next response classes:

- Warm / enthusiastic
- Short / low effort
- Compliment
- Flirtatious
- Curious about creator
- Asks for content
- Purchase intent
- Asks for explicit or unsupported content
- Silent / no reply

### Branch A: Warm / Enthusiastic

Fan class:

- "So happy to be here."
- "I have been waiting to join."
- "Hey, glad I found you."

Creator response intent:

- Reflect the fan's energy.
- Make the fan feel individually noticed.
- Ask a preference question that can route the next step.

Example response:

> That is sweet. I like when someone actually says hi instead of just disappearing into the page. What pulled you in first?

Expected next classes:

- Shares preference
- Compliment
- Flirtatious
- Asks for content
- Purchase intent

Routing:

- If the fan shares a preference, go to content exploration or relationship building.
- If the fan compliments, go to Branch C.
- If the fan asks for content, go to Branch F.
- If the fan shows purchase intent, go to Branch H.

### Branch B: Short / Low Effort

Fan class:

- "hey"
- "nice"
- "ok"
- "lol"

Creator response intent:

- Avoid punishing low effort.
- Give one easy prompt.
- Do not over-invest if the fan stays flat.

Example response:

> Hey you. I will make it easy: are you here to look around, flirt a little, or find something extra?

Expected next classes:

- Shares preference
- Flirtatious
- Asks for content
- Purchase intent
- Still short / low effort
- Silent / no reply

Routing:

- If the fan chooses an option, route by that class.
- If the fan stays low effort twice, use a soft exit.

Second low-effort response:

> I will not make you do homework. Have a look around, and if something catches you, come tell me.

Outcome:

- Nurture / follow up later, or closed if no further reply.

### Branch C: Compliment

Fan class:

- Compliments MoonSiren's look, content, page, body, smile, vibe, or style.

Creator response intent:

- Accept the compliment warmly.
- Avoid instantly selling.
- Turn the compliment into preference discovery.

Example response:

> That is really sweet. Now I am curious what caught your eye first.

Expected next classes:

- Shares preference
- Flirtatious
- Asks for content
- Purchase intent
- Asks for explicit or unsupported content

Routing:

- Specific visual/content preference -> content exploration.
- Flirtatious but safe -> Branch D.
- Explicit/unsupported -> Branch G.
- Buying signal -> Branch H.

### Branch D: Flirtatious

Fan class:

- Light teasing, playful attraction, suggestive but not unsafe.

Creator response intent:

- Match the warmth lightly.
- Keep control of pace.
- Ask a question that can become relationship or offer routing.

Example response:

> Careful, I might start liking the attention. Are you more into sweet flirting or being teased a little?

Expected next classes:

- Shares preference
- Flirtatious
- Asks for content
- Purchase intent
- Boundary-testing

Routing:

- Sweet / teasing preference -> relationship building.
- Content curiosity -> Branch F.
- Purchase intent -> Branch H.
- Boundary-testing -> Branch G.

### Branch E: Curious About Creator

Fan class:

- "What are you like?"
- "What do you post?"
- "Tell me about you."
- "What should I expect here?"

Creator response intent:

- Give a warm, bounded creator-facing answer.
- Keep it conversational.
- Ask about the fan instead of delivering a menu dump.

Example response:

> I am usually sweet with a teasing streak. I like making this feel more personal than just scrolling. What kind of attention do you like getting?

Expected next classes:

- Shares preference
- Compliment
- Flirtatious
- Asks for content
- Not ready

Routing:

- Preference -> relationship building or content exploration.
- Content ask -> Branch F.
- Hesitation -> Branch J.

### Branch F: Asks For Content

Fan class:

- "What do you have?"
- "What can I see?"
- "Where should I start?"
- "Send me something."

Creator response intent:

- Help the fan explore.
- Clarify vibe before offering.
- Detect whether the fan wants browsing, PPV, longer subscription value, or one-to-one interaction.

Example response:

> I can steer you. Do you want something soft and cute first, something playful, or are you looking for an extra little treat?

Expected next classes:

- Shares preference
- Purchase intent
- Price objection
- Asks for explicit or unsupported content
- Not ready

Routing:

- Soft/cute/playful preference -> profile/content exploration.
- "Extra", "paid", "send it", price ask -> Branch H.
- Budget concern -> Branch I.
- Explicit unsupported request -> Branch G.

Content exploration example:

> Start with the vibe that pulled you in, then tell me what you want more of. I like being pointed in the right direction.

Outcome:

- Engaged relationship, profile/content exploration, or PPV interest if the fan asks for paid content.

### Branch G: Explicit, Unsupported, Or Boundary-Testing

Fan class:

- Unsupported explicit requests.
- Platform-prohibited requests.
- Attempts to bypass boundaries.
- Repeated pressure after a boundary.

Creator response intent:

- Set a clear boundary.
- Do not shame the fan.
- Offer a safe redirect once.
- Escalate or close if repeated.

Example response:

> I cannot do that, but we can keep it fun another way. Tell me the vibe you want and I will stay within what is okay here.

Expected next classes:

- Respects boundary / shares preference
- Boundary-testing again
- No interest / disengaged

Routing:

- If the fan respects the boundary, route to Branch F or Branch D.
- If the fan repeats or escalates, stop automation and require human review.

Repeated boundary-testing response:

> I already said I cannot go there. I am going to pause this instead of pushing it.

Outcome:

- Human review required, or closed / disengaged.

### Branch H: Purchase Intent

Fan class:

- "How much?"
- "I want to buy."
- "Send me the paid one."
- "Do you have PPV?"
- "Can I get something just for me?"

Creator response intent:

- Confirm interest.
- Keep the offer soft but clear.
- Choose the right conversion path.

Example PPV response:

> I do have a welcome treat I can send over. It is {{starter_ppv_title}} for ${{starter_ppv_price}} if you want something extra to start with.

Expected next classes:

- Accepts offer
- Price objection
- Custom / one-to-one request
- Not ready
- Asks for unsupported content

Routing:

- Accepts -> PPV interest / conversion opportunity detected.
- Price objection -> Branch I.
- Custom/one-to-one -> one-to-one opportunity, likely human review before quote.
- Not ready -> Branch J.
- Unsupported -> Branch G.

Custom / one-to-one bridge:

> If you want something more personal, tell me the mood and I can see what makes sense. I may need to check the details before promising anything.

Outcome:

- PPV interest.
- Conversion opportunity detected.
- One-to-one opportunity.
- Human review required for custom scope, pricing, safety, or fulfillment.

### Branch I: Price Objection

Fan class:

- "Too much."
- "Can I get it free?"
- "I am broke."
- "Discount?"
- "Maybe later."

Creator response intent:

- Normalize the objection.
- Avoid arguing.
- Keep relationship open.
- Offer lower-pressure browsing or later follow-up.

Example response:

> No stress. I would rather you enjoy being here than feel pushed. Look around first, and if you want something extra later, just tell me.

Expected next classes:

- Not ready
- Shares later timing
- Asks for free content again
- Purchase intent
- No interest

Routing:

- Later timing -> nurture / scheduled follow-up.
- Repeated free request -> soft boundary.
- Renewed purchase intent -> Branch H.
- No interest -> closed / disengaged.

Optional lower-friction response:

> If you want, start with what is already here and tell me what kind of thing would actually be worth it for you.

Outcome:

- Nurture / follow up later.
- Relationship building.
- Closed / disengaged if they decline.

### Branch J: Not Ready

Fan class:

- "Maybe later."
- "Just looking."
- "Not sure yet."
- "I will think about it."

Creator response intent:

- Keep door open.
- Give an easy next action.
- Avoid chasing.

Example response:

> That is fine. Look around a little and come back when something catches you. I am curious what you end up liking.

Expected next classes:

- Shares preference later
- Asks for content
- Purchase intent
- Silent / no reply

Routing:

- If the fan re-engages, route by class.
- If no response, use silence logic only if the playbook has not already sent follow-ups.

Outcome:

- Nurture / follow up later.

### Branch K: Off-Topic

Fan class:

- Unrelated jokes, random topics, non-actionable tangents.

Creator response intent:

- Acknowledge once.
- Gently return to the funnel question.
- Exit if the fan keeps drifting.

Example response:

> You came in sideways with that one. I am still going to ask: are you here to chat, browse, or find something extra?

Expected next classes:

- Shares preference
- Flirtatious
- Asks for content
- Still off-topic

Routing:

- If the fan returns, route by class.
- If off-topic continues, use a soft exit.

Soft exit:

> I will let you wander for a bit. Come back when you know what mood you want from me.

Outcome:

- Nurture / follow up later.

### Branch L: No Interest / Disengaged

Fan class:

- "No thanks."
- "Stop."
- "Not interested."
- Repeated flat replies after prompts.

Creator response intent:

- Respect the fan's stated preference.
- Stop the playbook.
- Leave the relationship cleanly closed.

Example response:

> All good. I will leave you be. You can always come back if you change your mind.

Outcome:

- Closed / disengaged.

## 6. Silence And Follow-Up Logic

Silence should be handled with restraint. The Girl Next Door version should feel like a casual check-in, not a pressure sequence.

### Silence Window 1

Condition:

- No fan reply after the opening message and normal wait period.

First no-response follow-up:

> You went quiet on me a little. Should I leave you to explore, or do you want me to point you somewhere fun?

Purpose:

- Re-open the choice.
- Offer a soft exit.
- Avoid guilt or urgency.

Next classes:

- Warm / enthusiastic
- Short / low effort
- Asks for content
- Not ready
- Silent / no reply

### Silence Window 2

Condition:

- No fan reply after the first no-response follow-up.
- Use only if the product owner wants a second touch in the implemented playbook.

Second no-response follow-up:

> I will not chase you. I will keep the good stuff here for when you feel like coming back.

Purpose:

- Preserve warmth.
- End pressure.
- Stop the playbook.

Outcome:

- No response.
- Nurture / follow up later only if a separate retention or re-engagement playbook owns it.

### Stop Rule

The New Subscriber playbook should stop after:

- two unanswered creator messages after the opening, or
- an explicit "no", "stop", or equivalent disengagement, or
- repeated low-effort replies after one low-friction rescue prompt, or
- a boundary/safety condition requiring human review.

## 7. Conversion And Exit Outcomes

Terminal or handoff outcomes for NSP-1:

| Outcome | Definition | Typical source branch | Next owner |
| --- | --- | --- | --- |
| Engaged relationship | Fan is responding warmly and sharing preferences, but no immediate sale is needed. | Warm, compliment, curious, flirtatious, shares preference | Relationship Building playbook or ongoing conversation |
| Profile/content exploration | Fan wants to browse or understand what is available. | Asks for content, curious about creator | New Subscriber or Content Discovery path |
| Conversion opportunity detected | Fan shows commercial intent but the exact offer is not selected. | Purchase intent, asks for paid options | Revenue opportunity routing |
| PPV interest | Fan is a fit for starter PPV or asks to buy paid content. | Purchase intent, content ask with "extra" interest | PPV Opportunity |
| Subscription upsell opportunity | Fan asks about longer access, staying subscribed, or value beyond the initial welcome. | Curious, content exploration, relationship warmth | Upsell or Renewal/Subscription path |
| One-to-one opportunity | Fan asks for personal attention, custom, or direct interaction. | Purchase intent, custom ask, one-to-one ask | Human review or Custom Content Request |
| Nurture / follow up later | Fan is friendly but not ready, price-sensitive, browsing, or temporarily quiet. | Price objection, not ready, soft exit | Scheduled Follow-up or Relationship Building |
| No response | Fan does not reply after allowed follow-ups. | Silence | Stop playbook |
| Closed / disengaged | Fan declines, asks to stop, or remains repeatedly low effort. | No interest, repeated low effort | Stop playbook |
| Human review required | Safety, unsupported request, repeated boundary testing, custom pricing/scope, or low AI confidence. | Boundary, explicit unsupported, one-to-one/custom | Human operator / review queue |

Conversion should be treated as discovered intent, not a mandatory path. The playbook should be allowed to end in relationship building or nurture without an offer.

## 8. Builder Implementation Notes

These notes describe how this design could later become a Playbook Builder source of truth. They are not implementation instructions for NSP-1.

### Suggested Builder-Level Shape

Recommended conceptual nodes:

1. Trigger: `subscriber_created`
2. Opening message
3. Wait for fan reply
4. Classify fan reply into NSP-1 response classes
5. Branch by response class
6. Creator response node per class
7. Wait for next fan reply
8. Second classification
9. Conversion, nurture, human review, or end outcome
10. Silence follow-up path
11. Stop/end nodes with explicit outcome labels

### Suggested Variables

Potential variables for later implementation:

- `subscriber_name`
- `creator_name`
- `archetype_key = girl_next_door`
- `response_class`
- `next_response_class`
- `fan_preference`
- `purchase_intent`
- `price_objection`
- `boundary_flag`
- `unsupported_request_flag`
- `human_review_required`
- `offer_type`
- `outcome`

### Suggested Response-Class Keys

```text
warm_enthusiastic
short_low_effort
compliment
flirtatious
curious_about_creator
shares_preference
asks_for_content
explicit_or_unsupported_request
purchase_intent
price_objection
not_ready
silent_no_reply
boundary_testing
off_topic
no_interest_disengaged
```

### Suggested Outcome Keys

```text
engaged_relationship
profile_content_exploration
conversion_opportunity_detected
ppv_interest
subscription_upsell_opportunity
one_to_one_opportunity
nurture_follow_up_later
no_response
closed_disengaged
human_review_required
```

### Existing Current-State Fit

Current builder/runtime concepts that appear useful:

- `of_message_scripts` can represent the playbook/script container.
- `of_message_script_steps` can represent messages, waits, branches, follow-ups, and end nodes.
- `builder_config.workspace.templateKey` can identify `new_subscriber_funnel`.
- `builder_config.workspace.styleKey` exists, though MSP-1 recommends not overloading it as an archetype key without a naming decision.
- Visual Builder node types include message, ask question, wait, AI/draft/classification, branch, human approval, escalation, PPV offer, custom content, renewal subscription, delay, schedule, expiry, and end.
- Conversation Opportunity catalogue already includes New Subscriber, Relationship Building, PPV Opportunity, Upsell Opportunity, Custom Content Request, Scheduled Follow-up, Compliance Review, Risk Review, and AI Escalation.

## 9. Builder Gaps That Would Prevent Faithful Implementation

The current builder can approximate a linear New Subscriber Funnel, but this NSP-1 map needs several capabilities to be faithful.

### Gap 1: Response-Class Routing Is Not First-Class

The design depends on routing by reusable fan response classes.

Current gap:

- The builder has AI/classification-like node types, but there is no visible first-class response-class taxonomy for New Subscriber routing.
- Branch nodes appear oriented around simple condition keys and yes/no style paths.

Needed later:

- A classifier node that outputs `response_class`.
- A switch/multi-branch node that can route more than two named classes cleanly.
- A stable registry for response-class keys and labels.

### Gap 2: Multi-Turn Conversation State Is Under-Specified

The map requires a second and sometimes third turn:

- opening
- fan class
- creator response
- next fan class
- creator response or outcome

Current gap:

- The existing seeded New Subscriber Funnel has a simpler path: welcome, question, AI draft/confidence, PPV offer, purchase check, follow-up, end.
- It does not encode branch-specific second-turn response classes.

Needed later:

- State variables for `response_class`, `next_response_class`, `fan_preference`, `outcome`, and prior follow-up count.
- Clear runtime behavior for waiting on replies between classification points.

### Gap 3: Outcome Labels Need To Be Explicit Runtime/Builder Metadata

The design ends in business outcomes such as `ppv_interest`, `nurture_follow_up_later`, and `human_review_required`.

Current gap:

- End nodes can carry an `outcome` config in the visual builder, but outcome semantics are not clearly tied to Conversation Opportunity creation, queue routing, or handoff behavior.

Needed later:

- Outcome metadata on terminal nodes.
- A mapping from terminal outcomes to Conversation Opportunities or queue handoffs.
- Reporting support for non-sale outcomes.

### Gap 4: Archetype Selection Is Not Cleanly Modelled

The map uses Girl Next Door as a creator archetype baseline.

Current gap:

- `styleKey` exists, but MSP-1 found no first-class creator archetype model.
- Existing playbook styles are operational tone/generation modes, not creator archetypes.

Needed later:

- Either a distinct `archetypeKey` in builder workspace config or a product decision to treat `styleKey` as the selected archetype.
- A Girl Next Door baseline registry entry that is separate from subscriber persona.
- No billing or entitlement enforcement in this sprint.

### Gap 5: Human Review And Boundary Handling Need Stronger Semantics

The map requires human review for unsupported requests, repeated boundary testing, custom scope/pricing, and low-confidence AI.

Current gap:

- Builder node types include approve, assign, pause, and escalate, but faithful implementation needs clear policy triggers and stop behavior.

Needed later:

- Boundary/safety classifier outputs.
- Escalation metadata that names the review reason.
- Runtime stop/pause semantics that prevent further automated follow-up after escalation.

### Gap 6: Silence Follow-Up Counts Need Guardrails

The map allows at most two no-response follow-ups after the opening.

Current gap:

- The seeded flow has wait/follow-up behavior, but no explicit documented count guard for silence by branch.

Needed later:

- A `no_response_followup_count` or equivalent runtime state.
- Stop rules for silence windows.
- Builder validation warning when a silence path has too many follow-ups.

### Gap 7: Conversion Paths Should Not Force PPV

The design allows relationship building, content exploration, PPV, subscription upsell, one-to-one, nurture, or exit.

Current gap:

- The current seeded New Subscriber Funnel routes quickly toward a starter PPV offer after AI reply.

Needed later:

- Branch-specific conversion routing.
- Ability to end successfully without a PPV offer.
- Separate handoff outcomes for PPV, subscription upsell, one-to-one, and nurture.

### Gap 8: Message Examples Need Draft/Template Treatment

The map includes example creator responses, but they are not exact script text for every possible fan sentence.

Current gap:

- A faithful builder needs to distinguish fixed messages, archetype-guided draft prompts, and classifier routing instructions.

Needed later:

- Node-level generation mode: fixed template vs archetype-guided draft.
- Prompt/context fields that include archetype baseline, branch intent, allowed response classes, and safety rules.
- Low-confidence fallback to human review rather than auto-send.

## Closing Design Decision

NSP-1 should proceed from this design map, not from historical MoonSiren chat enrichment.

The first implementable version should encode the Girl Next Door baseline, response-class routing, bounded silence follow-up, conversion handoffs, soft exits, and human-review stops. Historical creator style enrichment can be added later only when reliable creator-authored evidence exists with confidence metadata.
