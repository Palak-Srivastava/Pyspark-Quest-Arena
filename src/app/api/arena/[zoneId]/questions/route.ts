import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getQuestionsByZone } from "@/lib/db";
import type { Difficulty } from "@/data/mock";
import { applyAuthRotation, resolveAuthContext } from "@/lib/session";

export async function GET(request: NextRequest, context: { params: Promise<{ zoneId: string }> }) {
  const auth = await resolveAuthContext(request);
  const { zoneId } = await context.params;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "30");
  const difficulty = (request.nextUrl.searchParams.get("difficulty") ?? "All") as Difficulty | "All";
  const company = request.nextUrl.searchParams.get("company") ?? "All";
  const sort = (request.nextUrl.searchParams.get("sort") ?? "recommended") as "recommended" | "difficulty" | "solved" | "acceptance";
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const savedOnly = request.nextUrl.searchParams.get("savedOnly") === "1";

  const result = await getQuestionsByZone(
    zoneId,
    Number.isNaN(page) ? 1 : page,
    Number.isNaN(pageSize) ? 30 : pageSize,
    { difficulty, company, sort, search, savedOnly },
    auth?.user.id,
  );
  const response = NextResponse.json(result);
  if (auth) {
    applyAuthRotation(response, auth);
  }
  return response;
}
