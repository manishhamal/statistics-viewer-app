import { requireOwnerPage } from "@/server/auth/session";
import { listAssignableCurators, listSourcesWithPages, listTasks, type Task } from "@/server/tasks/taskData";
import { TaskCard } from "@/components/tasks/TaskParts";
import { NewTaskForm, SourcePages } from "@/components/tasks/OwnerTaskForms";
import { Notice, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
// Creating a task checks whether the owner's link opens a PDF (one request to the publisher's site).
export const maxDuration = 30;

// Owner view: create and assign tasks, see every task by where it stands, and
// set each source's publications page for "Find document".
export default async function ManageTasksPage() {
  const owner = await requireOwnerPage();
  let tasks: Task[] = [];
  let people: Awaited<ReturnType<typeof listAssignableCurators>> = [];
  let sources: Awaited<ReturnType<typeof listSourcesWithPages>> = [];
  let loadError = "";
  try {
    [tasks, people, sources] = await Promise.all([listTasks(), listAssignableCurators(), listSourcesWithPages()]);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load tasks.";
  }

  const columns: { title: string; hint: string; items: Task[] }[] = [
    { title: "Needs you", hint: "Curators marked these as blocked.", items: tasks.filter((t) => t.status === "blocked") },
    {
      title: "In progress",
      hint: "Finding, registering or entering values.",
      items: tasks.filter((t) => t.active && t.step !== "review"),
    },
    { title: "In review", hint: "Values waiting for a second curator.", items: tasks.filter((t) => t.status === "open" && t.step === "review") },
    {
      title: "Finished",
      hint: "Published, done or cancelled (latest 20).",
      items: tasks.filter((t) => !t.active && t.status !== "blocked").slice(0, 20),
    },
  ];
  const overdue = tasks.filter((t) => t.overdue).length;

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-10">
      <PageHeader
        eyebrow="Owner"
        title="Manage tasks"
        intro="Say which reports or checks are needed and who does them. Each curator sees their tasks with the next step to take."
      />
      {loadError && <Notice kind="error">{loadError}</Notice>}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] items-start">
        <NewTaskForm people={people} sources={sources} />
        <SourcePages sources={sources} />
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">
          All tasks ({tasks.length})
          {overdue > 0 && <span className="ml-2 text-base font-semibold text-red-700 dark:text-red-300">{overdue} overdue</span>}
        </h2>
        <div className="grid gap-6 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title} className="space-y-3">
              <div>
                <h3 className="font-bold">{col.title} ({col.items.length})</h3>
                <p className="text-xs text-muted">{col.hint}</p>
              </div>
              {col.items.map((t) => (
                <TaskCard key={t.id} task={t} viewerId={owner.id} showAssignee />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
