
import { requireCurator } from "@/server/auth/session";
export default async function ExtractPage(){await requireCurator();return <div className="max-w-5xl mx-auto px-5 py-16 space-y-6"><p className="eyebrow-label">Step 2 · Generate manifest</p><h1 className="text-4xl font-bold">Prepare extraction rows.</h1><p className="text-[#617080]">Map indicator, period, value, unit, page, and table evidence into private staged observations.</p></div>}
