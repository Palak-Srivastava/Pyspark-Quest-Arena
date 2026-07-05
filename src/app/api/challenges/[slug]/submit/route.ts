import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createSubmissionJob } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { applyAuthRotation, resolveAuthContext, validateCsrfToken } from "@/lib/session";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MEMORY_LIMIT_MB = 256;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function resolveQueueLimits() {
  const timeoutMs = clamp(Number(process.env.SUBMISSION_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS), 1000, 120000);
  const memoryLimitMb = clamp(Number(process.env.SUBMISSION_MEMORY_LIMIT_MB ?? DEFAULT_MEMORY_LIMIT_MB), 64, 2048);
  return { timeoutMs, memoryLimitMb };
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Login required to submit." }, { status: 401 });
  }

  if (!validateCsrfToken(request, auth)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const limiter = await checkRateLimit(`submit:${auth.user.id}`, 25, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many submissions. Please retry in a minute." }, { status: 429 });
  }

  const { slug } = await context.params;
  const body = (await request.json()) as { code?: string; questionId?: string };
  const code = body.code ?? "";
  const questionId = body.questionId ?? `manual-${slug}`;

  if (!code.trim()) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const executionMode = process.env.SANDBOX_MODE === "safe" ? "safe-sandbox" : "heuristic";
  const limits = resolveQueueLimits();

  const job = await createSubmissionJob({
    userId: auth.user.id,
    userName: auth.user.name,
    challengeSlug: slug,
    questionId,
    code,
    executionMode,
    timeoutMs: limits.timeoutMs,
    memoryLimitMb: limits.memoryLimitMb,
  });

  const response = NextResponse.json(
    {
      jobId: job.id,
      status: job.status,
      queuedAt: job.createdAt,
      pollUrl: `/api/challenges/${slug}/submit/${job.id}`,
      timeoutMs: job.timeoutMs,
      memoryLimitMb: job.memoryLimitMb,
    },
    { status: 202 },
  );
  applyAuthRotation(response, auth);
  return response;
}
