import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import {
  ArrowLeft, CheckCircle2, Circle, AlertCircle, Download,
  TrendingUp, TrendingDown, Minus, Activity, ChevronRight, Loader2
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";

const Section = ({ icon: Icon, title, color, items, testId, mastery }) => (
  <div data-testid={testId} className="bg-white border border-stone-200 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}><Icon size={16} /></div>
      <h3 className="font-display text-lg font-semibold text-stone-900">{title}</h3>
      <span className="ml-auto text-xs font-medium text-stone-500">{items.length}</span>
    </div>
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.concept} className="flex items-center gap-2">
          <div className="text-sm text-stone-800 flex-1 truncate">{it.concept}</div>
          <div className="w-20 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className={`h-full ${mastery(it.mastery)}`} style={{ width: `${it.mastery}%` }} />
          </div>
          <div className="text-xs font-semibold text-stone-700 w-9 text-right">{it.mastery}%</div>
        </div>
      ))}
    </div>
  </div>
);

const TrendIcon = ({ trend }) => {
  if (trend === "up") return <TrendingUp size={14} className="text-emerald-700" />;
  if (trend === "down") return <TrendingDown size={14} className="text-rose-700" />;
  return <Minus size={14} className="text-stone-500" />;
};

const StudentProfile = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const { id: assessmentId, studentId } = useParams();

  const { data: STUDENTS = [] } = useQuery({ queryKey: ['students', assessmentId], queryFn: () => apiClient.getStudents(assessmentId) });
  const { data: ASSESSMENTS = [] } = useQuery({ queryKey: ['assessments'], queryFn: apiClient.getAssessments });
  const { data: CHAPTERS = {} } = useQuery({ queryKey: ['chapters', assessmentId], queryFn: () => apiClient.getChapters(assessmentId) });
  
  const student = STUDENTS.find((s) => s.id === studentId) || STUDENTS[1] || { name: "", roll: "", total: 0 };
  const assessment = ASSESSMENTS.find((a) => a.id === assessmentId) || ASSESSMENTS[0] || { name: "", totalMarks: 40 };

  const { data: profile = null, isLoading: loadingP } = useQuery({ queryKey: ['profile', assessmentId, studentId], queryFn: () => apiClient.getStudentProfile(assessmentId, studentId) });
  const { data: termTrend = [], isLoading: loadingT } = useQuery({ queryKey: ['termTrend', assessmentId, studentId], queryFn: () => apiClient.getTermTrends(assessmentId, studentId) });
  const { data: conceptTrend = [], isLoading: loadingC } = useQuery({ queryKey: ['conceptTrend', assessmentId, studentId], queryFn: () => apiClient.getConceptTrends(assessmentId, studentId) });

  const [tab, setTab] = useState("overview");

  if (loadingP || loadingT || loadingC) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-800" size={32} /></div>;
  }

  const masteryColor = (m) =>
    m >= 75 ? "bg-emerald-600" : m >= 50 ? "bg-blue-700" : m >= 35 ? "bg-amber-500" : "bg-rose-600";

  const all = profile ? [...(profile.strong||[]), ...(profile.developing||[]), ...(profile.weak||[])] : [];
  const chaptersList = Array.isArray(CHAPTERS) ? CHAPTERS : Object.values(CHAPTERS);
  const byChapter = chaptersList.map((ch) => {
    const cs = all.filter((c) => c.chapter === ch.id);
    const avg = cs.length ? cs.reduce((s, c) => s + c.mastery, 0) / cs.length : 0;
    return { ...ch, avg, count: cs.length };
  });

  // Build chart-friendly term trend with %
  const chartData = termTrend.map((a) => ({
    name: (a.name || "").split(" — ")[0].slice(0, 16),
    fullName: a.name,
    date: a.date,
    you: Math.round((a.studentScore / a.totalMarks) * 100),
    classAvg: Math.round((a.classAvg / a.totalMarks) * 100),
  }));

  const avgYou = Math.round(chartData.reduce((s, d) => s + d.you, 0) / chartData.length);
  const avgClass = Math.round(chartData.reduce((s, d) => s + d.classAvg, 0) / chartData.length);
  const firstScore = chartData[0]?.you || 0;
  const lastScore = chartData[chartData.length - 1]?.you || 0;
  const overallDelta = lastScore - firstScore;

  const downloadReport = () => {
    const rows = [
      ["Concept", "Chapter", "Mastery %"],
      ...all.map((c) => {
        const ch = Array.isArray(CHAPTERS) ? CHAPTERS.find(x => x.id === c.chapter) : CHAPTERS[c.chapter];
        return [c.concept, ch?.name || "", c.mastery + "%"];
      }),
    ];
    const csv = rows.map((r) => r.map((x) => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${student.name.replace(/\s+/g, "_")}_profile.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Profile downloaded");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="student-profile-page">
      <Breadcrumbs items={[
        { label: t("assessments"), to: `/analysis/${assessmentId}` },
        { label: assessment.name, to: `/insights/${assessmentId}` },
        { label: student.name },
      ]} />
      <button onClick={() => navigate(`/insights/${assessmentId}`)} data-testid="btn-back-insights" className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 mb-4">
        <ArrowLeft size={14} /> Back to Insights
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xl font-bold">
            {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">{t("profileTitle")}</div>
            <h1 className="mt-0.5 font-display text-3xl font-semibold text-stone-900">{student.name}</h1>
            <div className="text-sm text-stone-500">Roll {student.roll} · {assessment.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-stone-200 rounded-xl px-5 py-3 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{t("overallScore")}</div>
            <div className="font-display text-2xl font-semibold text-stone-900">{student.total}<span className="text-stone-400 text-sm font-normal">/{assessment.totalMarks}</span></div>
          </div>
          <button onClick={downloadReport} data-testid="btn-download-profile" className="h-12 px-4 rounded-lg bg-blue-800 text-white hover:bg-blue-900 font-medium inline-flex items-center gap-2 text-sm">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-stone-200" data-testid="profile-tabs">
        {[
          { id: "overview", label: t("tabOverview") },
          { id: "term", label: t("tabTerm"), badge: termTrend.length },
        ].map((it) => {
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              data-testid={`profile-tab-${it.id}`}
              className={`relative h-11 px-4 text-sm font-medium transition-colors ${active ? "text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
            >
              <span className="inline-flex items-center gap-2">
                {it.label}
                {it.badge !== undefined && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-700"}`}>{it.badge}</span>
                )}
              </span>
              {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-800" />}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          {/* Three columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Section icon={CheckCircle2} title={t("strongConcepts")} color="bg-emerald-50 text-emerald-700" items={profile?.strong ?? []} testId="section-strong" mastery={masteryColor} />
            <Section icon={Circle} title={t("developingConcepts")} color="bg-amber-50 text-amber-700" items={profile?.developing ?? []} testId="section-developing" mastery={masteryColor} />
            <Section icon={AlertCircle} title={t("needsSupport")} color="bg-rose-50 text-rose-700" items={profile?.weak ?? []} testId="section-weak" mastery={masteryColor} />
          </div>

          {/* Topic-wise mastery */}
          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <h2 className="font-display text-xl font-semibold text-stone-900 mb-1">{t("topicMastery")}</h2>
            <p className="text-sm text-stone-500 mb-5">Chapter-level summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {byChapter.filter((c) => c.count > 0).map((c) => (
                <div key={c.id} data-testid={`chapter-${c.id}`} className="p-4 rounded-lg border border-stone-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-stone-900 text-sm truncate">{c.name}</div>
                    <div className="text-sm font-semibold text-stone-900">{c.avg.toFixed(0)}%</div>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full ${masteryColor(c.avg)}`} style={{ width: `${c.avg}%` }} />
                  </div>
                  <div className="text-xs text-stone-500 mt-1.5">{c.count} concept{c.count > 1 ? "s" : ""} tracked</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "term" && (
        <div className="space-y-6" data-testid="term-view">
          {/* Term KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-xl p-5" data-testid="kpi-term-avg">
              <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-stone-500">Term Average</div>
              <div className="mt-1 font-display text-3xl font-semibold text-stone-900">{avgYou}%</div>
              <div className="text-xs text-stone-500 mt-0.5">across {termTrend.length} assessments</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5" data-testid="kpi-vs-class">
              <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-stone-500">{t("vsClass")}</div>
              <div className="mt-1 font-display text-3xl font-semibold text-stone-900">
                {avgYou >= avgClass ? "+" : ""}{avgYou - avgClass}%
              </div>
              <div className="text-xs text-stone-500 mt-0.5">Class avg {avgClass}%</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5" data-testid="kpi-growth">
              <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-stone-500">Growth this term</div>
              <div className={`mt-1 font-display text-3xl font-semibold inline-flex items-center gap-2 ${overallDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {overallDelta >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                {overallDelta >= 0 ? "+" : ""}{overallDelta}%
              </div>
              <div className="text-xs text-stone-500 mt-0.5">{firstScore}% → {lastScore}%</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-5" data-testid="kpi-best-asm">
              <div className="text-[11px] font-semibold tracking-[0.06em] uppercase text-stone-500">Best Assessment</div>
              <div className="mt-1 font-display text-3xl font-semibold text-stone-900">{Math.max(...chartData.map((d) => d.you))}%</div>
              <div className="text-xs text-stone-500 mt-0.5 truncate">{chartData.find((d) => d.you === Math.max(...chartData.map((x) => x.you)))?.fullName}</div>
            </div>
          </div>

          {/* Term line chart */}
          <div className="bg-white border border-stone-200 rounded-xl p-6" data-testid="term-chart-section">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={18} className="text-blue-800" />
              <h2 className="font-display text-xl font-semibold text-stone-900">{t("termPerformance")}</h2>
            </div>
            <p className="text-sm text-stone-500 mb-5">{t("termPerformanceSub")}</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#57534e" }} axisLine={{ stroke: "#d6d3d1" }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#57534e" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 13 }}
                    formatter={(value, name) => [`${value}%`, name === "you" ? student.name.split(" ")[0] : "Class avg"]}
                    labelFormatter={(_, items) => items?.[0]?.payload?.fullName || ""}
                  />
                  <Legend
                    iconType="circle"
                    formatter={(v) => v === "you" ? student.name.split(" ")[0] : t("classAvgShort")}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Line type="monotone" dataKey="classAvg" stroke="#a8a29e" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "#a8a29e", r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="you" stroke="#1e40af" strokeWidth={3} dot={{ fill: "#1e40af", r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-assessment table */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200">
              <h2 className="font-display text-xl font-semibold text-stone-900">{t("assessmentHistory")}</h2>
              <p className="text-sm text-stone-500 mt-0.5">Newest first</p>
            </div>
            <div className="divide-y divide-stone-100">
              {[...termTrend].reverse().map((a) => {
                const pct = Math.round((a.studentScore / a.totalMarks) * 100);
                const classPct = Math.round((a.classAvg / a.totalMarks) * 100);
                const diff = pct - classPct;
                return (
                  <button
                    key={a.assessmentId}
                    onClick={() => navigate(`/insights/${a.assessmentId}`)}
                    data-testid={`history-row-${a.assessmentId}`}
                    className="w-full text-left px-6 py-4 hover:bg-stone-50/60 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-900">{a.name}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{a.date}</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 w-44">
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden flex-1">
                        <div className={`h-full ${masteryColor(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-stone-700 w-10 text-right">{pct}%</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-lg font-semibold text-stone-900">{a.studentScore}<span className="text-stone-400 text-sm font-normal">/{a.totalMarks}</span></div>
                      <div className={`text-xs font-medium mt-0.5 ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {diff >= 0 ? "+" : ""}{diff}% {t("vsClass")}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-stone-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concept trends */}
          <div className="bg-white border border-stone-200 rounded-xl p-6" data-testid="concept-trends-section">
            <h2 className="font-display text-xl font-semibold text-stone-900 mb-1">{t("conceptTrends")}</h2>
            <p className="text-sm text-stone-500 mb-5">{t("conceptTrendsSub")}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conceptTrend.map((c) => {
                const max = c.history?.length ? Math.max(...c.history) : 0;
                return (
                  <div key={c.concept} data-testid={`concept-trend-${c.concept}`} className={`p-4 rounded-lg border ${
                    c.trend === "up" ? "border-emerald-100 bg-emerald-50/30" :
                    c.trend === "down" ? "border-rose-100 bg-rose-50/30" :
                    "border-stone-200"
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="font-medium text-stone-900 truncate">{c.concept}</div>
                        <div className="text-xs text-stone-500">{Array.isArray(CHAPTERS) ? CHAPTERS.find(x => x.id === c.chapter)?.name?.split(" — ")[0] ?? "" : CHAPTERS[c.chapter]?.name?.split(" — ")[0] ?? ""}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        c.trend === "up" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                        c.trend === "down" ? "bg-rose-50 text-rose-800 border-rose-200" :
                        "bg-stone-50 text-stone-700 border-stone-200"
                      }`}>
                        <TrendIcon trend={c.trend} />
                        {c.delta >= 0 ? "+" : ""}{c.delta}%
                      </span>
                    </div>

                    {/* Mini sparkline */}
                    <div className="flex items-end gap-1 h-12">
                      {(c.history ?? []).map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end">
                          <div
                            className={`w-full rounded-t ${
                              c.trend === "up" ? "bg-emerald-500" : c.trend === "down" ? "bg-rose-500" : "bg-stone-400"
                            }`}
                            style={{ height: `${(h / 100) * 100}%`, minHeight: 4 }}
                            title={`${h}%`}
                          />
                          <div className="text-[10px] text-stone-500 mt-1">{h}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-1 text-right">Across {(c.history ?? []).length} assessments</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
