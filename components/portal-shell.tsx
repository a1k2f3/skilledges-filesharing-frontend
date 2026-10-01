"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPushPublicKey, removePushSubscription, savePushSubscription } from "./api";
import { usePortal } from "./portal-context";

const links = [
  ["/dashboard", "Overview", "▦"], ["/upload", "Upload design", "＋"],
  ["/orders", "My designs", "☷"], ["/designers", "Designers", "✦"],
  ["/teams", "Teams", "♧"], ["/files", "Received files", "↓"], ["/files/sent", "Sent files", "↑"], ["/settings", "Settings", "⚙"],
];

function decodeVapidKey(value: string) {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`;
  const binary = window.atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function NotificationCenter() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = usePortal();
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) setPushEnabled(true);
    });
  }, []);

  async function togglePushNotifications() {
    try {
      if (pushEnabled) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setPushEnabled(false);
        setPushStatus("Device alerts are off on this browser.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPushStatus("Device alerts are not supported by this browser.");
        return;
      }
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("Allow notifications in your browser settings to receive device alerts.");
        return;
      }
      const { publicKey } = await getPushPublicKey();
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey) as BufferSource
      });
      const details = subscription.toJSON();
      if (!details.endpoint || !details.keys?.p256dh || !details.keys.auth) throw new Error("Browser returned an incomplete device subscription.");
      await savePushSubscription({ endpoint: details.endpoint, expirationTime: details.expirationTime ?? null, keys: details.keys as { p256dh: string; auth: string } });
      setPushEnabled(true);
      setPushStatus("Device alerts are enabled on this browser.");
    } catch (error) {
      setPushStatus(error instanceof Error ? error.message : "Unable to enable device alerts.");
    }
  }

  return <div className="notification-center">
    <button className="notification-trigger" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      Notifications
      {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
    </button>
    {open && <section className="notification-popover" aria-label="Notifications">
      <div className="notification-heading"><strong>Notifications</strong><button type="button" onClick={() => void markAllNotificationsRead().catch(() => undefined)} disabled={!unreadCount}>Mark all read</button></div>
      <div className="push-preferences"><button type="button" onClick={() => void togglePushNotifications()}>{pushEnabled ? "Turn off device alerts" : "Enable device alerts"}</button>{pushStatus && <span role="status">{pushStatus}</span>}</div>
      {notifications.length === 0 ? <p className="notification-empty">No notifications yet.</p> : <ul>
        {notifications.map((notification) => <li key={notification._id} className={notification.readAt ? "" : "unread"}>
          <button type="button" className="notification-item" onClick={() => { if (!notification.readAt) void markNotificationRead(notification._id).catch(() => undefined); }}>
            <strong>{notification.title}</strong>
            <span>{notification.message}</span>
            <time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleString()}</time>
          </button>
        </li>)}
      </ul>}
    </section>}
  </div>;
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = usePortal();
  const pathname = usePathname(); const router = useRouter();
  function signOut() { logout(); router.push("/"); }
  return <div className="portal-frame">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand brand-light">SKILLS <span>EDGE</span></Link>
      <div className="workspace-label">Production workspace</div>
      <div className="user-chip"><div className="avatar">{user.name.slice(0, 1)}</div><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">{links.filter(([href], index) => user.role === "admin" || (index !== 3 && href !== "/teams")).filter(([href]) => (user.role === "admin" || user.role === "designer") || href !== "/files/sent").map(([href, label, icon]) => <Link key={href} href={href} className={pathname === href || (href === "/teams" && pathname.startsWith("/teams/")) || (href === "/files/sent" && pathname.startsWith("/files/sent")) ? "active" : ""}><span className="nav-icon">{icon}</span>{label}</Link>)}</nav>
      <button className="signout" onClick={signOut}><span>↪</span> Sign out</button>
    </aside>
    <main className="content"><header className="mobile-header"><Link href="/dashboard" className="brand brand-dark">SKILLS <span>EDGE</span></Link><button className="mobile-signout" onClick={signOut}>Sign out</button></header><div className="portal-topbar"><NotificationCenter /></div>{children}</main>
  </div>;
}