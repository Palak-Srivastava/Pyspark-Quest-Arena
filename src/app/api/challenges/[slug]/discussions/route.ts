import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { addDiscussion, deleteDiscussion, getDiscussionByChallenge } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { applyAuthRotation, resolveAuthContext, validateCsrfToken } from "@/lib/session";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return NextResponse.json({ discussions: await getDiscussionByChallenge(slug) });
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (!validateCsrfToken(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const limiter = await checkRateLimit(`discussion-post:${auth.user.id}`, 10, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many discussion posts. Please retry soon." }, { status: 429 });
  }

  const { slug } = await context.params;
  const body = (await request.json()) as { comment?: string };
  const comment = body.comment?.trim() ?? "";

  if (comment.length < 3) {
    return NextResponse.json({ error: "Comment is too short." }, { status: 400 });
  }

  const created = await addDiscussion({ slug, userId: auth.user.id, userName: auth.user.name, comment });
  const response = NextResponse.json({ discussion: created });
  applyAuthRotation(response, auth);
  return response;
}

export async function DELETE(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (!validateCsrfToken(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const limiter = await checkRateLimit(`discussion-delete:${auth.user.id}`, 20, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many delete requests. Please retry soon." }, { status: 429 });
  }

  const body = (await request.json()) as { discussionId?: string };
  const discussionId = body.discussionId?.trim() ?? "";
  if (!discussionId) {
    return NextResponse.json({ error: "discussionId is required." }, { status: 400 });
  }

  const result = await deleteDiscussion({ discussionId, userId: auth.user.id });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === "Discussion not found." ? 404 : 403 });
  }

  const response = NextResponse.json({ ok: true });
  applyAuthRotation(response, auth);
  return response;
}
