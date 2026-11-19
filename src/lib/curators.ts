// Curator allowlist. Supabase sign-up is open to anyone holding the public key,
// so being logged in is not enough: the email must also be listed in CURATOR_EMAILS
// (comma-separated). If the variable is missing, nobody is a curator (fail closed).
export function isCuratorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.CURATOR_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
