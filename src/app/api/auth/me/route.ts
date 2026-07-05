import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { applyAuthRotation, resolveAuthContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const response = NextResponse.json({
    user: {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
    },
  }, { headers: { "Cache-Control": "no-store" } });

  applyAuthRotation(response, auth);
  return response;
}
