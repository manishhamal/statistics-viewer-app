import Link from "next/link";
import { DOCUMENT_STEPS, type DocumentStep, type Task } from "@/server/tasks/taskData";

// Shared, server-rendered pieces of the task screens.

export const STEP_LABEL: Record<DocumentStep, string> = {
  find: "Find PDF",
  register: "Register",
  extract: "Enter values",
  review: "Review",
  published: "Published",
};

export function StepBar({ step }: { step: DocumentStep }) {
  const at = DOCUMENT_STEPS.indexOf(step);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label={`Step ${at + 1} of 5: ${STEP_LABEL[step]}`}>
      {DOCUMENT_STEPS.map((s, i) => {
        const done = i < at || step === "published";
        const current = i === at && step !== "published";
        return (
          <li key={s} className="space-y-1">
            <span className={`block h-1.5 rounded-full ${done ? "bg-good" : current ? "bg-link" : "bg-line"}`} />
            <span className={`block text-[11px] leading-tight ${current ? "font-bold text-ink" : "text-muted"}`}>
              {i + 1}. {STEP_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** One plain sentence telling the curator what to do now. */
export function stepGuide(task: Task, viewerId: string): string {
  if (task.status === "cancelled") return "This task was cancelled by the owner. Nothing to do.";
  if (task.status === "blocked") return `Waiting for the owner: ${task.blockedReason ?? "marked as blocked"}.`;
  if (task.kind === "note") {
    return task.status === "done" ? "Done." : "Do what the notes say, then write what you did and mark it done.";
  }
  switch (task.step) {
    case "find":
      return `Find the PDF. Click "Find document" to search ${task.source?.shortName ?? "the source"}'s publications, or paste the PDF link yourself.`;
    case "register":
      return "Register the PDF. The form is filled in from the task: check it against the PDF's cover, then register. The server downloads the PDF itself.";
    case "extract":
      return task.counts.rejected > 0 && task.counts.published === 0
        ? `Enter the values. ${task.counts.rejected} earlier value(s) were rejected by a reviewer; enter corrected ones with their page numbers.`
        : "Enter the values. Type each figure exactly as printed, with the page it is on.";
    case "review":
      return task.stagedBy.length > 0 && task.stagedBy.every((id) => id === viewerId)
        ? "Waiting for review. You entered these values, so a different curator must check and approve them."
        : "Waiting for review. A curator who did not enter the values checks each one against the PDF and approves it.";
    case "published":
      return "Done. The values are live on the public site.";
    default:
      return "";
  }
}

export function StatusPill({ task }: { task: Task }) {
  let text = "";
  let cls = "bg-paper text-muted";
  if (task.status === "cancelled") text = "cancelled";
  else if (task.status === "blocked") {
    text = "blocked";
    cls = "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300";
  } else if (task.kind === "note") {
    text = task.status === "done" ? "done" : "to do";
    if (task.status === "done") cls = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300";
  } else if (task.step) {
    text = STEP_LABEL[task.step].toLowerCase();
    if (task.step === "published") cls = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300";
    else if (task.step === "review") cls = "bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300";
  }
  return <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

export function TaskCard({ task, viewerId, showAssignee = false }: { task: Task; viewerId: string; showAssignee?: boolean }) {
  return (
    <Link href={`/admin/tasks/${task.id}`} className="surface-panel block p-4 space-y-3 hover:border-link">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-semibold leading-snug">{task.title}</p>
          <p className="text-xs text-muted">
            {task.kind === "note" ? "Note task" : task.source?.shortName ?? "No source"}
            {task.periodHint && ` · ${task.periodHint}`}
            {showAssignee && ` · ${task.assigneeEmail ?? "unassigned"}`}
            {task.dueDate && (
              <span className={task.overdue ? "font-semibold text-red-700 dark:text-red-300" : ""}> · due {task.dueDate}{task.overdue && " (overdue)"}</span>
            )}
          </p>
        </div>
        <StatusPill task={task} />
      </div>
      {task.kind === "document" && task.step && task.status !== "cancelled" && <StepBar step={task.step} />}
      <p className="text-sm text-muted">{stepGuide(task, viewerId)}</p>
    </Link>
  );
}
