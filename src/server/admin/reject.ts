
import { getAdminDbClient } from '@/server/db/client';
export async function rejectObservation(id:string,reviewerId:string,reason:string){const {data,error}=await getAdminDbClient().from('observations').update({status:'rejected',reviewed_by:reviewerId,reviewed_at:new Date().toISOString(),rejection_reason:reason}).eq('id',id).eq('status','staged').select('*').single();if(error)throw new Error(error.message);return data;}
