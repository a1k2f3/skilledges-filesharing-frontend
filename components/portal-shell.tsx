"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePortal } from "./portal-context";

const links = [
  ["/dashboard", "Overview", "▦"], ["/upload", "Upload design", "＋"],
  ["/orders", "My designs", "☷"], ["/designers", "Designers", "✦"],
  ["/files", "Download files", "↓"], ["/settings", "Settings", "⚙"],
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = usePortal();
  const pathname = usePathname(); const router = useRouter();
  function signOut() { logout(); router.push("/"); }
  return <div className="portal-frame">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand brand-light">SKILLS <span>EDGE</span></Link>
      <div className="workspace-label">Production workspace</div>
      <div className="user-chip"><div className="avatar">{user.name.slice(0, 1)}</div><div><strong>{user.name}</strong><small>{user.role}</small></div></div>
      <nav className="sidebar-nav" aria-label="Primary navigation">{links.filter(([, ,], index) => user.role === "admin" || index !== 3).map(([href, label, icon]) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><span className="nav-icon">{icon}</span>{label}</Link>)}</nav>
      <button className="signout" onClick={signOut}><span>↪</span> Sign out</button>
    </aside>
    <main className="content"><header className="mobile-header"><Link href="/dashboard" className="brand brand-dark">SKILLS <span>EDGE</span></Link><button className="mobile-signout" onClick={signOut}>Sign out</button></header>{children}</main>
  </div>;
}