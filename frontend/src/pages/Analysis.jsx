import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Sparkles, ArrowRight, ArrowLeft, Pencil, Check, X, Network, Loader2, ChevronDown, CheckCircle2, ScanLine, ListChecks, BookOpen, Tags, Brain, ClipboardCheck, PenLine } from "lucide-react";

const ANALYZE_MIN_MS = 16000;
const GENERATE_MIN_MS = 13000;

const ANALYZE_STEPS = [
  { label: "Reading the question paper", detail: "Going through each page you uploaded", icon: ScanLine, minMs: 3000 },
  { label: "Finding all questions", detail: "Picking out question numbers, sections, and marks", icon: ListChecks, minMs: 4000 },
  { label: "Matching to your syllabus", detail: "Linking each question to topics and chapters", icon: BookOpen, minMs: 4000 },
  { label: "Understanding what is tested", detail: "Identifying concepts, skills, and difficulty levels", icon: Tags, minMs: 5000 },
];

const GENERATE_STEPS = [
  { label: "Reading each question", detail: "Understanding what students need to answer", icon: Brain, minMs: 3000 },
  { label: "Finding correct answers", detail: "Solving each question accurately", icon: ClipboardCheck, minMs: 5000 },
  { label: "Setting grading guidelines", detail: "Preparing how marks will be awarded", icon: PenLine, minMs: 5000 },
];

const ProgressPanel = ({ title, subtitle, steps, onSkip }) => {
  const [current, setCurrent] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    setCurrent(0);
    setElapsedSec(0);
    const startedAt = Date.now();
    const tick = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 1000);

    const timers = [];
    let accumulated = 0;
    for (let i = 0; i < steps.length - 1; i++) {
      accumulated += steps[i].minMs;
      timers.push(setTimeout(() => setCurrent((c) => Math.max(c, i + 1)), accumulated));
    }
    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
  }, [steps]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 md:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
            <Sparkles size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-stone-900">{title}</h2>
            <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
          </div>
          <div className="text-xs font-mono text-stone-400 shrink-0 pt-1">{elapsedSec}s</div>
        </div>

        <ol className="space-y-3">
          {steps.map((step, i) => {
            const isDone = i < current;
            const isActive = i === current;
            const Icon = step.icon;
            return (
              <li
                key={i}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  isDone ? "bg-emerald-50/60 border-emerald-200" :
                  isActive ? "bg-blue-50 border-blue-200" :
                  "bg-stone-50 border-stone-200 opacity-60"
                }`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isDone ? "bg-emerald-100 text-emerald-700" :
                  isActive ? "bg-blue-100 text-blue-800" :
                  "bg-stone-200 text-stone-400"
                }`}>
                  {isDone ? <Check size={16} /> : isActive ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isDone ? "text-emerald-900" : isActive ? "text-blue-900" : "text-stone-600"}`}>
                    {step.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${isDone ? "text-emerald-700" : isActive ? "text-blue-700" : "text-stone-400"}`}>
                    {step.detail}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-stone-400">This usually takes 15–30 seconds.</p>
          <button onClick={onSkip} className="text-xs text-stone-500 underline hover:text-stone-700">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

const difficultyChip = (d) => {
  const map = {
    Easy: "bg-emerald-50 text-emerald-800",
    Medium: "bg-amber-50 text-amber-800",
    Hard: "bg-rose-50 text-rose-800",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${map[d] || "bg-stone-100 text-stone-700"}`}>{d}</span>;
};

const Analysis = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const { data: QUESTIONS = [], isLoading: loadingQ, refetch: refetchQuestions } = useQuery({
    queryKey: ['questions', id],
    queryFn: () => apiClient.getQuestions(id),
  });

  const { data: ASSESSMENT, isLoading: loadingA } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => apiClient.getAssessment(id),
  });

  const { data: CONCEPT_MAP = [] } = useQuery({
    queryKey: ['concepts', id],
    queryFn: () => apiClient.getConcepts(id),
  });

  const { data: ANSWER_KEY_DATA, refetch: refetchAnswerKey } = useQuery({
    queryKey: ['answerKey', id],
    queryFn: () => apiClient.getAnswerKey(id),
  });

  const answerKey = ANSWER_KEY_DATA?.answerKey || [];

  const uniqueConcepts = useMemo(() => [...new Set(QUESTIONS.map((q) => q.concept).filter(Boolean))], [QUESTIONS]);
  const conceptCount = uniqueConcepts.length;
  const totalMarks = useMemo(() => QUESTIONS.reduce((s, q) => s + (q.maxMarks || 1), 0), [QUESTIONS]);
  const skillCount = useMemo(() => [...new Set(QUESTIONS.map(q => q.skill).filter(Boolean))].length, [QUESTIONS]);
  const [concepts, setConcepts] = useState([]);
  const [newConcept, setNewConcept] = useState("");
  const [editingQ, setEditingQ] = useState(null);
  const [questionEdits, setQuestionEdits] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [approvedAnswers, setApprovedAnswers] = useState({});
  const [expandedAnswers, setExpandedAnswers] = useState({});

  const hasPendingOCR = QUESTIONS.length === 1 && QUESTIONS[0]?.text === "OCR_ANALYSIS_PENDING";

  const hasAnswerKey = answerKey.length > 0;
  const totalApproved = Object.values(approvedAnswers).filter(Boolean).length;
  const allApproved = hasAnswerKey && totalApproved >= answerKey.length;

  const progressTimerRef = useRef(null);

  const handleAnalyzeQPaper = async () => {
    setAnalyzing(true);
    setAnalysisError("");
    const startedAt = Date.now();
    try {
      const r = await fetch(`/api/assessments/${id}/analyze-qpaper`, { method: "POST" });
      const data = await r.json();
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, ANALYZE_MIN_MS - elapsed);
      if (data.status === "ok") {
        progressTimerRef.current = setTimeout(async () => {
          setAnalyzing(false);
          await refetchQuestions();
          await queryClient.invalidateQueries(['concepts', id]);
        }, remaining);
      } else {
        progressTimerRef.current = setTimeout(() => {
          setAnalyzing(false);
          setAnalysisError(data.message || "Analysis failed. Your images are saved — try again.");
          refetchQuestions();
        }, remaining);
      }
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, ANALYZE_MIN_MS - elapsed);
      progressTimerRef.current = setTimeout(() => {
        setAnalyzing(false);
        setAnalysisError("Network error. Check your connection and try again.");
      }, remaining);
    }
  };

  const handleGenerateAnswerKey = async () => {
    setGeneratingKey(true);
    setKeyError("");
    const startedAt = Date.now();
    try {
      const result = await apiClient.generateAnswerKey(id);
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, GENERATE_MIN_MS - elapsed);
      if (result.status === "ok") {
        progressTimerRef.current = setTimeout(async () => {
          setGeneratingKey(false);
          await refetchAnswerKey();
          const ak = result.answerKey || [];
          const initial = {};
          ak.forEach((a) => { initial[a.q] = true; });
          setApprovedAnswers(initial);
        }, remaining);
      } else {
        progressTimerRef.current = setTimeout(() => {
          setGeneratingKey(false);
          setKeyError(result.message || "Answer key generation failed. Try again.");
        }, remaining);
      }
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, GENERATE_MIN_MS - elapsed);
      progressTimerRef.current = setTimeout(() => {
        setGeneratingKey(false);
        setKeyError("Network error generating answer key.");
      }, remaining);
    }
  };

  const toggleApproval = (qNum) => {
    setApprovedAnswers((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  const approveAll = () => {
    const all = {};
    answerKey.forEach((a) => { all[a.q] = true; });
    setApprovedAnswers(all);
  };

  const handleRunEvaluation = () => {
    apiClient.processAssessment(id).catch(() => {});
    navigate(`/processing/${id}`);
  };

  useEffect(() => {
    const t = setTimeout(() => { setAnalyzing(false); setAnalysisError("Analysis timed out. Try again."); }, 45000);
    return () => clearTimeout(t);
  }, [analyzing]);

  useEffect(() => {
    if (QUESTIONS.length > 0 && concepts.length === 0) {
      setConcepts([...new Set(QUESTIONS.map((q) => q.concept).filter(Boolean))]);
    }
  }, [QUESTIONS]);

  useEffect(() => {
    if (hasPendingOCR && !analyzing) {
      handleAnalyzeQPaper();
    }
  }, [hasPendingOCR]);

  // Guard against retry storm: once we've attempted answer-key generation for this
  // assessment, don't auto-retry on the same page mount even if it failed.
  const [answerKeyAttempted, setAnswerKeyAttempted] = useState(false);
  useEffect(() => {
    if (
      QUESTIONS.length > 0 &&
      !hasPendingOCR &&
      !hasAnswerKey &&
      !generatingKey &&
      !analysisError &&
      !keyError &&
      !answerKeyAttempted
    ) {
      setAnswerKeyAttempted(true);
      handleGenerateAnswerKey();
    }
  }, [QUESTIONS.length, hasPendingOCR, hasAnswerKey, generatingKey, analysisError, keyError, answerKeyAttempted]);

  if (analyzing || generatingKey) {
    return (
      <ProgressPanel
        title={analyzing ? "Analyzing your question paper" : "Generating answer key"}
        subtitle={analyzing ? "Let me go through each page you shared and understand the questions" : "Working through each question to prepare the best answers"}
        steps={analyzing ? ANALYZE_STEPS : GENERATE_STEPS}
        onSkip={() => {
          if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
          setAnalyzing(false);
          setGeneratingKey(false);
        }}
      />
    );
  }

  if (analysisError && QUESTIONS.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-red-600">{analysisError}</p>
        <div className="flex gap-2">
          <button onClick={handleAnalyzeQPaper} className="h-9 px-4 rounded-lg bg-blue-800 text-white text-xs font-medium">Retry Analysis</button>
          <button onClick={() => navigate("/dashboard")} className="h-9 px-4 rounded-lg border border-stone-300 text-stone-600 text-xs font-medium">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (loadingQ || loadingA) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-800" size={32} /></div>;
  }

  const updateQuestion = (qId, field, value) => {
    setQuestionEdits((p) => ({ ...p, [qId]: { ...p[qId], [field]: value } }));
  };

  const getQ = (q) => ({ ...q, ...(questionEdits[q.id] || {}) });

  const mcqs = answerKey.filter((a) => (a.type || a.correctOption) === "mcq" || a.correctOption);
  const subjectives = answerKey.filter((a) => !(a.type === "mcq" || a.correctOption));

  const getTypeClass = (ak) => {
    if (ak.type === "mcq" || ak.correctOption) return "A)";
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 md:py-6" data-testid="analysis-page">
      <Breadcrumbs items={[
        { label: t("assessments"), to: "/dashboard" },
        { label: t("analysisTitle") },
      ]} />
      <button onClick={() => navigate("/upload")} data-testid="btn-back-upload" className="mb-2 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft size={14} /> Back to Upload
      </button>

      {/* Compact header — stats & actions */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase text-blue-800">
            <Sparkles size={12} /> {t("aiExtracted")}
          </div>
          <h1 className="font-display text-xl md:text-2xl font-semibold text-stone-900">
            {t("analysisTitle")}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {QUESTIONS.length} questions · {totalMarks} marks · {conceptCount} concepts · {skillCount} skills
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={() => setDetailsOpen((v) => !v)} data-testid="btn-view-details" className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 text-sm font-medium">
            {t("viewDetails")} <ChevronDown size={14} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>
          <button onClick={handleRunEvaluation} disabled={!allApproved} data-testid="btn-run-evaluation" className={`inline-flex items-center gap-2 h-10 px-5 rounded-lg font-medium shadow-sm transition-colors text-sm ${allApproved ? "bg-blue-800 hover:bg-blue-900 text-white" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
            {t("runEvaluation")} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Compact stat cards — always visible at top */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Questions", value: QUESTIONS.length },
          { label: "Marks", value: totalMarks },
          { label: "Skills", value: skillCount },
          { label: "Concepts", value: conceptCount },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-lg px-3 py-2.5 text-center">
            <div className="text-[10px] font-semibold tracking-[0.05em] uppercase text-stone-400">{s.label}</div>
            <div className="font-display text-lg font-semibold text-stone-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* No concepts warning */}
      {conceptCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
          <strong>No concepts detected yet.</strong> Upload a question paper and run AI analysis to extract concepts, skills, and prerequisites.
          {QUESTIONS.length > 0 && !hasPendingOCR && (
            <div className="mt-2 text-xs text-amber-600">Your question paper has been analyzed but concept tagging may not have completed. Try running analysis again.</div>
          )}
        </div>
      )}

      {/* Answer Key */}
      {hasAnswerKey && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-700" />
              <h2 className="font-display text-lg font-semibold text-stone-900">Answer Key (AI Generated)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">{totalApproved}/{answerKey.length} approved</span>
              <button onClick={approveAll} className="text-xs font-medium text-blue-700 hover:text-blue-900">Approve All</button>
              <button onClick={handleGenerateAnswerKey} disabled={generatingKey} className="text-xs font-medium text-stone-500 hover:text-stone-700">
                {generatingKey ? <Loader2 size={12} className="animate-spin inline" /> : "Regenerate"}
              </button>
            </div>
          </div>
          <p className="text-sm text-stone-500 mb-4">Review the AI-generated answers. Tap any answer to approve or reject before running evaluation.</p>

          {mcqs.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wider">Multiple Choice ({mcqs.length} questions, 1 mark each)</div>
              <div className="flex flex-wrap gap-2">
                {mcqs.map((ak) => {
                  const approved = approvedAnswers[ak.q] !== false;
                  return (
                    <button
                      key={ak.q}
                      onClick={() => toggleApproval(ak.q)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${approved ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}
                      title={ak.explanation || `Q${ak.q} — ${approved ? "Approved" : "Rejected"}`}
                    >
                      <span className="text-xs font-mono text-stone-500">Q{ak.q}</span>
                      <span className="font-semibold">{ak.correctOption ? `[${ak.correctOption}]` : "—"}</span>
                      {approved ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-rose-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {subjectives.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wider">Subjective ({subjectives.length} questions)</div>
              <div className="space-y-2">
                {subjectives.map((ak) => {
                  const approved = approvedAnswers[ak.q] !== false;
                  const expanded = !!expandedAnswers[ak.q];
                  return (
                    <div key={ak.q} className={`rounded-lg border p-3 ${approved ? "border-stone-200" : "border-rose-200 bg-rose-50/30"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <button onClick={() => toggleApproval(ak.q)} className="shrink-0 mt-0.5">
                            {approved ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-rose-600" />}
                          </button>
                          <div>
                            <div className="text-xs font-mono text-stone-500">Q{ak.q} ({ak.maxMarks || "?"}M)</div>
                            <div className="text-sm text-stone-800 line-clamp-2">{(ak.correctAnswer || "—").slice(0, 120)}</div>
                          </div>
                        </div>
                        <button onClick={() => setExpandedAnswers(prev => ({ ...prev, [ak.q]: !prev[ak.q] }))} className="shrink-0 text-xs text-stone-500 hover:text-stone-700">
                          {expanded ? "Collapse ▴" : "Expand ▾"}
                        </button>
                      </div>
                      {expanded && (
                        <div className="mt-3 ml-7 p-3 rounded-lg bg-stone-50 border border-stone-200">
                          {ak.explanation && <div className="text-xs text-stone-600 mb-2"><span className="font-semibold">Explanation:</span> {ak.explanation}</div>}
                          {ak.keyPoints?.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs font-semibold text-stone-500 mb-1">Key Points:</div>
                              <ul className="list-disc list-inside text-xs text-stone-600 space-y-0.5">
                                {ak.keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}
                              </ul>
                            </div>
                          )}
                          {ak.markingScheme && <div className="text-xs text-stone-600"><span className="font-semibold">Marking:</span> {ak.markingScheme}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {keyError && <div className="mt-3 text-xs text-rose-600">{keyError}</div>}

          <div className="mt-4 flex items-center justify-between text-xs text-stone-400">
            <span>Answer key generated by DeepSeek AI</span>
            <span className={allApproved ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
              {allApproved ? "All answers approved — ready for evaluation" : `${answerKey.length - totalApproved} answers pending`}
            </span>
          </div>
        </div>
      )}

      {!hasAnswerKey && QUESTIONS.length > 0 && !hasPendingOCR && !generatingKey && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 mb-5 text-center">
          {keyError ? (
            <>
              <div className="flex items-center justify-center gap-2 text-rose-700 mb-3">
                <X size={18} className="text-rose-500" />
                <span className="font-semibold text-sm">Answer key generation failed</span>
              </div>
              <p className="text-sm text-rose-600 mb-4">{keyError}</p>
              <button onClick={handleGenerateAnswerKey} className="h-10 px-4 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900">
                Retry Generation
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 mb-3">Answer key has not been generated yet.</p>
              <button onClick={handleGenerateAnswerKey} className="h-10 px-4 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900">
                Generate Answer Key with AI
              </button>
            </>
          )}
        </div>
      )}

      {/* Question breakdown — always visible, before concepts */}
      {QUESTIONS.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl mb-5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-stone-900">Questions Detected</h2>
            <span className="text-xs text-stone-500">Click any row to edit tags</span>
          </div>
          <div className="divide-y divide-stone-100">
            {QUESTIONS.map((qRaw) => {
              const q = getQ(qRaw);
              const isEditing = editingQ === q.id;
              return (
                <div key={q.id} data-testid={`analysis-row-${q.id}`} className="px-5 py-3.5 hover:bg-stone-50/60">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="shrink-0 h-8 w-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-sm font-bold">Q{q.number}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-stone-800 line-clamp-2">{q.text}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">{(q.maxMarks || 1)} mark{(q.maxMarks || 1) > 1 ? "s" : ""}</span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-semibold">{q.concept || "Unknown"}</span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px]">{q.skill}</span>
                        {difficultyChip(q.difficulty)}
                      </div>
                    </div>
                    <button onClick={() => setEditingQ(isEditing ? null : q.id)} data-testid={`btn-edit-${q.id}`} className="text-stone-500 hover:text-blue-800 h-11 w-11 rounded-lg hover:bg-blue-50 flex items-center justify-center shrink-0">
                      {isEditing ? <Check size={16} /> : <Pencil size={14} />}
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-blue-50/40 border border-blue-100">
                      <div>
                        <label className="block text-[11px] font-semibold tracking-wider uppercase text-stone-600 mb-1">{t("concept")}</label>
                        <input
                          defaultValue={q.concept}
                          onChange={(e) => updateQuestion(q.id, "concept", e.target.value)}
                          data-testid={`edit-concept-${q.id}`}
                          className="w-full h-9 px-2.5 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold tracking-wider uppercase text-stone-600 mb-1">{t("skill")}</label>
                        <input
                          defaultValue={q.skill}
                          onChange={(e) => updateQuestion(q.id, "skill", e.target.value)}
                          data-testid={`edit-skill-${q.id}`}
                          className="w-full h-9 px-2.5 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold tracking-wider uppercase text-stone-600 mb-1">{t("difficulty")}</label>
                        <select
                          defaultValue={q.difficulty}
                          onChange={(e) => updateQuestion(q.id, "difficulty", e.target.value)}
                          data-testid={`edit-diff-${q.id}`}
                          className="w-full h-9 px-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
                        >
                          {["Easy","Medium","Hard"].map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible: Concept details + Prerequisites */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
      <CollapsibleContent>

      {/* Merged: Editable Concept Coverage + Prerequisites */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Tags size={16} className="text-blue-800" />
            <h2 className="font-display text-lg font-semibold text-stone-900">{t("conceptCoverage")}</h2>
          </div>
          <span className="text-xs text-stone-500">{concepts.length} concepts</span>
        </div>
        <p className="text-sm text-stone-500 mb-4">Add, remove, or rename concepts before AI starts evaluating.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {concepts.map((c) => (
            <div key={c} data-testid={`concept-chip-${c}`} className="group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-blue-50 text-blue-900 border border-blue-100 text-sm">
              {c}
              <button onClick={() => setConcepts((p) => p.filter((x) => x !== c))} className="h-5 w-5 rounded-full hover:bg-blue-100 text-blue-700 flex items-center justify-center opacity-60 group-hover:opacity-100">
                <X size={12} />
              </button>
            </div>
          ))}
          <div className="inline-flex items-center gap-1 px-1 py-1 rounded-full border border-dashed border-stone-300 bg-white">
            <input
              value={newConcept}
              onChange={(e) => setNewConcept(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newConcept.trim()) { setConcepts((p) => [...p, newConcept.trim()]); setNewConcept(""); }}}
              placeholder="+ add concept"
              data-testid="input-add-concept"
              className="px-2 h-7 text-sm bg-transparent outline-none placeholder:text-stone-400 w-32"
            />
          </div>
        </div>

        {/* Inline prerequisites per concept */}
        {concepts.length > 0 && (
          <div className="border-t border-stone-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Network size={14} className="text-blue-800" />
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Prerequisites</span>
            </div>
            <div className="space-y-2">
              {concepts.map((concept) => {
                const qsWithConcept = QUESTIONS.filter(q => (q.concept || "") === concept);
                const prereqs = [...new Set(qsWithConcept.flatMap(q => q.prerequisites || []))];
                if (prereqs.length === 0) return null;
                return (
                  <div key={concept} className="flex items-start gap-2 text-sm">
                    <span className="font-medium text-stone-800 shrink-0">{concept}:</span>
                    <div className="flex flex-wrap gap-1">
                      {prereqs.map(p => (
                        <span key={p} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] border border-amber-100">{p}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Prerequisite concept map from curriculum */}
      {CONCEPT_MAP.filter(n => n.leadsTo?.length > 0).length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Network size={16} className="text-blue-800" />
            <h2 className="font-display text-lg font-semibold text-stone-900">{t("prerequisiteMap")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CONCEPT_MAP.filter((n) => n.leadsTo?.length > 0).slice(0, 6).map((node, idx) => (
              <div key={node.concept} data-testid={`prereq-node-${idx}`} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-blue-800 text-white flex items-center justify-center text-[10px] font-bold">{idx + 1}</div>
                  <div className="font-medium text-stone-900 text-sm">{node.concept}</div>
                </div>
                <div className="ml-2 pl-3 border-l-2 border-dashed border-blue-200 space-y-1.5">
                  {node.leadsTo.map((child) => (
                    <div key={child} className="text-xs text-stone-600 font-medium">↓ {child}</div>
                  ))}
                </div>
              </div>
            ))}
            {CONCEPT_MAP.filter(n => n.leadsTo?.length > 0).length > 6 && (
              <div className="text-xs text-stone-400 flex items-center justify-center rounded-lg border border-dashed border-stone-200 p-3">
                +{CONCEPT_MAP.filter(n => n.leadsTo?.length > 0).length - 6} more
              </div>
            )}
          </div>
        </div>
      )}

      </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default Analysis;
