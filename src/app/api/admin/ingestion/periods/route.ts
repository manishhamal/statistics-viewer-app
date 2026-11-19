import { NextResponse } from "next/server";
import { requireCurator } from "@/server/auth/session";
import { createPeriod } from "@/server/admin/createPeriod";
import { firstIssue, periodInputSchema } from "@/lib/adminSchemas";
import { errorResponse } from "@/server/http";
import { logAudit } from "@/server/audit";

export async function POST(request: Request) {
  try {
    const curator = await requireCurator();
    const parsed = periodInputSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    const period = await createPeriod(parsed.data);
    await logAudit(curator, "period.create", { type: "period", id: period.id }, { type: period.type, label: period.label });
    return NextResponse.json(period);
  } catch (error) {
    return errorResponse(error, "Invalid period request.");
  }
}
