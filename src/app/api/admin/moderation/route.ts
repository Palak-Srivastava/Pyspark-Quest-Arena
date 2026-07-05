import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getModerationQueue } from "@/lib/db";
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

  const items = await getModerationQueue(120);
  return NextResponse.json({ items });
}
