import { getAdminDbClient } from "@/server/db/client";
import type { Curator } from "@/server/auth/session";

// Appends one entry to the audit log. A failed write is reported to the server log
// but does not undo the action it describes.
export async function logAudit(
  actor: Curator,
  action: string,
  target: { type: string; id?: string | null } | null = null,
  details: Record<string, unknown> = {},
) {
  const { error } = await getAdminDbClient().from("audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    target_type: target?.type ?? null,
    target_id: target?.id ?? null,
    details,
  });
  if (error) console.error(`Audit log write failed (${action}):`, error.message);
}
