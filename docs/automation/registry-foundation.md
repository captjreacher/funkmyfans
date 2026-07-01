# Conversation Operations Registry Foundation

This document describes the first backend registry layer for the Conversation Operations Platform.

## Purpose

The registry layer moves product copy and UI taxonomy out of hardcoded frontend arrays and into a shared backend source of truth. It lets Playbooks, Routing, and Conversation Interpretation render the same supported options from API data while keeping execution behavior unchanged.

## Registry Table Shape

Registry entries live in `of_automation_registry_entries`.

Key fields:

- `kind`: registry bucket, such as event type, classification, destination, goal, style, or queue state
- `registry_key`: stable machine key used by the UI and API
- `label`: human-readable display text
- `description`: optional supporting copy
- `category`: optional grouping label
- `premium`: marks entries intended for paid or gated features
- `is_default`: marks the primary option within a kind
- `sort_order`: display ordering
- `metadata`: flexible JSON payload for type-specific hints and migration-safe extension data

## Seeded Registry Categories

The initial seed includes:

- Event types
- Conversation classifications
- Routing destinations
- Playbook goals
- Playbook styles
- Queue states

## API Shape

`GET /api/automation/registry` returns grouped registry data:

```ts
{
  eventTypes: RegistryEntry[];
  conversationClassifications: RegistryEntry[];
  routingDestinations: RegistryEntry[];
  playbookGoals: RegistryEntry[];
  playbookStyles: RegistryEntry[];
  queueStates: RegistryEntry[];
}
```

Each `RegistryEntry` includes the table fields above plus `id`, `createdAt`, and `updatedAt`.

## Current Consumers

- Playbooks reads goals, styles, and event types from the registry endpoint to populate the wizard and summary UI.
- Routing reads conversation classifications, routing destinations, and queue states from the same registry data.
- Both pages remain read-only consumers of the registry for now.

## Current Constraints

- Read-only registry access only
- No execution behavior changes
- No AI routing changes
- Existing save, draft, test, and simulation flows remain deterministic and unchanged

## Future Extension Points

- `premium` flags for gated or monetized taxonomy values
- Marketplace packs for importing registry bundles
- Creator-specific overrides for tenant-level customization
- Analytics for option usage, conversion, and routing outcomes
- Versioned registry metadata for safe migration of new UI/runtime behavior
