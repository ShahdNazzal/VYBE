import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";

// All pages in the (app) group require an authenticated session.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell user={{ id: user.id, email: user.email, name: user.name }}>{children}</AppShell>
  );
}
