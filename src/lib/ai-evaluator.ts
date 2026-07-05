type AiVerdict = "passed" | "failed";

export type AiReview = {
  verdict: AiVerdict;
  confidence: number;
  summary: string;
  rubric: {
    correctness: number;
    performance: number;
    sparkPractices: number;
    codeQuality: number;
  };
  suggestions: string[];
};

type EvaluateWithAiInput = {
  challengeSlug: string;
  question: {
    id: string;
    title: string;
    description: string;
    problemStatement?: string;
    constraints?: string[];
  };
  code: string;
  baseline: {
    status: "passed" | "failed";
    score: number;
    runtimeMs: number;
    memoryMb: number;
    tests?: unknown;
    checks?: unknown;
    engine?: "safe-sandbox" | "heuristic";
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.AI_REVIEW_MODEL ?? "gpt-4.1-mini";
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const enabled = process.env.AI_REVIEW_ENABLED === "true";

  return { enabled, apiKey, model, baseUrl };
}

export async function evaluateWithAi(input: EvaluateWithAiInput): Promise<AiReview | null> {
  const config = getAiConfig();
  if (!config.enabled || !config.apiKey) {
    return null;
  }

  const prompt = [
    "You are evaluating a PySpark coding submission.",
    "Return strict JSON only matching this schema:",
    '{"verdict":"passed|failed","confidence":0-100,"summary":"short text","rubric":{"correctness":0-100,"performance":0-100,"sparkPractices":0-100,"codeQuality":0-100},"suggestions":["..."]}',
    "Use baseline tests/checks as strong evidence.",
    "If baseline failed, verdict should usually be failed unless there is clear reason.",
    "Keep summary <= 240 chars and suggestions <= 5 bullets.",
    "",
    `Challenge: ${input.challengeSlug}`,
    `Question ID: ${input.question.id}`,
    `Title: ${input.question.title}`,
    `Description: ${input.question.description}`,
    `Problem Statement: ${input.question.problemStatement ?? ""}`,
    `Constraints: ${(input.question.constraints ?? []).join(" | ")}`,
    "",
    "Baseline Result:",
    JSON.stringify(input.baseline),
    "",
    "User Code:",
    input.code,
  ].join("\n");

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a strict PySpark judge." },
          { role: "user", content: prompt },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as Partial<AiReview>;
    if (!parsed || !parsed.verdict || !parsed.rubric) {
      return null;
    }

    return {
      verdict: parsed.verdict === "failed" ? "failed" : "passed",
      confidence: clamp(Number(parsed.confidence ?? 0), 0, 100),
      summary: String(parsed.summary ?? "AI review completed."),
      rubric: {
        correctness: clamp(Number(parsed.rubric.correctness ?? 0), 0, 100),
        performance: clamp(Number(parsed.rubric.performance ?? 0), 0, 100),
        sparkPractices: clamp(Number(parsed.rubric.sparkPractices ?? 0), 0, 100),
        codeQuality: clamp(Number(parsed.rubric.codeQuality ?? 0), 0, 100),
      },
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.map((item) => String(item)).slice(0, 5)
        : [],
    };
  } catch {
    return null;
  }
}
