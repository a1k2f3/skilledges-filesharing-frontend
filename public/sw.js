self.addEventListener("push", (event) => {
  const notification = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(notification.title || "Skills Edge", {
    body: notification.body || "You have a new notification.",
    data: { url: notification.url || "/dashboard" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existingClient = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existingClient) return existingClient.navigate(targetUrl).then(() => existingClient.focus());
    return self.clients.openWindow(targetUrl);
  }));
});