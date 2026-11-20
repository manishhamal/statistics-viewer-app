"use client";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MESSAGES: Record<string, string> = {
  "not-curator": "This account does not have curator access, or its access was removed. Ask an owner.",
  "link-invalid": "That link has expired or was already used. Ask an owner for a new one.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const notice = MESSAGES[params.get("error") ?? ""];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    await supabase.auth.signOut(); // drop any previous (e.g. non-curator) session first
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin/review");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="surface-panel w-full max-w-md p-8 space-y-5">
      <p className="eyebrow-label">Curator access</p>
      <h1 className="text-3xl font-bold">Sign in to review data.</h1>
      {notice && !error && <p className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-300">{notice}</p>}
      {error && <p className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <label className="block text-sm font-semibold">
        Email
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border p-3" />
      </label>
      <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in to review queue"}
      </button>
      <p className="text-xs text-muted">Forgot your password? Ask an owner for a password link. Accounts are invite-only.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-5">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
