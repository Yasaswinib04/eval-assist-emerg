import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Download, TrendingUp, TrendingDown, Users, Trophy, BookOpen, ArrowLeft, Sparkles, Brain, AlertTriangle, ChevronRight, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

const KpiCard = ({ label, value, sub, icon: Icon, accent, testId }) => (
  <div data-testid={testId} className="bg-white border border-stone-200 rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-stone-500">{label}</div>
        <div className="mt-1 font-display text-3xl font-semibold text-stone-900">{value}</div>
        {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
      </div>
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
    </div>
  </div>
);

const masteryColor = (m) => {
  if (m >= 75) return "bg-emerald-600 text-white";
  if (m >= 60) return "bg-emerald-500 text-white";
  if (m >= 45) return "bg-amber-500 text-white";
  if (m >= 30) return "bg-amber-600 text-white";
  return "bg-rose-600 text-white";
};

const Insights = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const { id = "asm-001" } = useParams();
  
  const { data: ASSESSMENTS = [] } = useQuery({ queryKey: ['assessments'], queryFn: apiClient.getAssessments });
  const assessment = ASSESSMENTS.find((a) => a.id === id) || ASSESSMENTS[0] || { name: "", totalMarks: 40, avgScore: 0 };

  const { data: STUDENTS = [], isLoading: loadingS } = useQuery({ queryKey: ['students', id], queryFn: () => apiClient.getStudents(id) });
  const { data: kpi = {}, isLoading: loadingK } = useQuery({ queryKey: ['insights-kpi', id], queryFn: () => apiClient.getInsightsKpis(id) });
  const { data: ROOT_CAUSE_INSIGHTS = [], isLoading: loadingRC } = useQuery({ queryKey: ['insights-rc', id], queryFn: () => apiClient.getRootCauseInsights(id) });
  const { data: CONCEPT_MASTERY = [], isLoading: loadingCM } = useQuery({ queryKey: ['insights-cm', id], queryFn: () => apiClient.getConceptMastery(id) });
  const { data: CHAPTER_PERFORMANCE = [], isLoading: loadingCP } = useQuery({ queryKey: ['insights-cp', id], queryFn: () => apiClient.getChapterPerformance(id) });
  const { data: SCORE_DISTRIBUTION = [], isLoading: loadingSD } = useQuery({ queryKey: ['insights-sd', id], queryFn: () => apiClient.getScoreDistribution(id) });
  const { data: LEARNING_GAPS = [], isLoading: loadingLG } = useQuery({ queryKey: ['insights-lg', id], queryFn: () => apiClient.getLearningGaps(id) });
  const { data: INTERVENTION_LIST = [], isLoading: loadingIL } = useQuery({ queryKey: ['interventions', id], queryFn: () => apiClient.getInterventions(id) });
  const { data: CHAPTERS = {}, isLoading: loadingCh } = useQuery({ queryKey: ['chapters', id], queryFn: () => apiClient.getChapters(id) });

  if (loadingS || loadingK || loadingRC || loadingCM || loadingCP || loadingSD || loadingLG || loadingIL || loadingCh) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-800" size={32} /></div>;
  }

  const totalStudents = SCORE_DISTRIBUTION.reduce((s, b) => s + b.count, 0);
  const passing = SCORE_DISTRIBUTION.filter((b) => parseInt((b.range || "0-0").split("-")[0], 10) >= 21).reduce((s, b) => s + b.count, 0);
  const passRate = totalStudents ? ((passing / totalStudents) * 100).toFixed(0) : "0";

  const downloadCsv = () => {
    const rows = [
      ["Roll No.", "Student Name", "Score", "Out of", "Percentage", "Status"],
      ...STUDENTS.map((s) => [s.roll, s.name, s.total, assessment.totalMarks, ((s.total / assessment.totalMarks) * 100).toFixed(1) + "%", s.total / assessment.totalMarks >= 0.5 ? "Pass" : "Needs Help"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${assessment.name.replace(/\s+/g, "_")}_report.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const barColor = (range) => {
    const low = parseInt((range || "0-0").split("-")[0], 10);
    if (low < 11) return "#b91c1c";
    if (low < 21) return "#d97706";
    if (low < 31) return "#1e40af";
    return "#047857";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="insights-page">
      <Breadcrumbs items={[
        { label: t("assessments"), to: `/analysis/${id}` },
        { label: assessment.name, to: `/review/${id}` },
        { label: t("insights") },
      ]} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <button onClick={() => navigate("/dashboard")} data-testid="btn-back-from-insights" className="mb-3 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900">
            <ArrowLeft size={14} /> {t("backToDash")}
          </button>
          <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">{assessment.name}</div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">{t("insightsTitle")}</h1>
          <p className="mt-1.5 text-stone-600 text-lg">{t("insightsSub")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/interventions/${id}`)} data-testid="btn-go-interventions" className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-white border border-blue-200 text-blue-800 hover:bg-blue-50 font-medium">
            <Target size={18} /> {t("interventions")}
          </button>
          <button onClick={downloadCsv} data-testid="btn-download-csv" className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 shadow-sm">
            <Download size={18} /> {t("downloadCsv")}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard testId="kpi-class-avg" label={t("classAverage")} value={`${((assessment.avgScore / assessment.totalMarks) * 100).toFixed(0)}%`} sub={`${assessment.avgScore.toFixed(1)} / ${assessment.totalMarks}`} icon={Users} accent="bg-blue-50 text-blue-800" />
        <KpiCard testId="kpi-highest" label={t("highestScore")} value={`${Math.max(...STUDENTS.map((s) => s.total))}`} sub={`/ ${assessment.totalMarks}`} icon={Trophy} accent="bg-emerald-50 text-emerald-800" />
        <KpiCard testId="kpi-lowest" label={t("lowestScore")} value={`${Math.min(...STUDENTS.map((s) => s.total))}`} sub={`/ ${assessment.totalMarks}`} icon={TrendingDown} accent="bg-rose-50 text-rose-800" />
        <KpiCard testId="kpi-pass-rate" label={t("passRate")} value={`${passRate}%`} sub={`${passing} of ${totalStudents} passed`} icon={TrendingUp} accent="bg-amber-50 text-amber-800" />
      </div>

      {/* Root Cause AI insights */}
      <div className="mt-8 bg-gradient-to-br from-blue-50 to-stone-50 border border-blue-100 rounded-xl p-6" data-testid="root-cause-section">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={20} className="text-blue-800" />
          <h2 className="font-display text-xl font-semibold text-stone-900">{t("rootCause")}</h2>
        </div>
        <p className="text-sm text-stone-600 mb-4">AI looks for prerequisite knowledge gaps behind the surface scores.</p>
        <div className="space-y-3">
          {ROOT_CAUSE_INSIGHTS.map((r) => (
            <div key={r.id} data-testid={`root-cause-${r.id}`} className="flex gap-3 p-4 rounded-lg bg-white border border-stone-200">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${r.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                <Sparkles size={15} />
              </div>
              <div className="flex-1">
                <div className="text-sm text-stone-800 leading-relaxed">{r.insight}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(r.linkedConcepts ?? []).map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-100">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Concept mastery heatmap + Chapter performance */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6 lg:col-span-3" data-testid="concept-heatmap-section">
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-1">{t("conceptMastery")}</h2>
          <p className="text-sm text-stone-500 mb-4">Class-wide mastery for each concept — green is strong, red needs help.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CONCEPT_MASTERY.map((c) => (
              <div key={c.concept} data-testid={`heatmap-${c.concept}`} className="flex items-center gap-2">
                <div className={`shrink-0 h-9 w-14 rounded-md flex items-center justify-center text-xs font-bold ${masteryColor(c.mastery)}`}>
                  {c.mastery}%
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-stone-900 truncate">{c.concept}</div>
                  <div className="text-[11px] text-stone-500">{Array.isArray(CHAPTERS) ? CHAPTERS.find(x => x.id === c.chapter)?.name?.split(" — ")[0] ?? "" : CHAPTERS[c.chapter]?.name?.split(" — ")[0] ?? ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6 lg:col-span-2" data-testid="chapter-perf-section">
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-1">{t("chapterPerformance")}</h2>
          <p className="text-sm text-stone-500 mb-4">Average mastery per chapter</p>
          <div className="space-y-4">
            {CHAPTER_PERFORMANCE.map((c) => (
              <div key={c.id} data-testid={`chapter-perf-${c.id}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-sm font-medium text-stone-800 truncate">{c.name}</div>
                  <div className="text-sm font-semibold text-stone-900">{c.mastery}%</div>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full ${c.mastery >= 60 ? "bg-emerald-600" : c.mastery >= 45 ? "bg-amber-500" : "bg-rose-600"}`} style={{ width: `${c.mastery}%` }} />
                </div>
                <div className="text-[11px] text-stone-500 mt-1">{c.questions} question{c.questions > 1 ? "s" : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score distribution + Most missed */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-6 lg:col-span-3">
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-1">{t("distribution")}</h2>
          <p className="text-sm text-stone-500 mb-4">Students per score band (out of {assessment.totalMarks})</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SCORE_DISTRIBUTION} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: "#57534e" }} axisLine={{ stroke: "#d6d3d1" }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#57534e" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(30,64,175,0.04)" }} contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 13 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {SCORE_DISTRIBUTION.map((d, i) => <Cell key={i} fill={barColor(d.range)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-6 lg:col-span-2" data-testid="learning-gaps-section">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={18} className="text-amber-700" />
            <h2 className="font-display text-xl font-semibold text-stone-900">{t("mostMissed")}</h2>
          </div>
          <p className="text-sm text-stone-500 mb-4">Topics needing reinforcement</p>
          <div className="space-y-4">
            {LEARNING_GAPS.map((g, i) => (
              <div key={i} data-testid={`gap-row-${i}`}>
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="text-sm font-medium text-stone-800 flex-1">{g.topic}</div>
                  <div className="text-xs font-semibold text-amber-800 whitespace-nowrap">{g.percentage}%</div>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${g.percentage}%` }} />
                </div>
                <div className="mt-1 text-xs text-stone-500">{g.studentsStruggled} {t("gapStudents")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Students requiring intervention */}
      <div className="mt-8 bg-white border border-stone-200 rounded-xl overflow-hidden" data-testid="intervention-section">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-700" />
            <h2 className="font-display text-xl font-semibold text-stone-900">{t("intervention")}</h2>
          </div>
          <span className="text-sm text-stone-500">{INTERVENTION_LIST.length} students</span>
        </div>
        <div className="divide-y divide-stone-100">
          {INTERVENTION_LIST.map((s) => (
            <div key={s.studentId} data-testid={`intervention-${s.studentId}`} className="px-6 py-4 flex items-center gap-4 hover:bg-stone-50/60">
              <div className={`h-2.5 w-2.5 rounded-full ${s.priority === "high" ? "bg-rose-600" : s.priority === "medium" ? "bg-amber-500" : "bg-stone-400"}`} />
              <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center text-sm font-semibold">
                {(s.name || "??").split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-stone-900">{s.name || "Unknown"}</div>
                <div className="text-xs text-stone-500 mt-0.5">Roll {s.roll} · Scored {s.score}/{assessment.totalMarks}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(s.weakConcepts ?? []).map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 text-[10px] font-semibold border border-rose-100">{c}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => navigate(`/student/${id}/${s.studentId}`)}
                data-testid={`btn-view-profile-${s.studentId}`}
                className="shrink-0 inline-flex items-center gap-1 px-3 h-11 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 text-sm font-medium"
              >
                {t("viewProfile")} <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Full student list */}
      <div className="mt-8 bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-stone-900">{t("studentList")}</h2>
          <span className="text-sm text-stone-500">{STUDENTS.length} {t("papers")}</span>
        </div>
        <div className="divide-y divide-stone-100">
          {[...STUDENTS].sort((a, b) => b.total - a.total).map((s, idx) => {
            const pct = (s.total / assessment.totalMarks) * 100;
            return (
              <div key={s.id} data-testid={`student-row-${s.id}`} className="px-6 py-4 flex items-center gap-4 hover:bg-stone-50/60 cursor-pointer" onClick={() => navigate(`/student/${id}/${s.id}`)}>
                <div className="text-stone-400 font-mono text-sm w-6">{idx + 1}</div>
                <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center text-sm font-semibold">
                  {(s.name || "??").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-900">{s.name || "Unknown"}</div>
                  <div className="text-xs text-stone-500">Roll {s.roll}</div>
                </div>
                <div className="hidden sm:flex items-center gap-2 w-48">
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden flex-1">
                    <div className={`h-full ${pct >= 75 ? "bg-emerald-600" : pct >= 50 ? "bg-blue-700" : pct >= 25 ? "bg-amber-500" : "bg-rose-600"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-stone-700 w-10 text-right">{pct.toFixed(0)}%</span>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-semibold text-stone-900">{s.total}<span className="text-stone-400 text-sm font-normal">/{assessment.totalMarks}</span></div>
                </div>
                <ChevronRight size={16} className="text-stone-400" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Insights;
