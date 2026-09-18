self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (action === "extend5") {
            client.postMessage({ type: "POMODORO_EXTEND", seconds: 5 * 60 });
          } else if (action === "extend10") {
            client.postMessage({ type: "POMODORO_EXTEND", seconds: 10 * 60 });
          }
          if ("focus" in client) client.focus();
          return;
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
  );
});
