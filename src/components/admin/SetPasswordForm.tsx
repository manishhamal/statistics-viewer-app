"use client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPasswordAction } from "@/actions/curatorActions";
import { Notice, inputClass } from "@/components/admin/ui";

export default function SetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 12) return setError("Use at least 12 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    startTransition(async () => {
      const result = await setPasswordAction(password);
      if (!result.ok) setError(result.error);
      else {
        router.push("/admin/review");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="surface-panel w-full max-w-md p-8 space-y-5">
      <p className="eyebrow-label">Curator access</p>
      <h1 className="text-3xl font-bold">Choose your password.</h1>
      <p className="text-sm text-[#617080]">Signed in as {email}. Use at least 12 characters; a short phrase works well.</p>
      {error && <Notice kind="error">{error}</Notice>}
      <label className="block text-sm font-semibold">
        New password
        <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </label>
      <label className="block text-sm font-semibold">
        Repeat it
        <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
      </label>
      <button disabled={pending} className="w-full rounded-lg bg-[#10283f] px-4 py-3 font-bold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
