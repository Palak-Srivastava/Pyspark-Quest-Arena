import { NextResponse } from "next/server";

import { getLeaderboard } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ leaderboard: await getLeaderboard(100) });
}
