self.addEventListener("push", (event) => {
  let message = { title: "Bisou", url: "/", tag: "bisou" };
  try {
    const data = event.data.json();
    if (typeof data.title === "string" && data.title) message = {
      title: data.title,
      url: typeof data.url === "string" ? data.url : "/",
      tag: typeof data.tag === "string" && data.tag ? data.tag : "bisou",
    };
  } catch { /* Every push must show a notification, even an unreadable one. */ }
  event.waitUntil(self.registration.showNotification(message.title, {
    tag: message.tag, renotify: true, icon: "/icons/icon-192.png", data: { url: message.url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let url = "/";
  const target = event.notification.data?.url;
  if (typeof target === "string" && target.startsWith("/") && !target.startsWith("//")) {
    try {
      if (new URL(target, self.location.origin).origin === self.location.origin) url = target;
    } catch { /* Open / instead. */ }
  }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows[0]) {
      await windows[0].focus();
      await windows[0].navigate(url);
    } else await self.clients.openWindow(url);
  })());
});
