import { AppShell } from "@/components/app-shell";
import { requirePageSession } from "@/lib/auth/session";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageSession();
  return <AppShell session={session}>{children}</AppShell>;
}
