import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdminDbClient } from "@/server/db/client";
import type { DocumentInput } from "@/lib/adminSchemas";

const MAX_BYTES = 50 * 1024 * 1024;

export async function downloadPdf(url: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`PDF download failed with HTTP ${response.status}. Try uploading the file instead.`);
  return Buffer.from(await response.arrayBuffer());
}

// Hashes the PDF, keeps a local copy in inputs/official-reports/<hash>.pdf when the
// server allows writing files, and registers it. The same file (same hash) is never registered twice.
export async function registerDocument(input: DocumentInput, bytes: Buffer, registeredBy: string) {
  if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error("PDF must be between 1 byte and 50 MB.");
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("That file is not a valid PDF.");

  const db = getAdminDbClient();
  const hash = createHash("sha256").update(bytes).digest("hex");

  // The local archive is a convenience for running the app on your own computer. Hosted servers
  // (Vercel) have a read-only project folder, so a failed write must never block registration.
  try {
    const dir = path.join(process.cwd(), "inputs", "official-reports");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${hash}.pdf`), bytes, { flag: "wx" }).catch(() => undefined); // already saved
  } catch {
    // Not archived locally; the hash and details are still saved to the database below.
  }

  const { data: existing } = await db.from("documents").select("id,title,status").eq("file_hash", hash).maybeSingle();
  if (existing) return { id: existing.id, fileHash: hash, duplicate: true, status: existing.status, title: existing.title };

  const { data, error } = await db
    .from("documents")
    .insert({
      source_id: input.sourceId,
      title: input.title,
      doc_type: input.docType,
      publication_date: input.publicationDate,
      period_covered: input.periodCovered,
      coverage_type: input.coverageType,
      calendar_system: input.calendarSystem,
      language: input.language,
      file_hash: hash,
      file_url: input.fileUrl || null,
      status: "registered",
      registered_by: registeredBy,
    })
    .select("id,file_hash,status,title")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, fileHash: data.file_hash, duplicate: false, status: data.status, title: data.title };
}
