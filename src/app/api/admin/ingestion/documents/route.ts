
import { NextResponse } from 'next/server';
import { requireCurator } from '@/server/auth/session';
import { registerDocument } from '@/server/ingestion/documentIntake';
export async function POST(request:Request){try{await requireCurator();const input=await request.json();return NextResponse.json(await registerDocument(input));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Invalid document registration request.'},{status:401});}}
