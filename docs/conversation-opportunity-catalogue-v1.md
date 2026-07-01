# Conversation Opportunity Catalogue v1

Status: canonical business catalogue for the Conversation Operations Platform

## Purpose

This document defines the complete set of Conversation Opportunities recognised by the platform.

Conversation Opportunities are the business reason work exists.

They are not queues.
They are not playbooks.
They are not scripts.
They are not events.

This catalogue is a business artefact, not an implementation artefact.

It must be understandable by creator managers, agencies, moderators, product owners, developers, and AI agents.

## Canonical Hierarchy

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

## Layer Responsibilities

| Layer | Responsibility |
| --- | --- |
| Conversation | The live interaction record between creator and subscriber. |
| Conversation Interpretation | Normalizes signals, identifies meaning, and classifies business context. |
| Conversation Opportunity | States the business reason the conversation requires attention. |
| Queue | Owns operational work intake, priority, and assignment for opportunities. |
| Playbook | Defines the approved handling strategy for an opportunity. |
| Template | Provides reusable starting patterns for playbooks and scripts. |
| Script | Encodes deterministic operational behavior for an approved playbook. |
| HOST Runtime | Executes governed script behavior using HOST-owned primitives. |

## Opportunity Classification

The catalogue is grouped into the following business categories:

- Revenue
- Retention
- Relationship
- Support
- Compliance
- Operations
- Risk
- Marketing
- Lifecycle
- Creator Management

## Opportunity State

The canonical opportunity lifecycle is:

- Detected
- Queued
- Assigned
- In Progress
- Waiting
- Completed
- Cancelled
- Rejected

## Opportunity Rules

- A Conversation may contain many Opportunities.
- A Conversation Opportunity belongs to exactly one Conversation.
- A Queue Item references one Opportunity.
- Playbooks execute against Opportunities.
- Scripts implement Playbooks.
- HOST executes Scripts.
- Opportunities are business meaning, not execution behavior.
- Opportunity lifecycle and queue ownership are separate concerns.
- A single Conversation may move through multiple Opportunities over time.

## Catalogue

| Name | Category | Description | Business Goal | Typical Trigger | Priority | Default Queue | Suggested Playbook | Human Required? | AI Allowed? | Completion Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New Subscriber | Lifecycle | A new subscriber relationship has started and needs onboarding or welcome handling. | Establish the relationship and set the tone early. | subscription started | High | Unread Conversation | New Subscriber Welcome | Optional | Assist | Welcome has been sent or the welcome workflow is intentionally deferred. |
| Renewal Recovery | Retention | A renewal has lapsed or is at risk, and the relationship needs recovery handling. | Recover the relationship and restore subscription value. | renewal due, renewal failed, expiration detected | High | Needs Reply | Renewal Recovery | Yes | Constrained | Renewal path is resolved, escalated, or explicitly dismissed. |
| Renewal Reminder | Retention | A renewal date is approaching and a timely reminder is appropriate. | Encourage renewal before lapse. | renewal due | Medium | Scheduled Follow-up | Renewal Reminder | Optional | Assist | Reminder is sent or the reminder is intentionally suppressed. |
| VIP Identification | Relationship | The subscriber qualifies for VIP treatment or needs VIP classification. | Mark the relationship for premium handling. | high spend, vip threshold crossed | High | VIP | VIP Identification | Optional | Assist | VIP status is confirmed or rejected with reason. |
| VIP Conversion | Revenue | A high-value subscriber can be moved into VIP treatment or VIP-specific offers. | Convert value into long-term premium relationship. | high spend, engagement spike, creator review | High | VIP | VIP Conversion | Yes | Constrained | VIP path is accepted, declined, or handed off. |
| Custom Content Request | Revenue | The subscriber is requesting custom work, custom content, or tailored delivery. | Capture and convert custom demand safely. | custom request, keyword detected | High | Needs Reply | Custom Content Request | Yes | Constrained | Request is fulfilled, quoted, declined, or escalated. |
| PPV Opportunity | Revenue | The subscriber is a likely buyer for pay-per-view content. | Convert interest into a PPV sale. | high spend, buying signal, message received | High | Needs Reply | PPV Opportunity | Optional | Constrained | Offer is sent, sold, rejected, or deferred. |
| Upsell Opportunity | Revenue | A subscriber is a fit for a higher-value offer or larger purchase. | Increase revenue with a stronger offer. | engagement spike, purchase history, interest keyword | High | Needs Reply | Upsell Opportunity | Optional | Constrained | Upsell is sent, accepted, or explicitly closed. |
| Cross-sell Opportunity | Revenue | A subscriber may respond to a related but different offer. | Expand revenue across relevant offers. | purchase history, interest pattern | Medium | Needs Reply | Cross-sell Opportunity | Optional | Constrained | Cross-sell is sent, accepted, or declined. |
| Tip Acknowledgement | Relationship | A tip or similar positive action should be acknowledged. | Reinforce positive behavior and relationship warmth. | tip received | Medium | Unread Conversation | Tip Acknowledgement | Optional | Assist | Acknowledgement is sent or the interaction is intentionally left untouched. |
| Whale Monitoring | Risk | The subscriber is a very high-value relationship requiring close monitoring. | Protect the relationship and detect material shifts early. | high spend, whale threshold crossed | Critical | VIP | Whale Monitoring | Optional | Assist | Monitoring state is accepted, downgraded, or escalated. |
| High Value Fan | Relationship | The subscriber is valuable enough to warrant elevated attention. | Protect and deepen the relationship. | high spend, purchase accumulation | High | VIP | High Value Fan Care | Optional | Assist | Fan is handled, moved to another opportunity, or explicitly resolved. |
| Low Engagement Fan | Retention | The relationship is weakening and engagement is falling. | Rebuild interaction before the subscriber becomes inactive. | low engagement, reply delay, inactivity signal | Medium | Waiting | Re-engagement | Optional | Assist | Engagement is restored, the case is dismissed, or it becomes inactive. |
| Inactive Subscriber | Retention | The subscriber has fallen inactive and needs recovery assessment. | Reactivate the relationship or mark it as dormant. | inactivity threshold, no recent replies | High | Needs Reply | Inactive Subscriber Recovery | Optional | Assist | Subscriber re-engages, is moved to win-back, or is closed. |
| Win-back | Retention | The platform is trying to recover an inactive or lapsed subscriber. | Restore revenue and relationship value. | inactivity, expired subscription, missed reply | High | Needs Reply | Win-back | Yes | Constrained | Win-back attempt is completed or the case is rejected. |
| Complaint | Support | The subscriber has expressed dissatisfaction or a complaint. | Resolve the complaint and reduce churn risk. | complaint keyword, negative sentiment, creator report | High | Escalated | Complaint Handling | Yes | Constrained | Complaint is resolved, escalated, or closed with documented reason. |
| Compliance Review | Compliance | The conversation requires policy, safety, or governance review. | Prevent unsafe or non-compliant handling. | policy keyword, protected content, review flag | Critical | Compliance Review | Compliance Review | Yes | None | Review is approved, rejected, or escalated to governance. |
| Blocked Conversation | Compliance | The conversation cannot proceed until a restriction is lifted. | Prevent further action until the block is cleared. | blocked status, policy lock, trust issue | Critical | Compliance Review | Blocked Conversation Handling | Yes | None | Block is lifted, confirmed, or escalated. |
| Manual Escalation | Operations | A human intentionally escalates the conversation for attention. | Route the work to the correct human owner. | manual escalation, operator override | High | Escalated | Manual Escalation | Yes | None | Escalation is accepted, reassigned, or resolved. |
| AI Escalation | Risk | AI cannot complete the work safely and a human must take over. | Preserve safety and decision quality. | low confidence, AI boundary hit | High | Escalated | AI Escalation | Yes | None | Human ownership is established or the case is closed. |
| Content Delivery | Operations | The conversation is waiting on content delivery or asset sharing. | Deliver the requested content or close the loop. | content request, scheduled send, delivery due | Medium | Scheduled Follow-up | Content Delivery | Optional | Constrained | Content is delivered or the request is explicitly declined. |
| Payment Follow-up | Revenue | Payment or purchase follow-up is required to complete the business outcome. | Recover revenue or resolve payment friction. | payment failure, purchase pending, renewal failed | High | Needs Reply | Payment Follow-up | Yes | Constrained | Payment is completed, abandoned, or escalated. |
| Priority Reply | Operations | The conversation needs a fast human reply. | Reduce response latency on important threads. | urgent message, SLA risk, customer priority | Critical | Unread Conversation | Priority Reply | Yes | Constrained | Reply is sent or the item is reclassified. |
| Unread Conversation | Operations | A conversation is new or unread and must be triaged. | Ensure nothing important is missed. | message received | High | Unread Conversation | Triage Unread Conversation | Optional | Assist | Conversation is triaged into another opportunity or completed. |
| Conversation Stall | Operations | The conversation has stalled and needs a nudge or operator intervention. | Re-establish progress or close the thread. | waiting delay, no response, overdue state | High | Waiting | Conversation Stall Recovery | Optional | Assist | Progress resumes, the item is escalated, or the case is closed. |
| Relationship Building | Relationship | The conversation is healthy and should be used to deepen rapport. | Strengthen long-term relationship value. | positive sentiment, ongoing chat, engagement rise | Medium | Waiting | Relationship Building | Optional | Assist | Relationship is advanced, handed off, or intentionally left open. |
| Creator Follow-up | Creator Management | The creator needs to review, approve, or respond to the conversation. | Put the right decision in front of the creator. | creator approval needed, sensitive reply | High | Creator Queue | Creator Follow-up | Yes | None | Creator responds, delegates, or rejects the follow-up. |
| Moderator Follow-up | Creator Management | A moderator must continue handling the conversation. | Complete operational work at the moderator level. | assigned work, handoff, backlog | Medium | Team Queue | Moderator Follow-up | Yes | Assist | Moderator acts, reassigns, or completes the work. |
| Scheduled Follow-up | Operations | The conversation is intentionally waiting for a future action. | Resume work at the right time. | scheduled follow-up, delay expiry | Medium | Scheduled Follow-up | Scheduled Follow-up | Optional | Assist | Follow-up is executed or the schedule is cancelled. |
| Birthday Opportunity | Marketing | The subscriber has a birthday-related business moment. | Use a milestone moment to drive goodwill or revenue. | birthday, date-based trigger | Low | Scheduled Follow-up | Birthday Outreach | Optional | Assist | Birthday action is sent, skipped, or intentionally deferred. |
| Anniversary Opportunity | Marketing | The relationship anniversary or subscription anniversary is relevant. | Mark the milestone and increase loyalty. | anniversary, subscription anniversary | Low | Scheduled Follow-up | Anniversary Outreach | Optional | Assist | Anniversary action is sent or intentionally suppressed. |
| Promotion Campaign | Marketing | A campaign offer should be delivered or coordinated. | Drive campaign conversion. | campaign launch, creator promotion | Medium | Campaign Queue | Promotion Campaign | Optional | Constrained | Campaign response is sent, scheduled, or closed. |
| Campaign Response | Marketing | The subscriber has responded to a campaign and needs handling. | Convert campaign interest into an outcome. | campaign reply, campaign click, campaign keyword | Medium | Campaign Queue | Campaign Response Handling | Optional | Constrained | Response is handled, converted, or dismissed. |
| Mass Message Follow-up | Marketing | A broadcast or mass message produced responses that need review. | Convert broadcast replies into useful outcomes. | mass message reply, broadcast response | High | Needs Reply | Mass Message Follow-up | Optional | Constrained | Follow-up is completed, grouped, or closed. |
| Fan Question | Support | The subscriber asked a direct question that needs an answer. | Answer clearly and keep the conversation moving. | question mark, question keyword | Medium | Needs Reply | Fan Question Handling | Optional | Assist | Question is answered or moved to another opportunity. |
| Support Request | Support | The subscriber needs help with a non-sensitive operational issue. | Resolve the issue or route it correctly. | support keyword, help request | High | Needs Reply | Support Request Handling | Yes | Assist | Request is resolved, escalated, or closed. |
| Safety Review | Compliance | The conversation may involve safety, policy, or harm-related concerns. | Protect users and enforce platform rules. | safety keyword, harm signal, sensitive content | Critical | Compliance Review | Safety Review | Yes | None | Review is resolved or escalated to governance. |
| Risk Review | Risk | The conversation may create financial, reputational, or operational risk. | Reduce exposure and prevent avoidable harm. | fraud suspicion, chargeback risk, policy risk | High | Compliance Review | Risk Review | Yes | None | Risk is resolved, monitored, or escalated. |
| Creator Action Required | Creator Management | The creator must take a specific action to move the conversation forward. | Ensure the creator completes the required step. | creator-only action, approval request | High | Creator Queue | Creator Action Required | Yes | None | Creator action is completed, delegated, or rejected. |

## Notes On The Catalogue

- The suggested playbook names are references only.
- The default queue is an operational ownership suggestion, not a queue definition.
- AI Allowed describes business permission only.
- AI execution remains outside v1.
- Human Required is the default operating stance, not a hard implementation constraint.

## Business Interpretation Rules

- Opportunities may be discovered from one or more conversation signals.
- Opportunities may be reclassified as more context becomes available.
- Multiple opportunities may coexist on the same conversation if they are materially distinct.
- The highest-priority active opportunity should generally own the operational queue item.
- A completed opportunity may give way to a new opportunity in the same conversation.
- Compliance and risk opportunities always override convenience-driven handling.

## Canonical Source Of Truth

This catalogue is the business source of truth for Conversation Opportunities.

Future COP-2 implementation must use this catalogue as the approved business reference for opportunity recognition, classification, routing, and operating language.
