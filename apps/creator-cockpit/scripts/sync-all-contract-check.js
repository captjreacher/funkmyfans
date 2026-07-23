import assert from "node:assert/strict";

function createRunner(dataset, options = {}) {
  const state = {
    stage: "profile",
    cursor: 0,
    processed: 0,
    completed: false,
    running: false,
    lastCursor: null,
    retries: 0
  };
  let providerRequests = 0;
  let databaseRequests = 0;
  const budget = options.budget ?? 30;
  const writes = [];

  function count(total = 1) {
    providerRequests += total;
    if (providerRequests + databaseRequests > budget) throw new Error("sync_request_budget_exceeded");
  }

  function db(total = 1) {
    databaseRequests += total;
    if (providerRequests + databaseRequests > budget) throw new Error("sync_request_budget_exceeded");
  }

  function page(items, offset) {
    const limit = options.pageSize ?? 100;
    return items.slice(offset, offset + limit);
  }

  async function step() {
    if (state.running) throw new Error("sync_already_running");
    state.running = true;
    try {
      if (state.stage === "profile") {
        count();
        db(2);
        writes.push("profile");
        state.stage = "stats";
        state.processed += 1;
        return snapshot(false);
      }
      if (state.stage === "stats") {
        count();
        db(2);
        writes.push("stats");
        state.stage = "subscribers";
        state.processed += 1;
        return snapshot(false);
      }
      if (state.stage === "subscribers") {
        count();
        const items = page(dataset.subscribers, state.cursor);
        if (!items.length) {
          state.stage = "chats";
          return snapshot(false);
        }
        db(2);
        writes.push(`subscribers:${items.length}`);
        const nextCursor = state.cursor + items.length;
        if (nextCursor <= state.cursor) throw new Error("pagination_cursor_repeated");
        state.cursor = nextCursor;
        state.processed += items.length;
        if (items.length < (options.pageSize ?? 100)) state.stage = "chats";
        return snapshot(false);
      }
      if (state.stage === "chats") {
        count();
        const items = page(dataset.chats, state.cursor);
        if (!items.length) {
          state.stage = "completed";
          state.completed = true;
          return snapshot(true);
        }
        db(2);
        writes.push(`chats:${items.length}`);
        const nextCursor = state.cursor + items.length;
        if (nextCursor <= state.cursor) throw new Error("pagination_cursor_repeated");
        state.cursor = nextCursor;
        state.processed += items.length;
        if (items.length < (options.pageSize ?? 100)) {
          state.stage = "completed";
          state.completed = true;
        }
        return snapshot(state.completed);
      }
      return snapshot(true);
    } finally {
      state.running = false;
    }
  }

  function snapshot(done) {
    return {
      syncRunId: "run_1",
      status: done ? "completed" : "in_progress",
      stage: state.stage,
      processed: state.processed,
      nextCursor: state.stage === "completed" ? null : state.cursor,
      hasMore: state.stage !== "completed",
      providerRequests,
      databaseRequests,
      writes
    };
  }

  return { state, step };
}

async function run() {
  const single = createRunner({ subscribers: [1], chats: [1] });
  let result = await single.step();
  assert.equal(result.status, "in_progress");
  result = await single.step();
  assert.equal(result.status, "in_progress");
  result = await single.step();
  assert.equal(result.status, "in_progress");
  result = await single.step();
  assert.equal(result.status, "completed");
  assert.ok(result.providerRequests + result.databaseRequests <= 30);

  const multi = createRunner({ subscribers: Array.from({ length: 250 }, (_, i) => i), chats: Array.from({ length: 150 }, (_, i) => i) });
  for (let i = 0; i < 6; i += 1) await multi.step();
  const done = await multi.step();
  assert.equal(done.status, "completed");
  assert.equal(done.hasMore, false);

  const running = createRunner({ subscribers: [], chats: [] });
  running.state.running = true;
  await assert.rejects(() => running.step(), /sync_already_running/);

  const budgeted = createRunner({ subscribers: Array.from({ length: 5000 }, (_, i) => i), chats: [] }, { budget: 3 });
  await budgeted.step();
  await assert.rejects(() => budgeted.step(), /sync_request_budget_exceeded/);

  console.log("sync-all contract checks passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
