import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { StatusChip, StatusIcon } from "@/components/StatusChip";
import { STATUS_META, getMarkStatus, isOverridden } from "@/lib/reviewStatus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { GRADE_BOUNDARIES, getGradeContext } from "@/data/gradeUtils";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Search, X, Check, Sparkles, ChevronRight, ChevronLeft,
  Wand2, Keyboard, Save, ArrowRight, Maximize2, Minimize2, ListChecks, LayoutGrid, User, Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ════════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════════

const chapterChip = (chId, CHAPTERS) => {
  const c = Array.isArray(CHAPTERS) ? CHAPTERS.find(x => x.id === chId) : CHAPTERS[chId];
  if (!c) return null;
  const map = { blue: "bg-blue-50 text-blue-800 border-blue-100", emerald: "bg-emerald-50 text-emerald-800 border-emerald-100", amber: "bg-amber-50 text-amber-800 border-amber-200", rose: "bg-rose-50 text-rose-800 border-rose-100" };
  return <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${map[c.color]}`}>{(c.name || "").split(" — ")[0]}</span>;
};

// Discrete 0.5-step marks for the segmented control (only usable for small maxMarks)
const markSteps = (maxMarks) => {
  const steps = [];
  for (let m = 0; m <= maxMarks; m += 0.5) steps.push(m);
  return steps;
};

// ════════════════════════════════════════════════════════════════════════
// Heatmap Cell (Grid mode)
// ════════════════════════════════════════════════════════════════════════

const HeatmapCell = ({ ev, q, density, onClick, approved, dimmed, highlighted }) => {
  const size = density === "compact" ? "h-11 w-11 sm:h-7 sm:w-7" : "h-11 w-11 sm:h-10 sm:w-10";
  const status = getMarkStatus(q, ev, ev ? (ev.teacherMark ?? ev.aiMark) : null);
  const meta = status ? STATUS_META[status] : null;
  return (
    <button
      onClick={onClick}
      data-testid={`cell-${q.id}`}
      className={`${size} rounded-md border flex items-center justify-center transition-all relative ${meta ? `${meta.bg} ${meta.border} hover:brightness-95` : "bg-stone-100 border-stone-200"} ${dimmed ? "opacity-30" : ""} ${highlighted ? "ring-2 ring-blue-700 ring-offset-1" : ""}`}
      title={`Q${q.number} · ${ev?.aiMark}/${q.maxMarks} · ${ev?.confidenceScore}% AI confidence`}
    >
      {status && <StatusIcon status={status} size={11} />}
      {approved && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center">
          <Check size={7} strokeWidth={4} className="text-white" />
        </span>
      )}
    </button>
  );
};

// ════════════════════════════════════════════════════════════════════════
// Borderline pill
// ════════════════════════════════════════════════════════════════════════

const BorderlineBadge = ({ ctx }) => {
  if (!ctx.isBorderline && !ctx.isFailing) return null;
  if (ctx.isFailing) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700">Below pass</span>;
  }
  if (ctx.isBorderlinePass && ctx.distToPass >= 0) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">+{ctx.distToPass} from pass</span>;
  }
  if (ctx.isBorderlineGrade) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">−{ctx.distToNext} from {ctx.nextGrade.grade}</span>;
  }
  return null;
};

// ════════════════════════════════════════════════════════════════════════
// Expanded paper view (Grid mode)
// ════════════════════════════════════════════════════════════════════════

const ExpandedPaper = ({ student, evals, totals, onPillClick, onWalkAi, t, CHAPTERS, getApproved }) => {
  const ctx = getGradeContext(totals.total);
  const needsReviewIds = evals.filter((e) => e.needsReview).map((e) => e.qId);
  const reviewedCount = evals.filter((e) => getApproved(student.id, e.qId)).length;

  return (
    <div className="bg-stone-50/80 border-l-2 border-blue-700 p-5 animate-fade-in" data-testid={`expanded-${student.id}`}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="text-xs font-semibold tracking-wider uppercase text-stone-500">Full paper · {evals.length} questions</div>
        <span className="text-stone-300">·</span>
        <div className="text-xs text-stone-600">{reviewedCount}/{evals.length} reviewed</div>
        {needsReviewIds.length > 0 && (
          <>
            <span className="text-stone-300">·</span>
            <span className="text-xs font-semibold text-yellow-800">{needsReviewIds.length} need attention</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {evals.map((ev) => {
          const q = QUESTIONS.find((x) => x.id === ev.qId);
          if (!q) return null;
          const isApproved = getApproved(student.id, ev.qId);
          const status = getMarkStatus(q, ev, ev.teacherMark ?? ev.aiMark);
          const meta = STATUS_META[status];
          return (
            <button
              key={ev.qId}
              onClick={() => onPillClick(ev.qId)}
              data-testid={`pill-${student.id}-${ev.qId}`}
              className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:-translate-y-0.5 ${meta.bg} ${meta.border} ${meta.text}`}
            >
              <span className="font-mono">Q{q.number}</span>
              <span className="opacity-70">{ev.teacherMark ?? ev.aiMark}/{q.maxMarks}</span>
              <StatusIcon status={status} size={11} />
              {isApproved && <Check size={11} className="text-emerald-700" />}
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-3 flex-wrap p-3 rounded-lg bg-white border border-stone-200">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Sparkles size={15} className="text-blue-800 shrink-0 mt-0.5" />
          <div className="text-sm text-stone-700 leading-relaxed flex-1">
            {needsReviewIds.length > 0 ? (
              <>
                <span className="font-semibold text-stone-900">AI suggests starting with: </span>
                {needsReviewIds.map((id) => {
                  const q = QUESTIONS.find((x) => x.id === id);
                  return q ? `Q${q.number}` : null;
                }).join(" · ")}
              </>
            ) : (
              <span className="text-stone-500">AI is confident on all answers. Spot-check anything you like.</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-stone-600">
            <span className="font-semibold text-stone-900">{totals.total.toFixed(1)}/{totals.totalMax}</span> · {ctx.currentGrade.grade}
            {ctx.nextGrade && ctx.distToNext !== null && ctx.distToNext <= 4 && (
              <span className="ml-1.5 text-amber-800 font-medium">({ctx.distToNext} from {ctx.nextGrade.grade})</span>
            )}
          </div>
          {needsReviewIds.length > 0 && (
            <button
              onClick={() => onWalkAi(needsReviewIds)}
              data-testid={`btn-walk-ai-${student.id}`}
              className="inline-flex items-center gap-1.5 h-11 px-3 rounded-lg bg-blue-800 text-white hover:bg-blue-900 text-xs font-semibold"
            >
              <Wand2 size={13} /> Walk through {needsReviewIds.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

let QUESTIONS = [];

// ════════════════════════════════════════════════════════════════════════
// Review Drawer (Grid mode — focused single question)
// ════════════════════════════════════════════════════════════════════════

const ReviewDrawer = ({ open, student, qId, queue, queueIdx, marks, onMarkChange, onApprove, onNav, onClose, evals, CHAPTERS, t }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "a" || e.key === "A") { e.preventDefault(); onApprove(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); onNav(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); onNav(-1); }
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onApprove, onNav]);

  if (!open || !student || !qId) return null;

  const q = QUESTIONS.find((x) => x.id === qId);
  const studentEvals = evals?.[student.id] || [];
  const ev = studentEvals.find((e) => e.qId === qId);
  if (!q || !ev) return null;

  const currentMark = marks[`${student.id}-${qId}`] ?? ev.teacherMark ?? ev.aiMark;
  const overridden = currentMark !== ev.aiMark;
  const queueLen = queue?.length || 0;
  const inQueueMode = queueLen > 0 && queueIdx !== null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm animate-fade-in" onClick={onClose} data-testid="drawer-backdrop" />
      <aside
        data-testid="review-drawer"
        className="fixed top-0 right-0 z-50 h-screen w-full sm:w-[540px] bg-white border-l border-stone-200 shadow-2xl flex flex-col animate-slide-in-right"
      >
        <div className="px-5 py-3 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <User size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-stone-900 truncate">{student.name}</div>
            <div className="text-[11px] text-stone-500">Roll {student.roll} · Q{q.number} · {q.section} section</div>
          </div>
          {inQueueMode && (
            <div className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-1 rounded">
              {queueIdx + 1} / {queueLen}
            </div>
          )}
          <button onClick={onClose} data-testid="drawer-close" className="h-11 w-11 rounded-lg hover:bg-stone-200 text-stone-600 flex items-center justify-center">
            <X size={15} />
          </button>
        </div>

        {inQueueMode && (
          <div className="h-1 bg-stone-100">
            <div className="h-full bg-blue-700 transition-[width]" style={{ width: `${((queueIdx + 1) / queueLen) * 100}%` }} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
          {student.imageUrls?.length > 0 && (
            <div className="rounded-lg border border-stone-200 overflow-hidden bg-stone-50">
              <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 px-3 py-1.5 border-b border-stone-200 bg-stone-100">
                Answer sheet
              </div>
              <div className="max-h-64 overflow-y-auto">
                {student.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt={`${student.name} answer sheet ${i + 1}`} className="w-full object-contain" loading="lazy" />
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="text-[11px] font-bold tracking-wider uppercase text-stone-500">Question · Max {q.maxMarks} {q.maxMarks === 1 ? "mark" : "marks"}</div>
              {ev.needsReview ? (
                <StatusChip status="review" showLabel />
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 text-[11px] font-semibold">
                  <Check size={11} /> {ev.confidenceScore}% confident
                </span>
              )}
            </div>
            <h3 className="font-display text-lg font-semibold text-stone-900 leading-snug">{q.text}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chapterChip(q.chapter, CHAPTERS)}
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-semibold">{q.concept}</span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px]">{q.skill}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
              <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 mb-1">Student answer</div>
              <div className="text-sm text-stone-800 leading-relaxed">{ev.studentAnswer}</div>
            </div>
            <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-3">
              <div className="text-[10px] font-bold tracking-wider uppercase text-blue-700 mb-1">Expected answer</div>
              <div className="text-sm text-stone-800 leading-relaxed">{q.correctAnswer || q.expected}</div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50/30 border border-blue-100 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={13} className="text-blue-800" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-700">AI reasoning</span>
            </div>
            <div className="text-sm text-stone-700 leading-relaxed">{ev.reasoning}</div>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 mb-1.5">AI suggested</div>
                <div className="font-display text-2xl font-semibold text-stone-700 tabular-nums">{ev.aiMark}<span className="text-base text-stone-400 font-normal"> / {q.maxMarks}</span></div>
              </div>
              <div className="h-12 w-px bg-stone-200" />
              <div>
                <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 mb-1.5">Your mark</div>
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="number" min={0} max={q.maxMarks} step={0.5}
                    value={currentMark}
                    onChange={(e) => onMarkChange(parseFloat(e.target.value || 0))}
                    data-testid="drawer-mark-input"
                    className={`h-12 w-24 px-3 rounded-lg border text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-800 ${overridden ? "border-blue-300 bg-blue-50 text-blue-900" : "border-stone-300 bg-white text-stone-900"}`}
                  />
                  <span className="text-stone-500">/ {q.maxMarks}</span>
                  {overridden && (
                    <button onClick={() => onMarkChange(ev.aiMark)} data-testid="drawer-reset" className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2">reset</button>
                  )}
                </div>
              </div>
            </div>
            {overridden && (
              <div className="mt-3">
                <StatusChip status="overridden" showLabel={false} />
                <span className="ml-1.5 text-xs text-stone-500">AI {ev.aiMark} → You {currentMark}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-stone-200 bg-stone-50 px-5 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <button onClick={() => onNav(-1)} disabled={!inQueueMode || queueIdx === 0} data-testid="drawer-prev" className="h-11 w-11 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center">
              <ChevronLeft size={18} />
            </button>
            <button onClick={onApprove} data-testid="drawer-approve" className="flex-1 h-11 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition">
              <Check size={18} /> Approve
            </button>
            <button onClick={() => onNav(1)} disabled={!inQueueMode || queueIdx === queueLen - 1} data-testid="drawer-next" className="h-11 w-11 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="text-[10px] text-stone-500 flex items-center gap-2 flex-wrap">
            <Keyboard size={11} />
            <span><kbd className="px-1 py-0.5 rounded border border-stone-300 bg-white font-mono">A</kbd> approve</span>
            <span><kbd className="px-1 py-0.5 rounded border border-stone-300 bg-white font-mono">→</kbd> next</span>
            <span><kbd className="px-1 py-0.5 rounded border border-stone-300 bg-white font-mono">←</kbd> prev</span>
            <span><kbd className="px-1 py-0.5 rounded border border-stone-300 bg-white font-mono">E</kbd> edit</span>
            <span><kbd className="px-1 py-0.5 rounded border border-stone-300 bg-white font-mono">Esc</kbd> close</span>
          </div>
        </div>
      </aside>
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════
// Queue Card (Queue mode — the trust moment)
// ════════════════════════════════════════════════════════════════════════

const QueueCard = ({ item, index, total, mark, isActive, isDone, onMarkChange, onApprove, onSkip, cardRef, CHAPTERS }) => {
  const { student, q, ev } = item;
  const overridden = mark !== ev.aiMark;
  const steps = q.maxMarks <= 2 ? markSteps(q.maxMarks) : null;

  return (
    <div
      ref={cardRef}
      data-testid={`queue-card-${student.id}-${q.id}`}
      className={`bg-white border rounded-xl p-5 transition-all ${isActive ? "border-blue-300 shadow-md ring-1 ring-blue-100" : "border-stone-200"} ${isDone ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-stone-100">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-stone-900 truncate">{student.name} · Roll {student.roll}</div>
          <div className="text-xs text-stone-500 mt-0.5">Q{q.number} · {q.maxMarks} {q.maxMarks === 1 ? "mark" : "marks"}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDone ? (
            <StatusChip status="overridden" showLabel={false} className={overridden ? "" : "hidden"} />
          ) : (
            <StatusChip status="review" showLabel />
          )}
          <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded whitespace-nowrap">{index + 1} of {total}</span>
        </div>
      </div>

      <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 mb-1">Question</div>
      <div className="text-sm text-stone-900 font-medium mb-3">{q.text}</div>

      {student.imageUrls?.length > 0 ? (
        <div className="mb-3 rounded-lg border border-stone-200 overflow-hidden bg-stone-50">
          <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 px-3 py-1.5 border-b border-stone-200 bg-stone-100 flex items-center justify-between">
            <span>Student answer sheet</span>
            <span className="text-stone-400 normal-case font-normal">no per-question crop yet — look for Q{q.number}</span>
          </div>
          <img src={student.imageUrls[0]} alt={`${student.name} answer sheet`} className="w-full max-h-56 object-contain" loading="lazy" />
        </div>
      ) : null}
      <div className="mb-3 rounded-lg bg-stone-50 border border-stone-200 p-3">
        <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 mb-1">Student answer (transcribed)</div>
        <div className="text-sm text-stone-800 leading-relaxed">{ev.studentAnswer}</div>
      </div>

      <div className="mb-4 rounded-lg bg-blue-50/40 border border-blue-100 p-3">
        <div className="flex items-baseline gap-1.5 mb-1">
          <Sparkles size={13} className="text-blue-800 shrink-0 relative top-0.5" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-stone-700">AI mark {ev.aiMark} / {q.maxMarks}</span>
        </div>
        <div className="text-sm text-stone-700 leading-relaxed">"{ev.reasoning}"</div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 mb-1.5">Your mark</div>
          {steps ? (
            <div className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              {steps.map((s) => (
                <button
                  key={s}
                  onClick={() => onMarkChange(s)}
                  className={`h-10 px-3.5 text-sm font-semibold transition-colors ${mark === s ? "bg-blue-800 text-white" : "bg-white text-stone-700 hover:bg-stone-50"} ${s !== 0 ? "border-l border-stone-300" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={q.maxMarks} step={0.5}
                value={mark}
                onChange={(e) => onMarkChange(parseFloat(e.target.value || 0))}
                className={`h-10 w-20 px-2 rounded-lg border text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-800 ${overridden ? "border-blue-300 bg-blue-50 text-blue-900" : "border-stone-300 bg-white text-stone-900"}`}
              />
              <span className="text-stone-500 text-sm">/ {q.maxMarks}</span>
            </div>
          )}
          {overridden && <div className="mt-1.5 text-[11px] text-blue-800 font-medium">AI {ev.aiMark} → You {mark}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSkip} className="h-11 px-4 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 text-sm font-medium">Skip</button>
          <button onClick={onApprove} className="h-11 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition">
            <Check size={16} /> {overridden ? `Save override → ${mark}` : `Approve ${mark}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════
// MAIN REVIEW PAGE
// ════════════════════════════════════════════════════════════════════════

const ReviewPage = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: ASSESSMENTS = [] } = useQuery({ queryKey: ['assessments'], queryFn: apiClient.getAssessments });
  const assessment = ASSESSMENTS.find((a) => a.id === id) || ASSESSMENTS[0] || { name: "", class: "", subject: "" };

  const { data: allQuestions = [], isLoading: loadingQ } = useQuery({ queryKey: ['questions', id], queryFn: () => apiClient.getQuestions(id) });
  const { data: CHAPTERS = {} } = useQuery({ queryKey: ['chapters', id], queryFn: () => apiClient.getChapters(id) });
  const { data: STUDENTS = [], isLoading: loadingS } = useQuery({ queryKey: ['students', id], queryFn: () => apiClient.getStudents(id) });

  QUESTIONS = allQuestions;

  // Batch-fetch evaluations for all students
  const [allEvals, setAllEvals] = useState({});
  const [loadingEvals, setLoadingEvals] = useState(false);

  useEffect(() => {
    if (!STUDENTS.length) return;
    let cancelled = false;
    setLoadingEvals(true);
    Promise.all(
      STUDENTS.map((s) =>
        apiClient.getEvaluations(id, s.id).then((evals) => ({ studentId: s.id, evals: evals || [] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      results.forEach((r) => { map[r.studentId] = r.evals; });
      setAllEvals(map);
      setLoadingEvals(false);
    });
    return () => { cancelled = true; };
  }, [id, STUDENTS]);

  // Mode: queue (default, trust moment) or grid (power users)
  const [mode, setMode] = useState("queue");

  // State
  const [filter, setFilter] = useState("review");
  const [search, setSearch] = useState("");
  const [questionFilter, setQuestionFilter] = useState(null);
  const [density, setDensity] = useState("compact");
  const [expanded, setExpanded] = useState({});
  const [marks, setMarks] = useState({});
  const [approved, setApproved] = useState({});
  const [confirmApproveAll, setConfirmApproveAll] = useState(false);

  // Grid drawer state
  const [drawer, setDrawer] = useState(null);

  // Queue active card
  const [activeIdx, setActiveIdx] = useState(0);
  const queueContainerRef = useRef(null);
  const cardRefs = useRef({});

  // Mutations
  const updateOverrideMutation = useMutation({
    mutationFn: ({ studentId, qid, mark }) => apiClient.updateEvaluationOverride(id, studentId, qid, mark),
    onSuccess: (_data, vars) => queryClient.invalidateQueries(['evaluations', id, vars.studentId])
  });

  const approveHighMutation = useMutation({
    mutationFn: () => apiClient.approveAllHigh(id),
    onSuccess: () => { /* batch approve already handled locally */ }
  });

  // Helpers
  const getApproved = useCallback((sid, qid) => !!approved[`${sid}-${qid}`], [approved]);
  const setApprovedKey = useCallback((sid, qid, val = true) => setApproved((p) => ({ ...p, [`${sid}-${qid}`]: val })), []);
  const getMark = useCallback((sid, qid, fallback) => marks[`${sid}-${qid}`] ?? fallback, [marks]);

  // Derived: totals + grade context per student
  const totalMax = allQuestions.reduce((s, q) => s + q.maxMarks, 0);
  const studentTotals = useMemo(() => {
    return STUDENTS.reduce((acc, s) => {
      const evals = allEvals[s.id] || [];
      const total = evals.reduce((sum, e) => sum + getMark(s.id, e.qId, e.teacherMark ?? e.aiMark), 0);
      acc[s.id] = { total, totalMax, ctx: getGradeContext(total) };
      return acc;
    }, {});
  }, [STUDENTS, allEvals, totalMax, getMark]);

  // Filtering (Grid mode student list)
  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return STUDENTS.filter((s) => {
      if (lower && !s.name.toLowerCase().includes(lower) && !(s.roll || "").toLowerCase().includes(lower)) return false;
      return true;
    });
  }, [search, STUDENTS]);

  // AI Summary stats
  const stats = useMemo(() => {
    const needsReview = STUDENTS.flatMap((s) => (allEvals[s.id] || []).filter((e) => e.needsReview && !getApproved(s.id, e.qId)).map(() => s.id));
    const reviewItems = needsReview.length;
    const reviewPapers = new Set(needsReview).size;
    const borderline = STUDENTS.filter((s) => studentTotals[s.id]?.ctx.isBorderline).length;
    const failing = STUDENTS.filter((s) => studentTotals[s.id]?.ctx.isFailing).length;
    const patterns = allQuestions.map((q) => {
      const struggled = STUDENTS.filter((s) => {
        const ev = (allEvals[s.id] || []).find((e) => e.qId === q.id);
        return ev?.needsReview;
      });
      return { q, count: struggled.length };
    }).filter((x) => x.count >= 3).sort((a, b) => b.count - a.count);
    return { reviewItems, reviewPapers, borderline, failing, patterns };
  }, [studentTotals, STUDENTS, allEvals, allQuestions, getApproved]);

  // ── Queue items: fixed order per filter, items stay in place once approved ──
  const queueItems = useMemo(() => {
    const items = [];
    STUDENTS.forEach((s) => {
      const evals = allEvals[s.id] || [];
      const ctx = studentTotals[s.id]?.ctx;
      evals.forEach((ev) => {
        const q = allQuestions.find((x) => x.id === ev.qId);
        if (!q) return;
        let include;
        if (filter === "review") include = ev.needsReview;
        else if (filter === "borderline") include = !!ctx?.isBorderline;
        else if (filter === "failed") include = !!ctx?.isFailing;
        else include = true;
        if (include) items.push({ student: s, q, ev });
      });
    });
    return items;
  }, [STUDENTS, allEvals, allQuestions, studentTotals, filter]);

  const filterCounts = useMemo(() => {
    const count = (predicate) => {
      let n = 0;
      STUDENTS.forEach((s) => {
        const evals = allEvals[s.id] || [];
        const ctx = studentTotals[s.id]?.ctx;
        evals.forEach((ev) => { if (predicate(ev, ctx)) n++; });
      });
      return n;
    };
    return {
      review: count((ev) => ev.needsReview),
      borderline: count((_ev, ctx) => !!ctx?.isBorderline),
      failed: count((_ev, ctx) => !!ctx?.isFailing),
      all: count(() => true),
    };
  }, [STUDENTS, allEvals, studentTotals]);

  const remainingInQueue = queueItems.filter((it) => !getApproved(it.student.id, it.q.id));

  // Reset active card when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [filter]);

  const scrollToCard = (item) => {
    const key = `${item.student.id}-${item.q.id}`;
    const el = cardRefs.current[key];
    const container = queueContainerRef.current;
    if (el && container) {
      container.scrollTop = el.offsetTop - container.offsetTop - 8;
    }
  };

  const advanceQueue = (fromIdx) => {
    const next = queueItems.findIndex((it, i) => i > fromIdx && !getApproved(it.student.id, it.q.id));
    const target = next >= 0 ? next : Math.min(fromIdx + 1, queueItems.length - 1);
    setActiveIdx(target);
    const item = queueItems[target];
    if (item) requestAnimationFrame(() => scrollToCard(item));
  };

  const queueMarkChange = (item, val) => {
    setMarks((m) => ({ ...m, [`${item.student.id}-${item.q.id}`]: val }));
  };

  const queueApprove = (item, idx) => {
    const mark = getMark(item.student.id, item.q.id, item.ev.teacherMark ?? item.ev.aiMark);
    setApprovedKey(item.student.id, item.q.id, true);
    updateOverrideMutation.mutate({ studentId: item.student.id, qid: item.q.id, mark });
    toast.success("Approved", { duration: 700 });
    advanceQueue(idx);
  };

  const queueSkip = (idx) => advanceQueue(idx);

  // Keyboard shortcuts for the active queue card
  useEffect(() => {
    if (mode !== "queue") return;
    const item = queueItems[activeIdx];
    if (!item) return;
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const mark = getMark(item.student.id, item.q.id, item.ev.teacherMark ?? item.ev.aiMark);
      if (e.key === "Enter") { e.preventDefault(); queueApprove(item, activeIdx); }
      else if (e.key === "ArrowRight") { e.preventDefault(); advanceQueue(activeIdx); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
      else if (["1", "2", "3"].includes(e.key) && item.q.maxMarks <= 2) {
        e.preventDefault();
        const steps = markSteps(item.q.maxMarks);
        const idx = parseInt(e.key, 10) - 1;
        if (steps[idx] !== undefined) queueMarkChange(item, steps[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeIdx, queueItems, marks, approved]);

  // ── Drawer (Grid mode) ──
  const openCellDrawer = (studentId, qId, queue = null) => {
    const queueIdx = queue ? queue.indexOf(qId) : null;
    setDrawer({ studentId, qId, queue, queueIdx });
  };

  const closeDrawer = () => setDrawer(null);

  const drawerApprove = () => {
    if (!drawer) return;
    const mark = marks[`${drawer.studentId}-${drawer.qId}`];
    setApprovedKey(drawer.studentId, drawer.qId, true);
    updateOverrideMutation.mutate({ studentId: drawer.studentId, qid: drawer.qId, mark });
    toast.success("Approved", { duration: 700 });
    if (drawer.queue && drawer.queueIdx !== null && drawer.queueIdx < drawer.queue.length - 1) {
      const nextIdx = drawer.queueIdx + 1;
      setDrawer((d) => ({ ...d, qId: d.queue[nextIdx], queueIdx: nextIdx }));
    } else if (drawer.queue && drawer.queueIdx === drawer.queue.length - 1) {
      toast.success("All done in this batch!", { duration: 1400 });
      setTimeout(closeDrawer, 400);
    }
  };

  const drawerNav = (delta) => {
    if (!drawer?.queue) return;
    const next = drawer.queueIdx + delta;
    if (next < 0 || next >= drawer.queue.length) return;
    setDrawer((d) => ({ ...d, qId: d.queue[next], queueIdx: next }));
  };

  const drawerMarkChange = (val) => {
    if (!drawer) return;
    setMarks((m) => ({ ...m, [`${drawer.studentId}-${drawer.qId}`]: val }));
  };

  // ── Bulk approve high-confidence ──
  const approveAllHighConf = () => {
    const updates = {};
    let count = 0;
    STUDENTS.forEach((s) => {
      (allEvals[s.id] || []).forEach((e) => {
        if (!e.needsReview && !approved[`${s.id}-${e.qId}`]) {
          updates[`${s.id}-${e.qId}`] = true;
          count++;
        }
      });
    });
    setApproved((p) => ({ ...p, ...updates }));
    approveHighMutation.mutate();
    toast.success(`Approved ${count} high-confidence answers`);
  };

  const confidentCount = useMemo(() => {
    let n = 0;
    STUDENTS.forEach((s) => {
      (allEvals[s.id] || []).forEach((e) => {
        if (!e.needsReview && !approved[`${s.id}-${e.qId}`]) n++;
      });
    });
    return n;
  }, [STUDENTS, allEvals, approved]);

  // ── Overall progress ──
  const totalAnswers = STUDENTS.length * allQuestions.length;
  const totalApproved = Object.values(approved).filter(Boolean).length;
  const overallProgress = totalAnswers > 0 ? (totalApproved / totalAnswers) * 100 : 0;

  // Drawer student object
  const drawerStudent = drawer ? STUDENTS.find((s) => s.id === drawer.studentId) : null;

  if (loadingQ || loadingS) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-800" size={32} /></div>;
  }

  const allCaughtUp = stats.reviewItems === 0;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6 pb-28" data-testid="review-page">
      <Breadcrumbs items={[
        { label: t("assessments"), to: `/analysis/${id}` },
        { label: assessment.name, to: `/insights/${id}` },
        { label: t("reviewOverride") },
      ]} />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">{assessment.name}</div>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-semibold text-stone-900">{t("reviewOverride")}</h1>
          <div className="mt-1 text-sm text-stone-500">{assessment.class} · {assessment.subject} · {STUDENTS.length} papers · {allQuestions.length} questions each</div>
          <div className="mt-2 text-sm font-semibold text-stone-800">
            {stats.reviewItems > 0 ? <><span className="text-yellow-800">{stats.reviewItems}</span> {t("marksNeedReview")}</> : t("noMarksNeedReview")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-stone-100 rounded-lg p-0.5" data-testid="mode-toggle">
            <button onClick={() => setMode("queue")} data-testid="mode-queue" className={`h-10 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 ${mode === "queue" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>
              <ListChecks size={13} /> {t("queueMode")}
            </button>
            <button onClick={() => setMode("grid")} data-testid="mode-grid" className={`h-10 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 ${mode === "grid" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>
              <LayoutGrid size={13} /> {t("gridMode")}
            </button>
          </div>
          <button onClick={() => setConfirmApproveAll(true)} data-testid="btn-approve-all-high" className="h-11 px-4 rounded-lg bg-blue-800 text-white hover:bg-blue-900 text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <Wand2 size={14} /> {t("approveAllConfident")}
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1 flex-wrap mb-4">
        {[
          { id: "review", label: t("needsReviewFilter"), count: filterCounts.review, accent: "yellow" },
          { id: "borderline", label: t("borderlineFilter"), count: filterCounts.borderline, accent: "amber" },
          { id: "failed", label: t("belowPassFilter"), count: filterCounts.failed, accent: "rose" },
          { id: "all", label: t("allFilter"), count: filterCounts.all },
        ].map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              data-testid={`filter-${f.id}`}
              className={`h-11 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
              }`}
            >
              {f.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                active ? "bg-white/20 text-white" :
                f.accent === "yellow" ? "bg-yellow-100 text-yellow-800" :
                f.accent === "amber" ? "bg-amber-100 text-amber-800" :
                f.accent === "rose" ? "bg-red-50 text-red-700" :
                "bg-stone-200 text-stone-700"
              }`}>{f.count}</span>
            </button>
          );
        })}
      </div>

      {mode === "queue" ? (
        remainingInQueue.length === 0 && filter === "review" ? (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center" data-testid="queue-empty-state">
            <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <Check size={26} />
            </div>
            <div className="font-display text-xl font-semibold text-stone-900">{t("allCaughtUp")}. {totalApproved} marks reviewed.</div>
            <button onClick={() => navigate(`/insights/${id}`)} data-testid="btn-finalize" className="mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-medium shadow-sm">
              {t("finalizeInsights")} <ArrowRight size={16} />
            </button>
          </div>
        ) : queueItems.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-12 text-center text-stone-500">
            Nothing here — try a different filter.
          </div>
        ) : (
          <div ref={queueContainerRef} className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin pr-1" data-testid="queue-list">
            {queueItems.map((item, idx) => {
              const key = `${item.student.id}-${item.q.id}`;
              const isDone = getApproved(item.student.id, item.q.id);
              const mark = getMark(item.student.id, item.q.id, item.ev.teacherMark ?? item.ev.aiMark);
              return (
                <QueueCard
                  key={key}
                  item={item}
                  index={idx}
                  total={queueItems.length}
                  mark={mark}
                  isActive={idx === activeIdx}
                  isDone={isDone}
                  onMarkChange={(val) => queueMarkChange(item, val)}
                  onApprove={() => queueApprove(item, idx)}
                  onSkip={() => queueSkip(idx)}
                  cardRef={(el) => { cardRefs.current[key] = el; }}
                  CHAPTERS={CHAPTERS}
                />
              );
            })}
          </div>
        )
      ) : (
        <>
          {/* Toolbar */}
          <div className="bg-white border border-stone-200 rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student name or roll…"
                data-testid="search-input"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            </div>
            <div className="inline-flex bg-stone-100 rounded-lg p-0.5" data-testid="density-toggle">
              <button onClick={() => setDensity("compact")} data-testid="density-compact" className={`h-10 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 ${density === "compact" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>
                <Minimize2 size={12} /> Compact
              </button>
              <button onClick={() => setDensity("detail")} data-testid="density-detail" className={`h-10 px-2.5 rounded-md text-xs font-medium inline-flex items-center gap-1 ${density === "detail" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600"}`}>
                <Maximize2 size={12} /> Detail
              </button>
            </div>
          </div>

          {/* Heatmap table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden" data-testid="heatmap-table">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-stone-200 bg-stone-50 sticky top-0 z-10">
              <div className="w-28 xs:w-36 sm:w-48 lg:w-56 text-[10px] font-bold tracking-wider uppercase text-stone-500 shrink-0">Student</div>
              <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${allQuestions.length}, minmax(${density === "compact" ? "28px" : "40px"}, 1fr))` }}>
                  {allQuestions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setQuestionFilter(questionFilter === q.id ? null : q.id)}
                      data-testid={`col-header-${q.id}`}
                      className={`text-center text-[10px] font-mono rounded transition-colors py-1 ${
                        questionFilter === q.id ? "bg-blue-800 text-white font-bold" : "text-stone-500 hover:bg-stone-200"
                      }`}
                      title={q.text}
                    >
                      Q{q.number}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-24 xs:w-32 sm:w-44 shrink-0 text-right text-[10px] font-bold tracking-wider uppercase text-stone-500">Total · Grade</div>
            </div>

            <div className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-stone-500">
                  <Search size={24} className="mx-auto mb-2 text-stone-400" />
                  <div className="font-medium">No students match your search</div>
                </div>
              ) : filtered.map((s) => {
                const evals = allEvals[s.id] || [];
                const totals = studentTotals[s.id] || { total: 0, totalMax, ctx: getGradeContext(0) };
                const ctx = totals.ctx;
                const isExpanded = !!expanded[s.id];
                const needsReviewIds = evals.filter((e) => e.needsReview).map((e) => e.qId);
                const pct = totalMax > 0 ? (totals.total / totalMax) * 100 : 0;

                return (
                  <div key={s.id} data-testid={`row-${s.id}`} className={ctx?.isBorderline ? "border-l-2 border-amber-500" : ctx?.isFailing ? "border-l-2 border-red-500" : "border-l-2 border-transparent"}>
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50/60">
                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }))}
                        data-testid={`expand-${s.id}`}
                        className="w-28 xs:w-36 sm:w-48 lg:w-56 flex items-center gap-2 shrink-0 text-left group"
                      >
                        <ChevronRight size={14} className={`text-stone-400 transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                        {(ctx?.isBorderline || ctx?.isFailing) && (
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ctx.isFailing ? "bg-red-600" : "bg-amber-500"}`} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-stone-900 truncate group-hover:text-blue-800">{s.name}</div>
                          <div className="text-[10px] text-stone-500">Roll {s.roll}</div>
                        </div>
                      </button>

                      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${allQuestions.length}, minmax(${density === "compact" ? "28px" : "40px"}, 1fr))` }}>
                          {allQuestions.map((q) => {
                            const ev = evals.find((e) => e.qId === q.id);
                            return (
                              <HeatmapCell
                                key={q.id}
                                q={q}
                                ev={ev}
                                density={density}
                                onClick={() => openCellDrawer(s.id, q.id)}
                                approved={getApproved(s.id, q.id)}
                                highlighted={questionFilter === q.id}
                                dimmed={questionFilter !== null && questionFilter !== q.id}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="w-24 xs:w-32 sm:w-44 shrink-0 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="font-display text-base font-semibold text-stone-900 tabular-nums">{totals.total.toFixed(1)}<span className="text-stone-400 text-xs font-normal">/{totals.totalMax}</span></div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ctx?.currentGrade?.color === "emerald" ? "bg-emerald-100 text-emerald-800" :
                            ctx?.currentGrade?.color === "blue" ? "bg-blue-100 text-blue-800" :
                            ctx?.currentGrade?.color === "amber" ? "bg-amber-100 text-amber-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>{ctx?.currentGrade?.grade || "—"}</span>
                        </div>
                        <div className="mt-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full ${pct >= 80 ? "bg-emerald-600" : pct >= 65 ? "bg-blue-700" : pct >= 50 ? "bg-amber-500" : "bg-rose-600"} animate-grow-bar`} style={{ width: `${pct}%`, animationDelay: "100ms" }} />
                        </div>
                        <div className="mt-0.5 flex items-center justify-end gap-1.5">
                          <BorderlineBadge ctx={ctx || {}} />
                          {needsReviewIds.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800">{needsReviewIds.length} ⚠</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <ExpandedPaper
                        student={s}
                        evals={evals}
                        totals={totals}
                        onPillClick={(qId) => openCellDrawer(s.id, qId)}
                        onWalkAi={(queue) => openCellDrawer(s.id, queue[0], queue)}
                        t={t}
                        CHAPTERS={CHAPTERS}
                        getApproved={getApproved}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 flex-wrap text-xs text-stone-600">
            <span className="font-semibold text-stone-700">Legend:</span>
            <span className="inline-flex items-center gap-1.5"><StatusChip status="correct" showLabel /></span>
            <span className="inline-flex items-center gap-1.5"><StatusChip status="partial" showLabel /></span>
            <span className="inline-flex items-center gap-1.5"><StatusChip status="review" showLabel /></span>
            <span className="inline-flex items-center gap-1.5"><StatusChip status="wrong" showLabel /></span>
            <span className="inline-flex items-center gap-1.5"><StatusChip status="overridden" showLabel /></span>
          </div>
        </>
      )}

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-stone-200 lg:left-[260px] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-xs text-stone-500 shrink-0">Review progress</div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden flex-1 max-w-md">
              <div className="h-full bg-blue-700 transition-[width] duration-300" style={{ width: `${overallProgress}%` }} />
            </div>
            <div className="text-xs font-semibold text-stone-700 whitespace-nowrap tabular-nums">{totalApproved}/{totalAnswers} · {Math.round(overallProgress)}%</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              const entries = Object.entries(marks);
              if (!entries.length) { toast.info("No changes to save"); return; }
              Promise.all(
                entries.map(([key, mark]) => {
                  const idx = key.lastIndexOf('-q');
                  if (idx === -1) return Promise.resolve();
                  return updateOverrideMutation.mutateAsync({ studentId: key.slice(0, idx), qid: key.slice(idx + 1), mark });
                })
              ).then(() => {
                queryClient.invalidateQueries(['evaluations', id]);
                toast.success("All changes saved");
              });
            }} data-testid="btn-save" className="h-11 px-4 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium inline-flex items-center gap-2"><Save size={14} /> Save</button>
            <button onClick={() => navigate(`/insights/${id}`)} data-testid="btn-finalize-footer" className="h-11 px-5 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium inline-flex items-center gap-2 shadow-sm">
              {t("finalizeInsights")} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid mode drawer */}
      <ReviewDrawer
        open={!!drawer}
        student={drawerStudent}
        qId={drawer?.qId}
        queue={drawer?.queue}
        queueIdx={drawer?.queueIdx}
        marks={marks}
        onMarkChange={drawerMarkChange}
        onApprove={drawerApprove}
        onNav={drawerNav}
        onClose={closeDrawer}
        evals={allEvals}
        CHAPTERS={CHAPTERS}
        t={t}
      />

      {/* Approve-all confirm sheet */}
      <AlertDialog open={confirmApproveAll} onOpenChange={setConfirmApproveAll}>
        <AlertDialogContent data-testid="approve-all-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {confidentCount} confident marks?</AlertDialogTitle>
            <AlertDialogDescription>
              Approve {confidentCount} confident marks across {STUDENTS.length} papers? You'll still review the {stats.reviewItems} flagged ones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { approveAllHighConf(); setConfirmApproveAll(false); }} data-testid="confirm-approve-all">
              Approve {confidentCount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReviewPage;
