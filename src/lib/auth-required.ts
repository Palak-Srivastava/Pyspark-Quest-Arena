import type { NextRequest } from "next/server";

import { resolveAuthContext } from "@/lib/session";

export async function getAuthenticatedUser(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  return auth?.user ?? null;
}

export async function getAuthenticatedContext(request: NextRequest) {
  return resolveAuthContext(request);
}
