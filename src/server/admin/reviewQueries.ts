
import { getAdminDbClient } from '@/server/db/client';
export async function getStagedObservations(){const {data,error}=await getAdminDbClient().from('observations').select('*, indicator:indicators(*), period:periods(*), document:documents(*)').eq('status','staged').order('created_at');if(error)throw new Error(error.message);return data??[];}
