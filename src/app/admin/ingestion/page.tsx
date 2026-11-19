
import Link from "next/link";
import { requireCurator } from "@/server/auth/session";
export default async function IngestionPage(){await requireCurator();return <div className="max-w-5xl mx-auto px-5 py-16 space-y-8"><p className="eyebrow-label">Step 1 · Register document</p><h1 className="text-4xl font-bold">Register an official source document.</h1><p className="text-[#617080]">Download, hash, deduplicate, and register a PDF without publishing observations.</p><div className="surface-panel p-6 flex gap-4"><Link href="/admin/ingestion/periods" className="text-[#2c6eaa]">Create period →</Link><Link href="/admin/ingestion/extract" className="text-[#2c6eaa]">Generate manifest →</Link></div></div>}
