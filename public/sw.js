self.addEventListener("install", (event) => {
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
      const seconds = action === "extend5" ? 300 : action === "extend10" ? 600 : 0;

      for (const client of clientList) {
        if (seconds > 0) {
          client.postMessage({ type: "POMODORO_EXTEND", seconds });
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
