import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Sparkles, ArrowRight, ArrowLeft, Pencil, Check, X, Network, Loader2 } from "lucide-react";

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
  const { id = "asm-001" } = useParams();

  const { data: QUESTIONS = [], isLoading: loadingQ } = useQuery({
    queryKey: ['questions', id],
    queryFn: () => apiClient.getQuestions(id)
  });

  const { data: CHAPTERS = {}, isLoading: loadingCh } = useQuery({
    queryKey: ['chapters', id],
    queryFn: () => apiClient.getChapters(id)
  });

  const { data: CONCEPT_MAP = [], isLoading: loadingC } = useQuery({
    queryKey: ['concepts', id],
    queryFn: () => apiClient.getConcepts(id)
  });

  const chapterChip = (chId) => {
    const c = Array.isArray(CHAPTERS) ? CHAPTERS.find(x => x.id === chId) : CHAPTERS[chId];
    if (!c) return null;
    const map = {
      blue: "bg-blue-50 text-blue-800 border-blue-100",
      emerald: "bg-emerald-50 text-emerald-800 border-emerald-100",
      amber: "bg-amber-50 text-amber-800 border-amber-200",
      rose: "bg-rose-50 text-rose-800 border-rose-100",
    };
    return <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${map[c.color]}`}>{(c.name || "").split(" — ")[0]}</span>;
  };

  // Unique concepts from questions
  const uniqueConcepts = [...new Set(QUESTIONS.map((q) => q.concept))];
  const [concepts, setConcepts] = useState([]);
  const [newConcept, setNewConcept] = useState("");
  const [editingQ, setEditingQ] = useState(null);
  const [questionEdits, setQuestionEdits] = useState({});

  useEffect(() => {
    if (QUESTIONS.length > 0 && concepts.length === 0) {
      setConcepts([...new Set(QUESTIONS.map((q) => q.concept))]);
    }
  }, [QUESTIONS]);

  if (loadingQ || loadingCh || loadingC) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-800" size={32} /></div>;
  }

  const updateQuestion = (qId, field, value) => {
    setQuestionEdits((p) => ({ ...p, [qId]: { ...p[qId], [field]: value } }));
  };

  const getQ = (q) => ({ ...q, ...(questionEdits[q.id] || {}) });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="analysis-page">
      <Breadcrumbs items={[
        { label: t("assessments"), to: "/dashboard" },
        { label: t("analysisTitle") },
      ]} />
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
        <div>
          <button onClick={() => navigate("/upload")} data-testid="btn-back-upload" className="mb-3 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
            <ArrowLeft size={14} /> Back to Upload
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">
            <Sparkles size={14} /> {t("aiExtracted")}
          </div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">{t("analysisTitle")}</h1>
          <p className="mt-1.5 text-stone-600 text-lg max-w-2xl">{t("analysisSub")}</p>
        </div>
        <button onClick={() => navigate(`/processing/${id}`)} data-testid="btn-run-evaluation" className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-medium shadow-sm">
          Proceed to Student Evaluation <ArrowRight size={18} />
        </button>
      </div>

      {/* AI summary band */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Questions", value: QUESTIONS.length },
          { label: "Total Marks", value: QUESTIONS.reduce((s, q) => s + q.maxMarks, 0) },
          { label: "Chapters Covered", value: Array.isArray(CHAPTERS) ? CHAPTERS.length : Object.keys(CHAPTERS).length },
          { label: "Concepts Tested", value: uniqueConcepts.length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-stone-500">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-semibold text-stone-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chapter mapping */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <h2 className="font-display text-xl font-semibold text-stone-900 mb-1">{t("chapterMapping")}</h2>
        <p className="text-sm text-stone-500 mb-4">How marks are distributed across chapters in this paper.</p>
        <div className="space-y-3">
          {(Array.isArray(CHAPTERS) ? CHAPTERS : Object.values(CHAPTERS)).map((ch) => {
            const qs = QUESTIONS.filter((q) => q.chapter === ch.id);
            const marks = qs.reduce((s, q) => s + q.maxMarks, 0);
            const total = QUESTIONS.reduce((s, q) => s + q.maxMarks, 0);
            const pct = (marks / total) * 100;
            const colorBg = { blue: "bg-blue-700", emerald: "bg-emerald-700", amber: "bg-amber-600", rose: "bg-rose-700" }[ch.color];
            return (
              <div key={ch.id} data-testid={`chapter-bar-${ch.id}`}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="font-medium text-stone-800">{ch.name}</div>
                  <div className="text-stone-600">{qs.length} Q · {marks} marks <span className="text-stone-400">({pct.toFixed(0)}%)</span></div>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full ${colorBg}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
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
              <div key={q.id} data-testid={`analysis-row-${q.id}`} className="px-6 py-4 hover:bg-stone-50/60">
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-sm font-bold">Q{q.number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-800 line-clamp-2">{q.text}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">{q.maxMarks} mark{q.maxMarks > 1 ? "s" : ""}</span>
                      {chapterChip(q.chapter)}
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-semibold">{q.concept}</span>
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

      {/* Footer actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button onClick={() => navigate("/upload")} data-testid="btn-back-upload-2" className="h-12 px-5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium">{t("cancel")}</button>
        <button onClick={() => navigate(`/processing/${id}`)} data-testid="btn-run-evaluation-2" className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-blue-800 hover:bg-blue-900 text-white font-medium shadow-sm">
          Proceed to Student Evaluation <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Analysis;
