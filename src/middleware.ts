import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isCuratorEmail } from "@/lib/curators";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const { createClient } = await import("@/lib/supabase/server");
    const client = await createClient();
    const { data } = await client.auth.getUser();
    if (!data.user || !isCuratorEmail(data.user.email)) {
      const url = new URL("/admin/login", request.url);
      if (data.user) url.searchParams.set("error", "not-curator");
      return NextResponse.redirect(url);
    }
  }
  return response;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
