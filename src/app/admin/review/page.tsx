
import Link from "next/link";
import { requireCurator } from "@/server/auth/session";
export default async function ReviewPage(){await requireCurator();return <div className="max-w-6xl mx-auto px-5 py-16 space-y-8"><p className="eyebrow-label">Curator workspace</p><h1 className="text-4xl font-bold">Verify and publish observations.</h1><p className="text-[#617080]">Review staged values against their official document evidence before exposing them to public charts and search.</p><div className="flex gap-3"><Link href="/admin/ingestion" className="rounded-lg bg-[#10283f] px-4 py-3 font-bold text-white">Register document</Link><Link href="/admin/ingestion/extract" className="rounded-lg border border-[#10283f] px-4 py-3 font-bold">Generate manifest</Link></div></div>}
