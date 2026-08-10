import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery, useQueries } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { TrendingUp, TrendingDown, Loader2, ChevronRight, BarChart3 } from "lucide-react";

const gradeColor = (pct) => {
  if (pct >= 80) return "text-emerald-700 bg-emerald-50";
  if (pct >= 60) return "text-blue-700 bg-blue-50";
  if (pct >= 50) return "text-amber-700 bg-amber-50";
  return "text-rose-700 bg-rose-50";
};

const ClassPerformance = () => {
  const { activeClass, activeSubject } = useApp();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("name");

  const { data: assessments = [], isLoading: loadingAssessments } = useQuery({
    queryKey: ["assessments"],
    queryFn: apiClient.getAssessments,
  });

  const relevant = useMemo(() => {
    return assessments.filter((a) => {
      if (activeClass && a.class !== activeClass) return false;
      if (activeSubject && a.subject !== activeSubject) return false;
      return true;
    });
  }, [assessments, activeClass, activeSubject]);

  const studentQueries = useQueries({
    queries: relevant.map((a) => ({
      queryKey: ["students", a.id || a._id],
      queryFn: () => apiClient.getStudents(a.id || a._id),
    })),
  });

  const loading = loadingAssessments || studentQueries.some((q) => q.isLoading);

  // Only keep assessments that actually have graded students
  const columns = useMemo(() => {
    return relevant
      .map((a, i) => ({
        id: a.id || a._id,
        name: a.name || a.type || "Assessment",
        subject: a.subject,
        klass: a.class,
        maxMarks: a.totalMarks || 40,
        students: studentQueries[i]?.data || [],
      }))
      .filter((c) => c.students.length > 0);
  }, [relevant, studentQueries]);

  // Merge students across assessments by roll number (fallback: name)
  const rows = useMemo(() => {
    const map = new Map();
    columns.forEach((c) => {
      c.students.forEach((s) => {
        const key = s.roll || s.name;
        if (!key) return;
        if (!map.has(key)) map.set(key, { key, name: s.name, roll: s.roll, scores: {}, firstStudentId: null, firstAsmId: null });
        const row = map.get(key);
        row.scores[c.id] = s.total ?? 0;
        if (!row.firstStudentId) {
          row.firstStudentId = s.id || s._id;
          row.firstAsmId = c.id;
        }
      });
    });
    return [...map.values()];
  }, [columns]);

  const getAvg = (row) => {
    const taken = columns.filter((c) => row.scores[c.id] !== undefined);
    if (!taken.length) return 0;
    const score = taken.reduce((sum, c) => sum + row.scores[c.id], 0);
    const max = taken.reduce((sum, c) => sum + c.maxMarks, 0);
    return max ? Math.round((score / max) * 100) : 0;
  };

  const getGrowth = (row) => {
    const taken = columns.filter((c) => row.scores[c.id] !== undefined);
    if (taken.length < 2) return null;
    const first = taken[0], last = taken[taken.length - 1];
    return Math.round((row.scores[last.id] / last.maxMarks) * 100) - Math.round((row.scores[first.id] / first.maxMarks) * 100);
  };

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "avg") return getAvg(b) - getAvg(a);
    return (a.name || "").localeCompare(b.name || "");
  });

  const classAvg = rows.length ? Math.round(rows.reduce((s, r) => s + getAvg(r), 0) / rows.length) : 0;
  const topStudent = rows.length ? rows.reduce((best, r) => (getAvg(r) > getAvg(best) ? r : best), rows[0]) : null;
  const mostWeak = columns.length
    ? columns
        .map((c) => {
          const taken = rows.filter((r) => r.scores[c.id] !== undefined);
          const avg = taken.length
            ? Math.round(taken.reduce((s, r) => s + (r.scores[c.id] / c.maxMarks) * 100, 0) / taken.length)
            : 0;
          return { name: c.name, avg };
        })
        .sort((a, b) => a.avg - b.avg)[0]
    : null;

  const title = [activeClass, activeSubject].filter(Boolean).join(" · ") || "All Classes";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-stone-500" data-testid="class-performance-loading">
        <Loader2 size={28} className="animate-spin mb-3" />
        <p className="text-sm">Loading class performance...</p>
      </div>
    );
  }

  if (!columns.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center" data-testid="class-performance-empty">
        <div className="mx-auto h-12 w-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mb-4">
          <BarChart3 size={22} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-stone-900">No graded assessments yet</h1>
        <p className="mt-2 text-stone-600">
          Once you upload and evaluate answer sheets, class-wide performance will appear here.
        </p>
        <button
          onClick={() => navigate("/upload")}
          className="mt-6 inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-blue-800 text-white font-semibold hover:bg-blue-900"
        >
          Upload answer sheets <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="class-performance-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">Overview</div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">{title} Performance</h1>
          <p className="mt-1.5 text-stone-600 text-lg">Across {columns.length} assessment{columns.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Class Average</div>
          <div className="mt-1 font-display text-3xl font-semibold text-stone-900">{classAvg}%</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Top Performer</div>
          <div className="mt-1 font-display text-lg font-semibold text-stone-900">{topStudent?.name || "—"}</div>
          {topStudent && <div className="text-xs text-stone-500">{getAvg(topStudent)}% avg</div>}
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Most Challenging</div>
          <div className="mt-1 font-display text-lg font-semibold text-stone-900 truncate">{mostWeak?.name || "—"}</div>
          {mostWeak && <div className="text-xs text-stone-500">{mostWeak.avg}% class avg</div>}
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Students</div>
          <div className="mt-1 font-display text-3xl font-semibold text-stone-900">{rows.length}</div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-stone-50 border-b border-stone-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setSortBy("name")} className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded ${sortBy === "name" ? "bg-blue-100 text-blue-800" : "text-stone-500 hover:text-stone-700"}`}>Name</button>
            <button onClick={() => setSortBy("avg")} className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded ${sortBy === "avg" ? "bg-blue-100 text-blue-800" : "text-stone-500 hover:text-stone-700"}`}>Avg</button>
          </div>
          <span className="text-[11px] text-stone-500">Growth</span>
        </div>

        <div className="overflow-x-auto">
          {sorted.map((row) => {
            const avg = getAvg(row);
            const growth = getGrowth(row);
            return (
              <div
                key={row.key}
                onClick={() => row.firstStudentId && navigate(`/student/${row.firstAsmId}/${row.firstStudentId}`)}
                className="flex items-center gap-3 px-6 py-4 border-b border-stone-100 last:border-0 cursor-pointer hover:bg-stone-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-900 truncate">{row.name}</div>
                  <div className="text-[11px] text-stone-500">{row.roll}</div>
                </div>
                <div className="flex items-center gap-3">
                  {columns.map((c) => (
                    <div key={c.id} className="text-center">
                      <div className="text-[10px] text-stone-400 uppercase font-bold max-w-[72px] truncate">{c.name}</div>
                      <div className={`text-sm font-semibold rounded px-1.5 py-0.5 ${row.scores[c.id] !== undefined ? gradeColor(Math.round((row.scores[c.id] / c.maxMarks) * 100)) : "text-stone-400 bg-stone-50"}`}>
                        {row.scores[c.id] !== undefined ? `${row.scores[c.id]}/${c.maxMarks}` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right w-20">
                  <div className="text-sm font-bold text-stone-900">{avg}%</div>
                  {growth !== null && (
                    <div className={`flex items-center justify-end gap-0.5 text-xs ${growth >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {growth >= 0 ? "+" : ""}{growth}%
                    </div>
                  )}
                </div>
                <ChevronRight size={15} className="text-stone-300 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClassPerformance;
