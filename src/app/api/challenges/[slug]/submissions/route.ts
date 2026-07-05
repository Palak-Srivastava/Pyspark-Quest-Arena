import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSubmissionsByChallenge } from "@/lib/db";

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return NextResponse.json({ submissions: await getSubmissionsByChallenge(slug) });
}
