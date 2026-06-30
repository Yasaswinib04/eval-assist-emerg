import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { BarChart3, TrendingUp, TrendingDown, Users, Target, ArrowRight, Loader2, ChevronRight } from "lucide-react";

const studentScores = {
  "stu-01": { name: "Karan", roll: "08-01", asm001: 25, asm002: 12, asm003: 16, asm004: 9 },
  "stu-02": { name: "Rahul", roll: "08-02", asm001: 8,  asm002: 8,  asm003: 10, asm004: 6 },
  "stu-03": { name: "Aryan", roll: "08-03", asm001: 27, asm002: 15, asm003: 19, asm004: 11 },
  "stu-04": { name: "Janu", roll: "08-04", asm001: 16, asm002: 10, asm003: 13, asm004: 8 },
  "stu-05": { name: "Tara", roll: "08-05", asm001: 7,  asm002: 6,  asm003: 8,  asm004: 5 },
  "stu-06": { name: "Dev", roll: "08-06", asm001: 14, asm002: 11, asm003: 14, asm004: 10 },
  "stu-07": { name: "Sanya", roll: "08-07", asm001: 13, asm002: 9,  asm003: 11, asm004: 7 },
  "stu-08": { name: "Priya", roll: "08-08", asm001: 2,  asm002: 5,  asm003: 7,  asm004: 4 },
};
const maxMarks = { asm001: 40, asm002: 20, asm003: 25, asm004: 15 };
const asmNames = { asm001: "SA1 (40)", asm002: "UT (20)", asm003: "FA2 (25)", asm004: "Quiz (15)" };

const gradeColor = (pct) => {
  if (pct >= 80) return "text-emerald-700 bg-emerald-50";
  if (pct >= 60) return "text-blue-700 bg-blue-50";
  if (pct >= 50) return "text-amber-700 bg-amber-50";
  return "text-rose-700 bg-rose-50";
};

const ClassPerformance = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("name");

  const studentsList = Object.values(studentScores);
  const asmIds = ["asm001", "asm002", "asm003", "asm004"];

  const getPct = (sid, asm) => Math.round((studentScores[sid][asm] / maxMarks[asm]) * 100);
  const getAvg = (sid) => {
    const s = studentScores[sid];
    const totalScore = asmIds.reduce((sum, a) => sum + s[a], 0);
    const totalMax = asmIds.reduce((sum, a) => sum + maxMarks[a], 0);
    return Math.round((totalScore / totalMax) * 100);
  };
  const getGrowth = (sid) => {
    const s = studentScores[sid];
    const early = getPct(sid, "asm003");
    const late = getPct(sid, "asm001");
    return late - early;
  };

  const sorted = [...studentsList].sort((a, b) => {
    if (sortBy === "avg") return getAvg(b) - getAvg(a);
    return a.name.localeCompare(b.name);
  });

  const classAvg = Math.round(Object.keys(studentScores).reduce((s, sid) => s + getAvg(sid), 0) / studentsList.length);
  const topStudent = studentsList.reduce((best, s) => getAvg(s.id) > getAvg(best.id) ? s : best, studentsList[0]);
  const mostWeak = asmIds.map(asm => ({ asm, avg: Math.round(studentsList.reduce((s, sid) => s + getPct(sid, asm), 0) / studentsList.length) })).sort((a, b) => a.avg - b.avg)[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="class-performance-page">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">Overview</div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">Class 8-B Performance</h1>
          <p className="mt-1.5 text-stone-600 text-lg">Across 4 assessments this term</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Class Average</div>
          <div className="mt-1 font-display text-3xl font-semibold text-stone-900">{classAvg}%</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Top Performer</div>
          <div className="mt-1 font-display text-lg font-semibold text-stone-900">{topStudent.name}</div>
          <div className="text-xs text-stone-500">{getAvg(topStudent.id)}% avg</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Most Challenging</div>
          <div className="mt-1 font-display text-lg font-semibold text-stone-900">{asmNames[mostWeak.asm]}</div>
          <div className="text-xs text-stone-500">{mostWeak.avg}% class avg</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="text-[11px] font-bold tracking-wide uppercase text-stone-500">Students</div>
          <div className="mt-1 font-display text-3xl font-semibold text-stone-900">{studentsList.length}</div>
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

        {sorted.map((s) => {
          const avg = getAvg(s.id);
          const growth = getGrowth(s.id);
          return (
            <div key={s.id} onClick={() => navigate(`/student/asm-001/${s.id}`)} className="flex items-center gap-3 px-6 py-4 border-b border-stone-100 last:border-0 hover:bg-stone-50/60 cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-900">{s.name}</div>
                <div className="text-[11px] text-stone-500">{s.roll}</div>
              </div>
              <div className="flex items-center gap-3">
                {asmIds.map((a) => (
                  <div key={a} className="text-center">
                    <div className="text-[10px] text-stone-400 uppercase font-bold">{asmNames[a].split(" ")[0]}</div>
                    <div className={`text-sm font-semibold rounded px-1.5 py-0.5 ${gradeColor(getPct(s.id, a))}`}>{studentScores[s.id][a]}/{maxMarks[a]}</div>
                  </div>
                ))}
              </div>
              <div className="text-right w-20">
                <div className="text-sm font-bold text-stone-900">{avg}%</div>
                <div className={`flex items-center gap-0.5 text-xs ${growth >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {growth >= 0 ? "+" : ""}{growth}%
                </div>
              </div>
              <ChevronRight size={15} className="text-stone-300 shrink-0" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassPerformance;
