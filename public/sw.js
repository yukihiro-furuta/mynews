self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  if (!data || typeof data !== "object") return;
  event.waitUntil(
    self.registration.showNotification(data.title || "MyNews", {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

function safeNotificationUrl(raw) {
  // 1. 文字列かつ "/" 始まりであること
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";
  // 2. "//" 始まりのプロトコル相対URLを拒否
  if (raw.startsWith("//")) return "/";
  // 3. self.location.origin と一致するかを URL 解決で検証
  try {
    const resolved = new URL(raw, self.location.origin);
    if (resolved.origin !== self.location.origin) return "/";
    return resolved.pathname;
  } catch {
    return "/";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url;
  const url = safeNotificationUrl(rawUrl);
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // includes()は"/"が全URLにマッチするため、pathname完全一致に変更
        for (const c of clientList) {
          try {
            if (new URL(c.url).pathname === url) return c.focus();
          } catch { /* 不正なURLはスキップ */ }
        }
        return clients.openWindow(url);
      })
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
