import type { Observation } from "@/server/db/types";
export function buildChartSpec(rows:Observation[]){return {data:rows.map(row=>({period:row.period?.label_ad||row.period?.label||row.period_id,value:Number(row.value)})),xKey:'period',yKey:'value'};}
