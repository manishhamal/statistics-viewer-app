
"use server";
import { requireCurator } from '@/server/auth/session';
import { publishObservation } from '@/server/admin/publish';
import { rejectObservation } from '@/server/admin/reject';
export async function publishAction(id:string){const user=await requireCurator();return publishObservation(id,user.id);}
export async function rejectAction(id:string,reason:string){const user=await requireCurator();return rejectObservation(id,user.id,reason);}
