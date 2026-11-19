// Owners are named in the environment (OWNER_EMAILS, or the older CURATOR_EMAILS).
// They always have access and manage everyone else from /admin/curators.
// Ordinary curators live in the `curators` table, never in the environment.
export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? process.env.CURATOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ownerEmails().includes(email.trim().toLowerCase());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
