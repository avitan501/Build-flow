import { test, expect } from "@playwright/test";
import { AutosaveQueue, type AutosaveResult } from "../lib/autosave-queue";

const tick = () => new Promise((resolve) => setTimeout(resolve, 15));
function deferred() {
  let resolve!: (result: AutosaveResult) => void;
  const promise = new Promise<AutosaveResult>((done) => { resolve = done; });
  return { promise, resolve };
}

test("initial and unchanged values make no writes; rapid edits debounce into one", async () => {
  const writes: number[] = [];
  const queue = new AutosaveQueue(0, 0, async (value) => {
    writes.push(value); return { ok: true, revision: 1 };
  }, 5);
  queue.update(0);
  await tick();
  expect(writes).toEqual([]);
  queue.update(1); queue.update(2); queue.update(3);
  await tick();
  expect(writes).toEqual([3]);
  expect(queue.getState().status).toBe("saved");
  queue.update(3);
  await queue.flush();
  expect(writes).toEqual([3]);
});

test("pending writes serialize latest snapshot and chain returned revision; flush waits both", async () => {
  const first = deferred(); const second = deferred();
  const writes: [number, number][] = [];
  const queue = new AutosaveQueue(0, 4, (value, revision) => {
    writes.push([value, revision]); return writes.length === 1 ? first.promise : second.promise;
  });
  queue.update(1);
  const flushed = queue.flush();
  await Promise.resolve();
  queue.update(2); queue.update(3);
  expect(queue.getState().status).toBe("saving");
  expect(writes).toEqual([[1, 4]]);
  first.resolve({ ok: true, revision: 5 });
  await tick();
  expect(writes).toEqual([[1, 4], [3, 5]]);
  expect(queue.getState().dirty).toBe(true);
  second.resolve({ ok: true, revision: 6 });
  expect(await flushed).toBe(true);
  expect(queue.getState().dirty).toBe(false);
});

test("editing back to baseline during a save still restores baseline on server", async () => {
  const pending = deferred(); const values: number[] = [];
  const queue = new AutosaveQueue(0, 0, async (value) => {
    values.push(value); return values.length === 1 ? pending.promise : { ok: true, revision: 2 };
  });
  queue.update(1); const flushed = queue.flush(); await Promise.resolve();
  queue.update(0); pending.resolve({ ok: true, revision: 1 });
  expect(await flushed).toBe(true);
  expect(values).toEqual([1, 0]);
});

test("failure retains dirty draft and stops autosaves until explicit retry of latest", async () => {
  const values: number[] = [];
  const queue = new AutosaveQueue(0, 0, async (value) => {
    values.push(value);
    return values.length === 1 ? { ok: false, error: "Offline" } : { ok: true, revision: 1 };
  }, 5);
  queue.update(1); expect(await queue.flush()).toBe(false);
  queue.update(2); await tick();
  expect(values).toEqual([1]);
  expect(queue.getState()).toMatchObject({ dirty: true, status: "error", error: "Offline" });
  expect(await queue.flush()).toBe(false);
  expect(await queue.retry()).toBe(true);
  expect(values).toEqual([1, 2]);
});

test("conflict never retries blindly or clears on further typing", async () => {
  let count = 0;
  const queue = new AutosaveQueue(0, 2, async () => {
    count++; return { ok: false, error: "Changed elsewhere", conflict: true };
  }, 5);
  queue.update(1); expect(await queue.flush()).toBe(false);
  queue.update(3); await tick();
  expect(await queue.retry()).toBe(false);
  expect(count).toBe(1);
  expect(queue.getState()).toMatchObject({ dirty: true, conflict: true });
});

test("thrown save and reverting to old baseline cannot falsely become saved", async () => {
  let count = 0;
  const queue = new AutosaveQueue(0, 0, async () => {
    if (++count === 1) throw new Error("network");
    return { ok: true, revision: 1 };
  });
  queue.update(1); expect(await queue.flush()).toBe(false);
  queue.update(0); expect(queue.getState().dirty).toBe(true);
  expect(await queue.retry()).toBe(true);
  expect(count).toBe(2);
});

test("snapshots are immutable and cancelling scheduled writes does not mark draft saved", async () => {
  const values: { value: number }[] = [];
  const queue = new AutosaveQueue({ value: 0 }, 0, async (value) => {
    values.push(value); return { ok: true, revision: 1 };
  }, 5);
  const draft = { value: 1 }; queue.update(draft); draft.value = 99;
  queue.cancelScheduled(); await tick();
  expect(values).toEqual([]);
  expect(queue.getState().dirty).toBe(true);
  expect(await queue.flush()).toBe(true);
  expect(values).toEqual([{ value: 1 }]);
});

test("in-flight failure preserves newer edits and concurrent flush callers see failure", async () => {
  const pending = deferred(); const values: number[] = [];
  const queue = new AutosaveQueue(0, 0, async (value) => {
    values.push(value);
    return values.length === 1 ? pending.promise : { ok: true, revision: 1 };
  }, 5);
  queue.update(1); const firstFlush = queue.flush();
  await Promise.resolve(); queue.update(2);
  const secondFlush = queue.flush();
  expect(secondFlush).toBe(firstFlush);
  pending.resolve({ ok: false, error: "Unavailable" });
  expect(await firstFlush).toBe(false);
  expect(await secondFlush).toBe(false);
  await tick();
  expect(values).toEqual([1]);
  expect(await queue.retry()).toBe(true);
  expect(values).toEqual([1, 2]);
});

test("updated persistence callback is used without creating an initial write", async () => {
  const queue = new AutosaveQueue(0, 9, async () => { throw new Error("old callback"); });
  const calls: number[] = [];
  queue.setPersist(async (_value, revision) => {
    calls.push(revision); return { ok: true, revision: revision + 1 };
  });
  expect(await queue.flush()).toBe(true); expect(calls).toEqual([]);
  queue.update(1); expect(await queue.flush()).toBe(true);
  expect(calls).toEqual([9]);
});

test("unmount during a save stops the newer queued snapshot and never reports flush success", async () => {
  const pending = deferred(); const writes: number[] = [];
  const queue = new AutosaveQueue(0, 0, async value => {
    writes.push(value); return pending.promise;
  });
  queue.update(1); const flushed = queue.flush(); await Promise.resolve();
  queue.update(2); queue.pause();
  pending.resolve({ ok: true, revision: 1 });
  expect(await flushed).toBe(false);
  expect(writes).toEqual([1]);
  expect(queue.getState().dirty).toBe(true);
  expect(await queue.flush()).toBe(false);
});

test("unmount before the flush microtask makes no server write", async () => {
  let writes = 0;
  const queue = new AutosaveQueue(0, 0, async () => { writes++; return { ok: true, revision: 1 }; });
  queue.update(1); const flushed = queue.flush(); queue.pause();
  expect(await flushed).toBe(false); expect(writes).toBe(0);
});

test("Strict Mode pause/resume preserves edits and writes once", async () => {
  const writes: number[] = [];
  const queue = new AutosaveQueue(0, 0, async value => { writes.push(value); return { ok: true, revision: 1 }; }, 5);
  queue.update(1); queue.pause(); queue.resume();
  await tick(); expect(writes).toEqual([1]); expect(queue.getState().dirty).toBe(false);
});

test("unverified server revisions fail closed instead of declaring saved", async () => {
  for (const revision of [0, -1, 1.5, NaN, Infinity]) {
    const queue = new AutosaveQueue(0, 0, async () => ({ ok: true, revision }));
    queue.update(1); expect(await queue.flush()).toBe(false);
    expect(queue.getState()).toMatchObject({ dirty: true, conflict: true });
    expect(await queue.retry()).toBe(false);
  }
});
