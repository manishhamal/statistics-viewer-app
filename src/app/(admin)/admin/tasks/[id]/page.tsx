import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCuratorPage } from "@/server/auth/session";
import { getTask, listAssignableCurators } from "@/server/tasks/taskData";
import { StatusPill, StepBar, stepGuide } from "@/components/tasks/TaskParts";
import TaskWorkPanel from "@/components/tasks/TaskWorkPanel";
import { OwnerTaskControls } from "@/components/tasks/OwnerTaskForms";
import { splitPages } from "@/server/tasks/findDocument";

export const dynamic = "force-dynamic";
// "Find document" runs as a server action from this page and reads several pages on the
// publisher's site; give it more than the default time on Vercel.
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const curator = await requireCuratorPage();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const task = await getTask(id);
  if (!task) notFound();

  const isOwner = curator.role === "owner";
  const canWork = isOwner || task.assigneeId === curator.id;
  // Anyone may review values they did not enter, so curators can open review-stage tasks too.
  const canSee = canWork || (task.step === "review" && task.stagedBy.some((s) => s !== curator.id));
  if (!canSee) notFound();
  const people = isOwner ? await listAssignableCurators() : [];

  return (
    <div className="max-w-4xl mx-auto px-5 py-12 space-y-8">
      <Link href="/admin/tasks" className="text-sm font-semibold text-link">← My tasks</Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold">{task.title}</h1>
          <StatusPill task={task} />
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <div><dt className="inline">Type: </dt><dd className="inline font-semibold text-ink">{task.kind === "note" ? "Note task" : "Document task"}</dd></div>
          {task.source && <div><dt className="inline">Source: </dt><dd className="inline font-semibold text-ink">{task.source.shortName}</dd></div>}
          {task.periodHint && <div><dt className="inline">Period: </dt><dd className="inline font-semibold text-ink">{task.periodHint}</dd></div>}
          <div><dt className="inline">Assigned to: </dt><dd className="inline font-semibold text-ink">{task.assigneeEmail ?? "nobody"}</dd></div>
          {task.dueDate && (
            <div>
              <dt className="inline">Due: </dt>
              <dd className={`inline font-semibold ${task.overdue ? "text-red-700 dark:text-red-300" : "text-ink"}`}>{task.dueDate}{task.overdue && " (overdue)"}</dd>
            </div>
          )}
        </dl>
      </div>

      {task.notes && (
        <section className="surface-panel p-5 space-y-1">
          <h2 className="text-sm font-bold">Notes from the owner</h2>
          <p className="whitespace-pre-wrap text-sm">{task.notes}</p>
        </section>
      )}

      <section className="surface-panel p-6 space-y-5">
        {task.kind === "document" && task.step && task.status !== "cancelled" && <StepBar step={task.step} />}
        <p className="font-semibold">{stepGuide(task, curator.id)}</p>
        {task.document && (
          <p className="text-sm text-muted">
            Registered as <span className="text-ink">{task.document.title}</span>
            {task.counts.published + task.counts.staged + task.counts.rejected > 0 &&
              ` · ${task.counts.published} published, ${task.counts.staged} waiting, ${task.counts.rejected} rejected`}
          </p>
        )}
        {task.resultNote && (
          <p className="rounded-lg bg-paper p-3 text-sm"><strong>Result:</strong> {task.resultNote}</p>
        )}
        <TaskWorkPanel
          canWork={canWork || task.step === "review"}
          task={{
            id: task.id,
            kind: task.kind,
            step: task.step,
            status: task.status,
            docLink: task.docLink,
            documentId: task.document?.id ?? null,
            sourceName: task.source?.shortName ?? null,
            // For people: the owner's suggested page, else the first search page that is not a sitemap.
            sourcePage:
              task.searchLink ??
              splitPages(task.source?.publicationsUrl).find((p) => !/\.xml($|[?#])/i.test(p)) ??
              task.source?.websiteUrl ??
              null,
            viewerEnteredAll: task.stagedBy.length > 0 && task.stagedBy.every((s) => s === curator.id),
          }}
        />
      </section>

      {isOwner && <OwnerTaskControls taskId={task.id} status={task.status} assigneeId={task.assigneeId} people={people} />}
    </div>
  );
}
