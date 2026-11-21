import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for the one-time links an owner generates on /admin/curators.
// Verifying the token signs the curator in; they then choose their password.
//
// Opening the link (GET) only shows a "Continue" button. The token is used up by the
// button's POST. Chat apps such as WhatsApp fetch links to build a preview, and a
// verify-on-GET would let that preview burn the one-time token before the curator opens it.
const ALLOWED = new Set(["invite", "recovery"]);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!tokenHash || !type || !ALLOWED.has(type)) {
    return NextResponse.redirect(new URL("/admin/login?error=link-invalid", request.url));
  }

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Nepal Stats — Set up your account</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f5f2;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif}
@media(prefers-color-scheme:dark){body{background:#121212;color:#ebebea}.card{background:#1c1c1c!important;border-color:#2e2e2e!important}}
.card{max-width:380px;margin:16px;padding:28px;background:#fff;border:1px solid #e0e0dc;border-radius:14px;text-align:center}
h1{font-size:1.25rem;margin:0 0 8px}p{margin:0 0 20px;line-height:1.5;color:#666664}
button{width:100%;padding:12px 16px;border:0;border-radius:8px;background:#d8f35b;color:#1a1a1a;font-weight:700;font-size:1rem;cursor:pointer}
</style></head><body><form class="card" method="post" action="/auth/confirm">
<h1>Welcome to Nepal Stats</h1>
<p>Continue to set your password. This link works only once.</p>
<input type="hidden" name="token_hash" value="${esc(tokenHash)}">
<input type="hidden" name="type" value="${esc(type)}">
<button type="submit">Continue</button>
</form></body></html>`;

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const type = form.get("type");
  // 303 turns the redirect after a POST into a GET.
  const fail = NextResponse.redirect(new URL("/admin/login?error=link-invalid", request.url), 303);
  if (typeof tokenHash !== "string" || typeof type !== "string" || !tokenHash || !ALLOWED.has(type)) return fail;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "invite" | "recovery" });
  if (error) return fail;
  return NextResponse.redirect(new URL("/admin/set-password", request.url), 303);
}
