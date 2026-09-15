export const CARLOS_GOAL_OPTIONS = [
  ["Collect 5 supplier quotes", "Attach five received quotes to the relevant requests."],
  ["Send an approved client quote", "Get David’s approval before sending; agree on a follow-up time."],
  ["Capture a new material request", "Record the client, products, quantities and delivery needs."],
  ["Find a supplier for a missing product", "Verify the product and availability. Ask David before contacting a supplier he introduced."],
  ["Complete a price comparison", "Compare matching specifications, units and quantities; flag alternatives."],
  ["Secure a better buying price", "Document the improvement, including shipping and conditions."],
  ["Make a request ready for pricing", "Confirm missing details with the client; don’t guess."],
  ["Move a stalled request forward", "Resolve the blocker and record the next action and date."],
  ["Confirm an approved delivery", "Confirm the date, address and included items for an approved order."],
  ["Resolve a website issue", "Tell David, verify the fix and update him. Reporting alone is not completion."],
] as const;
export type CarlosGoal = { id: number; selected: boolean; status: "in_progress" | "done" | "blocked"; note: string; link: string; count: number };
export type CarlosGoalBoard = { revision: number; goals: CarlosGoal[] };
export function initialCarlosGoals(goals: CarlosGoal[] = []): CarlosGoal[] {
  return CARLOS_GOAL_OPTIONS.map((_, id) => goals.find(g => g.id === id) ?? { id, selected: false, status: "in_progress", note: "", link: "", count: 0 });
}
export function validCarlosGoals(value: unknown): value is CarlosGoal[] {
  if (!Array.isArray(value) || value.length !== 10 || new Set(value.map(g => g?.id)).size !== 10) return false;
  return value.filter(g => g?.selected).length <= 5 && value.every(g =>
    g && Number.isInteger(g.id) && g.id >= 0 && g.id < 10 && typeof g.selected === "boolean" &&
    ["in_progress", "done", "blocked"].includes(g.status) && typeof g.note === "string" && g.note.length <= 1200 &&
    typeof g.link === "string" && g.link.length <= 1000 &&
    Number.isInteger(g.count) && g.count >= 0 && g.count <= 5 &&
    (g.status === "in_progress" || g.note.trim().length > 0) &&
    (g.status !== "done" || (/^https?:\/\//i.test(g.link) && (g.id !== 0 || g.count === 5))));
}
