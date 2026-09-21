self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Pomodoro extend actions
      const extendSeconds = action === "extend5" ? 300 : action === "extend10" ? 600 : 0;
      // Stretch break actions
      const breakSeconds = action === "break5" ? 300 : action === "break10" ? 600 : 0;

      for (const client of clientList) {
        if (extendSeconds > 0) {
          client.postMessage({ type: "POMODORO_EXTEND", seconds: extendSeconds });
        } else if (breakSeconds > 0) {
          client.postMessage({ type: "TIMER_BREAK", seconds: breakSeconds });
        }
        if ("focus" in client) {
          client.focus();
          return;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
