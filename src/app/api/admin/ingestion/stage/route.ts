import { NextResponse } from "next/server";
import { requireCurator } from "@/server/auth/session";
import { stageManifest } from "@/server/ingestion/stageManifest";
import { firstIssue, manifestInputSchema } from "@/lib/adminSchemas";
import { errorResponse } from "@/server/http";
import { logAudit } from "@/server/audit";

export async function POST(request: Request) {
  try {
    const curator = await requireCurator();
    const parsed = manifestInputSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    const result = await stageManifest(parsed.data, curator.id);
    await logAudit(curator, "observations.stage", { type: "document", id: parsed.data.documentId }, {
      count: result.count,
      observationIds: result.observations.map((o) => o.id),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Invalid manifest.");
  }
}
