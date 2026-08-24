import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const root = process.cwd();

test("manager push notifications stay private and cover business events", async () => {
  const [api, edgeFunction, dashboard, shell, control, center, serviceWorker, migration, queueMigration, lockdownMigration] = await Promise.all([
    readFile(path.join(root, "app/api/manager-notifications/route.ts"), "utf8"),
    readFile(path.join(root, "supabase/functions/manager-web-push/index.ts"), "utf8"),
    readFile(path.join(root, "app/admin/build-map/page.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/admin-shell.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-notification-control.tsx"), "utf8"),
    readFile(path.join(root, "components/buildflow/manager-notification-center.tsx"), "utf8"),
    readFile(path.join(root, "public/sw.js"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260824011214_add_manager_web_push_notifications.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260824022900_harden_manager_web_push_delivery.sql"), "utf8"),
    readFile(path.join(root, "supabase/migrations/20260824023200_lock_down_manager_push_trigger_functions.sql"), "utf8"),
  ]);

  expect(api).toContain("managerCapabilities");
  expect(api).toContain("sameOrigin");
  expect(api).toContain('action: z.literal("subscribe")');
  expect(api).toContain("functions/v1/manager-web-push");
  expect(api).not.toContain("createAdminClient");
  expect(edgeFunction).toContain("get_manager_web_push_private_key");
  expect(edgeFunction).toContain("managerUser(request)");
  expect(edgeFunction).toContain("dispatchAuthorized(request)");
  expect(edgeFunction).toContain('from("manager_push_notification_log")');
  expect(edgeFunction).toContain("notifications:");
  expect(edgeFunction).toContain(".limit(100)");
  expect(dashboard).toContain("<ManagerNotificationControl settings />");
  expect(dashboard).toContain("<ManagerNotificationCenter />");
  expect(dashboard.indexOf("<ManagerNotificationControl settings />")).toBeGreaterThan(dashboard.indexOf("Manager tools"));
  expect(shell).not.toContain("ManagerNotificationControl");
  expect(control).toContain("Add to Home Screen");
  expect(control).toContain("Open Avantia in Safari");
  expect(control).toContain("Send test notification");
  expect(center).toContain('fetch("/api/manager-notifications"');
  expect(center).toContain("Notification center");
  expect(center).toContain('event.href.startsWith("/")');
  expect(serviceWorker).toContain('self.addEventListener("push"');
  expect(serviceWorker).toContain('self.addEventListener("notificationclick"');
  expect(serviceWorker).toContain("self.skipWaiting()");
  expect(serviceWorker).toContain("self.clients.claim()");
  expect(serviceWorker).toContain("clients.openWindow(destination.href)");
  expect(serviceWorker).not.toContain("client.navigate(");
  expect(migration).toContain("enable row level security");
  expect(migration).toContain("grant execute on function public.initialize_manager_web_push(text, text) to service_role");
  expect(migration).toContain("revoke all on function public.initialize_manager_web_push(text, text) from public, anon, authenticated");
  expect(queueMigration).toContain("quote_requests_manager_push");
  expect(queueMigration).toContain("aura_communications_manager_push");
  expect(queueMigration).toContain("supplier_quotes_manager_push");
  expect(queueMigration).toContain("quote_comparisons_manager_push");
  expect(queueMigration).toContain("dispatch-manager-web-push");
  expect(queueMigration).toContain("manager_push_dispatch_secret");
  expect(lockdownMigration).toContain("revoke all on function public.queue_new_request_push() from public, anon, authenticated");
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
