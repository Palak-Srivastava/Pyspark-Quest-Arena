import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getQuestionCatalog } from "@/lib/db";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "120");
  const items = await getQuestionCatalog(search, Number.isNaN(limit) ? 120 : Math.max(20, Math.min(400, limit)));
  return NextResponse.json({ items });
}
