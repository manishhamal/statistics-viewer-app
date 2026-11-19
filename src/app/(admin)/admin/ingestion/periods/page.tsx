import { requireCuratorPage } from "@/server/auth/session";
import { getAdminPeriods } from "@/server/admin/adminData";
import CreatePeriodForm from "@/components/CreatePeriodForm";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function PeriodsPage() {
  await requireCuratorPage();
  const periods = await getAdminPeriods();

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-8">
      <PageHeader
        eyebrow="Step 2 · Periods"
        title="Create a period."
        intro="Every value belongs to a period. Add one here if the report covers a period that isn't listed yet, using the label exactly as the publication prints it."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] items-start">
        <CreatePeriodForm />
        <section className="surface-panel p-6 space-y-3">
          <h2 className="text-xl font-bold">Existing periods ({periods.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-[#617080]">
                <tr><th className="py-2 pr-3">Label</th><th className="py-2 pr-3">AD</th><th className="py-2 pr-3">Type</th><th className="py-2">Dates</th></tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className="border-t border-[#dce2e4]">
                    <td className="py-2 pr-3 font-semibold">{p.label}</td>
                    <td className="py-2 pr-3">{p.label_ad}</td>
                    <td className="py-2 pr-3">{p.type.replace("_", " ")}</td>
                    <td className="py-2 text-xs text-[#617080]">{p.start_date} → {p.end_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
