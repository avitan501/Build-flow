import { expect, test } from "@playwright/test";
import { advanceCircles, circleLayout, circlesOverlap, CIRCLE_PADDING } from "@/lib/dashboard-circle-motion";

for (const width of [266, 336, 600, 960, 1180]) {
  test(`circles travel, turn, and stay separate at ${width}px`, () => {
    const size = width < 550 ? 120 : 180;
    const { circles, height } = circleLayout(6, width, size);
    const start = circles.map((circle) => ({ ...circle }));
    const range = circles.map((circle) => ({ minX: circle.x, maxX: circle.x, minY: circle.y, maxY: circle.y }));
    let turns = 0;
    for (let frame = 0; frame < 2400; frame++) {
      const velocities = circles.map((c) => ({ vx: c.vx, vy: c.vy }));
      advanceCircles(circles, width, height, 1 / 60);
      if (circlesOverlap(circles)) throw new Error(`Collision at frame ${frame}`);
      circles.forEach((circle, i) => {
        if (circle.x < CIRCLE_PADDING - 0.1 || circle.y < CIRCLE_PADDING - 0.1 ||
            circle.x + size > width - CIRCLE_PADDING + 0.1 || circle.y + size > height - CIRCLE_PADDING + 0.1) {
          throw new Error(`Circle ${i} left the arena at frame ${frame}`);
        }
        range[i].minX = Math.min(range[i].minX, circle.x); range[i].maxX = Math.max(range[i].maxX, circle.x);
        range[i].minY = Math.min(range[i].minY, circle.y); range[i].maxY = Math.max(range[i].maxY, circle.y);
        if (Math.sign(circle.vx) !== Math.sign(velocities[i].vx) || Math.sign(circle.vy) !== Math.sign(velocities[i].vy)) turns++;
      });
    }
    expect(turns).toBeGreaterThan(6);
    expect(range.every((r) => Math.hypot(r.maxX - r.minX, r.maxY - r.minY) > 150)).toBe(true);
    expect(circles).not.toEqual(start);
  });
}

test("empty and single-task layouts are valid; huge background-tab deltas are bounded", () => {
  expect(circleLayout(0, 300, 120).circles).toEqual([]);
  const { circles, height } = circleLayout(1, 300, 120);
  const before = { ...circles[0] };
  advanceCircles(circles, 300, height, 300);
  expect(Math.hypot(circles[0].x - before.x, circles[0].y - before.y)).toBeLessThan(5);
});
