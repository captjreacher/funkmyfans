# FunkMyFans

## Creator Cockpit Smoke Tests

Use the Creator Cockpit smoke suite to verify deploy-safe surface area before release. It checks:

- API shape for `Dashboard`, `Scripts`, `Automation`, `Settings`, and `Outbound`
- A simulation-only business flow through a connected creator and automation rule test path when available
- Outbound approval queue visibility, including needs-approval, approved/sending, sent, and failed buckets

Run it locally against a worker on `127.0.0.1:8787`:

```bash
npm run smoke:creator-cockpit:local
```

Run it against a deployed worker:

```bash
COCKPIT_BASE_URL=https://your-worker.example.com npm run smoke:creator-cockpit:prod
```

Environment variables:

- `COCKPIT_BASE_URL` required for deployed smoke runs; defaults to `http://127.0.0.1:8787` when unset
- `COCKPIT_SMOKE_MUTATION` optional, reserved for future mutation-only checks; default smoke runs remain read-only / simulation-only

CI behavior:

- Workflow: [`.github/workflows/creator-cockpit-smoke.yml`](./.github/workflows/creator-cockpit-smoke.yml)
- Always runs install, Creator Cockpit typecheck, and build
- Runs deployed smoke only when `COCKPIT_BASE_URL` is provided via secret or workflow env
- Skips deployed smoke cleanly when the URL is not available

Safety note:

- Default smoke tests must not send live creator messages
- Any future mutation smoke tests must be explicitly designed, safely sandboxed, and never target real creators unless the test plan says so

## Docs

- [Automation registry foundation](./docs/automation/registry-foundation.md)
