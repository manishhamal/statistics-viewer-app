import Link from "next/link";
import { requireCuratorPage } from "@/server/auth/session";
import { getAdminDocuments, getAdminSources } from "@/server/admin/adminData";
import DocumentRegistrationForm from "@/components/DocumentRegistrationForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  registered: "bg-sky-50 text-sky-800",
  extracted: "bg-emerald-50 text-emerald-800",
};

export default async function IngestionPage() {
  await requireCuratorPage();
  const [sources, documents] = await Promise.all([getAdminSources(), getAdminDocuments()]);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-8">
      <PageHeader
        eyebrow="Step 1 · Register document"
        title="Register an official source document."
        intro="Each PDF is hashed so the same file is never registered twice, and a copy is kept in inputs/official-reports/. Registering publishes nothing; values go live only after review."
      />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] items-start">
        <DocumentRegistrationForm sources={sources} />

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Registered documents ({documents.length})</h2>
          {documents.length === 0 && <p className="text-sm text-[#617080]">None yet.</p>}
          {documents.map((d) => (
            <div key={d.id} className="surface-panel p-4 space-y-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold leading-snug">{d.title}</p>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[d.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {d.status}
                </span>
              </div>
              <p className="text-xs text-[#617080]">
                {d.source?.short_name ?? "?"} · {d.period_covered} · published {d.publication_date}
              </p>
              <div className="flex gap-4 text-xs">
                {d.file_url && (
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-[#2c6eaa]">Official PDF ↗</a>
                )}
                <Link href={`/admin/ingestion/extract?document=${d.id}`} className="text-[#2c6eaa] font-semibold">
                  Stage values →
                </Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
