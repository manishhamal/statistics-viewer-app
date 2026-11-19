"use client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteCuratorAction,
  resetLinkAction,
  setActiveAction,
  type CuratorActionResult,
} from "@/actions/curatorActions";
import type { CuratorRow } from "@/server/admin/curatorAdmin";
import { Notice, inputClass } from "@/components/admin/ui";

function LinkBox({ message, link }: { message: string; link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm">
      <p className="font-semibold text-emerald-900">{message}</p>
      <div className="flex gap-2">
        <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="flex-1 rounded border border-emerald-200 bg-white p-2 text-xs" />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }}
          className="rounded bg-emerald-800 px-3 py-2 text-xs font-bold text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-emerald-900">
        Works once and expires (1 hour by default). Send it privately, e.g. a direct message, not a group chat. Anyone who opens it can set this account&apos;s password.
      </p>
    </div>
  );
}

export default function CuratorManager({ curators, currentUserId }: { curators: CuratorRow[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState<{ message: string; link: string } | null>(null);

  function act(task: () => Promise<CuratorActionResult>, onOk?: () => void) {
    setError("");
    setLink(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.link) setLink({ message: result.message ?? "Send this link.", link: result.link });
      onOk?.();
      router.refresh();
    });
  }

  function invite(e: FormEvent) {
    e.preventDefault();
    act(() => inviteCuratorAction(email), () => setEmail(""));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={invite} className="surface-panel p-6 space-y-4">
        <h2 className="text-xl font-bold">Add a curator</h2>
        <div className="flex flex-wrap gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="curator@example.org"
            className={`${inputClass} !mt-0 max-w-md`}
          />
          <button disabled={pending} className="rounded-lg bg-[#10283f] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            {pending ? "Working…" : "Create invite link"}
          </button>
        </div>
        <p className="text-xs text-[#617080]">They get a one-time link to choose their own password. You never see it.</p>
      </form>

      {error && <Notice kind="error">{error}</Notice>}
      {link && <LinkBox {...link} />}

      <section className="surface-panel p-6 space-y-3">
        <h2 className="text-xl font-bold">Team ({curators.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-[#617080]">
              <tr>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Added</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {curators.map((c) => {
                const self = c.user_id === currentUserId;
                const isOwner = c.role === "owner";
                return (
                  <tr key={c.user_id} className="border-t border-[#dce2e4]">
                    <td className="py-2 pr-3 font-semibold">{c.email}{self && <span className="ml-1 text-xs font-normal text-[#617080]">(you)</span>}</td>
                    <td className="py-2 pr-3">{c.role}</td>
                    <td className="py-2 pr-3">
                      {c.active ? (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">active</span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">deactivated</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-xs text-[#617080]">{c.created_at.slice(0, 10)}</td>
                    <td className="py-2 text-right whitespace-nowrap space-x-2">
                      {!isOwner && c.active && (
                        <>
                          <button disabled={pending} onClick={() => act(() => resetLinkAction(c.user_id))} className="rounded border border-[#dce2e4] px-2 py-1 text-xs font-semibold">
                            Password link
                          </button>
                          <button
                            disabled={pending}
                            onClick={() => {
                              if (confirm(`Remove ${c.email}'s access now?`)) act(() => setActiveAction(c.user_id, false));
                            }}
                            className="rounded border border-red-700 px-2 py-1 text-xs font-semibold text-red-700"
                          >
                            Deactivate
                          </button>
                        </>
                      )}
                      {!isOwner && !c.active && (
                        <button disabled={pending} onClick={() => act(() => setActiveAction(c.user_id, true))} className="rounded border border-[#dce2e4] px-2 py-1 text-xs font-semibold">
                          Reactivate
                        </button>
                      )}
                      {isOwner && <span className="text-xs text-[#617080]">set in OWNER_EMAILS</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
