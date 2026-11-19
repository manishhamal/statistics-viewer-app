
import { NextResponse } from 'next/server';
import { requireCurator } from '@/server/auth/session';
import { stageManifest } from '@/server/ingestion/stageManifest';
export async function POST(request:Request){try{await requireCurator();return NextResponse.json(await stageManifest(await request.json()));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unauthorized: curator authentication is required.'},{status:401});}}
