import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/data/apiClient";
import { ChevronDown } from "lucide-react";

export const ContextBar = () => {
  const location = useLocation();
  const { activeSubject, setActiveSubject, activeClass, setActiveClass, CLASS_OPTIONS } = useApp();

  const { data: ASSESSMENTS = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: apiClient.getAssessments,
  });

  const subjectOptions = [...new Set(ASSESSMENTS.map((a) => a.subject).filter(Boolean))].sort();

  if (/^\/analysis\//.test(location.pathname)) return null;
  if (!subjectOptions.length) return null;

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-10 py-2 border-b border-stone-200 bg-white sticky top-14 lg:top-0 z-25" data-testid="context-bar">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin flex-1">
        <button
          onClick={() => setActiveSubject("")}
          data-testid="subject-tab-all"
          className={`h-10 px-3 rounded-md text-sm font-semibold tracking-wide whitespace-nowrap transition-colors ${
            activeSubject === "" ? "bg-blue-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          All
        </button>
        {subjectOptions.map((s) => {
          const active = activeSubject === s;
          return (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              data-testid={`subject-tab-${s}`}
              className={`h-10 px-3 rounded-md text-sm font-semibold tracking-wide whitespace-nowrap transition-colors ${
                active ? "bg-blue-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <select
          value={activeClass}
          onChange={(e) => setActiveClass(e.target.value)}
          data-testid="context-class-select"
          className="h-10 pl-3 pr-7 rounded-md border border-stone-300 bg-white text-sm font-semibold text-stone-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800"
        >
          {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500" />
      </div>
    </div>
  );
};
