
import { NextResponse } from 'next/server';
import { requireCurator } from '@/server/auth/session';
import { getAdminDbClient } from '@/server/db/client';
export async function POST(request:Request){try{await requireCurator();const body=await request.json();const {data,error}=await getAdminDbClient().from('periods').insert(body).select('*').single();if(error)throw new Error(error.message);return NextResponse.json(data);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid period request.'},{status:400});}}
