import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { isExplicitCustomerRequestConfirmation } from "@/lib/customer-request-confirmation";

const root = process.cwd();

test("only explicit confirmations can complete an exact pending SMS summary", async () => {
  expect(isExplicitCustomerRequestConfirmation("YES")).toBe(true);
  expect(isExplicitCustomerRequestConfirmation("כן")).toBe(true);
  expect(isExplicitCustomerRequestConfirmation("Sí")).toBe(true);
  expect(
    isExplicitCustomerRequestConfirmation("yes, but change it to 12"),
  ).toBe(false);
  expect(isExplicitCustomerRequestConfirmation("cancel")).toBe(false);

  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain("aura_sms_request_pending_confirmations");
  expect(broker).toContain("summary_hash");
  expect(broker).toContain("summary_sent_at is not null");
  expect(broker).toContain("if (!pending) return null");
  expect(broker).toContain(
    "if (await confirmPendingSmsRequest(communicationId, phone, body)) return",
  );
  expect(broker).toContain("sql.begin");
  expect(broker).toContain("customer_request_portal_invite_outbox");
  expect(broker).toContain("await sendQuoSms(phone, outbox[0].message)");
  expect(broker).toContain("phone_confirm: true");
  expect(broker).toContain(
    "where phone = ${phone} and phone_confirmed_at is not null",
  );
  expect(broker).toContain("@phone-login.buildflow.local");
  expect(broker).toContain("admin.auth.admin.generateLink({ type: \"magiclink\", email })");
  expect(broker).toContain('url.searchParams.set("token_hash", tokenHash)');
  expect(broker).toContain("and status in ('pending', 'failed')");
});

test("request numbers and portal ownership are enforced in the database", async () => {
  const migration = await readFile(
    path.join(
      root,
      "supabase/migrations/20260830051352_customer_request_portal_access.sql",
    ),
    "utf8",
  );
  expect(migration).toContain("minvalue 100000");
  expect(migration).toContain("maxvalue 999999");
  expect(migration).toContain("no cycle");
  expect(migration).toContain("quote_requests_public_number_uidx");
  expect(migration).toContain("request_public_number_is_immutable");
  expect(migration).toContain("customer_request_portal_access_owner_read");
  expect(migration).toContain("(select auth.uid()) = claimed_by");
  expect(migration).toContain("auth.jwt() ->> 'phone'");
  expect(migration).not.toContain("to anon\nusing ( true )");
});

test("customer portal returns a minimal server-only view, refreshes live, and uses one-tap secure access", async () => {
  const [portal, confirmRoute, liveRefresh, pageSource, accountActions] =
    await Promise.all([
      readFile(path.join(root, "lib/customer-request-portal.ts"), "utf8"),
      readFile(path.join(root, "app/auth/confirm/route.ts"), "utf8"),
      readFile(
        path.join(
          root,
          "components/buildflow/customer-request-live-refresh.tsx",
        ),
        "utf8",
      ),
      readFile(path.join(root, "app/requests/page.tsx"), "utf8"),
      readFile(path.join(root, "app/account/actions.ts"), "utf8"),
    ]);
  expect(portal).toContain('import "server-only"');
  expect(portal).not.toContain("createAdminClient");
  expect(portal).toContain(
    'select("id,public_number,title,status,updated_at")',
  );
  expect(portal).toContain(
    'select("id,request_id,name,quantity,unit,qualification_status")',
  );
  expect(portal).not.toContain("supplier_packages");
  expect(portal).not.toContain("manager_notes");
  expect(confirmRoute).toContain("supabase.auth.verifyOtp({ token_hash: tokenHash, type })");
  expect(confirmRoute).toContain('const next = safeNext(requestUrl.searchParams.get("next"))');
  expect(confirmRoute).toContain("const destination = new URL(next, requestUrl.origin)");
  const broker = await readFile(
    path.join(root, "supabase/functions/aura-messaging-broker/index.ts"),
    "utf8",
  );
  expect(broker).toContain('const next = `/requests?request=${publicNumber}`');
  expect(broker).toContain('url.searchParams.set("next", next)');
  expect(liveRefresh).toContain("router.refresh()");
  expect(liveRefresh).toContain("REFRESH_INTERVAL_MS = 20_000");
  expect(liveRefresh).toContain('document.visibilityState !== "visible"');
  expect(liveRefresh).toContain('window.addEventListener("focus", refresh)');
  expect(pageSource).toContain("CustomerRequestLiveRefresh");
  expect(pageSource).toContain("Your materials. One clear view.");
  expect(pageSource).toContain("Download PDF");
  expect(pageSource).not.toContain("CustomerRequestOtp");
  expect(accountActions).toContain("updateUserById(user.id");
  expect(accountActions).toContain("phone_confirm: true");
});

test("one-tap portal explains secure access without asking for a phone, code, or password", async ({
  page,
}) => {
  await page.goto("/requests");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: "Open from your text" }),
  ).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('input[type="tel"]')).toHaveCount(0);
  await expect(page.getByText(/signs you in and opens the correct request automatically/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "Use an existing account instead" })).toHaveAttribute("href", "/login?next=/requests");
});
