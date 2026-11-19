
import { requireCurator } from "@/server/auth/session";
export default async function PeriodsPage(){await requireCurator();return <div className="max-w-5xl mx-auto px-5 py-16 space-y-6"><p className="eyebrow-label">Catalog support</p><h1 className="text-4xl font-bold">Create a period.</h1><p className="text-[#617080]">Add exact monthly, quarterly, fiscal-year, or calendar-year labels from the publication.</p></div>}
