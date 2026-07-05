import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getQuestionCatalog } from "@/lib/db";
import { resolveAuthContext } from "@/lib/session";

function isAdminEmail(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  return adminEmail.length > 0 && email.toLowerCase() === adminEmail.toLowerCase();
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth || !isAdminEmail(auth.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams.get("search") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "120");
  const items = await getQuestionCatalog(search, Number.isNaN(limit) ? 120 : Math.max(20, Math.min(400, limit)));
  return NextResponse.json({ items });
}
