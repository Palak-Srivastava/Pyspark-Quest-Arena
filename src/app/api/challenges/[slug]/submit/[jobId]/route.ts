import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  addSubmission,
  claimSubmissionJob,
  completeSubmissionJob,
  failSubmissionJob,
  getQuestionById,
  getSubmissionJobById,
  timeoutSubmissionJob,
} from "@/lib/db";
import { evaluateWithAi } from "@/lib/ai-evaluator";
import { runSubmission } from "@/lib/execution-engine";
import { checkRateLimit } from "@/lib/rate-limit";
import { applyAuthRotation, resolveAuthContext } from "@/lib/session";

async function runWithTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Execution timed out.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; jobId: string }> },
) {
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: "Login required to read submission status." }, { status: 401 });
  }

  const limiter = await checkRateLimit(`submit-poll:${auth.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Too many polling requests. Please retry shortly." }, { status: 429 });
  }

  const { slug, jobId } = await context.params;
  let job = await getSubmissionJobById(jobId);

  if (!job || job.userId !== auth.user.id || job.challengeSlug !== slug) {
    return NextResponse.json({ error: "Submission job not found." }, { status: 404 });
  }

  if (job.status === "queued") {
    const claimed = await claimSubmissionJob(job.id, auth.user.id);
    if (claimed) {
      try {
        const question = await getQuestionById(claimed.questionId, auth.user.id);
        const result = await runWithTimeout(
          runSubmission({
            code: claimed.code,
            language: "python",
            testCases: question?.testCases ?? [],
            mode: claimed.executionMode,
          }),
          claimed.timeoutMs,
        );

        const aiReview = await evaluateWithAi({
          challengeSlug: slug,
          question: {
            id: question?.id ?? claimed.questionId,
            title: question?.title ?? "Untitled question",
            description: question?.description ?? "",
            problemStatement: question?.problemStatement,
            constraints: question?.constraints,
          },
          code: claimed.code,
          baseline: {
            status: result.status,
            score: result.score,
            runtimeMs: result.runtimeMs,
            memoryMb: result.memoryMb,
            tests: result.tests,
            checks: result.checks,
            engine: result.engine,
          },
        });

        const enforceAi = process.env.AI_REVIEW_ENFORCE === "true";
        const finalStatus = enforceAi && aiReview?.verdict === "failed" ? "failed" : result.status;

        // Difficulty-based scoring: Beginner=1, Intermediate=5, Advanced=10, Interview=10
        function difficultyPoints(difficulty: string | undefined): number {
          switch ((difficulty ?? "").toLowerCase()) {
            case "beginner": return 1;
            case "intermediate": return 5;
            case "advanced": return 10;
            case "interview": return 10;
            default: return 1;
          }
        }
        const finalScore = finalStatus === "failed" ? 0 : difficultyPoints(question?.difficulty);
        const resultWithAi = {
          ...result,
          status: finalStatus,
          score: finalScore,
          aiReview,
          aiReviewEnforced: enforceAi,
        };

        if ((result.memoryMb ?? 0) > claimed.memoryLimitMb) {
          await failSubmissionJob(claimed.id, `Memory limit exceeded (${result.memoryMb}MB > ${claimed.memoryLimitMb}MB).`);
          await addSubmission({
            userId: auth.user.id,
            userName: auth.user.name,
            slug,
            questionId: claimed.questionId,
            score: 0,
            runtimeMs: result.runtimeMs ?? 0,
            memoryMb: result.memoryMb ?? 0,
            status: "failed",
          });
        } else {
          await completeSubmissionJob(claimed.id, resultWithAi);
          await addSubmission({
            userId: auth.user.id,
            userName: auth.user.name,
            slug,
            questionId: claimed.questionId,
            score: finalScore,
            runtimeMs: result.runtimeMs,
            memoryMb: result.memoryMb,
            status: finalStatus,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected execution failure.";
        if (message.toLowerCase().includes("timed out")) {
          await timeoutSubmissionJob(claimed.id, message);
        } else {
          await failSubmissionJob(claimed.id, message);
        }
      }
    }

    job = await getSubmissionJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Submission job no longer exists." }, { status: 404 });
    }
  }

  const response = NextResponse.json({
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    timeoutMs: job.timeoutMs,
    memoryLimitMb: job.memoryLimitMb,
    result: job.status === "completed" ? job.result : undefined,
    error: job.status === "failed" || job.status === "timed_out" ? job.error : undefined,
  });

  applyAuthRotation(response, auth);
  return response;
}
