import Image from "next/image";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import type { SessionPayload } from "@/lib/types";

export function AppShell({ session, children }: { session: SessionPayload; children: React.ReactNode }) {
  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="brand" href="/dashboard"><span className="brand-mark">HP</span><span><strong>Gateway Console</strong><small>Google Cloud VM</small></span></Link>
      <NavLinks />
      <div className="sidebar-footer">
        <div className="account-card">
          {session.user.avatarUrl
            ? <Image src={session.user.avatarUrl} alt="" width={34} height={34} className="avatar" />
            : <span className="avatar avatar-fallback">{session.user.login.slice(0, 1).toUpperCase()}</span>}
          <span className="account-copy"><strong>{session.user.name ?? session.user.login}</strong><small>@{session.user.login}</small></span>
        </div>
        <form action="/api/auth/logout" method="post"><button className="button ghost full" type="submit">Sign out</button></form>
      </div>
    </aside>
    <main className="main-content">{children}</main>
  </div>;
}
