# Creator Intelligence Projection v1

## Boundary

FYV is the canonical producer of creator intelligence.

FMF is the operational consumer. It does not calculate assessment, scoring, archetype derivation, scenario derivation, or opportunity identification in this phase.

## Why This Projection Exists

FMF needs a local read model that can:

- preserve the imported FYV package exactly as received
- associate that package with an FMF creator
- project the package's available opportunities into FMF-owned operational records
- show creator-level intelligence context in the product UI

The projection is intentionally the smallest bridge between an intelligence-producing system and an operations product.

## Immutable Source Snapshot

FMF stores the imported package as an immutable source snapshot so the original FYV contract can be audited and re-projected without losing provenance.

The snapshot is not the operational object. It is the historical source-of-truth record for the imported package payload.

## Separate FMF State

FYV package state stays intelligence-level only:

- identified
- published
- superseded

FMF projection state is separate and operational:

- available
- accepted
- dismissed

This keeps FMF from inheriting FYV lifecycle semantics that belong to the producer.

## Intentionally Excluded In v1

This projection does not include:

- live FYV API integration
- webhooks or event buses
- queues or cross-product database coupling
- playbook generation
- active/generated/playbook state models

## Fixture Note

The local MoonSiren fixture mirrors the FYV creator intelligence package contract for validation.

It is a local FMF-side sample and should later be replaced by a shared package contract or transport import when FYV integration is introduced.
