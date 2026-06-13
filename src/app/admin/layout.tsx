import { requireUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen" style={{ background: "var(--ad-bg)", color: "var(--ad-text)" }}>
      <AdminSidebar userName={user.name ?? user.email ?? ""} role={user.role} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
