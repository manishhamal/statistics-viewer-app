import { NextResponse } from "next/server";
import { requireCurator } from "@/server/auth/session";
import { downloadPdf, registerDocument } from "@/server/ingestion/documentIntake";
import { documentInputSchema, firstIssue } from "@/lib/adminSchemas";
import { errorResponse } from "@/server/http";
import { logAudit } from "@/server/audit";

// Accepts multipart form data: the document details, plus either an uploaded
// "file" or a "fileUrl" to download the PDF from.
export async function POST(request: Request) {
  try {
    const curator = await requireCurator();
    const form = await request.formData();
    const parsed = documentInputSchema.safeParse({
      sourceId: form.get("sourceId"),
      title: form.get("title"),
      docType: form.get("docType"),
      publicationDate: form.get("publicationDate"),
      periodCovered: form.get("periodCovered"),
      coverageType: form.get("coverageType"),
      calendarSystem: form.get("calendarSystem"),
      language: form.get("language") || "en",
      fileUrl: form.get("fileUrl") ?? "",
    });
    if (!parsed.success) throw new Error(firstIssue(parsed.error));

    const file = form.get("file");
    let bytes: Buffer;
    if (file instanceof File && file.size > 0) bytes = Buffer.from(await file.arrayBuffer());
    else if (parsed.data.fileUrl) bytes = await downloadPdf(parsed.data.fileUrl);
    else throw new Error("Upload the PDF or give its official link.");

    const result = await registerDocument(parsed.data, bytes, curator.id);
    if (!result.duplicate) {
      await logAudit(curator, "document.register", { type: "document", id: result.id }, {
        title: result.title,
        fileHash: result.fileHash,
        uploaded: file instanceof File && file.size > 0,
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "Invalid document registration request.");
  }
}
