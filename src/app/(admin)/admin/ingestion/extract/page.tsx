import { requireCuratorPage } from "@/server/auth/session";
import { getAdminDocuments, getAdminIndicators, getAdminPeriods } from "@/server/admin/adminData";
import ExtractionManifestForm from "@/components/ExtractionManifestForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ExtractPage({ searchParams }: { searchParams: Promise<{ document?: string; task?: string }> }) {
  await requireCuratorPage();
  const [{ document, task }, documents, indicators, periods] = await Promise.all([
    searchParams,
    getAdminDocuments(),
    getAdminIndicators(),
    getAdminPeriods(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-8">
      <PageHeader
        eyebrow="Step 3 · Stage values"
        title="Enter values from the PDF."
        intro="Type each figure exactly as printed, with the page it appears on. Staged values stay private until you approve them in the review queue."
      />
      <ExtractionManifestForm
        documents={documents.map((d) => ({ id: d.id, title: d.title, period_covered: d.period_covered, file_url: d.file_url }))}
        indicators={indicators}
        periods={periods}
        initialDocumentId={document}
        taskId={task && UUID.test(task) ? task : undefined}
      />
    </div>
  );
}
