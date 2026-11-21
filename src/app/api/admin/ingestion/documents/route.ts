import { NextResponse } from "next/server";
import { requireCurator } from "@/server/auth/session";
import { downloadPdf, registerDocument } from "@/server/ingestion/documentIntake";
import { documentInputSchema, firstIssue } from "@/lib/adminSchemas";
import { errorResponse } from "@/server/http";
import { logAudit } from "@/server/audit";
import { getTaskForWork, updateTask } from "@/server/tasks/taskData";

// The server may download a large PDF (e.g. an Economic Survey) from the publisher's site.
export const maxDuration = 60;

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

    // Registering from a task links the document to that task (checked before any download).
    const taskId = String(form.get("taskId") ?? "");
    const task = taskId ? await getTaskForWork(taskId, curator) : null;
    if (task && task.kind !== "document") throw new Error("That task is not a document task.");

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
    if (task) {
      // A duplicate PDF is still the right document for the task, so link it either way.
      await updateTask(task.id, { document_id: result.id, doc_link: parsed.data.fileUrl || task.docLink, status: "open", blocked_reason: null });
      await logAudit(curator, "task.register", { type: "task", id: task.id }, { title: result.title, duplicate: result.duplicate });
    }
    return NextResponse.json({ ...result, taskId: task?.id ?? null });
  } catch (error) {
    return errorResponse(error, "Invalid document registration request.");
  }
}
