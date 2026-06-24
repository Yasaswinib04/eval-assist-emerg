import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { Upload as UploadIcon, FileCheck2, Clock, TrendingUp, ChevronRight, ArrowUpRight, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

const StatusPill = ({ status, t }) => {
  const map = {
    draft: { label: t("status_draft") || "Draft", cls: "bg-stone-100 text-stone-700 border-stone-200", dot: "bg-stone-400" },
    processing: { label: t("status_processing"), cls: "bg-blue-50 text-blue-800 border-blue-100", dot: "bg-blue-600 animate-pulse" },
    review: { label: t("status_review"), cls: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-600" },
    complete: { label: t("status_complete") || "Complete", cls: "bg-emerald-50 text-emerald-800 border-emerald-100", dot: "bg-emerald-600" },
    done: { label: t("status_done"), cls: "bg-emerald-50 text-emerald-800 border-emerald-100", dot: "bg-emerald-600" },
  };
  const m = map[status] || map.complete;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

const greetingKey = () => {
  const h = new Date().getHours();
  if (h < 12) return "goodMorning";
  if (h < 17) return "goodAfternoon";
  return "goodEvening";
};

const KpiCard = ({ label, value, sub, icon: Icon, accent, testId }) => (
  <div data-testid={testId} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="mt-5">
      <div className="text-xs font-semibold tracking-[0.08em] uppercase text-stone-500">{label}</div>
      <div className="mt-1 font-display text-4xl font-semibold text-stone-900">{value}</div>
      {sub && <div className="mt-1 text-sm text-stone-500">{sub}</div>}
    </div>
  </div>
);

const Dashboard = () => {
  const { t, user, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.fromLoader) {
      const displayName = location.state.name || user?.name || "Teacher";
      toast(`You're ${displayName} (demo). Click any assessment to explore.`, {
        description: "All data is pre-loaded and ready.",
        duration: 7000,
      });
    }
  }, []);

  const { data: ALL_ASSESSMENTS = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: apiClient.getAssessments
  });

  const ASSESSMENTS = ALL_ASSESSMENTS.filter((a) => {
    if (activeSubject && a.subject !== activeSubject) return false;
    if (activeClass && a.class !== activeClass) return false;
    return true;
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-blue-800" size={32} /></div>;
  }

  const totalEvaluated = ASSESSMENTS.reduce((s, a) => s + a.totalPapers, 0);
  const totalPending = ASSESSMENTS.reduce((s, a) => s + a.pendingReview, 0);
  const avg = ASSESSMENTS.length ? (ASSESSMENTS.reduce((s, a) => s + a.avgScore / a.totalMarks, 0) / ASSESSMENTS.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">{t("dashboard")}</div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">
            {t(greetingKey())}, {user?.name?.split(" ")[0] || "Teacher"}
          </h1>
          <p className="mt-1.5 text-stone-600 text-lg">{t("classroomToday")}</p>
        </div>
        <Link
          to="/upload"
          data-testid="upload-cta-header"
          className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-sm"
        >
          <UploadIcon size={18} />
          {t("uploadCta")}
        </Link>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <KpiCard
          testId="kpi-total-papers"
          label={t("totalPapers")}
          value={totalEvaluated}
          sub={`across ${ASSESSMENTS.length} assessment${ASSESSMENTS.length !== 1 ? "s" : ""}`}
          icon={FileCheck2}
          accent="bg-blue-50 text-blue-800"
        />
        <KpiCard
          testId="kpi-pending-review"
          label={t("pendingReview")}
          value={totalPending}
          sub="papers waiting on you"
          icon={Clock}
          accent="bg-amber-50 text-amber-800"
        />
        <KpiCard
          testId="kpi-avg-score"
          label={t("avgScore")}
          value={`${avg.toFixed(1)}%`}
          sub="weighted across batches"
          icon={TrendingUp}
          accent="bg-emerald-50 text-emerald-800"
        />
      </div>

      {/* Upload feature card */}
      <Link
        to="/upload"
        data-testid="upload-cta-card"
        className="mt-6 group flex items-center justify-between gap-6 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 p-6 md:p-8 transition-colors"
      >
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-xl bg-blue-800 text-white flex items-center justify-center shrink-0">
            <UploadIcon size={26} />
          </div>
          <div>
            <div className="font-display text-xl md:text-2xl font-semibold text-stone-900">{t("uploadCta")}</div>
            <div className="mt-1 text-stone-600">{t("uploadCtaSub")}</div>
          </div>
        </div>
        <ArrowUpRight className="text-blue-800 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
      </Link>

      {/* Recent assessments */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-semibold text-stone-900">{t("recent")}</h2>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-stone-50 border-b border-stone-200 text-xs font-semibold tracking-[0.06em] uppercase text-stone-500">
            <div className="col-span-4">Assessment</div>
            <div className="col-span-2">Papers</div>
            <div className="col-span-2">Avg Score</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          {ASSESSMENTS.map((a) => (
            <div
              key={a.id}
              data-testid={`assessment-row-${a.id}`}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors"
            >
              <div className="md:col-span-4">
                <div className="font-medium text-stone-900">{a.name}</div>
                <div className="text-sm text-stone-500 mt-0.5">{a.type} · {a.createdAt}</div>
              </div>
              <div className="md:col-span-2 flex md:block items-center gap-2">
                <div className="md:hidden text-xs uppercase tracking-wide text-stone-500">Papers</div>
                <div className="font-medium text-stone-900">{a.totalPapers} <span className="text-stone-500 text-sm font-normal">{t("papers")}</span></div>
                {a.pendingReview > 0 && (
                  <div className="text-xs text-amber-700 mt-0.5">{a.pendingReview} {t("pendingReview").toLowerCase()}</div>
                )}
              </div>
              <div className="md:col-span-2 flex md:block items-center gap-2">
                <div className="md:hidden text-xs uppercase tracking-wide text-stone-500">Avg</div>
                <div className="font-medium text-stone-900">{a.avgScore.toFixed(1)} <span className="text-stone-500 text-sm font-normal">/ {a.totalMarks}</span></div>
              </div>
              <div className="md:col-span-2">
                <StatusPill status={a.status} t={t} />
              </div>
              <div className="md:col-span-2 flex items-center md:justify-end gap-1.5">
                <button
                  onClick={() => navigate(`/upload?assessmentId=${a.id}`)}
                  title="Scan & Add New Student Response"
                  className="inline-flex items-center justify-center gap-1 px-2.5 h-9 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-100 text-xs font-semibold"
                >
                  + Add Response
                </button>
                {a.status === "review" ? (
                  <button
                    onClick={() => navigate(`/review/${a.id}`)}
                    data-testid={`btn-review-${a.id}`}
                    className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200 text-xs font-semibold"
                  >
                    {t("review")} <ChevronRight size={12} />
                  </button>
                ) : a.status === "complete" || a.status === "done" ? (
                  <button
                    onClick={() => navigate(`/insights/${a.id}`)}
                    data-testid={`btn-insights-${a.id}`}
                    className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 text-xs font-semibold"
                  >
                    Insights <ChevronRight size={12} />
                  </button>
                ) : a.status === "draft" ? (
                  <button
                    onClick={() => navigate(`/analysis/${a.id}`)}
                    data-testid={`btn-draft-${a.id}`}
                    className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 text-xs font-semibold"
                  >
                    Continue <ChevronRight size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/processing/${a.id}`)}
                    data-testid={`btn-processing-${a.id}`}
                    className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-semibold"
                  >
                    Open <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
