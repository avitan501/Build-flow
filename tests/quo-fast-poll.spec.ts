import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()

test("Quo fast ingress is authenticated, bounded, and idempotent", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")

  expect(broker).toContain("handleQuoFastPollDispatch")
  expect(broker).toContain("quoFastPollDispatchSecret")
  expect(broker).toContain('req.headers.get("x-quo-fast-poll")')
  expect(broker).toContain("constantTimeEqual(expectedSecret, suppliedSecret)")
  expect(broker).toContain('url.searchParams.get("mode") === "quo-fast-poll"')
  expect(broker).toContain("const leaseToken = await claimQuoFastPollLease()")
  expect(broker).toContain('reason: "lease_active"')
  expect(broker).toContain("EdgeRuntime.waitUntil(runQuoFastPollWindow(leaseToken))")
  expect(broker).toContain("private.claim_quo_fast_poll_lease")
  expect(broker).toContain("private.renew_quo_fast_poll_lease")
  expect(broker).toContain("private.release_quo_fast_poll_lease")
  expect(broker).toMatch(/if \(!\(await renewQuoFastPollLease\(leaseToken\)\)\)/)
  expect(broker).toContain("await releaseQuoFastPollLease(leaseToken)")
  expect(broker).not.toContain("for (let cycle = 0; cycle < 5; cycle += 1)")
  expect(broker).toContain("cycles: 1")
  expect(broker).not.toContain("setTimeout(resolve, 5000)")
  const pollingFunction = broker.slice(broker.indexOf("async function pollRecentQuoMessagesOnce"), broker.indexOf("async function runQuoFastPollWindow"))
  expect(pollingFunction).toContain('new URL("https://api.quo.com/v1/conversations")')
  expect(pollingFunction).toContain('new URL("https://api.quo.com/v1/messages")')
  expect(pollingFunction).toContain('searchParams.append("participants", participant)')
  expect(pollingFunction).toContain(".slice(0, 8)")
  expect(pollingFunction).toContain("AbortSignal.timeout(3000)")
  expect(pollingFunction.match(/signal: pollSignal/g)).toHaveLength(2)
  expect(pollingFunction).not.toContain("api.openphone.com")
  expect(broker).toContain("on conflict (provider, external_event_id) do nothing")
  expect(broker).toContain("on conflict (provider, external_activity_id) do nothing")
})

test("Quo fast-poll control queries do not wait behind the polling connection", async () => {
  const broker = await readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8")

  expect(broker).toContain("const fastPollControlSql = postgres")
  expect(broker.match(/max: 1/g)).toHaveLength(2)

  const claim = broker.slice(
    broker.indexOf("async function claimQuoFastPollLease"),
    broker.indexOf("async function renewQuoFastPollLease"),
  )
  const renew = broker.slice(
    broker.indexOf("async function renewQuoFastPollLease"),
    broker.indexOf("async function releaseQuoFastPollLease"),
  )
  const release = broker.slice(
    broker.indexOf("async function releaseQuoFastPollLease"),
    broker.indexOf("async function runQuoFastPollWindow"),
  )

  for (const leaseOperation of [claim, renew, release]) {
    expect(leaseOperation).toContain("fastPollControlSql")
    expect(leaseOperation).not.toMatch(/await sql[<`]/)
  }

  const dispatch = broker.slice(
    broker.indexOf("async function handleQuoFastPollDispatch"),
    broker.indexOf("const PUBLIC_START_TEXT_TEMPLATE_VERSION"),
  )
  expect(broker).toContain("async function quoFastPollDispatchSecret")
  expect(dispatch).toContain("await quoFastPollDispatchSecret()")
  expect(dispatch).not.toContain('await secret("quo_fast_poll_dispatch_secret")')
})

test("Quo fast ingress lease is atomic, private, renewable, and crash recoverable", async () => {
  const migration = await readFile(path.join(root, "supabase/migrations/20260830125147_harden_quo_fast_poll_lease.sql"), "utf8")

  expect(migration).toContain("create table if not exists private.aura_worker_leases")
  expect(migration).toContain("lease_name text primary key")
  expect(migration).toContain("on conflict (lease_name) do update")
  expect(migration).toContain("where private.aura_worker_leases.lease_until <= clock_timestamp()")
  expect(migration).toContain("private.claim_quo_fast_poll_lease")
  expect(migration).toContain("private.renew_quo_fast_poll_lease")
  expect(migration).toContain("private.release_quo_fast_poll_lease")
  expect(migration).toContain("and lease_token = p_lease_token")
  expect(migration).toContain("and lease_until > clock_timestamp()")
  expect(migration).toContain("revoke all on table private.aura_worker_leases from public, anon, authenticated")
  expect(migration).toContain("revoke all on function private.claim_quo_fast_poll_lease(integer) from public, anon, authenticated")
  expect(migration).not.toMatch(/quo_fast_poll_dispatch_secret|decrypted_secret/)
})

test("pg_cron dispatch reads its credential from Vault and never exposes it in the job", async () => {
  const [migration, timeoutMigration] = await Promise.all([
    readFile(path.join(root, "supabase/migrations/20260830123936_add_quo_fast_poll.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830130028_extend_quo_fast_poll_dispatch_timeout.sql"), "utf8"),
  ])

  expect(migration).toContain("create extension if not exists pg_net")
  expect(migration).toContain("create extension if not exists pg_cron")
  expect(migration).toContain("vault.create_secret")
  expect(migration).toContain("quo_fast_poll_dispatch_secret")
  expect(migration).toContain("from vault.decrypted_secrets")
  expect(migration).toContain("security definer")
  expect(migration).toContain("set search_path = ''")
  expect(migration).toContain("X-Quo-Fast-Poll")
  expect(migration).toContain("?mode=quo-fast-poll")
  expect(migration).toContain("https://nprfhspwdflpqlopydmp.supabase.co")
  expect(migration).toContain("'* * * * *'")
  expect(migration).toContain("cron.unschedule(existing_job)")
  expect(migration).toContain("revoke all on function public.dispatch_quo_fast_poll() from public, anon, authenticated")

  const scheduledCommand = migration.match(/'select public\.dispatch_quo_fast_poll\(\);'/)?.[0] || ""
  expect(scheduledCommand).toBe("'select public.dispatch_quo_fast_poll();'")
  expect(scheduledCommand).not.toContain("quo_fast_poll_dispatch_secret")
  expect(scheduledCommand).not.toContain("X-Quo-Fast-Poll")
  expect(timeoutMigration).toContain("timeout_milliseconds := 30000")
  expect(timeoutMigration).toContain("https://nprfhspwdflpqlopydmp.supabase.co")
  expect(timeoutMigration).toContain("revoke all on function public.dispatch_quo_fast_poll() from public, anon, authenticated")
  expect(timeoutMigration).not.toContain("cron.schedule")
})

test("Quo recovery dispatch is isolated from the live customer webhook worker", async () => {
  const migration = await readFile(
    path.join(root, "supabase/migrations/20260830145710_isolate_quo_fast_poll_worker.sql"),
    "utf8",
  )

  expect(migration).toContain("/functions/v1/aura-quo-fast-poll-worker?mode=quo-fast-poll")
  expect(migration).toContain("timeout_milliseconds := 5000")
  expect(migration).not.toContain("/functions/v1/aura-messaging-broker?mode=quo-fast-poll")
  expect(migration).toContain("quo_fast_poll_dispatch_secret")
  expect(migration).toContain("revoke all on function public.dispatch_quo_fast_poll() from public, anon, authenticated")
})

test("Quo recovery retries every 30 seconds and records safe failures", async () => {
  const [broker, migration] = await Promise.all([
    readFile(path.join(root, "supabase/functions/aura-messaging-broker/index.ts"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260830223200_schedule_quo_recovery_every_30_seconds.sql"), "utf8"),
  ])

  expect(migration).toContain("'30 seconds'")
  expect(migration).toContain("cron.alter_job")
  expect(migration).toContain("cron.schedule")
  expect(migration).toContain("'select public.dispatch_quo_fast_poll();'")
  expect(migration).not.toMatch(/decrypted_secret|quo_fast_poll_dispatch_secret|X-Quo-Fast-Poll/)
  expect(broker).toContain("function quoFastPollErrorCode")
  expect(broker).toContain("'quo_fast_poll_window_failed'")
  expect(broker).toContain('error_code: errorCode')
  expect(broker).toContain('error_code: "lease_lost"')
  expect(broker).toMatch(/if \(!messagesResponse\.ok\)\s+throw new Error/)
  const pollWindow = broker.slice(broker.indexOf("async function runQuoFastPollWindow"), broker.indexOf("function validEmail"))
  expect(pollWindow).not.toContain("String(error)")
})

test("Quo recovery ACK timeout tolerates a cold worker without overlapping cron ticks", async () => {
  const migration = await readFile(
    path.join(root, "supabase/migrations/20260830224000_extend_quo_worker_ack_timeout.sql"),
    "utf8",
  )
  expect(migration).toContain("timeout_milliseconds := 10000")
  expect(migration).toContain("https://nprfhspwdflpqlopydmp.supabase.co")
  expect(migration).toContain("aura-quo-fast-poll-worker?mode=quo-fast-poll")
  expect(migration).toContain("revoke all on function public.dispatch_quo_fast_poll() from public, anon, authenticated")
  expect(migration).not.toContain("cron.schedule")
})
