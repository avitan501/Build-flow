import { expect, test } from "@playwright/test"
import { createRequestRefreshCoordinator } from "../lib/request-refresh-coordinator"

function fixture() {
  let now = 0, available = true, calls = 0
  const timers = new Map<symbol, { callback: () => void; delay: number }>()
  const wakes = new Set<() => void>()
  const coordinator = createRequestRefreshCoordinator(() => { calls++ }, {
    now: () => now, available: () => available,
    interval: (callback, delay) => { const id = Symbol(); timers.set(id, { callback, delay }); return () => { timers.delete(id) } },
    onWake: callback => { wakes.add(callback); return () => { wakes.delete(callback) } },
  })
  return { coordinator, timers, wakes, calls: () => calls,
    available: (value: boolean) => { available = value },
    advance: (ms: number) => { now += ms; for (const timer of timers.values()) timer.callback() },
    wake: () => { for (const wake of wakes) wake() },
  }
}
test("page and multiple AI sources share the fastest single timer", () => {
  const f = fixture()
  f.coordinator.subscribe(10_000); f.coordinator.subscribe(4_000); f.coordinator.subscribe(4_000)
  expect(f.timers.size).toBe(1); expect(f.wakes.size).toBe(1)
  expect([...f.timers.values()][0].delay).toBe(4_000)
  for (let second = 0; second < 60; second += 4) f.advance(4_000)
  expect(f.calls()).toBe(15)
})
test("finishing organization restores normal refresh and final unmount cleans up", () => {
  const f = fixture(), stopPage = f.coordinator.subscribe(10_000), stopAI = f.coordinator.subscribe(4_000)
  stopAI(); expect([...f.timers.values()][0].delay).toBe(10_000)
  f.advance(10_000); expect(f.calls()).toBe(1)
  stopPage(); expect(f.timers.size).toBe(0); expect(f.wakes.size).toBe(0)
  f.advance(50_000); f.wake(); expect(f.calls()).toBe(1)
})
test("hidden or offline pages do not refresh; wake events coalesce", () => {
  const f = fixture(); f.coordinator.subscribe(4_000); f.available(false)
  f.advance(20_000); f.wake(); expect(f.calls()).toBe(0)
  f.available(true); f.wake(); f.wake(); expect(f.calls()).toBe(1)
  f.advance(100); f.wake(); expect(f.calls()).toBe(1)
  f.advance(4_000); expect(f.calls()).toBe(2)
})
test("standalone organization status still polls and retry mode never accelerates", () => {
  const f = fixture(), stop = f.coordinator.subscribe(15_000)
  f.advance(4_000); expect(f.calls()).toBe(0)
  f.advance(11_000); expect(f.calls()).toBe(1)
  stop(); expect(f.timers.size).toBe(0)
})
test("invalid polling rates cannot create busy loops", () => {
  const f = fixture()
  for (const delay of [0, -1, Number.NaN, Infinity]) expect(() => f.coordinator.subscribe(delay)).toThrow()
  expect(f.timers.size).toBe(0)
})
