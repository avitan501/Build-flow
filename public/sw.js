self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Avantia Build", body: event.data ? event.data.text() : "You have a new update." };
  }

  const title = payload.title || "Avantia Build";
  const href = payload.href || "/admin/build-map";
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || "You have a new update.",
    icon: "/images/avantia/avantia-app-icon-512.png",
    badge: "/images/avantia/avantia-app-icon-512.png",
    tag: payload.tag || "avantia-update",
    renotify: true,
    data: { href },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.href || "/admin/build-map", self.location.origin);
  if (destination.origin !== self.location.origin) destination.href = new URL("/admin/build-map", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url === destination.href && "focus" in client) return client.focus();
    }

    // Mobile browsers often reuse an already-open PWA window for openWindow().
    // Navigate that window explicitly so tapping a notification opens the exact
    // request, quote, supplier, or communication referenced by the alert.
    for (const client of windows) {
      try {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== destination.origin || !("navigate" in client)) continue;
        const navigated = await client.navigate(destination.href);
        if (navigated && "focus" in navigated) return navigated.focus();
        if ("focus" in client) return client.focus();
      } catch {
        // If an existing window cannot navigate, open the exact link below.
      }
    }
    return clients.openWindow(destination.href);
  })());
});
