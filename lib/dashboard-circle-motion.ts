// Version 5's bounded circle motion, adapted for a variable number of real tasks.
// Coordinates live outside React so animation never renders the component tree.
export type TaskCircle = { x: number; y: number; vx: number; vy: number; size: number };
export const CIRCLE_PADDING = 12;
export const CIRCLE_GAP = 10;

export function circleLayout(count: number, width: number, size: number) {
  const columns = Math.max(1, Math.min(4, Math.floor((width - CIRCLE_PADDING * 2 + CIRCLE_GAP) / (size + CIRCLE_GAP))));
  const rows = Math.ceil(count / columns);
  const height = Math.max(width < 600 ? 390 : 470, rows * (size + 55) + 60);
  const circles: TaskCircle[] = Array.from({ length: count }, (_, i) => ({
    size,
    x: CIRCLE_PADDING + (i % columns) * Math.max(0, width - size - CIRCLE_PADDING * 2) / Math.max(1, columns - 1),
    y: CIRCLE_PADDING + Math.floor(i / columns) * (height - size - CIRCLE_PADDING * 2) / Math.max(1, rows - 1),
    vx: (i % 2 ? -1 : 1) * ((width < 600 ? 30 : 45) + (i % 3) * 7),
    vy: [21, 33, -27, -19][i % 4],
  }));
  return { circles, height };
}

function keepInside(circle: TaskCircle, width: number, height: number) {
  const maxX = Math.max(CIRCLE_PADDING, width - circle.size - CIRCLE_PADDING);
  const maxY = Math.max(CIRCLE_PADDING, height - circle.size - CIRCLE_PADDING);
  // Keep a small cross-axis component when turning. A perfectly horizontal or
  // vertical reflection would otherwise trap neighbors in repeating lanes.
  const cross = (value: number) => (value >= 0 ? 1 : -1) * Math.max(12, Math.abs(value));
  if (circle.x < CIRCLE_PADDING) { circle.x = CIRCLE_PADDING; circle.vx = Math.max(20, Math.abs(circle.vx)); circle.vy = cross(circle.vy); }
  if (circle.x > maxX) { circle.x = maxX; circle.vx = -Math.max(20, Math.abs(circle.vx)); circle.vy = cross(circle.vy); }
  if (circle.y < CIRCLE_PADDING) { circle.y = CIRCLE_PADDING; circle.vy = Math.max(20, Math.abs(circle.vy)); circle.vx = cross(circle.vx); }
  if (circle.y > maxY) { circle.y = maxY; circle.vy = -Math.max(20, Math.abs(circle.vy)); circle.vx = cross(circle.vx); }
}

export function circlesOverlap(circles: TaskCircle[]) {
  return circles.some((a, i) => circles.slice(i + 1).some((b) =>
    Math.hypot(b.x + b.size / 2 - a.x - a.size / 2, b.y + b.size / 2 - a.y - a.size / 2) < (a.size + b.size) / 2 + CIRCLE_GAP - 0.1,
  ));
}

export function advanceCircles(circles: TaskCircle[], width: number, height: number, seconds: number) {
  const dt = Math.min(Math.max(seconds, 0), 0.04);
  for (const circle of circles) {
    const propose = (vx: number, vy: number) => {
      const next = { ...circle, vx, vy, x: circle.x + vx * dt, y: circle.y + vy * dt };
      keepInside(next, width, height);
      return next;
    };
    const collision = (next: TaskCircle) => circles.find((other) => other !== circle &&
      Math.hypot(next.x + next.size / 2 - other.x - other.size / 2, next.y + next.size / 2 - other.y - other.size / 2) < (next.size + other.size) / 2 + CIRCLE_GAP,
    );
    let next = propose(circle.vx, circle.vy);
    const other = collision(next);
    if (other) {
      const dx = circle.x + circle.size / 2 - other.x - other.size / 2;
      const dy = circle.y + circle.size / 2 - other.y - other.size / 2;
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance, ny = dy / distance;
      const dot = circle.vx * nx + circle.vy * ny;
      const speed = Math.max(35, Math.hypot(circle.vx, circle.vy));
      const alternatives = [
        propose(-ny * speed, nx * speed),
        propose(ny * speed, -nx * speed),
        propose(circle.vx - 2 * dot * nx, circle.vy - 2 * dot * ny),
        propose(nx * speed, ny * speed),
      ];
      const clear = alternatives.find((candidate) => !collision(candidate) && Math.hypot(candidate.x - circle.x, candidate.y - circle.y) > 0.01);
      if (!clear) {
        // Only this circle waits, never the whole arena. Rotate its next attempt
        // so a wall/circle pinch cannot permanently pin it in place.
        circle.vx = -circle.vy; circle.vy = next.vx;
        continue;
      }
      next = clear;
    }
    Object.assign(circle, next);
  }
}
