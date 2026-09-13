export type Tier = 'warm' | 'standard' | 'hard';
export type ProgressEvidence = {
  courses: Partial<
    Record<
      number,
      { examScores: number[]; freeTextPassed: boolean; diagramPassed?: boolean }
    >
  >;
  passingSimTiers: Tier[];
  field: {
    rideAlongCompleted: boolean;
    day5Passed: boolean;
    hcpCompleted: boolean;
  };
};
export function examPassed(score: number) {
  return Number.isFinite(score) && score >= 90 && score <= 100;
}

export function trainingPath(evidence: ProgressEvidence) {
  let previousPassed = true;
  return Array.from({ length: 7 }, (_, index) => {
    const module = index + 1;
    let requirementsMet = false;
    if (module <= 5) {
      const course = evidence.courses[module];
      requirementsMet =
        !!course &&
        course.examScores.some(examPassed) &&
        course.freeTextPassed &&
        (module !== 3 || course.diagramPassed === true);
    } else if (module === 6) {
      requirementsMet = (['warm', 'standard', 'hard'] as const).every((tier) =>
        evidence.passingSimTiers.includes(tier),
      );
    } else {
      requirementsMet =
        evidence.field.rideAlongCompleted &&
        evidence.field.day5Passed &&
        evidence.field.hcpCompleted;
    }
    const status = !previousPassed
      ? 'locked'
      : requirementsMet
        ? 'passed'
        : 'unlocked';
    previousPassed = status === 'passed';
    return { module, status } as {
      module: number;
      status: 'locked' | 'unlocked' | 'passed';
    };
  });
}
