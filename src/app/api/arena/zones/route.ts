import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getArenaLobbyZones, type ArenaZoneSort } from "@/lib/db";
import { applyAuthRotation, resolveAuthContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  const company = request.nextUrl.searchParams.get("company") ?? "All";
  const sort = (request.nextUrl.searchParams.get("sort") ?? "recommended") as ArenaZoneSort;

  const zones = await getArenaLobbyZones({
    company,
    sort,
    userId: auth?.user.id,
  });

  const response = NextResponse.json({ zones });
  if (auth) {
    applyAuthRotation(response, auth);
  }
  return response;
}
