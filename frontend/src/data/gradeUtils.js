// Grade boundaries for a 40-mark assessment
// Customize totalMarks + boundaries per assessment in the future
export const GRADE_BOUNDARIES = {
  A: 32,
  B: 24,
  C: 16,
  pass: 20,
  borderlineWindow: 3,
};

export const GRADES = [
  { min: 36, grade: "A+", color: "emerald" },
  { min: 32, grade: "A", color: "emerald" },
  { min: 28, grade: "B+", color: "blue" },
  { min: 24, grade: "B", color: "blue" },
  { min: 20, grade: "C+", color: "amber" },
  { min: 16, grade: "C", color: "amber" },
  { min: 0, grade: "D", color: "rose" },
];

export function getGradeContext(total) {
  const current = GRADES.find((g) => total >= g.min) || GRADES[GRADES.length - 1];
  const nextIdx = GRADES.findIndex((g) => g.min === current.min) - 1;
  const nextGrade = nextIdx >= 0 ? GRADES[nextIdx] : null;
  const distToNext = nextGrade ? nextGrade.min - total : null;

  const isFailing = total < GRADE_BOUNDARIES.pass;
  const isBorderlinePass = total >= GRADE_BOUNDARIES.pass - GRADE_BOUNDARIES.borderlineWindow &&
    total < GRADE_BOUNDARIES.pass + GRADE_BOUNDARIES.borderlineWindow;
  const isBorderlineGrade = nextGrade && distToNext !== null && distToNext <= GRADE_BOUNDARIES.borderlineWindow;
  const isBorderline = isBorderlinePass || isBorderlineGrade;

  return { currentGrade: current, nextGrade, distToNext, isBorderline, isFailing, isBorderlinePass };
}
