import type { ReactNode } from "react";

// Small shared pieces for the curator forms.

export const inputClass = "mt-1 w-full rounded-lg border border-[#dce2e4] bg-white p-2.5 text-sm";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-[#617080]">{hint}</span>}
    </label>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const cls = kind === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800";
  return <p className={`rounded-lg p-3 text-sm ${cls}`}>{children}</p>;
}

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <div className="space-y-3">
      <p className="eyebrow-label">{eyebrow}</p>
      <h1 className="text-3xl sm:text-4xl font-bold">{title}</h1>
      <p className="max-w-3xl text-[#617080]">{intro}</p>
    </div>
  );
}

export async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (HTTP ${res.status}).`);
  return data;
}
