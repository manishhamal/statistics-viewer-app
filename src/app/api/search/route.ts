import { NextResponse } from "next/server";
import { searchRequestSchema } from "@/lib/schemas";
import { answerQuery } from "@/server/search/answerQuery";

export async function POST(request: Request) {
  try {
    const body = searchRequestSchema.parse(await request.json());
    return NextResponse.json(await answerQuery(body.question, body.lang));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid search request" }, { status: 400 });
  }
}
