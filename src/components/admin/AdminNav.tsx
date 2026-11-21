"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  ["/admin/tasks", "My tasks"],
  ["/admin/review", "Review queue"],
  ["/admin/ingestion", "Documents"],
  ["/admin/ingestion/periods", "Periods"],
  ["/admin/ingestion/extract", "Stage values"],
] as const;
const OWNER_LINKS = [
  ["/admin/tasks/manage", "Manage tasks"],
  ["/admin/curators", "Curators"],
] as const;

export default function AdminNav({ email, role }: { email: string; role: "owner" | "curator" }) {
  const pathname = usePathname();
  const links = role === "owner" ? [...LINKS, ...OWNER_LINKS] : LINKS;
  // A task's own page (/admin/tasks/<id>) counts as "My tasks".
  const isTaskPage = /^\/admin\/tasks\/(?!manage$)[^/]+$/.test(pathname);
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <div className="border-b border-line bg-surface">
      <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="eyebrow-label mr-2">Curator</span>
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 font-semibold ${pathname === href || (isTaskPage && href === "/admin/tasks") ? "bg-primary text-on-primary" : "text-ink hover:bg-paper"}`}
          >
            {label}
          </Link>
        ))}
        <span className="ml-auto text-xs text-muted">
          {email} · {role}
        </span>
        <Link href="/admin/set-password" className="rounded-md px-3 py-1.5 font-semibold hover:bg-paper">
          Change password
        </Link>
        <button onClick={signOut} className="rounded-md border border-line px-3 py-1.5 font-semibold hover:bg-paper">
          Sign out
        </button>
      </div>
    </div>
  );
}
