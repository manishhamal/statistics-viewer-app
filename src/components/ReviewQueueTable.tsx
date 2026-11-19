"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishAction, rejectAction, type ActionResult } from "@/actions/adminActions";
import type { ReviewItem } from "@/server/admin/reviewQueries";
import { formatValue } from "@/lib/numbers";
import { Notice } from "@/components/admin/ui";

function ReviewCard({ item, currentUserId }: { item: ReviewItem; currentUserId: string }) {
  const ownEntry = item.stagedBy === currentUserId;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function act(task: () => Promise<ActionResult>) {
    setError("");
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  const breakdown = Object.entries(item.breakdown);
  const changed = item.currentPublished && item.currentPublished.value !== item.value;

  return (
    <div className="surface-panel p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-[#617080]">
            {item.indicator?.name ?? "Unknown indicator"} · {item.period?.label ?? "?"}
            {item.period?.label_ad ? ` (${item.period.label_ad})` : ""}
          </p>
          <p className="text-2xl font-bold">
            {formatValue(item.value, item.unit, item.scale)}
            {item.is_provisional && <span className="ml-2 align-middle rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">provisional</span>}
          </p>
          {breakdown.length > 0 && (
            <p className="text-xs text-[#617080]">{breakdown.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
          )}
          <p className="text-sm text-[#617080]">
            {item.document?.file_url ? (
              <a href={item.document.file_url} target="_blank" rel="noreferrer" className="text-[#2c6eaa]">
                {item.document.title} ↗
              </a>
            ) : (
              item.document?.title ?? "No source document"
            )}
            {" · "}page {item.page_number ?? "—"}
            {item.table_ref ? ` · ${item.table_ref}` : ""}
          </p>
          {item.currentPublished ? (
            <p className={`text-xs font-semibold ${changed ? "text-amber-800" : "text-[#617080]"}`}>
              Approving replaces the published value {formatValue(item.currentPublished.value, item.currentPublished.unit, item.currentPublished.scale)}
              {changed ? "" : " (same number)"}.
            </p>
          ) : (
            <p className="text-xs text-[#617080]">New value. Nothing is published for this period yet.</p>
          )}
          <p className="text-xs text-[#617080]">
            Entered by {ownEntry ? "you" : item.stagedByEmail ?? "unknown (before curator tracking)"} on {item.created_at.slice(0, 10)}
          </p>
        </div>

        {!rejecting && (
          <div className="flex gap-2">
            <button
              disabled={pending || ownEntry}
              title={ownEntry ? "You entered this value, so another curator must approve it." : undefined}
              onClick={() => act(() => publishAction(item.id))}
              className="rounded bg-[#2f7d5b] px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Working…" : ownEntry ? "Needs another curator" : "Approve & publish"}
            </button>
            <button
              disabled={pending}
              onClick={() => setRejecting(true)}
              className="rounded border border-red-700 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {rejecting && (
        <div className="flex flex-wrap gap-2">
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why? e.g. wrong page, typo in value"
            className="min-w-[240px] flex-1 rounded border border-[#dce2e4] p-2 text-sm"
          />
          <button
            disabled={pending || !reason.trim()}
            onClick={() => act(() => rejectAction(item.id, reason))}
            className="rounded bg-red-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Confirm reject
          </button>
          <button onClick={() => setRejecting(false)} className="rounded px-3 py-2 text-sm">
            Cancel
          </button>
        </div>
      )}
      {error && <Notice kind="error">{error}</Notice>}
    </div>
  );
}

export default function ReviewQueueTable({ rows, currentUserId }: { rows: ReviewItem[]; currentUserId: string }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <ReviewCard key={row.id} item={row} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
