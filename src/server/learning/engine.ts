export type PerformanceEvidence = {
  correctness: number;
  reasoning: number;
  independence: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function calculatePerformanceScore(
  evidence: PerformanceEvidence,
): number {
  const correctness = clamp01(evidence.correctness);
  const reasoning = clamp01(evidence.reasoning);
  const independence = clamp01(evidence.independence);

  return clamp01(
    correctness * 0.5 +
      reasoning * 0.3 +
      independence * 0.2,
  );
}

export function updateMastery(
  oldMastery: number,
  performanceScore: number,
  alpha = 0.25,
): number {
  const oldValue = clamp01(oldMastery);
  const score = clamp01(performanceScore);
  const safeAlpha = clamp01(alpha);

  return clamp01(
    (1 - safeAlpha) * oldValue + safeAlpha * score,
  );
}

export function masteryToReviewIntervalDays(
  mastery: number,
  performanceScore: number,
): number {
  const m = clamp01(mastery);
  const s = clamp01(performanceScore);

  if (s < 0.4) return 1;
  if (m < 0.4) return 1;
  if (m < 0.6) return 3;
  if (m < 0.8) return 7;
  if (m < 0.9) return 14;
  return 30;
}

export function reviewPriority(
  mastery: number,
  performanceScore: number,
): number {
  const weakness = 1 - clamp01(mastery);
  const recentFailure = 1 - clamp01(performanceScore);

  return Math.round(
    Math.min(100, Math.max(1, 40 + weakness * 35 + recentFailure * 25)),
  );
}

export function addDays(from: Date, days: number): Date {
  const result = new Date(from);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function attemptResult(score: number) {
  if (score >= 0.8) return "CORRECT" as const;
  if (score >= 0.5) return "PARTIAL" as const;
  return "INCORRECT" as const;
}
