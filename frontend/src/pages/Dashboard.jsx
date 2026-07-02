import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { Upload as UploadIcon, Zap, ChevronRight, Loader2, Plus, FileText } from "lucide-react";

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

const Dashboard = () => {
  const { t, user, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">Assessment Directory</div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">
            {t(greetingKey())}, {user?.name?.split(" ")[0] || "Teacher"}
          </h1>
          <p className="mt-1.5 text-stone-600 text-lg">Select an assessment to review or analyze</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/score-entry"
            data-testid="score-entry-cta-header"
            className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors shadow-sm"
          >
            <Zap size={18} />
            Quick Score Entry
          </Link>
          <Link
            to="/upload"
            data-testid="upload-cta-header"
            className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-sm"
          >
            <UploadIcon size={18} />
            New Assessment
          </Link>
        </div>
      </div>

      {/* Assessment Directory */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-stone-50 border-b border-stone-200 text-xs font-semibold tracking-[0.06em] uppercase text-stone-500">
          <div className="col-span-4">Assessment</div>
          <div className="col-span-2">Papers</div>
          <div className="col-span-2">Avg Score</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {ASSESSMENTS.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center mx-auto mb-4">
              <FileText size={26} />
            </div>
            <h2 className="font-display text-xl font-semibold text-stone-900 mb-1">No assessments yet</h2>
            <p className="text-stone-500 mb-6 max-w-sm mx-auto">Create your first assessment by uploading a question paper and student answer sheets.</p>
            <div className="flex items-center justify-center gap-3">
              <Link to="/upload" className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-sm">
                <Plus size={18} /> New Assessment
              </Link>
              <Link to="/score-entry" className="inline-flex items-center gap-2 h-12 px-5 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors shadow-sm">
                <Zap size={18} /> Quick Score Entry
              </Link>
            </div>
          </div>
        ) : (<>
          {ASSESSMENTS.map((a) => (
            <div
              key={a.id}
              data-testid={`assessment-row-${a.id}`}
              onClick={() => navigate(`/analysis/${a.id}`)}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 transition-colors cursor-pointer"
            >
            <div className="md:col-span-4">
              <div className="font-medium text-stone-900">{a.name}</div>
              <div className="text-sm text-stone-500 mt-0.5">{a.type} · {a.createdAt}</div>
            </div>
            <div className="md:col-span-2 flex md:block items-center gap-2">
              <div className="md:hidden text-xs uppercase tracking-wide text-stone-500">Papers</div>
              <div className="font-medium text-stone-900">{a.totalPapers}</div>
              {a.pendingReview > 0 && (
                <div className="text-xs text-amber-700 mt-0.5">{a.pendingReview} pending</div>
              )}
            </div>
            <div className="md:col-span-2 flex md:block items-center gap-2">
              <div className="md:hidden text-xs uppercase tracking-wide text-stone-500">Avg</div>
              <div className="font-medium text-stone-900">{(a.avgScore ?? 0).toFixed(1)} <span className="text-stone-500 text-sm font-normal">/ {a.totalMarks}</span></div>
            </div>
            <div className="md:col-span-2">
              <StatusPill status={a.status} t={t} />
            </div>
            <div className="md:col-span-2 flex items-center md:justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              {a.status === "review" ? (
                <button onClick={() => navigate(`/review/${a.id}`)} data-testid={`btn-review-${a.id}`} className="inline-flex items-center gap-1 px-3 h-11 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200 text-sm font-semibold">
                  Review <ChevronRight size={12} />
                </button>
              ) : a.status === "complete" || a.status === "done" ? (
                <button onClick={() => navigate(`/insights/${a.id}`)} data-testid={`btn-insights-${a.id}`} className="inline-flex items-center gap-1 px-3 h-11 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 text-sm font-semibold">
                  Insights <ChevronRight size={12} />
                </button>
              ) : (
                <button onClick={() => navigate(`/analysis/${a.id}`)} data-testid={`btn-open-${a.id}`} className="inline-flex items-center gap-1 px-3 h-11 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-100 text-sm font-semibold">
                  Open <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
        </>)}
      </div>
    </div>
  );
};

export default Dashboard;
