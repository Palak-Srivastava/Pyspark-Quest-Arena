import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { clearSessionCookies, resolveAuthContext, validateCsrfToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await clearSessionCookies(unauthorized, request);
    return unauthorized;
  }

  if (!validateCsrfToken(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  await clearSessionCookies(response, request);
  return response;
}
