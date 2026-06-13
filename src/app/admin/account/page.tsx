import { requireUser } from "@/lib/auth";
import { AccountManager } from "@/components/admin/AccountManager";

export default async function AccountPage() {
  const me = await requireUser();
  return <AccountManager name={me.name ?? ""} email={me.email ?? ""} role={me.role} />;
}
