import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("manager push notifications stay private and cover business events", async () => {
  const [api, sender, dashboard, control, serviceWorker, migration, quo, whatsapp, publicRequest, cart, quotes] = await Promise.all([
    readFile(path.join(root, "app/api/manager-notifications/route.ts"), "utf8"),
    readFile(path.join(root, "lib/manager-push-notifications.ts"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-notification-control.tsx"), "utf8"),
    readFile(path.join(root, "public/sw.js"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260824011214_add_manager_web_push_notifications.sql"), "utf8"),
    readFile(path.join(root, "app/api/aura/quo/route.ts"), "utf8"),
    readFile(path.join(root, "app/api/aura/whatsapp/twilio/route.ts"), "utf8"),
    readFile(path.join(root, "app/request-quote/actions.ts"), "utf8"),
    readFile(path.join(root, "app/cart/actions.ts"), "utf8"),
    readFile(path.join(root, "app/quotes/actions.ts"), "utf8"),
  ]);

  expect(api).toContain("managerCapabilities");
  expect(api).toContain("sameOrigin");
  expect(api).toContain('action: z.literal("subscribe")');
  expect(sender).toContain("get_manager_web_push_private_key");
  expect(sender).not.toContain("privateKey:");
  expect(dashboard).toContain("ManagerNotificationControl");
  expect(control).toContain("Add to Home Screen");
  expect(control).toContain("Send test notification");
  expect(serviceWorker).toContain('self.addEventListener("push"');
  expect(serviceWorker).toContain('self.addEventListener("notificationclick"');
  expect(migration).toContain("enable row level security");
  expect(migration).toContain("grant execute on function public.initialize_manager_web_push(text, text) to service_role");
  expect(migration).toContain("revoke all on function public.initialize_manager_web_push(text, text) from public, anon, authenticated");
  expect(quo).toContain('eventType: "call_message"');
  expect(quo).toContain('activity.direction !== "outgoing"');
  expect(whatsapp).toContain('title: "New WhatsApp message"');
  expect(publicRequest).toContain('eventType: "new_order"');
  expect(publicRequest).toContain('href: `/owner/materials/requests/${saved.requestId}`');
  expect(cart).toContain('title: "New shop order request"');
  expect(quotes).toContain('eventType: "quote_approval"');
});

test("publishes the installable web app and protected notification endpoint", async ({ request }) => {
  const [manifestResponse, workerResponse, apiResponse] = await Promise.all([
    request.get("/manifest.webmanifest"),
    request.get("/sw.js"),
    request.get("/api/manager-notifications"),
  ]);

  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Avantia Build");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/admin/build-map");

  expect(workerResponse.ok()).toBeTruthy();
  expect(workerResponse.headers()["cache-control"]).toContain("no-cache");
  expect(workerResponse.headers()["content-type"]).toContain("application/javascript");
  expect(await workerResponse.text()).toContain("showNotification");

  expect(apiResponse.status()).toBe(401);
});
