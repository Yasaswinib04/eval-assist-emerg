import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/data/apiClient";
import { GRADES } from "@/data/gradeUtils";
import {
  ArrowLeft, Plus, Trash2, BarChart3, ClipboardPaste,
  Users, Loader2, Zap
} from "lucide-react";
import { toast } from "sonner";

const CHAPTERS = [
  { id: "ch1", name: "Cell Structure & Functions", concepts: ["Cell Wall", "Cell Membrane", "Cytoplasm", "Nucleus", "Unicellular", "Multicellular"] },
  { id: "ch2", name: "Microorganisms: Friend & Foe", concepts: ["Bacteria", "Virus", "Fungi", "Protozoa", "Communicable Diseases", "Antibiotics & Medicine", "Food Preservation"] },
  { id: "ch3", name: "Crop Production & Management", concepts: ["Crop Production", "Crop Seasons", "Agricultural Implements", "Irrigation", "Weed Control"] },
  { id: "ch4", name: "Reproduction in Animals", concepts: ["Sexual Reproduction", "Asexual Reproduction", "Fertilization", "Internal Fertilization", "IVF", "Metamorphosis", "Gametes", "Budding", "Binary Fission", "Male Reproductive System", "Female Reproductive System"] },
];

const SECTIONS = ["A", "B", "C", "D"];

const getGrade = (total, maxMarks) => {
  const pct = maxMarks ? (total / maxMarks) * 100 : 0;
  return GRADES.find((g) => pct >= (g.min / 40) * 100) || GRADES[GRADES.length - 1];
};

const EditableCell = ({ value, onChange, onKeyDown, onFocus, className = "" }) => {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value ?? ""));
  const ref = useRef(null);

  useEffect(() => { setLocalVal(String(value ?? "")); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.select(); }, [editing]);

  const commit = () => {
    const num = parseFloat(localVal);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    } else if (localVal === "" || localVal === "-") {
      onChange(0);
    } else {
      setLocalVal(String(value ?? ""));
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        tabIndex={0}
        onClick={() => setEditing(true)}
        onFocus={() => setEditing(true)}
        className={`h-9 min-w-[52px] px-2 flex items-center justify-center text-sm font-mono cursor-pointer rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 ${className}`}
      >
        {value ?? "-"}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type="number"
      min="0"
      step="0.5"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); onKeyDown?.("enter"); }
        if (e.key === "Tab") { e.preventDefault(); commit(); onKeyDown?.("tab"); }
        if (e.key === "ArrowRight") { e.preventDefault(); commit(); onKeyDown?.("right"); }
        if (e.key === "ArrowLeft") { e.preventDefault(); commit(); onKeyDown?.("left"); }
        if (e.key === "ArrowDown") { e.preventDefault(); commit(); onKeyDown?.("down"); }
        if (e.key === "ArrowUp") { e.preventDefault(); commit(); onKeyDown?.("up"); }
        if (e.key === "Escape") { setLocalVal(String(value ?? "")); setEditing(false); }
      }}
      className={`h-9 w-full min-w-[52px] px-1 text-center text-sm font-mono border-2 border-blue-500 rounded bg-white focus:outline-none ${className}`}
    />
  );
};

const ScoreEntry = () => {
  const { t, user, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();
  const gridRef = useRef(null);

  const subjects = user?.subjects?.length ? user.subjects : ["Biology"];

  const [name, setName] = useState("");
  const [subject, setSubject] = useState(activeSubject || "Biology");
  const [customSubject, setCustomSubject] = useState("");
  const [klass, setKlass] = useState(activeClass || "Class 8");
  const [type, setType] = useState("Unit Test");
  const [totalMarks, setTotalMarks] = useState(40);

  const [questions, setQuestions] = useState([]);
  const [qSection, setQSection] = useState("A");
  const [qMarks, setQMarks] = useState(1);
  const [qCount, setQCount] = useState(10);
  const [qChapter, setQChapter] = useState("ch1");
  const [qConcept, setQConcept] = useState("");

  const [studentNames, setStudentNames] = useState("");
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const selectedChapterConcepts = useMemo(() => {
    const ch = CHAPTERS.find((c) => c.id === qChapter);
    return ch ? ch.concepts : [];
  }, [qChapter]);

  useEffect(() => {
    if (selectedChapterConcepts.length > 0 && !selectedChapterConcepts.includes(qConcept)) {
      setQConcept(selectedChapterConcepts[0]);
    }
  }, [qChapter, selectedChapterConcepts]);

  const addQuestions = useCallback(() => {
    const startNum = questions.length + 1;
    const newQs = [];
    for (let i = 0; i < qCount; i++) {
      newQs.push({
        number: startNum + i,
        section: qSection,
        maxMarks: qMarks,
        chapter: qChapter,
        concept: qConcept || selectedChapterConcepts[0] || "",
      });
    }
    setQuestions((prev) => [...prev, ...newQs]);
  }, [questions.length, qCount, qSection, qMarks, qChapter, qConcept, selectedChapterConcepts]);

  const applyTemplate = useCallback((template) => {
    const templates = {
      "10-mcq": (() => {
        const qs = [];
        for (let i = 1; i <= 10; i++) {
          const chIdx = (i - 1) % CHAPTERS.length;
          const ch = CHAPTERS[chIdx];
          qs.push({ number: i, section: "A", maxMarks: 1, chapter: ch.id, concept: ch.concepts[(i - 1) % ch.concepts.length] });
        }
        return qs;
      })(),
      "17-standard": [
        ...Array.from({ length: 10 }, (_, i) => { const ch = CHAPTERS[i % 4]; return { number: i + 1, section: "A", maxMarks: 1, chapter: ch.id, concept: ch.concepts[i % ch.concepts.length] }; }),
        ...Array.from({ length: 3 }, (_, i) => { const ch = CHAPTERS[i % 4]; return { number: 11 + i, section: "B", maxMarks: 2, chapter: ch.id, concept: ch.concepts[(i + 2) % ch.concepts.length] }; }),
        ...Array.from({ length: 2 }, (_, i) => { const ch = CHAPTERS[i % 4]; return { number: 14 + i, section: "C", maxMarks: 4, chapter: ch.id, concept: ch.concepts[(i + 4) % ch.concepts.length] }; }),
        ...Array.from({ length: 2 }, (_, i) => { const ch = CHAPTERS[i % 4]; return { number: 16 + i, section: "D", maxMarks: 8, chapter: ch.id, concept: ch.concepts[(i + 6) % ch.concepts.length] }; }),
      ],
    };
    if (templates[template]) setQuestions(templates[template]);
  }, []);

  const updateQuestion = useCallback((idx, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "chapter") {
        const ch = CHAPTERS.find((c) => c.id === value);
        if (ch && ch.concepts.length > 0) updated[idx].concept = ch.concepts[0];
      }
      return updated;
    });
  }, []);

  const removeQuestion = useCallback((idx) => {
    setQuestions((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated.map((q, i) => ({ ...q, number: i + 1 }));
    });
  }, []);

  const parseStudentNames = useCallback(() => {
    const names = studentNames.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    setStudents((prev) => {
      const existing = new Set(prev.map((s) => s.name.toLowerCase()));
      const unique = names.filter((n) => !existing.has(n.toLowerCase()));
      return [...prev, ...unique.map((name) => ({ name, roll: "" }))];
    });
    setStudentNames("");
  }, [studentNames]);

  const removeStudent = useCallback((idx) => {
    setStudents((prev) => prev.filter((_, i) => i !== idx));
    setScores((prev) => {
      const updated = { ...prev };
      delete updated[idx];
      return updated;
    });
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split("\n").filter((line) => line.trim());
      const parsedStudents = [];
      const parsedScores = {};
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].split("\t");
        const name = cells[0]?.trim();
        if (!name || name.toLowerCase() === "student" || name.toLowerCase() === "name") continue;
        parsedStudents.push({ name, roll: "" });
        const studentScores = {};
        for (let j = 1; j < cells.length && j <= questions.length + 1; j++) {
          const val = parseFloat(cells[j]?.trim());
          if (!isNaN(val)) studentScores[String(j)] = val;
        }
        parsedScores[parsedStudents.length - 1] = studentScores;
      }
      if (parsedStudents.length > 0) {
        setStudents(parsedStudents);
        setScores(parsedScores);
        toast.success(`Pasted ${parsedStudents.length} students`);
      } else {
        toast.error("No student data found. Use Tab-separated format: Name, Q1, Q2...");
      }
    } catch (err) {
      toast.error("Clipboard access denied. Please paste data manually.");
    }
  }, [questions.length]);

  const updateScore = useCallback((studentIdx, qNum, value) => {
    setScores((prev) => {
      const studentScores = { ...(prev[studentIdx] || {}) };
      studentScores[String(qNum)] = value;
      return { ...prev, [studentIdx]: studentScores };
    });
  }, []);

  const getStudentTotal = useCallback((studentIdx) => {
    const studentScores = scores[studentIdx] || {};
    return questions.reduce((sum, q) => sum + (studentScores[String(q.number)] || 0), 0);
  }, [scores, questions]);

  const getStudentGradeLabel = useCallback((studentIdx) => {
    return getGrade(getStudentTotal(studentIdx), totalMarks);
  }, [getStudentTotal, totalMarks]);

  const classStats = useMemo(() => {
    if (students.length === 0 || questions.length === 0) return { avg: 0, passRate: 0, highest: 0, lowest: 0 };
    const totals = students.map((_, i) => getStudentTotal(i));
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const passMark = totalMarks * 0.5;
    const passed = totals.filter((t) => t >= passMark).length;
    return {
      avg: Math.round(avg * 10) / 10,
      passRate: Math.round((passed / totals.length) * 100),
      highest: Math.max(...totals),
      lowest: Math.min(...totals),
    };
  }, [students, questions, getStudentTotal, totalMarks]);

  const canSave = name && questions.length > 0 && students.length > 0;

  const handleSave = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    const payload = {
      name,
      class: klass,
      subject: subject === "__custom__" ? customSubject : subject,
      type,
      totalMarks,
      questions: questions.map((q) => ({
        number: q.number, section: q.section, maxMarks: q.maxMarks,
        chapter: q.chapter, concept: q.concept,
      })),
      students: students.map((s, i) => {
        const studentScores = scores[i] || {};
        const scoreMap = {};
        questions.forEach((q) => { scoreMap[String(q.number)] = studentScores[String(q.number)] || 0; });
        return { name: s.name, roll: s.roll, scores: scoreMap };
      }),
    };
    try {
      const data = await apiClient.createScoreEntry(payload);
      toast.success("Assessment saved! Opening insights...");
      navigate(`/insights/${data._id || data.id}`);
    } catch (err) {
      toast.error(err.message || "Failed to save assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCellKey = (studentIdx, col) => (direction) => {
    if (!gridRef.current) return;
    const cells = gridRef.current.querySelectorAll("[data-cell]");
    const currentCell = gridRef.current.querySelector(`[data-cell="${studentIdx}-${col}"]`);
    if (!currentCell) return;
    const flatIndex = Array.from(cells).indexOf(currentCell);
    const colsPerRow = questions.length + 1;
    let nextIdx = flatIndex;
    if (direction === "right" || direction === "tab") nextIdx = flatIndex + 1;
    else if (direction === "left") nextIdx = flatIndex - 1;
    else if (direction === "down" || direction === "enter") nextIdx = flatIndex + colsPerRow;
    else if (direction === "up") nextIdx = flatIndex - colsPerRow;
    if (nextIdx >= 0 && nextIdx < cells.length) {
      cells[nextIdx].focus();
      cells[nextIdx].click();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="score-entry-page">
      <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 mb-2">
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[0.08em] uppercase text-emerald-800">Quick Score Entry</div>
            <h1 className="mt-0.5 font-display text-3xl font-semibold text-stone-900">Enter Marks Directly</h1>
            <p className="text-sm text-stone-600 mt-1">Skip scanning — enter scores you've already given and get concept-wise analysis instantly.</p>
          </div>
        </div>
      </div>

      {/* Step 1: Assessment Metadata */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm mb-6">
        <div className="text-sm font-semibold text-stone-700 mb-4">1. Assessment Details</div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">Assessment Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Unit Test 3 — Reproduction" className="w-full h-11 px-3 rounded-lg border border-stone-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600" data-testid="input-se-name" />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-stone-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {subjects.map((s) => <option key={s}>{s}</option>)}
              <option value="__custom__">+ Custom</option>
            </select>
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">Class</label>
            <select value={klass} onChange={(e) => setKlass(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-stone-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {["Class 6","Class 7","Class 8","Class 9","Class 10"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-stone-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {["Revision Test","Unit Test","Formative Assessment","Summative Assessment","Practice Quiz"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">Total Marks</label>
            <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value || "40", 10))} className="w-full h-11 px-3 rounded-lg border border-stone-300 bg-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>
        </div>
      </div>

      {/* Step 2: Question Builder */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm mb-6">
        <div className="text-sm font-semibold text-stone-700 mb-4">2. Question Structure</div>
        {questions.length === 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-stone-500 mb-2">Quick templates:</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => applyTemplate("10-mcq")} className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 hover:border-emerald-200 text-sm font-medium transition-colors">10 MCQs (1 mark each)</button>
              <button onClick={() => applyTemplate("17-standard")} className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 hover:border-emerald-200 text-sm font-medium transition-colors">17 Qs Standard (10 MCQ + 3 Short + 2 Long + 2 Essay)</button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 mb-4 p-3 bg-stone-50 rounded-lg border border-stone-200">
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">Add</label>
            <input type="number" min="1" max="50" value={qCount} onChange={(e) => setQCount(parseInt(e.target.value || "1", 10))} className="w-16 h-9 px-2 rounded border border-stone-300 bg-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">Section</label>
            <select value={qSection} onChange={(e) => setQSection(e.target.value)} className="h-9 px-2 rounded border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">Marks</label>
            <input type="number" min="0.5" step="0.5" value={qMarks} onChange={(e) => setQMarks(parseFloat(e.target.value || "1"))} className="w-16 h-9 px-2 rounded border border-stone-300 bg-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">Chapter</label>
            <select value={qChapter} onChange={(e) => setQChapter(e.target.value)} className="h-9 px-2 rounded border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.name.split(":")[0]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">Concept</label>
            <select value={qConcept} onChange={(e) => setQConcept(e.target.value)} className="h-9 px-2 rounded border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {selectedChapterConcepts.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={addQuestions} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5">
            <Plus size={14} /> Add
          </button>
        </div>

        {questions.length > 0 && (
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[44px_64px_64px_1fr_1fr_44px] gap-1 px-3 py-2 bg-stone-50 border-b border-stone-200 text-xs font-semibold tracking-wide text-stone-500">
              <div>#</div><div>Section</div><div>Marks</div><div>Chapter</div><div>Concept</div><div></div>
            </div>
            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
              {questions.map((q, i) => {
                const ch = CHAPTERS.find((c) => c.id === q.chapter);
                const concepts = ch ? ch.concepts : [];
                return (
                  <div key={i} className="grid grid-cols-[44px_64px_64px_1fr_1fr_44px] gap-1 px-3 py-1.5 items-center hover:bg-stone-50/50">
                    <div className="text-sm font-mono text-stone-600">{q.number}</div>
                    <select value={q.section} onChange={(e) => updateQuestion(i, "section", e.target.value)} className="h-8 px-1 rounded border border-stone-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      {SECTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <input type="number" min="0.5" step="0.5" value={q.maxMarks} onChange={(e) => updateQuestion(i, "maxMarks", parseFloat(e.target.value || "1"))} className="h-8 w-full px-1 rounded border border-stone-200 bg-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <select value={q.chapter} onChange={(e) => updateQuestion(i, "chapter", e.target.value)} className="h-8 px-1 rounded border border-stone-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      {CHAPTERS.map((c) => <option key={c.id} value={c.id}>{c.name.split(":")[0]}</option>)}
                    </select>
                    <select value={q.concept} onChange={(e) => updateQuestion(i, "concept", e.target.value)} className="h-8 px-1 rounded border border-stone-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      {concepts.map((c) => <option key={c} value={c}>{c}</option>)}
                      {!concepts.includes(q.concept) && q.concept && <option value={q.concept}>{q.concept}</option>}
                    </select>
                    <button onClick={() => removeQuestion(i)} className="h-7 w-7 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center">
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Students */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm mb-6">
        <div className="text-sm font-semibold text-stone-700 mb-4">3. Students</div>
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <div className="flex-1 min-w-[280px]">
            <label className="block text-xs font-semibold text-stone-500 mb-1">Add students (comma or newline separated)</label>
            <textarea value={studentNames} onChange={(e) => setStudentNames(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); parseStudentNames(); } }} placeholder="e.g. Karan Singh, Rahul Sharma, Aryan Patel&#10;Paste names from your register..." rows={2} className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none" data-testid="input-student-names" />
          </div>
          <button onClick={parseStudentNames} className="h-11 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5">
            <Plus size={14} /> Add Students
          </button>
          <button onClick={handlePasteFromClipboard} disabled={questions.length === 0} className="h-11 px-4 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed" title={questions.length === 0 ? "Add questions first" : "Paste tab-separated data (Name, Q1, Q2, ...)"}>
            <ClipboardPaste size={14} /> Paste from Excel
          </button>
        </div>
        {students.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {students.map((s, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-sm">
                <Users size={12} className="text-stone-400" /><span className="text-stone-700">{s.name}</span>
                <button onClick={() => removeStudent(i)} className="h-5 w-5 rounded-full hover:bg-rose-100 text-stone-400 hover:text-rose-600 flex items-center justify-center"><Trash2 size={10} /></button>
              </div>
            ))}
            <button onClick={() => { setStudents([]); setScores({}); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-sm hover:bg-rose-100">Clear all</button>
          </div>
        )}
      </div>

      {/* Step 4: Score Grid */}
      {students.length > 0 && questions.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-semibold text-stone-700">4. Enter Scores</div>
              <div className="text-xs text-stone-500 mt-0.5">Click any cell or use Tab/Enter to navigate.</div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-stone-500">Avg: <strong className="text-stone-900">{classStats.avg}</strong></span>
              <span className="text-stone-500">Pass: <strong className={classStats.passRate >= 50 ? "text-emerald-700" : "text-rose-700"}>{classStats.passRate}%</strong></span>
              <span className="text-stone-500">High: <strong className="text-stone-900">{classStats.highest}</strong></span>
              <span className="text-stone-500">Low: <strong className="text-stone-900">{classStats.lowest}</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto" ref={gridRef}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-stone-50 border-b border-r border-stone-200 px-3 py-2 text-left text-xs font-semibold text-stone-600 min-w-[140px]">Student</th>
                  {questions.map((q) => (
                    <th key={q.number} className="bg-stone-50 border-b border-r border-stone-100 px-2 py-2 text-center text-xs font-semibold text-stone-600 min-w-[60px]" title={`${q.concept} (${q.maxMarks} marks)`}>
                      <div>Q{q.number}</div><div className="text-[10px] text-stone-400 font-normal">{q.maxMarks}</div>
                    </th>
                  ))}
                  <th className="bg-stone-50 border-b border-stone-200 px-3 py-2 text-center text-xs font-semibold text-stone-600 min-w-[72px]">Total</th>
                  <th className="bg-stone-50 border-b border-stone-200 px-3 py-2 text-center text-xs font-semibold text-stone-600 min-w-[60px]">Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, studentIdx) => {
                  const total = getStudentTotal(studentIdx);
                  const grade = getStudentGradeLabel(studentIdx);
                  return (
                    <tr key={studentIdx} className="hover:bg-stone-50/50 border-b border-stone-100">
                      <td className="sticky left-0 z-10 bg-white border-r border-stone-200 px-3 py-1.5">
                        <div className="text-sm font-medium text-stone-900 truncate">{s.name}</div>
                      </td>
                      {questions.map((q) => {
                        const cellValue = (scores[studentIdx] || {})[String(q.number)];
                        return (
                          <td key={q.number} className="border-r border-stone-50 px-0 py-0 text-center">
                            <div data-cell={`${studentIdx}-${q.number}`}>
                              <EditableCell value={cellValue} onChange={(val) => updateScore(studentIdx, q.number, val)} onKeyDown={handleCellKey(studentIdx, q.number)} />
                            </div>
                          </td>
                        );
                      })}
                      <td className="border-r border-stone-100 px-3 py-1.5 text-center">
                        <span className="text-sm font-bold font-mono text-stone-900">{total}</span>
                        <span className="text-stone-400 text-xs font-normal">/{totalMarks}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`inline-flex items-center justify-center h-7 w-10 rounded-md text-xs font-bold ${grade.color === "emerald" ? "bg-emerald-100 text-emerald-800" : grade.color === "blue" ? "bg-blue-100 text-blue-800" : grade.color === "amber" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                          {grade.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button onClick={() => navigate("/dashboard")} className="h-12 px-5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium">Cancel</button>
        <button disabled={!canSave || submitting} onClick={handleSave} className={`inline-flex items-center gap-2 h-12 px-6 rounded-lg font-medium text-white transition-colors ${canSave ? "bg-emerald-700 hover:bg-emerald-800" : "bg-stone-300 cursor-not-allowed"}`} data-testid="btn-save-scores">
          {submitting ? (<><Loader2 size={18} className="animate-spin" /> Saving...</>) : (<><BarChart3 size={18} /> Save & View Insights</>)}
        </button>
      </div>
    </div>
  );
};

export default ScoreEntry;
