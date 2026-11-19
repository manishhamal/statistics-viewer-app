import Link from "next/link";
import { requireCuratorPage } from "@/server/auth/session";
import { getStagedObservations } from "@/server/admin/reviewQueries";
import ReviewQueueTable from "@/components/ReviewQueueTable";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const curator = await requireCuratorPage();
  const rows = await getStagedObservations();
  const mine = rows.filter((r) => r.stagedBy === curator.id).length;

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-8">
      <PageHeader
        eyebrow="Curator workspace"
        title="Verify and publish observations."
        intro="Check each staged value against its page in the official PDF. Approved values appear on the public site within a few minutes."
      />

      {rows.length === 0 ? (
        <div className="surface-panel p-8 space-y-4">
          <p className="font-semibold">The review queue is empty.</p>
          <p className="text-sm text-[#617080]">To add data: register the official PDF, then enter its values.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/ingestion" className="rounded-lg bg-[#10283f] px-4 py-3 text-sm font-bold text-white">1 · Register document</Link>
            <Link href="/admin/ingestion/extract" className="rounded-lg border border-[#10283f] px-4 py-3 text-sm font-bold">3 · Stage values</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold">
            {rows.length} value(s) waiting for review
            {mine > 0 && <span className="font-normal text-[#617080]"> · {mine} entered by you need another curator to approve</span>}
          </p>
          <ReviewQueueTable rows={rows} currentUserId={curator.id} />
        </>
      )}
    </div>
  );
}
