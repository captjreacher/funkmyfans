# MoonSiren Girl Next Door Style Experiment v0.1

## Purpose

This is a read-only MSP-1 investigation into the minimum viable model for:

Creator -> Archetype -> Historical chat evidence -> Playbook

The experiment target is MoonSiren expressing the Girl Next Door archetype in conversation playbooks. This document does not define a single universal MoonSiren style profile.

## Current-State Findings

### Creator profiles

Creators are represented by `of_creators`.

Current relevant fields:

- `id`
- `platform_provider`
- `betterfans_account_id`
- `username`
- `display_name`
- `bio`
- `location`
- `status`
- `onboarding_status`
- `metadata`
- `last_sync_at`
- `active`

Local data includes MoonSiren:

- Username: `leahsiren`
- Display name: `moonsiren`
- BetterFans account id exists
- Last sync observed: 2026-06-23

Creator settings are represented separately by `of_creator_settings`.

Current settings already include useful defaults:

- `chat_automation_enabled`
- `tone_notes`
- `ai_behavior.ai_mode`
- `ai_behavior.emoji_level`
- `ai_behavior.flirty_level`
- `ai_behavior.sales_aggressiveness`
- `ai_behavior.use_creator_memory`
- `safety`

There is no current Creator Archetype association model.

### Archetypes

No first-class archetype model exists yet.

Existing adjacent concepts:

- `of_automation_registry_entries.kind = 'playbook_style'`
- hardcoded `StyleKey` values in `apps/creator-cockpit/src/pages/Scripts.tsx`
- subscriber persona classifications such as `persona_key`, `persona_name`, and `persona_strategy`

These are not equivalent to creator archetypes.

`playbook_style` currently means operational tone or generation mode:

- Friendly
- Flirty
- Direct Sales
- VIP
- Relationship Builder
- Authority
- Warning
- Soft Reactivation

Girl Next Door does not exist as a registry entry or archetype.

### Creator-to-Archetype associations

No existing table, metadata field, or registry relationship currently represents:

- creator has archetype
- creator is entitled to archetype
- creator default archetype
- archetype billing or plan access

Do not duplicate subscriber persona. Subscriber persona is about the fan. Creator archetype is about the creator-facing expression model.

### Playbooks

Playbooks are represented by `of_message_scripts`.

Relevant fields:

- `creator_id`
- `name`
- `trigger_event_type`
- `status`
- `action_mode`
- `builder_config`
- `category`
- `tags`
- `steps`

Builder configuration already has a suitable extension point:

```json
{
  "workspace": {
    "templateKey": "new_subscriber_funnel",
    "styleKey": null,
    "execution": {},
    "ai": {},
    "approval": {},
    "conditions": []
  }
}
```

The type already includes `ScriptWorkspaceConfig.styleKey`, but current seeded New Subscriber Funnel rows do not set it.

This is the best near-term place for Playbook Archetype selection, provided the selected key points to a real archetype concept rather than the existing tone-style registry.

### BetterFans historical chat and messages

Current integration wraps:

- `GET /users/me`
- `GET /users/me/stats/overview`
- `GET /subscriptions/subscribers`
- `GET /chats`
- `POST /chats/:id/messages`

The BetterFans SDK also exposes:

- `GET /chats/:id/messages`

But the app does not currently wrap or persist full chat message history.

Current synced data stores:

- `of_chats`: chat list rows and `raw_payload`
- `of_events`: realtime events, including some `chat_message` events
- `of_outbound_messages`: generated/simulated/app outbound messages

Stored chat rows are useful for identifying conversations and recent activity. They are not enough for creator style extraction because they do not contain a full historical message sequence.

Stored `chat_message` events are currently limited for this experiment:

- MoonSiren `of_chats` rows observed: 18
- MoonSiren `chat_message` events observed: 17
- reliable stored creator-authored historical messages: 0
- reliable stored subscriber-authored/simulation messages: 16
- empty or non-text chat event payloads: 1

The app's current actor extraction defaults unknown messages to subscriber unless payload fields explicitly say `creator`, `operator`, or `agency`. That is safe for runtime, but insufficient for style extraction when historical message payloads do not include creator-authored records.

A read-only SDK attempt against `GET /chats/:id/messages` for the available MoonSiren chats returned network errors in this environment. No live transcripts were retrieved or copied.

## Evidence Available

### Available now

Available data:

- MoonSiren creator profile row
- MoonSiren creator settings row
- MoonSiren script/playbook rows
- MoonSiren chat list rows
- limited realtime/simulation chat events
- generated outbound messages from current automation/simulation

Usable for this style experiment:

- Playbook architecture assessment: high confidence
- Creator settings assessment: high confidence
- Chat availability assessment: medium confidence
- MoonSiren-authored historical style extraction: low confidence

Approximate usable sample size:

- Creator-authored historical messages available in synced storage: 0
- Fan-authored or simulated text events available in synced storage: about 16
- Chat threads available as starting points for future retrieval: about 18

### Limitations

- Existing synced storage does not include full historical message bodies per chat.
- Existing stored `chat_message` data does not contain enough creator-authored messages to distinguish MoonSiren expression patterns.
- `of_outbound_messages` are generated by this product and should not be treated as historical creator-authored evidence.
- Fan messages can help classify context, but should not be used as creator style evidence.
- Direct BetterFans message-history access appears possible through the SDK, but the current app does not wrap it and the local read-only attempt could not retrieve it.

### Confidence Level

Overall confidence for architecture recommendation: medium-high.

Overall confidence for MoonSiren-specific Girl Next Door enrichment: low until creator-authored historical messages are available.

## Archetype Baseline: Girl Next Door

Girl Next Door is a creator expression archetype, not a fan persona and not a generic tone setting.

Baseline characteristics:

- Warm and accessible
- Conversational rather than performative
- Familiar without overclaiming intimacy
- Light teasing rather than hard sexual pressure
- Short to medium message length
- Uses simple everyday language
- Makes the fan feel noticed
- Asks natural follow-up questions
- Keeps selling language soft and invited
- Uses boundaries plainly and kindly
- Avoids overly polished sales copy
- Avoids icy, luxury-only, or dominatrix framing

Baseline emotional shape:

- "I am glad you are here."
- "Tell me what you are into."
- "No pressure, but I have something you might like."
- "I noticed you went quiet, so I thought I would check in."

## Creator Enrichment: MoonSiren

Historical creator-authored evidence is not currently sufficient to define how MoonSiren specifically modifies the Girl Next Door archetype.

Do not generate a universal MoonSiren style profile from the available data.

What can be safely said from existing product state:

- MoonSiren is connected as a BetterFans creator.
- MoonSiren has chat automation enabled.
- MoonSiren's default AI behavior is `draft_only`.
- MoonSiren's current default memory setting is enabled.
- MoonSiren's current default emoji level is light.
- MoonSiren's current default flirt level is medium.
- MoonSiren's current sales aggressiveness is balanced.
- MoonSiren has the New Subscriber Funnel active.

These are settings and product defaults, not historical style evidence.

Provisional enrichment hypothesis for a future validated sample:

- Keep Girl Next Door warmth.
- Keep flirtation moderate rather than explicit-first.
- Use light emoji only if historical evidence supports it.
- Favor conversational closeness over formal marketing copy.
- Let paid-content offers feel like an optional treat rather than a hard close.

This hypothesis should be treated as a test scaffold only.

## Contextual Patterns

Because creator-authored history is unavailable in synced storage, these patterns are recommended baselines to test once MoonSiren messages can be sampled.

### Greetings

Girl Next Door baseline:

- Start warm and low-friction.
- Acknowledge the person arrived or replied.
- Avoid sounding like a campaign blast.

MoonSiren evidence status:

- Not validated from historical creator-authored messages.

Generation guidance:

- Prefer short personal openers.
- Use one clear invitation to respond.

### Message Length

Girl Next Door baseline:

- Short to medium.
- One idea per message.
- Avoid dense paragraphs.

MoonSiren evidence status:

- Not validated.

Generation guidance:

- Default to 1-3 short sentences until evidence says otherwise.

### Wording

Girl Next Door baseline:

- Plain language.
- Warm verbs: noticed, glad, wanted, thought, wondering.
- Avoid corporate funnel language.

MoonSiren evidence status:

- Not validated.

### Emoji Usage

Girl Next Door baseline:

- Light emoji use can work, but should not carry the message.

MoonSiren evidence status:

- Current settings say light emoji level.
- Historical evidence not validated.

### Pet Names

Girl Next Door baseline:

- Use sparingly.
- Avoid heavy pet-name repetition unless historical evidence supports it.

MoonSiren evidence status:

- Not validated.

### Flirt Level

Girl Next Door baseline:

- Playful, approachable, not explicit-first.
- Let the fan escalate before the message does.

MoonSiren evidence status:

- Current settings say medium flirt level.
- Historical evidence not validated.

### Humour

Girl Next Door baseline:

- Light and situational.
- Avoid sarcasm that could read as cold.

MoonSiren evidence status:

- Not validated.

### Response Rhythm

Girl Next Door baseline:

- Reply like a person, not a script.
- Ask one natural question when useful.

MoonSiren evidence status:

- Not validated.

### Compliment Responses

Girl Next Door baseline:

- Accept the compliment warmly.
- Reflect a little attention back to the fan.

Generation guidance:

- Avoid deflecting every compliment.
- Avoid turning every compliment into an immediate sale.

### Quiet-Fan Re-Engagement

Girl Next Door baseline:

- Soft check-in.
- Low pressure.
- Small reason to come back.

Generation guidance:

- Keep it casual and non-accusatory.

### Selling Language

Girl Next Door baseline:

- Frame offers as a personal option or treat.
- Keep the CTA clear but relaxed.

Generation guidance:

- Avoid aggressive scarcity unless the playbook context requires it.
- Avoid sounding like a mass PPV blast.

### Paid-Content Introduction

Girl Next Door baseline:

- Bridge from conversation context into the offer.
- Explain why this content fits the moment.

Generation guidance:

- Use a soft lead-in before price or unlock language.

### Escalation

Girl Next Door baseline:

- Escalate warmth before explicitness.
- Escalate commercial asks only when context suggests interest.

Generation guidance:

- Use fan messages only to classify readiness, not to copy fan language.

### Closing

Girl Next Door baseline:

- Leave the door open.
- Avoid needy follow-ups.

Generation guidance:

- End with an easy next step or gentle opt-out.

### Boundaries

Girl Next Door baseline:

- Kind, direct, non-negotiable.
- Do not over-explain.

Generation guidance:

- Use plain safety language.
- Preserve platform boundaries.

### Avoided Language

Avoid:

- Universal "MoonSiren always says..." claims.
- Copying historical messages as templates.
- Explicit transcript reproduction.
- Private fan identifiers.
- Hard-selling every context.
- Overly generic AI warmth.
- Luxury/VIP framing unless the selected archetype/playbook calls for it.
- Treating subscriber personas as creator archetypes.

## Generation Guidance for Later Playbook Steps

For a generative Playbook step, pass four separate inputs:

1. Creator identity:
   - creator id
   - creator display label
   - active settings

2. Selected archetype:
   - archetype key
   - baseline behavioral guidance
   - safety/avoid rules

3. Playbook context:
   - playbook id
   - playbook goal/template key
   - step intent
   - current conversation state

4. Optional historical style evidence:
   - aggregate patterns only
   - sample size
   - confidence
   - no raw transcript snippets
   - no fan identifiers

Recommended prompt contract:

```text
Write as the creator expressing the selected archetype in this context.
Use historical evidence only as pattern guidance.
Do not quote or imitate exact past messages.
If evidence confidence is low, stay close to the archetype baseline.
```

For MSP-1, evidence confidence should be low.

## Example Transformations

These are paraphrased examples only. They are not copied from historical chats.

### Welcome

Generic AI:

> Welcome to my page. Let me know what content you are interested in.

Girl Next Door baseline:

> Hey, I am glad you made it in. What kind of vibe are you hoping for first?

MoonSiren-enriched Girl Next Door, provisional:

> Hey, glad you found me. Tell me what mood you want first and I will steer you somewhere fun.

### Compliment response

Generic AI:

> Thank you for the compliment. I appreciate your support.

Girl Next Door baseline:

> That is sweet of you. I like when someone actually says what caught their eye.

MoonSiren-enriched Girl Next Door, provisional:

> That is sweet. Now I am curious what got your attention first.

### Quiet fan

Generic AI:

> I noticed you have not replied. Would you like to continue?

Girl Next Door baseline:

> You went a little quiet, so I thought I would check in. Still around?

MoonSiren-enriched Girl Next Door, provisional:

> You disappeared on me a little. Should I leave you alone or tempt you back?

### Paid content

Generic AI:

> I have a PPV offer available for purchase.

Girl Next Door baseline:

> I have something extra ready if you want a little treat. No pressure.

MoonSiren-enriched Girl Next Door, provisional:

> I have a little extra tucked away if you want me to send it over.

### Boundary

Generic AI:

> I cannot fulfill that request due to policy restrictions.

Girl Next Door baseline:

> I cannot do that, but we can keep it fun another way.

MoonSiren-enriched Girl Next Door, provisional:

> I cannot go there, but I can still keep you entertained if you behave.

## Architecture Note

Minimum viable conceptual model:

```text
Creator
  has many CreatorArchetypeAccess rows

Archetype
  defines baseline expression guidance
  is not creator-specific
  may later be billable or plan-gated

CreatorArchetypeAccess
  joins Creator to Archetype
  records active/entitled status
  may later include plan source or billing source
  should not enforce billing in MSP-1/NSP-1

Playbook
  belongs to Creator
  selects one Archetype
  may optionally select generative style flags

Generative Style
  uses Playbook selected Archetype as the primary style axis
  may use Creator settings as defaults
  may use historical evidence only when available and confidence-rated

Historical Chat Enrichment
  is a read-only evidence summary
  should extract patterns, not content
  should separate creator-authored messages from fan-authored messages
  should never store private fan identifiers in reusable style guidance
```

Minimum viable data recommendation:

- Add an archetype registry concept rather than reusing subscriber personas.
- Reuse `of_automation_registry_entries` only if the team accepts registry entries as product taxonomy. Otherwise create a small `of_creator_archetypes` or `of_archetypes` table later.
- Add a creator-to-archetype association table when implementing entitlement-like access.
- Use `of_message_scripts.builder_config.workspace.archetypeKey` or extend the existing `styleKey` field once the naming is clarified.
- Keep `styleKey` for tone presets only if archetype becomes a separate key.

Recommended naming:

- `archetypeKey`: Girl Next Door, Authority, Muse, Coach, etc.
- `styleKey`: friendly, flirty, direct sales, soft reactivation, etc.

This avoids overloading the existing style registry.

## Historical Chat Enrichment Recommendation

Before NSP-1 consumes historical creator style, implement a read-only evidence pipeline:

1. Fetch recent messages through BetterFans `GET /chats/:id/messages`.
2. Determine author using `fromUser.id === creator.betterfans_account_id` or an equivalent reliable provider field.
3. Keep creator-authored messages for aggregate analysis only.
4. Use fan-authored messages only for context labels.
5. Store or cache an evidence summary, not transcripts.
6. Include sample size and confidence.
7. Never auto-send based on this evidence in the first pass.

Suggested evidence summary shape:

```json
{
  "creatorId": "uuid",
  "archetypeKey": "girl_next_door",
  "sample": {
    "creatorMessageCount": 0,
    "fanContextMessageCount": 0,
    "source": "betterfans_chat_history",
    "retrievedAt": "timestamp",
    "confidence": "low"
  },
  "patterns": {
    "messageLength": null,
    "emojiUsage": null,
    "petNames": [],
    "sellingLanguage": [],
    "boundaries": []
  },
  "avoid": []
}
```

For current MoonSiren MSP-1 data, `creatorMessageCount` should be 0 if using synced storage only.

## NSP-1 Recommendation

NSP-1 should consume:

- selected `archetypeKey`
- archetype baseline guidance
- playbook goal and step context
- creator settings defaults
- historical evidence summary only if confidence is medium or high

NSP-1 should not consume:

- a universal MoonSiren style profile
- raw chat transcripts
- fan identifiers
- generated outbound messages as historical evidence
- subscriber personas as creator archetypes
- billing/entitlement enforcement

Recommended NSP-1 behavior:

- If no reliable historical creator-authored evidence exists, generate from Girl Next Door baseline plus creator settings.
- If reliable evidence exists, blend it as pattern guidance with explicit confidence.
- Keep all generated messages in draft or simulation paths until a later approval policy says otherwise.

## Final Assessment

The intended model is valid:

Creator plus selected Archetype plus optional historical evidence plus Playbook context is the right shape.

The current repository is close enough to support an experiment without a large architecture change because Playbooks already have builder metadata and Creator settings already have AI behavior defaults.

However, current synced data is not sufficient to validate "how MoonSiren expresses Girl Next Door" from historical creator-authored messages. The next step should be a read-only message-history evidence extractor before NSP-1 relies on creator-specific enrichment.
