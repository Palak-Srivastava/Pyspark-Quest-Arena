import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { addBookmark, getBookmarkedQuestionIds, getBookmarkedQuestions, removeBookmark } from "@/lib/db";
import { applyAuthRotation, resolveAuthContext, validateCsrfToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ bookmarkedIds: [], bookmarks: [] });
  }

  const detailed = request.nextUrl.searchParams.get("detailed") === "1";
  if (detailed) {
    const bookmarks = await getBookmarkedQuestions(auth.user.id, 300);
    const response = NextResponse.json({ bookmarks });
    applyAuthRotation(response, auth);
    return response;
  }

  const bookmarkedIds = await getBookmarkedQuestionIds(auth.user.id);
  const response = NextResponse.json({ bookmarkedIds });
  applyAuthRotation(response, auth);
  return response;
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (!validateCsrfToken(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const body = (await request.json()) as { questionId?: string };
  const questionId = body.questionId?.trim() ?? "";
  if (!questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }

  await addBookmark(auth.user.id, questionId);
  const response = NextResponse.json({ ok: true, bookmarked: true });
  applyAuthRotation(response, auth);
  return response;
}

export async function DELETE(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (!validateCsrfToken(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const body = (await request.json()) as { questionId?: string };
  const questionId = body.questionId?.trim() ?? "";
  if (!questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }

  await removeBookmark(auth.user.id, questionId);
  const response = NextResponse.json({ ok: true, bookmarked: false });
  applyAuthRotation(response, auth);
  return response;
}
