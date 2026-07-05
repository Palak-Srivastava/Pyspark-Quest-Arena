type JudgeCase = {
  id: string;
  name: string;
  visibility: "public" | "hidden";
  requiredPatterns?: string[];
};

export function evaluateSubmission(code: string, testCases: JudgeCase[] = []) {
  const hasSolve = /def\s+solve\s*\(/.test(code);
  const hasTransform = /(groupBy|withColumn|join|agg|window|select)/.test(code);
  const avoidsCollect = !/collect\s*\(/.test(code);
  const avoidsPandas = !/toPandas\s*\(/.test(code);
  const hasExplain = /explain\s*\(/.test(code);
  const hasCache = /(cache\s*\(|persist\s*\()/.test(code);

  const checks = [hasSolve, hasTransform, avoidsCollect, avoidsPandas];
  const passedChecks = checks.filter(Boolean).length;

  const generatedCases =
    testCases.length > 0
      ? testCases
      : [
          { id: "public-1", name: "Public sample", visibility: "public" as const, requiredPatterns: ["def solve"] },
          { id: "public-2", name: "Public edge", visibility: "public" as const, requiredPatterns: ["select"] },
          { id: "hidden-1", name: "Hidden scale", visibility: "hidden" as const, requiredPatterns: ["groupBy"] },
          { id: "hidden-2", name: "Hidden skew", visibility: "hidden" as const, requiredPatterns: ["join"] },
        ];

  const testResults = generatedCases.map((testCase) => {
    const patterns = testCase.requiredPatterns ?? [];
    const patternPassed =
      patterns.length === 0 ||
      patterns.every((pattern) => code.toLowerCase().includes(pattern.toLowerCase().replace(/\s+/g, "")));

    const basePass = hasSolve && avoidsCollect && avoidsPandas;
    const passed = basePass && (patterns.length === 0 ? hasTransform : patternPassed);

    return {
      id: testCase.id,
      name: testCase.name,
      visibility: testCase.visibility,
      passed,
    };
  });

  const publicCases = testResults.filter((item) => item.visibility === "public");
  const hiddenCases = testResults.filter((item) => item.visibility === "hidden");
  const publicPassed = publicCases.filter((item) => item.passed).length;
  const hiddenPassed = hiddenCases.filter((item) => item.passed).length;
  const totalPassed = testResults.filter((item) => item.passed).length;
  const totalCases = Math.max(1, testResults.length);

  const status = totalPassed === totalCases ? "passed" : "failed";
  const qualityScore = Math.round((passedChecks / checks.length) * 60 + (totalPassed / totalCases) * 40);

  const codeLengthPenalty = Math.min(220, Math.floor(code.length / 35));
  const optimizationBonus = Number(hasExplain) * 18 + Number(hasCache) * 12;
  const runtimeMs = Math.max(180, 900 - qualityScore * 4 + codeLengthPenalty - optimizationBonus);
  const memoryMb = Math.max(72, 180 - Math.floor(qualityScore * 0.5) + Math.floor(codeLengthPenalty * 0.2) - Number(hasCache) * 4);

  const score = status === "passed" ? 300 + qualityScore * 3 - Math.floor(runtimeMs / 12) : Math.floor(qualityScore * 0.8);

  return {
    status,
    checks: {
      hasSolve,
      hasTransform,
      avoidsCollect,
      avoidsPandas,
      hasExplain,
      hasCache,
    },
    tests: {
      total: totalCases,
      passed: totalPassed,
      public: { total: publicCases.length, passed: publicPassed },
      hidden: { total: hiddenCases.length, passed: hiddenPassed },
      results: testResults,
    },
    runtimeMs,
    memoryMb,
    score: Math.max(0, score),
  } as const;
}
