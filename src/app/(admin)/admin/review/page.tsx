import Link from "next/link";
import { requireCuratorPage } from "@/server/auth/session";
import { getStagedObservations } from "@/server/admin/reviewQueries";
import ReviewQueueTable from "@/components/ReviewQueueTable";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ document?: string }> }) {
  const curator = await requireCuratorPage();
  const { document } = await searchParams;
  const documentId = document && UUID.test(document) ? document : undefined;
  const rows = await getStagedObservations(documentId);
  const mine = rows.filter((r) => r.stagedBy === curator.id).length;

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-8">
      <PageHeader
        eyebrow="Curator workspace"
        title="Verify and publish observations."
        intro="Check each staged value against its page in the official PDF. Approved values appear on the public site within a few minutes."
      />

      {documentId && (
        <p className="text-sm">
          Showing values from <strong>{rows[0]?.document?.title ?? "one document"}</strong> only.{" "}
          <Link href="/admin/review" className="text-link font-semibold">Show the whole queue →</Link>
        </p>
      )}

      {rows.length === 0 ? (
        <div className="surface-panel p-8 space-y-4">
          <p className="font-semibold">{documentId ? "Nothing from this document is waiting for review." : "The review queue is empty."}</p>
          <p className="text-sm text-muted">Work comes from tasks: find the PDF, register it, then enter its values.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/tasks" className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">My tasks</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold">
            {rows.length} value(s) waiting for review
            {mine > 0 && <span className="font-normal text-muted"> · {mine} entered by you need another curator to approve</span>}
          </p>
          <ReviewQueueTable rows={rows} currentUserId={curator.id} />
        </>
      )}
    </div>
  );
}
