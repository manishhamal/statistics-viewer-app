
import { getDbClient } from "@/server/db/client";
import type { SearchPlan } from "@/lib/schemas";
export async function runPlan(plan:SearchPlan){const db=getDbClient();const {data:indicator}=await db.from("indicators").select("*").eq("code",plan.indicator_code).single();if(!indicator)return {indicator:null,rows:[]};const {data:rows}=await db.from("observations").select("*, period:periods(*), document:documents(*)").eq("indicator_id",indicator.id).eq("status","published");return {indicator,rows:rows??[]};}
