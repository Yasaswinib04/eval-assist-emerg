import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Sparkles, ArrowRight, ArrowLeft, Pencil, Check, X, Network, Loader2, ChevronDown, CheckCircle2, ScanLine, ListChecks, BookOpen, Tags, Brain, ClipboardCheck, PenLine, RefreshCw } from "lucide-react";

const FULL_ANALYSIS_MIN_MS = 29000;

const FULL_ANALYSIS_STEPS = [
  { label: "Reading the question paper", detail: "Going through each page you uploaded", icon: ScanLine, minMs: 3000 },
  { label: "Finding all questions", detail: "Picking out question numbers, sections, and marks", icon: ListChecks, minMs: 4000 },
  { label: "Matching to your syllabus", detail: "Linking each question to topics and chapters", icon: BookOpen, minMs: 4000 },
  { label: "Understanding what is tested", detail: "Identifying concepts, skills, and difficulty levels", icon: Tags, minMs: 5000 },
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
  const { id } = useParams();

  const { data: QUESTIONS = [], isLoading: loadingQ, refetch: refetchQuestions } = useQuery({
    queryKey: ['questions', id],
    queryFn: () => apiClient.getQuestions(id),
  });

  const { data: ASSESSMENT, isLoading: loadingA } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => apiClient.getAssessment(id),
  });

  const { data: ANSWER_KEY_DATA, refetch: refetchAnswerKey } = useQuery({
    queryKey: ['answerKey', id],
    queryFn: () => apiClient.getAnswerKey(id),
  });

  // Teacher-uploaded/text-parsed keys use "questionNumber"; DeepSeek-generated
  // and OCR'd keys use "q". Normalize to "q" here so approval tracking below
  // (keyed on ak.q) works regardless of which path produced the answer key.
  const answerKey = useMemo(
    () => (ANSWER_KEY_DATA?.answerKey || []).map((a) => ({ ...a, q: a.q ?? a.questionNumber })),
    [ANSWER_KEY_DATA]
  );

  const uniqueConcepts = useMemo(() => [...new Set(QUESTIONS.map((q) => q.concept).filter(Boolean))], [QUESTIONS]);
  const conceptCount = uniqueConcepts.length;
  const totalMarks = useMemo(() => QUESTIONS.reduce((s, q) => s + (q.maxMarks || 1), 0), [QUESTIONS]);
  const skillCount = useMemo(() => [...new Set(QUESTIONS.map(q => q.skill).filter(Boolean))].length, [QUESTIONS]);
  const conceptByQ = useMemo(() => {
    const map = {};
    QUESTIONS.forEach((q) => { map[q.number] = q.concept; });
    return map;
  }, [QUESTIONS]);
  const [concepts, setConcepts] = useState([]);
  const [newConcept, setNewConcept] = useState("");
  const [hiddenPrereqs, setHiddenPrereqs] = useState({});
  const removePrereq = (concept, prereq) => {
    setHiddenPrereqs((p) => ({ ...p, [concept]: [...(p[concept] || []), prereq] }));
  };
  const [editingQ, setEditingQ] = useState(null);
  const [questionEdits, setQuestionEdits] = useState({});
  const [running, setRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [approvedAnswers, setApprovedAnswers] = useState({});
  const [expandedAnswers, setExpandedAnswers] = useState({});
  const [reextracting, setReextracting] = useState(false);
  const [reextractError, setReextractError] = useState("");
  const [answerEdits, setAnswerEdits] = useState({});
  const [savingAnswerKey, setSavingAnswerKey] = useState(false);

  const hasPendingOCR = QUESTIONS.length === 1 && QUESTIONS[0]?.text === "OCR_ANALYSIS_PENDING";

  const hasAnswerKey = answerKey.length > 0;
  const answerKeyStatus = ANSWER_KEY_DATA?.status;
  const isTeacherProvidedKey = answerKeyStatus === "uploaded" || answerKeyStatus === "edited";
  const uniqueAnswerKeyQuestions = useMemo(() => new Set(answerKey.map((a) => a.q)).size, [answerKey]);
  const totalApproved = Object.values(approvedAnswers).filter(Boolean).length;
  const allApproved = hasAnswerKey && totalApproved >= uniqueAnswerKeyQuestions;

  useEffect(() => {
    if (hasAnswerKey && !hasPendingOCR && Object.keys(approvedAnswers).length === 0) {
      const initial = {};
      answerKey.forEach((a) => { initial[a.q] = true; });
      setApprovedAnswers(initial);
    }
  }, [hasAnswerKey, hasPendingOCR]);

  const progressTimerRef = useRef(null);

  const handleRunFullAnalysis = async () => {
    setRunning(true);
    setPipelineError("");
    const startedAt = Date.now();

    try {
      const r = await fetch(`/api/assessments/${id}/analyze-qpaper`, { method: "POST" });
      const qdata = await r.json();
      if (qdata.status !== "ok") {
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, FULL_ANALYSIS_MIN_MS - elapsed);
        progressTimerRef.current = setTimeout(() => {
          setRunning(false);
          setPipelineError(qdata.message || "Question paper analysis failed.");
          refetchQuestions();
        }, remaining);
        return;
      }
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, FULL_ANALYSIS_MIN_MS - elapsed);
      progressTimerRef.current = setTimeout(() => {
        setRunning(false);
        setPipelineError("Network error during question paper analysis.");
      }, remaining);
      return;
    }

    try {
      const result = await apiClient.generateAnswerKey(id);
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, FULL_ANALYSIS_MIN_MS - elapsed);
      if (result.status === "ok") {
        progressTimerRef.current = setTimeout(async () => {
          setRunning(false);
          await refetchQuestions();
          await refetchAnswerKey();
          const ak = result.answerKey || [];
          const initial = {};
          ak.forEach((a) => { initial[a.q] = true; });
          setApprovedAnswers(initial);
          try { sessionStorage.setItem(`$ea-pipe-${id}`, "1"); } catch {}
        }, remaining);
      } else {
        progressTimerRef.current = setTimeout(() => {
          setRunning(false);
          setPipelineError(result.message || "Answer key generation failed. Try again.");
          refetchQuestions();
        }, remaining);
      }
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, FULL_ANALYSIS_MIN_MS - elapsed);
      progressTimerRef.current = setTimeout(() => {
        setRunning(false);
        setPipelineError("Network error generating answer key.");
      }, remaining);
    }
  };

  const toggleApproval = (qNum) => {
    setApprovedAnswers((prev) => ({ ...prev, [qNum]: !prev[qNum] }));
  };

  const saveAnswerEdit = async (rowKey) => {
    const edited = answerEdits[rowKey];
    if (edited === undefined) return;
    setSavingAnswerKey(true);
    try {
      const nextKey = answerKey.map((ak) => {
        const k = `${ak.q}${ak.alternative ? "-" + ak.alternative : ""}`;
        if (k !== rowKey) return ak;
        return { ...ak, correctAnswer: edited, expectedText: edited };
      });
      await apiClient.updateAnswerKey(id, nextKey);
      await refetchAnswerKey();
      setAnswerEdits((p) => { const c = { ...p }; delete c[rowKey]; return c; });
    } catch (err) {
      // Fall through; the input stays with the edited value so the teacher can retry
    } finally {
      setSavingAnswerKey(false);
    }
  };

  // Re-run just the question-paper parse — for when extraction came out wrong
  // (misaligned questions, header text picked up as a question, etc.) without
  // touching the already-uploaded/approved answer key.
  const handleReextractQuestions = async () => {
    setReextracting(true);
    setReextractError("");
    try {
      const r = await fetch(`/api/assessments/${id}/analyze-qpaper`, { method: "POST" });
      const data = await r.json();
      if (data.status !== "ok") {
        setReextractError(data.message || "Re-extraction failed.");
      } else {
        await refetchQuestions();
      }
    } catch (err) {
      setReextractError("Network error while re-extracting questions.");
    } finally {
      setReextracting(false);
    }
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
    const t = setTimeout(() => { setRunning(false); setPipelineError("Timed out. Try again."); }, 60000);
    return () => clearTimeout(t);
  }, [running]);

  useEffect(() => {
    if (QUESTIONS.length > 0 && concepts.length === 0) {
      setConcepts([...new Set(QUESTIONS.map((q) => q.concept).filter(Boolean))]);
    }
  }, [QUESTIONS]);

  const [pipelineAttempted, setPipelineAttempted] = useState(() => {
    try { return sessionStorage.getItem(`$ea-pipe-${id}`) === "1"; } catch { return false; }
  });

  useEffect(() => {
    const needsAnalysis = hasPendingOCR || (QUESTIONS.length > 0 && !hasPendingOCR && !hasAnswerKey);
    if (needsAnalysis && !running && !pipelineAttempted && !pipelineError) {
      setPipelineAttempted(true);
      try { sessionStorage.setItem(`$ea-pipe-${id}`, "1"); } catch {}
      handleRunFullAnalysis();
    }
  }, [hasPendingOCR, QUESTIONS.length, hasAnswerKey, running, pipelineAttempted, pipelineError]);

  if (running) {
    return (
      <ProgressPanel
        title="Preparing your assessment"
        subtitle="Reading the question paper, extracting questions, and generating the answer key"
        steps={FULL_ANALYSIS_STEPS}
        onSkip={() => {
          if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
          setRunning(false);
        }}
      />
    );
  }

  if (pipelineError && QUESTIONS.length === 0 && !hasAnswerKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-red-600">{pipelineError}</p>
        <div className="flex gap-2">
          <button onClick={handleRunFullAnalysis} className="h-9 px-4 rounded-lg bg-blue-800 text-white text-xs font-medium">Retry</button>
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
      {/* Compact one-line header: back + subject/name + stats + actions */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <button onClick={() => navigate("/upload")} data-testid="btn-back-upload" className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 shrink-0" title="Back to Upload">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-base md:text-lg font-semibold text-stone-900 truncate">{ASSESSMENT?.name || t("analysisTitle")}</span>
            {ASSESSMENT?.subject && (
              <span className="shrink-0 text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">{ASSESSMENT.subject}</span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 shrink-0">
            <span><b className="text-stone-800 font-semibold">{QUESTIONS.length}</b> Qs</span>
            <span className="text-stone-300">·</span>
            <span><b className="text-stone-800 font-semibold">{totalMarks}</b> marks</span>
            <span className="text-stone-300">·</span>
            <span><b className="text-stone-800 font-semibold">{skillCount}</b> skills</span>
            <span className="text-stone-300">·</span>
            <span><b className="text-stone-800 font-semibold">{conceptCount}</b> concepts</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setDetailsOpen((v) => !v)} data-testid="btn-view-details" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium">
            {t("viewDetails")} <ChevronDown size={12} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>
          <button onClick={handleRunEvaluation} disabled={!allApproved} data-testid="btn-run-evaluation" className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg font-medium shadow-sm transition-colors text-xs ${allApproved ? "bg-blue-800 hover:bg-blue-900 text-white" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
            {t("runEvaluation")} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* No concepts warning */}
      {conceptCount === 0 && QUESTIONS.length > 0 && !hasPendingOCR && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
          <strong>No concepts detected yet.</strong> Click the edit icon on any question row below to manually add concepts, or click "Regenerate" on the answer key to re-run concept tagging.
          <div className="mt-2 flex gap-2">
            <button onClick={handleRunFullAnalysis} disabled={running} className="text-xs font-medium text-amber-800 underline hover:text-amber-900">
              {running ? "Running..." : "Re-run full analysis"}
            </button>
          </div>
        </div>
      )}
      {conceptCount === 0 && QUESTIONS.length === 0 && !hasPendingOCR && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-700">
          <strong>No questions extracted yet.</strong> Please upload a question paper and run AI analysis.
        </div>
      )}

      {/* Answer Key */}
      {hasAnswerKey && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-5">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-700" />
              <h2 className="font-display text-lg font-semibold text-stone-900">
                {isTeacherProvidedKey ? "Answer Key (Your Upload)" : "Answer Key (AI Generated)"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">{totalApproved}/{uniqueAnswerKeyQuestions} approved</span>
              <button onClick={approveAll} className="text-xs font-medium text-blue-700 hover:text-blue-900">Approve All</button>
              {!isTeacherProvidedKey && (
                <button onClick={handleRunFullAnalysis} disabled={running} className="text-xs font-medium text-stone-500 hover:text-stone-700">
                  {running ? <Loader2 size={12} className="animate-spin inline" /> : "Regenerate"}
                </button>
              )}
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
                      {conceptByQ[ak.q] && (
                        <span className="text-[9px] font-semibold text-stone-500 bg-white/70 px-1 py-0.5 rounded normal-case">{conceptByQ[ak.q]}</span>
                      )}
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
                  const rowKey = `${ak.q}${ak.alternative ? "-" + ak.alternative : ""}`;
                  const approved = approvedAnswers[ak.q] !== false;
                  const expanded = !!expandedAnswers[rowKey];
                  const editedValue = answerEdits[rowKey];
                  const isEdited = editedValue !== undefined && editedValue !== (ak.correctAnswer || "");
                  const fullAnswer = ak.correctAnswer || "";
                  return (
                    <div key={rowKey} className={`rounded-lg border p-3 ${approved ? "border-stone-200" : "border-rose-200 bg-rose-50/30"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <button onClick={() => toggleApproval(ak.q)} className="shrink-0 mt-0.5">
                            {approved ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-rose-600" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-mono text-stone-500">
                              <span>Q{ak.q}{ak.alternative ? `.${ak.alternative}` : ""} ({ak.maxMarks || "?"}M)</span>
                              {conceptByQ[ak.q] && (
                                <span className="font-sans font-semibold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded normal-case">{conceptByQ[ak.q]}</span>
                              )}
                            </div>
                            {!expanded && (
                              <div className="text-sm text-stone-800 line-clamp-2 whitespace-pre-wrap">{fullAnswer || "—"}</div>
                            )}
                          </div>
                        </div>
                        <button onClick={() => setExpandedAnswers(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))} className="shrink-0 text-xs text-stone-500 hover:text-stone-700">
                          {expanded ? "Collapse ▴" : "Expand ▾"}
                        </button>
                      </div>
                      {expanded && (
                        <div className="mt-3 ml-7 space-y-2">
                          <div>
                            <div className="text-[10px] font-bold tracking-wider uppercase text-stone-500 mb-1">Correct answer (editable)</div>
                            <textarea
                              value={editedValue !== undefined ? editedValue : fullAnswer}
                              onChange={(e) => setAnswerEdits((p) => ({ ...p, [rowKey]: e.target.value }))}
                              rows={Math.min(12, Math.max(3, ((editedValue !== undefined ? editedValue : fullAnswer).split(/\r?\n/).length + 1)))}
                              className="w-full text-sm text-stone-800 leading-relaxed p-3 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-800 font-sans whitespace-pre-wrap"
                              placeholder="No answer text yet — paste or type the model answer here."
                            />
                            {isEdited && (
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={() => saveAnswerEdit(rowKey)}
                                  disabled={savingAnswerKey}
                                  className="h-8 px-3 rounded-md bg-blue-800 text-white hover:bg-blue-900 text-xs font-semibold disabled:opacity-50"
                                >
                                  {savingAnswerKey ? "Saving…" : "Save changes"}
                                </button>
                                <button
                                  onClick={() => setAnswerEdits((p) => { const c = { ...p }; delete c[rowKey]; return c; })}
                                  className="h-8 px-3 rounded-md text-xs text-stone-600 hover:text-stone-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                          {(ak.explanation || ak.keyPoints?.length > 0 || ak.markingScheme) && (
                            <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pipelineError && <div className="mt-3 text-xs text-rose-600">{pipelineError}</div>}

          <div className="mt-4 flex items-center justify-between text-xs text-stone-400">
            <span>{isTeacherProvidedKey ? "Answer key uploaded by you" : "Answer key generated by DeepSeek AI"}</span>
            <span className={allApproved ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
              {allApproved ? "All answers approved — ready for evaluation" : `${uniqueAnswerKeyQuestions - totalApproved} answers pending`}
            </span>
          </div>
        </div>
      )}

      {!hasAnswerKey && QUESTIONS.length > 0 && !hasPendingOCR && !running && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 mb-5 text-center">
          {pipelineError ? (
            <>
              <div className="flex items-center justify-center gap-2 text-rose-700 mb-3">
                <X size={18} className="text-rose-500" />
                <span className="font-semibold text-sm">Answer key generation failed</span>
              </div>
              <p className="text-sm text-rose-600 mb-4">{pipelineError}</p>
              <button onClick={handleRunFullAnalysis} className="h-10 px-4 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900">
                Retry
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 mb-3">Answer key has not been generated yet.</p>
              <button onClick={handleRunFullAnalysis} className="h-10 px-4 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900">
                Generate Answer Key with AI
              </button>
            </>
          )}
        </div>
      )}

      {/* Question breakdown — always visible, before concepts */}
      {QUESTIONS.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl mb-5 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-lg font-semibold text-stone-900">Questions Detected</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500 hidden sm:inline">Click any row to edit tags</span>
              <button
                onClick={handleReextractQuestions}
                disabled={reextracting}
                data-testid="btn-reextract-questions"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 disabled:opacity-50"
                title="Questions look wrong or misaligned? Re-parse the question paper text."
              >
                <RefreshCw size={12} className={reextracting ? "animate-spin" : ""} />
                {reextracting ? "Re-extracting…" : "Re-extract questions"}
              </button>
            </div>
          </div>
          {reextractError && (
            <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-700">{reextractError}</div>
          )}
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
                const allPrereqs = [...new Set(qsWithConcept.flatMap(q => q.prerequisites || []))];
                const prereqs = allPrereqs.filter(p => !(hiddenPrereqs[concept] || []).includes(p));
                if (prereqs.length === 0) return null;
                return (
                  <div key={concept} className="flex items-start gap-2 text-sm">
                    <span className="font-medium text-stone-800 shrink-0">{concept}:</span>
                    <div className="flex flex-wrap gap-1">
                      {prereqs.map(p => (
                        <span key={p} className="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] border border-amber-100">
                          {p}
                          <button onClick={() => removePrereq(concept, p)} className="h-3.5 w-3.5 rounded-full hover:bg-amber-100 flex items-center justify-center opacity-60 group-hover:opacity-100">
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default Analysis;
