
import { getAdminDbClient } from '@/server/db/client';
export async function createPeriod(input:{type:string;label:string;label_ad:string;start_date:string;end_date:string}){const {data,error}=await getAdminDbClient().from('periods').insert(input).select('*').single();if(error)throw new Error(error.message);return data;}
