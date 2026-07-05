# Creator Cockpit Due-Conversation Maintenance Note

## Summary

The Creator Cockpit used to await `processDueConversations` at the top of `handleApi` for every `GET`, `POST`, and `PATCH` request.
That made unrelated API actions depend on a background maintenance sweep finishing first.

The maintenance sweep now runs via `ctx.waitUntil(...)` with a single in-flight guard per Worker isolate.

## Intended Failure Semantics

- Unrelated API routes should continue even if due-conversation maintenance fails.
- The explicit `POST /api/conversations/process-due` route still awaits the sweep and reports failures directly.
- Maintenance errors are still logged, but they no longer take down a valid queue action or simulation request.

## What Changed

- Global awaited maintenance was removed from the request critical path.
- `waitUntil` is used so maintenance can continue after the response is sent.
- A simple in-flight guard prevents repeated maintenance work inside the same Worker isolate.
- Diagnostics now summarize scan counts and failures without logging every processed conversation.

## Known Limitation

- The in-flight guard is isolate-local.
- Multiple Worker isolates can still run maintenance concurrently under load or platform scaling.
- That is acceptable for this pass and remains out of scope for the current architecture.

## Out of Scope

- Cron scheduling
- Durable Objects
- Queues
- Distributed locks
- Broader scheduler architecture
- Playbook, queue, or simulation business logic changes
