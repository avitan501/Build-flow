import { importWhatsAppLogs } from "../lib/whatsapp-log-importer.ts";
import type { ImportMode } from "../lib/whatsapp-log-importer.ts";

type CliArgs = {
  mode: ImportMode;
  senderLast4: string | null;
  since: string | null;
  until: string | null;
  maxMessages: number;
  lookbackDays: number;
};

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFlag(argv: string[], flag: string) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

function hasFlag(argv: string[], flag: string) {
  return argv.includes(flag);
}

function parseArgs(argv: string[]): CliArgs {
  const mode: ImportMode = hasFlag(argv, "--apply") ? "apply" : "dry-run";
  const senderLast4 = readFlag(argv, "--sender-last4");
  const since = readFlag(argv, "--since");
  const until = readFlag(argv, "--until");
  const maxMessages = Math.max(1, Math.min(50, parseNumber(readFlag(argv, "--max-messages") ?? undefined, 5)));
  const lookbackDays = Math.max(1, Math.min(7, parseNumber(readFlag(argv, "--lookback-days") ?? undefined, 1)));

  return {
    mode,
    senderLast4,
    since,
    until,
    maxMessages,
    lookbackDays,
  };
}

function printUsage() {
  console.log([
    "Usage:",
    "  node --experimental-strip-types scripts/import-whatsapp-logs.ts [--sender-last4 0501] [--since 2026-04-27T17:20:00Z] [--until 2026-04-27T17:25:00Z] [--max-messages 5] [--lookback-days 1]",
    "",
    "Defaults:",
    "  - dry-run mode unless --apply is passed",
    "  - scans recent OpenClaw log files only",
    "  - max 5 messages by default",
  ].join("\n"));
}

async function main() {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, "--help")) {
    printUsage();
    return;
  }

  const args = parseArgs(argv);
  const summary = await importWhatsAppLogs({
    mode: args.mode,
    senderLast4: args.senderLast4,
    since: args.since,
    until: args.until,
    maxMessages: args.maxMessages,
    lookbackDays: args.lookbackDays,
  });

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
