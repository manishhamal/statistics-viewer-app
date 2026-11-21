import Link from "next/link";
import { requireCuratorPage } from "@/server/auth/session";
import { listTasks, type Task } from "@/server/tasks/taskData";
import { TaskCard } from "@/components/tasks/TaskParts";
import { Notice, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// The first page a curator sees: their tasks, with the next step for each,
// and other people's values that are waiting for them to review.
export default async function MyTasksPage() {
  const curator = await requireCuratorPage();
  let tasks: Task[] = [];
  let loadError = "";
  try {
    tasks = await listTasks();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load tasks.";
  }

  const mine = tasks.filter((t) => t.assigneeId === curator.id);
  const todo = mine.filter((t) => t.active).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const blocked = mine.filter((t) => t.status === "blocked");
  const finished = mine.filter((t) => !t.active && t.status !== "blocked" && t.status !== "cancelled").slice(0, 10);
  // Values someone else entered that I am allowed to approve.
  const toReview = tasks.filter(
    (t) => t.status === "open" && t.step === "review" && t.stagedBy.some((id) => id !== curator.id),
  );

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow="Curator workspace"
          title="My tasks"
          intro="Each task shows its next step. Open a task and follow the button; you are sent back here when a step is done."
        />
        {curator.role === "owner" && (
          <Link href="/admin/tasks/manage" className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary">
            Manage tasks
          </Link>
        )}
      </div>
      {loadError && <Notice kind="error">{loadError}</Notice>}

      {toReview.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Waiting for your review ({toReview.length})</h2>
          <p className="text-sm text-muted">Another curator entered these values. Check them against the PDF and approve or reject.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {toReview.map((t) => (
              <TaskCard key={t.id} task={t} viewerId={curator.id} showAssignee />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">To do ({todo.length})</h2>
        {todo.length === 0 && !loadError && (
          <p className="text-sm text-muted">Nothing assigned to you right now.{curator.role === "owner" && " Create tasks from Manage tasks."}</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {todo.map((t) => (
            <TaskCard key={t.id} task={t} viewerId={curator.id} />
          ))}
        </div>
      </section>

      {blocked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Waiting for the owner ({blocked.length})</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {blocked.map((t) => (
              <TaskCard key={t.id} task={t} viewerId={curator.id} />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Recently finished</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {finished.map((t) => (
              <TaskCard key={t.id} task={t} viewerId={curator.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
