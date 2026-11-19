
import { getDbClient } from "@/server/db/client";
import type { SearchPlan } from "@/lib/schemas";
export async function validatePlan(plan:SearchPlan){if(!plan.matched||!plan.indicator_code)return {valid:false,error:"No indicator matched."};const db=getDbClient();const {data:indicator}=await db.from("indicators").select("id,code").eq("code",plan.indicator_code).maybeSingle();if(!indicator)return {valid:false,error:"The requested indicator does not exist."};return {valid:true};}
