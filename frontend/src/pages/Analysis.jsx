import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Sparkles, ArrowRight, ArrowLeft, Pencil, Check, X, Network, Loader2, ChevronDown, CheckCircle2 } from "lucide-react";

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
    enabled: id !== "asm-001",
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

  const uniqueConcepts = [...new Set(QUESTIONS.map((q) => q.concept || "Unmapped"))];
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

  const isSeedData = QUESTIONS.length > 0 && id !== "asm-001" && QUESTIONS[0]?._id?.includes(id);
  const hasPendingOCR = QUESTIONS.length === 1 && QUESTIONS[0]?.text === "OCR_ANALYSIS_PENDING";

  const hasAnswerKey = answerKey.length > 0;
  const totalApproved = Object.values(approvedAnswers).filter(Boolean).length;
  const allApproved = hasAnswerKey && totalApproved >= answerKey.length;

  const handleAnalyzeQPaper = async () => {
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const r = await fetch(`/api/assessments/${id}/analyze-qpaper`, { method: "POST" });
      const data = await r.json();
      if (data.status === "ok") {
        setTimeout(async () => {
          setAnalyzing(false);
          await refetchQuestions();
          await queryClient.invalidateQueries(['concepts', id]);
        }, 1000);
      } else {
        setAnalyzing(false);
        setAnalysisError(data.message || "Analysis failed. Your images are saved — try again.");
        await refetchQuestions();
      }
    } catch (err) {
      setAnalyzing(false);
      setAnalysisError("Network error. Check your connection and try again.");
    }
  };

  const handleGenerateAnswerKey = async () => {
    setGeneratingKey(true);
    setKeyError("");
    try {
      const result = await apiClient.generateAnswerKey(id);
      if (result.status === "ok") {
        setGeneratingKey(false);
        await refetchAnswerKey();
        const ak = result.answerKey || [];
        const initial = {};
        ak.forEach((a) => { initial[a.q] = true; });
        setApprovedAnswers(initial);
      } else {
        setGeneratingKey(false);
        setKeyError(result.message || "Answer key generation failed. Try again.");
      }
    } catch (err) {
      setGeneratingKey(false);
      setKeyError("Network error generating answer key.");
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
    const t = setTimeout(() => { setAnalyzing(false); setAnalysisError("Analysis timed out. Try again."); }, 60000);
    return () => clearTimeout(t);
  }, [analyzing]);

  useEffect(() => {
    if (QUESTIONS.length > 0 && concepts.length === 0) {
      setConcepts([...new Set(QUESTIONS.map((q) => q.concept || "Unmapped"))]);
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
      !isSeedData &&
      !analysisError &&
      !keyError &&
      !answerKeyAttempted
    ) {
      setAnswerKeyAttempted(true);
      handleGenerateAnswerKey();
    }
  }, [QUESTIONS.length, hasPendingOCR, hasAnswerKey, generatingKey, isSeedData, analysisError, keyError, answerKeyAttempted]);

  if (analyzing || generatingKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="animate-spin text-blue-800" size={32} />
        <p className="text-sm text-stone-600">
          {analyzing ? "Analyzing your question paper with AI..." : "Generating answer key with AI..."}
        </p>
        <p className="text-xs text-stone-400">
          {analyzing ? "Extracting questions, concepts, and skills" : "DeepSeek is determining correct answers"}
        </p>
        <button onClick={() => { setAnalyzing(false); setGeneratingKey(false); }} className="text-xs text-stone-500 underline hover:text-stone-700">
          Skip
        </button>
      </div>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="analysis-page">
      <Breadcrumbs items={[
        { label: t("assessments"), to: "/dashboard" },
        { label: t("analysisTitle") },
      ]} />
      {isSeedData && (
        <div className="mb-6 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 italic">
          Showing sample data for preview. Your question paper images have been uploaded.
          {ASSESSMENT?.questionsImages?.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap items-center">
              <span className="text-[10px] text-amber-600 font-medium not-italic block mb-1">Your uploaded images:</span>
              {ASSESSMENT.questionsImages.map((img, i) => (
                <img key={i} src={`/${img}`} alt={`Uploaded Q paper page ${i+1}`} className="h-16 rounded border border-amber-300 object-cover" />
              ))}
            </div>
          )}
          {hasPendingOCR && (
            <button onClick={handleAnalyzeQPaper} disabled={analyzing} className="mt-3 not-italic inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-800 text-white text-xs font-medium hover:bg-blue-900 disabled:opacity-50">
              {analyzing ? <><Loader2 size={12} className="animate-spin" /> Analyzing with AI...</> : <>Analyze Question Paper</>}
            </button>
          )}
        </div>
      )}
      <button onClick={() => navigate("/upload")} data-testid="btn-back-upload" className="mb-3 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft size={14} /> Back to Upload
      </button>

      <div className="bg-white border border-stone-200 rounded-2xl p-8 md:p-10 mb-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">
          <Sparkles size={14} /> {t("aiExtracted")}
        </div>
        <h1 className="mt-2 font-display text-2xl md:text-3xl font-semibold text-stone-900">
          {t("analysisTitle")} {isSeedData && <span className="text-amber-600 text-base font-normal italic">(Sample Data)</span>}
        </h1>
        <p className="mt-2 text-stone-600 text-lg">
          {QUESTIONS.length} questions · {QUESTIONS.reduce((s, q) => s + (q.maxMarks || 1), 0)} marks · {uniqueConcepts.filter(c => c && c !== "Unmapped").length} concepts detected
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => setDetailsOpen((v) => !v)} data-testid="btn-view-details" className="inline-flex items-center gap-1.5 h-12 px-5 rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 font-medium">
            {t("viewDetails")} <ChevronDown size={16} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
          </button>
          <button onClick={handleRunEvaluation} disabled={!allApproved} data-testid="btn-run-evaluation" className={`inline-flex items-center gap-2 h-12 px-6 rounded-lg font-medium shadow-sm transition-colors ${allApproved ? "bg-blue-800 hover:bg-blue-900 text-white" : "bg-stone-200 text-stone-400 cursor-not-allowed"}`}>
            {t("runEvaluation")} <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Concepts & Prerequisites Detected — always visible */}
      {uniqueConcepts.filter(c => c && c !== "Unmapped").length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-blue-800" />
            <h2 className="font-display text-xl font-semibold text-stone-900">Concepts &amp; Prerequisites Detected</h2>
          </div>
          <p className="text-sm text-stone-500 mb-5">AI has identified the following concepts from your question paper, along with prerequisite knowledge requirements.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueConcepts.filter(c => c && c !== "Unmapped").map((concept, idx) => {
              const qsWithConcept = QUESTIONS.filter(q => (q.concept || "") === concept);
              const prereqs = [...new Set(qsWithConcept.flatMap(q => q.prerequisites || []))];
              return (
                <div key={concept} className="rounded-xl border border-stone-200 p-4 hover:border-blue-200 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-blue-800 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                    <div className="font-semibold text-stone-900 text-sm">{concept}</div>
                    <span className="text-xs text-stone-400 ml-auto">{qsWithConcept.length} Q</span>
                  </div>
                  {prereqs.length > 0 && (
                    <div className="ml-3 pl-3 border-l-2 border-blue-200">
                      <div className="text-[11px] font-semibold text-stone-500 mb-1.5 uppercase tracking-wider">Prerequisites</div>
                      <div className="flex flex-wrap gap-1">
                        {prereqs.map(p => (
                          <span key={p} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] border border-amber-100">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-stone-400">
                    Questions: {qsWithConcept.map(q => `Q${q.number}`).join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(uniqueConcepts.length === 0 || uniqueConcepts.every(c => !c || c === "Unmapped")) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
          <strong>No concepts detected yet.</strong> Upload a question paper and run AI analysis to extract concepts, skills, and prerequisites.
          {QUESTIONS.length > 0 && !hasPendingOCR && (
            <div className="mt-2 text-xs text-amber-600">Your question paper has been analyzed but concept tagging may not have completed. Try running analysis again.</div>
          )}
        </div>
      )}

      {/* Answer Key */}
      {hasAnswerKey && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-700" />
              <h2 className="font-display text-xl font-semibold text-stone-900">Answer Key (AI Generated)</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">{totalApproved}/{answerKey.length} approved</span>
              <button onClick={approveAll} className="text-xs font-medium text-blue-700 hover:text-blue-900">Approve All</button>
              <button onClick={handleGenerateAnswerKey} disabled={generatingKey} className="text-xs font-medium text-stone-500 hover:text-stone-700">
                {generatingKey ? <Loader2 size={12} className="animate-spin inline" /> : "Regenerate"}
              </button>
            </div>
          </div>
          <p className="text-sm text-stone-500 mb-5">Review the AI-generated answers. Tap any answer to approve or reject before running evaluation.</p>

          {mcqs.length > 0 && (
            <div className="mb-5">
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

      {!hasAnswerKey && QUESTIONS.length > 0 && !hasPendingOCR && !generatingKey && !isSeedData && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6 text-center">
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

      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
      <CollapsibleContent>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Questions", value: QUESTIONS.length },
          { label: "Total Marks", value: QUESTIONS.reduce((s, q) => s + (q.maxMarks || 1), 0) },
          { label: "Skill Level", value: [...new Set(QUESTIONS.map(q => q.skill).filter(Boolean))].length },
          { label: "Concepts Tested", value: uniqueConcepts.filter(c => c && c !== "Unmapped").length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-stone-500">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-semibold text-stone-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Concept coverage (editable chips) */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-xl font-semibold text-stone-900">{t("conceptCoverage")}</h2>
          <span className="text-xs text-stone-500">{concepts.length} concepts</span>
        </div>
        <p className="text-sm text-stone-500 mb-4">Add, remove, or rename concepts before AI starts evaluating.</p>
        <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Question breakdown table */}
      <div className="bg-white border border-stone-200 rounded-xl mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-stone-900">{t("questionBreakdown")}</h2>
          <span className="text-xs text-stone-500">Click any row to edit tags</span>
        </div>
        <div className="divide-y divide-stone-100">
          {QUESTIONS.map((qRaw) => {
            const q = getQ(qRaw);
            const isEditing = editingQ === q.id;
            return (
              <div key={q.id} data-testid={`analysis-row-${q.id}`} className={`px-6 py-4 hover:bg-stone-50/60 ${isSeedData ? "opacity-70 italic" : ""}`}>
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

      {/* Prerequisite concept map */}
      {CONCEPT_MAP.filter(n => n.leadsTo?.length > 0).length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Network size={18} className="text-blue-800" />
            <h2 className="font-display text-xl font-semibold text-stone-900">{t("prerequisiteMap")}</h2>
          </div>
          <p className="text-sm text-stone-500 mb-5">Which foundational concepts must students master before these will make sense?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONCEPT_MAP.filter((n) => n.leadsTo?.length > 0).map((node, idx) => (
              <div key={node.concept} data-testid={`prereq-node-${idx}`} className="rounded-xl border border-stone-200 bg-stone-50/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-full bg-blue-800 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                  <div className="font-semibold text-stone-900">{node.concept}</div>
                </div>
                <div className="ml-3 pl-4 border-l-2 border-dashed border-blue-300 space-y-2">
                  {node.leadsTo.map((child, i) => {
                    const grand = CONCEPT_MAP.find((n) => n.concept === child)?.leadsTo ?? [];
                    return (
                      <div key={child}>
                        <div className="text-sm text-stone-800 font-medium">↓ {child}</div>
                        {grand.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1">
                            {grand.map((g) => (
                              <div key={g} className="text-xs text-stone-600">↓ {g}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default Analysis;
