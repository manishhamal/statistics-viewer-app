import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "@/i18n/config";

// Paths that are not part of the bilingual public site.
const NOT_LOCALIZED = /^\/(admin|api|auth|_next)(\/|$)/;

function preferredLang(request: NextRequest): Lang {
  const saved = request.cookies.get(LANG_COOKIE)?.value;
  if (isLang(saved)) return saved;
  const accept = request.headers.get("accept-language") ?? "";
  return /(^|,)\s*ne\b/i.test(accept) ? "ne" : DEFAULT_LANG;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Curator area: /admin pages need a signed-in user. Whether that user is an
  // *active curator* is checked against the database by each page, API route and
  // server action (src/server/auth/session.ts), so it is never skipped.
  if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
    const response = await updateSession(request);
    if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
      const { createClient } = await import("@/lib/supabase/server");
      const { data } = await (await createClient()).auth.getUser();
      if (!data.user) return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }
  if (NOT_LOCALIZED.test(path)) return NextResponse.next();

  // Public site: every page lives under /en or /ne.
  const first = path.split("/")[1];
  if (isLang(first)) {
    const response = NextResponse.next();
    // Remember the language of the page being read, for the next visit to "/".
    if (request.cookies.get(LANG_COOKIE)?.value !== first) {
      response.cookies.set(LANG_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return response;
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLang(request)}${path === "/" ? "" : path}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next's static assets and files with an extension (images, favicon, PDFs…).
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
