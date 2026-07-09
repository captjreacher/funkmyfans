# NODE-1F — New Subscriber Journey Acceptance Pass

Acceptance + stabilisation of the complete **Journey → Node Contract → Node Flow → Runtime** seam
(NODE-1A → NODE-1E), driven by the Emma / moonsiren **New Subscriber** journey
(`OnlyFans → New Subscriber Chat → Human Handoff`). This is not a feature sprint.

Base: `node-1e-journey-node-contracts` (PR #30). Stacked draft PR.

## Environment & validation evidence

The sandbox egress firewall blocks `registry.npmjs.org` (HTTP 403), so `npm ci`, local
`typecheck`, `build`, and `tsx` could **not** be run in-agent. Evidence used, and what was / was not executed:

| Check | Executed | Result |
|---|---|---|
| Creator Cockpit Smoke CI on PR #30 (`npm ci` → typecheck → build) | ✅ yes (GitHub Actions) | **success** (`verify` job); GitGuardian + Cloudflare Workers build also green |
| CI on this NODE-1F branch (`push` + `pull_request` triggers) | ✅ on push | expected green; is the source of truth for this PR |
| Static trace of every acceptance scenario against the real code | ✅ yes | see below |
| `scripts/node1f-acceptance-check.ts` (deterministic) | ⚠️ not in-agent (needs deps) | runnable via `npx tsx` where deps exist |
| Browser acceptance on the real Playbooks page | ❌ not executed | cloud browser cannot reach sandbox localhost; `node1e`/`node1f` harness provided |

No unexecuted validation is claimed as passed.

## Acceptance results by scenario

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | Open New Subscriber playbook from management surface | PASS | `Playbooks.openBuilder` → `builderSession` → renders `PlaybookJourneyWorkspace` |
| 2 | Journey canvas opens as the parent workspace | PASS | workspace renders `JourneyCanvas` by default; builder is one level down |
| 3 | Three nodes render (OnlyFans / New Subscriber Chat / Human Handoff) | PASS | `bindEmmaJourney` clones the 3-node example, binds Conversation `nodeFlowRef` to the real script |
| 4 | Topology intact (connections, groups, no overlap, persisted layout restores) | PASS | 2 connections; Emma has no groups; positions 80/420/760 non-overlapping (node w=248); NODE-1C load restores positions |
| 5 | Move → dirty → Save persists → reload restores exact position | PASS | NODE-1C `onGraphChange`/`saveScriptJourney`/reload path; NODE-1E `capabilityById` is memoised so drags don't reset positions |
| 6 | Capability contract correct per node | PASS | OnlyFans = channel/source (ready when configured); Chat = automated conversation (ready **only** when referenced script exists); Human = manual |
| 7 | Graceful degradation: missing referenced script | PASS | derives `reference_missing` + warning; no crash |
| 7b | Graceful degradation: unknown/unsupported node metadata | **FIXED (F-1)** | was an unguarded `JOURNEY_CLASS_META[class]` crash; now `journeyClassMeta()` returns a safe fallback |
| 7c | Older NODE-1C persisted graphs still load | PASS | `JourneyGraph` shape unchanged by 1E; capability is derived at render |
| 8 | Drill into New Subscriber Chat via `nodeFlowRef` → existing builder, no duplicate/copied flow | PASS | NODE-1D `openNodeFlow` reuses the parent `BuilderSession`; graph stores only the ref |
| 9 | Node Flow still shows Trigger → Welcome → Ask intent → Offer → End | PASS (static) | existing builder unchanged; not run in a browser |
| 10 | Return → same playbook / positions / groups / connections / state, no re-derivation | PASS | load effect keyed on `session.script`; not remounted on return |
| 11 | Unsaved journey context survives a drill/return | PASS | `openNodeFlow` folds `draftGraph` into the in-memory journey before drilling |
| 12 | Standalone builder routes still work | PASS | `ConversationFlowBuilder` preserved; `onBack` returns to the list |
| 13 | Runtime boundaries untouched | PASS | 1E diff vs 1A–1D tip = journey UI + `of-types` only; no `flowBuilder.ts`, `worker.ts`, `processConversationInstance`, or migration |

## Defects found (classified)

- **F-1 — graceful-degradation / contract-correctness (minor).** `JOURNEY_CLASS_META[node.class]`
  was looked up unguarded in `JourneyNodeCard`, `JourneyNodeDrawer`, and `JourneyCanvas`
  (`miniMapNodeColor`). An unknown/unsupported class (older or malformed persisted graph) made
  `meta` undefined and crashed on `meta.icon` / `meta.accent`, failing scenario 7b. **Fixed** with a
  `JOURNEY_CLASS_FALLBACK_META` + `journeyClassMeta()` accessor.
- **F-2 — defensive robustness (minor).** Entry/exit summary derivation read `node.contract.*`
  directly; a malformed node without a contract would throw. **Fixed** with optional chaining.

No acceptance-blocking, regression, or out-of-scope issues were found. No migration was required.

## Files changed (NODE-1F)

- `apps/creator-cockpit/src/lib/journey.ts` — `JOURNEY_CLASS_FALLBACK_META` + `journeyClassMeta()`.
- `apps/creator-cockpit/src/components/journey/JourneyNodeCard.tsx` — use `journeyClassMeta()`.
- `apps/creator-cockpit/src/components/journey/JourneyNodeDrawer.tsx` — use `journeyClassMeta()`.
- `apps/creator-cockpit/src/components/journey/JourneyCanvas.tsx` — `miniMapNodeColor` uses `journeyClassMeta()`.
- `apps/creator-cockpit/src/lib/journeyContracts.ts` — defensive `node.contract?.` access.
- `apps/creator-cockpit/scripts/node1f-acceptance-check.ts` — deterministic acceptance + degradation check (new).
- `docs/acceptance/node-1f-new-subscriber-acceptance.md` — this record (new).

## Runtime-boundary confirmation

No changes to `flowBuilder.ts`, `processConversationInstance`, conversation-execution behaviour,
runtime-table writes, or migrations. NODE-1F touches journey UI, the derivation lib, a test script,
and docs only.

## Recommendation

The Journey foundation (NODE-1A → 1E, with the F-1/F-2 hardening) is **stable enough to begin the
full New Subscriber Node Flow build.** The Journey / Node Contract / Node Flow / Runtime boundaries
are clean and evidence-checked; persistence is backwards compatible; navigation is single-seam
(`nodeFlowRef`). Recommended next step before that build: **reconcile the merged 1A→1E stack into
`main`** (currently `main` has only 1A+1B), so future work branches from a single coherent base
rather than the stacked feature branches.
