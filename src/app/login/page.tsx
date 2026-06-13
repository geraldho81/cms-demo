import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ad-bg)" }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ background: "var(--ad-accent)" }}>
            <svg width="20" height="20" viewBox="0 0 64 64" fill="currentColor">
              <rect x="10" y="12" width="44" height="12" rx="3" />
              <rect x="10" y="28" width="26" height="12" rx="3" opacity="0.85" />
              <rect x="40" y="28" width="14" height="24" rx="3" opacity="0.6" />
              <rect x="10" y="44" width="26" height="8" rx="3" opacity="0.7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--ad-text)" }}>
            Sign in
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ad-muted)" }}>
            Content management
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
