import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("customer navigation keeps Account, language, and Manager together at the bottom", async () => {
  const [header, drawer] = await Promise.all([
    readFile(
      path.join(root, "components/buildflow/mobile-client-header.tsx"),
      "utf8",
    ),
    readFile(
      path.join(root, "components/buildflow/mobile-menu-drawer.tsx"),
      "utf8",
    ),
  ]);

  expect(header).toContain('label: "Manager"');
  expect(header).not.toContain("prominent: true");
  expect(header).not.toContain('href: "/admin/ai-tools"');
  expect(header).not.toContain('href: "/admin/traffic"');
  expect(header).not.toContain('href: "/admin/users"');
  expect(header).not.toContain('href: "/admin/vendors"');
  expect(header).not.toContain('href: "/delivery"');
  expect(header).not.toContain('label: "Jobsite Delivery"');
  expect(drawer).toContain("<span>Account</span>");
  expect(drawer).toContain('homeLanguage === "en" ? "ES" : "EN"');
  expect(drawer).toContain("BriefcaseBusiness");
  expect(drawer).not.toContain('d="m9 18 6-6-6-6"');
  expect(drawer.match(/adminLinks\.map/g)).toHaveLength(1);
  expect(drawer.indexOf("<span>Account</span>")).toBeLessThan(
    drawer.indexOf("{adminLinks.map"),
  );
  expect(drawer).not.toContain(">›</span>");
});

test("My Account remains personal and saves notification preferences", async () => {
  const [page, settings, actions] = await Promise.all([
    readFile(path.join(root, "app/account/page.tsx"), "utf8"),
    readFile(
      path.join(root, "components/buildflow/account-settings.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/account/actions.ts"), "utf8"),
  ]);

  expect(settings).toContain("My Account");
  expect(settings).toContain("Profile information");
  expect(settings).toContain("Password & security");
  expect(settings).toContain("Notifications");
  expect(settings).not.toContain("ABC Supply");
  expect(settings).not.toContain("Payments");
  expect(settings).not.toContain("Order Materials");
  expect(page).not.toContain("showAbcPricing");
  expect(actions).toContain("updateNotificationPreferences");
  expect(actions).toContain("notification_email");
  expect(actions).toContain("notification_sms");
});

test("ABC manager demo and payments are owner-protected while customers connect their own ABC account", async () => {
  const [
    abcPage,
    legacyPage,
    accountsApi,
    pricingApi,
    paymentsPage,
    stripeSetup,
    stripePortal,
  ] = await Promise.all([
    readFile(path.join(root, "app/admin/abc/page.tsx"), "utf8"),
    readFile(path.join(root, "app/account/abc/page.tsx"), "utf8"),
    readFile(
      path.join(root, "app/api/integrations/abc/accounts/route.ts"),
      "utf8",
    ),
    readFile(
      path.join(root, "app/api/integrations/abc/pricing/route.ts"),
      "utf8",
    ),
    readFile(path.join(root, "app/admin/payments/page.tsx"), "utf8"),
    readFile(path.join(root, "app/api/stripe/setup/route.ts"), "utf8"),
    readFile(path.join(root, "app/api/stripe/portal/route.ts"), "utf8"),
  ]);

  expect(abcPage).toContain("requireAdminProfile");
  expect(legacyPage).toContain("requireSignedInProfile");
  expect(legacyPage).toContain("Connect myABCsupply");
  expect(legacyPage).toContain('connectionMode="connected-user"');
  expect(accountsApi).toContain("requireAdminProfile");
  expect(accountsApi).toContain("requireSignedInProfile");
  expect(pricingApi).toContain("requireAdminProfile");
  expect(pricingApi).toContain("requireSignedInProfile");
  expect(paymentsPage).toContain("requireAdminProfile");
  expect(stripeSetup).toContain("requireAdminProfile");
  expect(stripePortal).toContain("requireAdminProfile");
  expect(stripeSetup.indexOf("await requireAdminProfile()")).toBeLessThan(
    stripeSetup.indexOf("hasStripeServerConfig()"),
  );
  expect(stripePortal.indexOf("await requireAdminProfile()")).toBeLessThan(
    stripePortal.indexOf("hasStripeServerConfig()"),
  );
  expect(stripeSetup).toContain("/admin/payments?payment=saved");
  expect(stripePortal).toContain("/admin/payments");
});
