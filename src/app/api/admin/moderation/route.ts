import { NextResponse } from "next/server";

import { getModerationQueue } from "@/lib/db";

export async function GET() {
  const items = await getModerationQueue(120);
  return NextResponse.json({ items });
}
