import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for the one-time links an owner generates on /admin/curators.
// Verifying the token signs the curator in; they then choose their password.
const ALLOWED = new Set(["invite", "recovery"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const fail = NextResponse.redirect(new URL("/admin/login?error=link-invalid", request.url));
  if (!tokenHash || !type || !ALLOWED.has(type)) return fail;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "invite" | "recovery" });
  if (error) return fail;
  return NextResponse.redirect(new URL("/admin/set-password", request.url));
}
