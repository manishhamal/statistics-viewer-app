"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  ["/admin/review", "Review queue"],
  ["/admin/ingestion", "1 · Documents"],
  ["/admin/ingestion/periods", "2 · Periods"],
  ["/admin/ingestion/extract", "3 · Stage values"],
] as const;

export default function AdminNav({ email, role }: { email: string; role: "owner" | "curator" }) {
  const pathname = usePathname();
  const links = role === "owner" ? [...LINKS, ["/admin/curators", "Curators"] as const] : LINKS;
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <div className="border-b border-[#dce2e4] bg-white">
      <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="eyebrow-label mr-2">Curator</span>
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 font-semibold ${pathname === href ? "bg-[#10283f] text-white" : "text-[#10283f] hover:bg-[#f5f6f0]"}`}
          >
            {label}
          </Link>
        ))}
        <span className="ml-auto text-xs text-[#617080]">
          {email} · {role}
        </span>
        <Link href="/admin/set-password" className="rounded-md px-3 py-1.5 font-semibold hover:bg-[#f5f6f0]">
          Change password
        </Link>
        <button onClick={signOut} className="rounded-md border border-[#dce2e4] px-3 py-1.5 font-semibold hover:bg-[#f5f6f0]">
          Sign out
        </button>
      </div>
    </div>
  );
}
