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
  const href = new URL(event.notification.data?.href || "/admin/build-map", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.navigate(href);
        return client.focus();
      }
    }
    return clients.openWindow(href);
  })());
});
