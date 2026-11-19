import { NextResponse } from "next/server";

// Maps thrown errors to the right HTTP status: 401/403 for auth, 400 otherwise.
export function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
  return NextResponse.json({ error: message }, { status });
}
