import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Plus, X, ChevronDown } from "lucide-react";

const SUBJECTS_KEY = "evalassist-subjects";

function getPersistedSubjects() {
  try {
    const raw = localStorage.getItem(SUBJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export const ContextBar = () => {
  const { activeSubject, setActiveSubject, activeClass, setActiveClass, CLASS_OPTIONS, user } = useApp();
  const [subjects, setSubjects] = useState(() => {
    return user?.subjects?.length ? user.subjects : getPersistedSubjects();
  });
  const [adding, setAdding] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    const s = user?.subjects?.length ? user.subjects : getPersistedSubjects();
    if (!s.length) return;
    setSubjects(s);
    if (!activeSubject || !s.includes(activeSubject)) {
      setActiveSubject(s[0]);
    }
  }, [activeSubject, setActiveSubject, user]);

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed || subjects.includes(trimmed)) return;
    const updated = [...subjects, trimmed];
    setSubjects(updated);
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updated));
    setActiveSubject(trimmed);
    setNewSubject("");
    setAdding(false);
  };

  const removeSubject = (s) => {
    const updated = subjects.filter((x) => x !== s);
    setSubjects(updated);
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(updated));
    if (activeSubject === s) {
      setActiveSubject(updated[0] || "");
    }
  };

  if (!subjects.length && !adding) return null;

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-10 py-2 border-b border-stone-200 bg-white sticky top-0 z-20" data-testid="context-bar">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin flex-1">
        {subjects.map((s) => {
          const active = activeSubject === s;
          return (
            <span key={s} className="inline-flex items-center gap-1">
              <button
                onClick={() => setActiveSubject(s)}
                data-testid={`subject-tab-${s}`}
                className={`h-7 px-3 rounded-md text-xs font-semibold tracking-wide whitespace-nowrap transition-colors ${
                  active
                    ? "bg-blue-800 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {s}
              </button>
              {subjects.length > 1 && (
                <button
                  onClick={() => removeSubject(s)}
                  className="h-5 w-5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center"
                  title={`Remove ${s}`}
                >
                  <X size={10} />
                </button>
              )}
            </span>
          );
        })}
        {adding ? (
          <span className="inline-flex items-center gap-1">
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSubject(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Subject name"
              autoFocus
              className="h-7 w-28 px-2 rounded-md border border-stone-300 text-xs outline-none focus:ring-2 focus:ring-blue-800"
            />
            <button onClick={addSubject} className="h-6 w-6 rounded-md bg-blue-800 text-white flex items-center justify-center">
              <Plus size={12} />
            </button>
          </span>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="h-7 w-7 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center"
            title="Add subject"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      <div className="relative">
        <select
          value={activeClass}
          onChange={(e) => setActiveClass(e.target.value)}
          data-testid="context-class-select"
          className="h-7 pl-3 pr-7 rounded-md border border-stone-300 bg-white text-xs font-semibold text-stone-700 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-800"
        >
          {CLASS_OPTIONS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500" />
      </div>
    </div>
  );
};