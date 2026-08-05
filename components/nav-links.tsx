"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview", icon: "◫" },
  { href: "/playground", label: "Playground", icon: "⌁" },
  { href: "/health", label: "Health", icon: "✓" },
  { href: "/events", label: "Events", icon: "≋" },
  { href: "/settings", label: "Settings", icon: "⚙" }
];

export function NavLinks() {
  const pathname = usePathname();
  return <nav className="sidebar-nav" aria-label="Primary navigation">{links.map((link) => {
    const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
    return <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}><span className="nav-icon" aria-hidden="true">{link.icon}</span><span>{link.label}</span></Link>;
  })}</nav>;
}
