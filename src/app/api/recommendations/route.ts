import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getRecommendedQuestions, getSubmissionHeatmap } from "@/lib/db";
import { applyAuthRotation, resolveAuthContext } from "@/lib/session";

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ recommendations: [], heatmap: [] });
  }

  const [recommendations, heatmap] = await Promise.all([
    getRecommendedQuestions(auth.user.id, 12),
    getSubmissionHeatmap(auth.user.id, 60),
  ]);

  const response = NextResponse.json({ recommendations, heatmap });
  applyAuthRotation(response, auth);
  return response;
}
