import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  let logoUrl = "/slim-minima-logo.svg";
  try {
    const settings = await getSettings();
    if (settings.logoUrl) logoUrl = settings.logoUrl;
  } catch {
    // DB not reachable yet - fall back to the default Slim Minima logo.
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--ad-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Sign in" style={{ height: 30, width: "auto" }} />
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
          <h1 className="mb-1 text-lg font-bold tracking-tight" style={{ color: "var(--ad-text)" }}>
            Sign in
          </h1>
          <p className="mb-6 text-sm" style={{ color: "var(--ad-muted)" }}>
            Manage your content
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
