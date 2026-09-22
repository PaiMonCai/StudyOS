import { describe, expect, it } from "vitest";
import {
  calculatePerformanceScore,
  masteryToReviewIntervalDays,
  updateMastery,
} from "./engine";

describe("learning engine", () => {
  it("calculates weighted performance", () => {
    expect(
      calculatePerformanceScore({
        correctness: 1,
        reasoning: 0.5,
        independence: 0.5,
      }),
    ).toBeCloseTo(0.75);
  });

  it("updates mastery deterministically", () => {
    expect(updateMastery(0.5, 1)).toBeCloseTo(0.625);
  });

  it("shortens review after a weak attempt", () => {
    expect(masteryToReviewIntervalDays(0.85, 0.25)).toBe(1);
  });

  it("spaces strong mastery further apart", () => {
    expect(masteryToReviewIntervalDays(0.93, 0.95)).toBe(30);
  });
});
