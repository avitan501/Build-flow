import type { AuraCommunicationRow } from "@/lib/aura/dashboard";

const CURSOR_PATTERN = /^(\d{4}-\d{2}-\d{2}T[^~]+)~([0-9a-f-]{36})$/i;

export function communicationHistoryCursor(row: Pick<AuraCommunicationRow, "id" | "occurred_at">) {
  return `${new Date(row.occurred_at).toISOString()}~${row.id}`;
}

export function parseCommunicationHistoryCursor(value: string | null | undefined) {
  if (!value || value.length > 100) return null;
  const match = value.match(CURSOR_PATTERN);
  if (!match) return null;
  const occurredAt = new Date(match[1]);
  if (Number.isNaN(occurredAt.getTime())) return null;
  return { occurredAt: occurredAt.toISOString(), id: match[2].toLowerCase() };
}
