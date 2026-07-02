import { Check, X, AlertTriangle, Eye, Pencil } from "lucide-react";

// Grade/mark status palette — one system reused across Review & Insights.
// Shape + color together so states read without a legend.
export const STATUS_META = {
  correct: { label: "Correct", text: "text-green-700", bg: "bg-green-50", border: "border-green-200", icon: Check },
  partial: { label: "Partial", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: null },
  review: { label: "Needs review", text: "text-yellow-700", bg: "bg-yellow-100", border: "border-yellow-300", icon: Eye },
  wrong: { label: "Wrong", text: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: X },
  overridden: { label: "Overridden", text: "text-blue-800", bg: "bg-blue-50", border: "border-blue-200", icon: Pencil },
};

// Sequential mastery scale — used on Insights only.
export const MASTERY_SCALE = [
  { min: 75, text: "text-green-700", bg: "bg-green-600", bar: "bg-green-600" },
  { min: 50, text: "text-amber-700", bg: "bg-amber-500", bar: "bg-amber-500" },
  { min: 0, text: "text-red-700", bg: "bg-red-600", bar: "bg-red-600" },
];

export const getMasteryTier = (pct) => MASTERY_SCALE.find((t) => pct >= t.min) || MASTERY_SCALE[MASTERY_SCALE.length - 1];

// Determine a mark's status. `currentMark` is the mark currently shown/selected
// (may differ from ev.aiMark if the teacher has changed it but not saved yet).
export const getMarkStatus = (q, ev, currentMark) => {
  if (!ev) return null;
  const mark = currentMark ?? ev.teacherMark ?? ev.aiMark;
  if (mark !== ev.aiMark) return "overridden";
  if (ev.needsReview) return "review";
  if (mark === 0 && q.maxMarks <= 2) return "wrong";
  if (mark >= q.maxMarks) return "correct";
  return "partial";
};

export const isOverridden = (ev, currentMark) => {
  if (!ev) return false;
  const mark = currentMark ?? ev.teacherMark;
  return mark != null && mark !== ev.aiMark;
};
