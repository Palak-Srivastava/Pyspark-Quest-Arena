import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getProfile } from "@/lib/db";
import { applyAuthRotation, resolveAuthContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(auth.user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const response = NextResponse.json({ profile });
  applyAuthRotation(response, auth);
  return response;
}
