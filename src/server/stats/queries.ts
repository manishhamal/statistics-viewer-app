import { getDbClient } from "@/server/db/client";
import type { Indicator, Observation, Source } from "@/server/db/types";
export async function getFeaturedIndicators():Promise<Indicator[]> { const db=getDbClient(); const {data}=await db.from('indicators').select('*').limit(6); return (data??[]) as Indicator[]; }
export async function getIndicators():Promise<Indicator[]> { const db=getDbClient(); const {data}=await db.from('indicators').select('*').order('name'); return (data??[]) as Indicator[]; }
export async function getSourcesWithDocuments():Promise<Source[]> { const db=getDbClient(); const {data}=await db.from('sources').select('*').order('name'); return (data??[]) as Source[]; }
export async function getIndicatorByCode(code:string):Promise<Indicator|null>{const db=getDbClient();const {data}=await db.from('indicators').select('*').eq('code',code).maybeSingle();return data as Indicator|null;}
export async function getPublishedObservations(indicatorId:string):Promise<Observation[]>{const db=getDbClient();const {data}=await db.from('observations').select('*, indicator:indicators(*), period:periods(*), document:documents(*)').eq('indicator_id',indicatorId).eq('status','published').order('period_id');return (data??[]) as Observation[];}
