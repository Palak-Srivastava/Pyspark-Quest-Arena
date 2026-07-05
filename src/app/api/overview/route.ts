import { NextResponse } from "next/server";

import { getOverview } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ overview: await getOverview() }, { headers: { "Cache-Control": "no-store" } });
}
