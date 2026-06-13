"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction}>
      <div className="ad-field">
        <label className="ad-label" htmlFor="email">Email</label>
        <input className="ad-input" id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      <div className="ad-field">
        <label className="ad-label" htmlFor="password">Password</label>
        <input className="ad-input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p className="mb-3 text-sm" style={{ color: "var(--ad-danger)" }}>{error}</p>
      )}
      <button className="ad-btn ad-btn-primary w-full" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
