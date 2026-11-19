import { notFound } from "next/navigation";
import { getIndicatorByCode, getPublishedObservations } from "@/server/stats/queries";
import { buildChartSpec } from "@/server/stats/chartSpec";
import StatChart from "@/components/StatChart";
import IndicatorTable from "@/components/IndicatorTable";
export default async function IndicatorPage({params}:{params:Promise<{code:string}>}){const {code}=await params;const indicator=await getIndicatorByCode(code);if(!indicator) notFound();const rows=await getPublishedObservations(indicator.id);const spec=buildChartSpec(rows);return <div className="max-w-6xl mx-auto px-5 py-16 space-y-8"><p className="eyebrow-label">Published indicator</p><div><h1 className="text-4xl font-bold">{indicator.name}</h1><p className="mt-2 text-[#617080]">{indicator.description||'Official published observations.'} Unit: {indicator.unit}; frequency: {indicator.frequency}.</p></div><StatChart data={spec.data}/><IndicatorTable rows={rows}/></div>}
