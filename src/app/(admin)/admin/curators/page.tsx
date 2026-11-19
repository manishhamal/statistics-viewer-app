import { requireOwnerPage } from "@/server/auth/session";
import { getAuditLog, listCurators } from "@/server/admin/curatorAdmin";
import CuratorManager from "@/components/admin/CuratorManager";
import { Notice, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  "observation.publish": "published a value",
  "observation.reject": "rejected a value",
  "observations.stage": "staged values",
  "document.register": "registered a document",
  "period.create": "created a period",
  "curator.invite": "invited a curator",
  "curator.password_link": "created a password link",
  "curator.password_set": "set their password",
  "curator.deactivate": "deactivated a curator",
  "curator.reactivate": "reactivated a curator",
};

function describe(details: Record<string, unknown>) {
  const parts: string[] = [];
  for (const key of ["email", "title", "label", "count", "value", "reason"]) {
    if (details[key] !== undefined && details[key] !== null) parts.push(`${key}: ${String(details[key])}`);
  }
  return parts.join(" · ");
}

export default async function CuratorsPage() {
  const owner = await requireOwnerPage();
  let curators: Awaited<ReturnType<typeof listCurators>> = [];
  let loadError = "";
  try {
    curators = await listCurators();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load curators.";
  }
  const audit = await getAuditLog(50);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-8">
      <PageHeader
        eyebrow="Owner"
        title="Curators and access."
        intro="Add people who verify data, and remove access instantly when they leave. A curator can enter values and approve values, but never approve their own entries."
      />
      {loadError ? <Notice kind="error">{loadError}</Notice> : <CuratorManager curators={curators} currentUserId={owner.id} />}

      <section className="surface-panel p-6 space-y-3">
        <h2 className="text-xl font-bold">Recent activity</h2>
        {audit.length === 0 && <p className="text-sm text-[#617080]">No activity recorded yet.</p>}
        <ul className="divide-y divide-[#dce2e4] text-sm">
          {audit.map((a) => (
            <li key={a.id} className="py-2 flex flex-wrap gap-x-3">
              <span className="text-xs text-[#617080] w-36 shrink-0">{new Date(a.created_at).toLocaleString("en-GB")}</span>
              <span className="font-semibold">{a.actor_email}</span>
              <span>{ACTION_LABEL[a.action] ?? a.action}</span>
              <span className="text-xs text-[#617080]">{describe((a.details ?? {}) as Record<string, unknown>)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
