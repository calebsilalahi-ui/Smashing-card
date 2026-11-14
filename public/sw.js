/* Smashing Burger VIP Card service worker: push notifications + offline navigation fallback. */
const OFFLINE_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head>' +
  '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1A0E0B;color:#E4D8CA;font-family:system-ui,sans-serif;text-align:center;padding:24px">' +
  '<div><div style="font-size:42px">🍔</div><h1 style="color:#F54725;margin:12px 0 8px">You are offline</h1>' +
  '<p style="margin:0 0 4px">Anda sedang offline. Periksa koneksi, lalu coba lagi.</p>' +
  '<p style="margin:0 0 20px;opacity:.7">Check your connection and try again.</p>' +
  '<button onclick="location.reload()" style="background:#F54725;color:#fff;border:0;border-radius:999px;padding:12px 24px;font-weight:700;font-size:16px">Retry / Coba lagi</button></div></body></html>';

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }
  const title = data.title || "Smashing Burger VIP";
  const options = {
    body: data.body || "Your stamps are waiting. Scan a receipt to collect more!",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "smashing-reminder",
    data: { url: data.url || "/card" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/card", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== target) {
            return client.navigate(target).then((c) => (c || client).focus()).catch(() => client.focus());
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    fetch(req).catch(
      () => new Response(OFFLINE_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })
    )
  );
});
