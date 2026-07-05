import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { reportDiscussion } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { applyAuthRotation, resolveAuthContext, validateCsrfToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (!validateCsrfToken(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const limiter = await checkRateLimit(`discussion-report:${auth.user.id}`, 20, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many report actions. Please retry soon." }, { status: 429 });
  }

  const body = (await request.json()) as { discussionId?: string; reason?: string };
  const discussionId = body.discussionId?.trim() ?? "";
  const reason = body.reason?.trim() ?? "Spam / abusive";

  if (!discussionId) {
    return NextResponse.json({ error: "discussionId is required" }, { status: 400 });
  }

  await reportDiscussion({
    discussionId,
    reporterUserId: auth.user.id,
    reason,
  });

  const response = NextResponse.json({ ok: true });
  applyAuthRotation(response, auth);
  return response;
}
