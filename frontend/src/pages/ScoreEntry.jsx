import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/data/apiClient";
import { GRADES } from "@/data/gradeUtils";
import {
  ArrowLeft, Plus, Trash2, BarChart3, ClipboardPaste,
  Loader2, Zap, UploadCloud, X, Image as ImageIcon, FileSpreadsheet,
  Search, Type, FileText
} from "lucide-react";
import { toast } from "sonner";

const SUBJECT_CHAPTERS = {
  Biology: [
    { id: "ch1", name: "Cell Structure & Functions", concepts: ["Cell Wall", "Cell Membrane", "Cytoplasm", "Nucleus", "Unicellular", "Multicellular"] },
    { id: "ch2", name: "Microorganisms: Friend & Foe", concepts: ["Bacteria", "Virus", "Fungi", "Protozoa", "Communicable Diseases", "Antibiotics & Medicine", "Food Preservation"] },
    { id: "ch3", name: "Crop Production & Management", concepts: ["Crop Production", "Crop Seasons", "Agricultural Implements", "Irrigation", "Weed Control"] },
    { id: "ch4", name: "Reproduction in Animals", concepts: ["Sexual Reproduction", "Asexual Reproduction", "Fertilization", "Internal Fertilization", "IVF", "Metamorphosis", "Gametes", "Budding", "Binary Fission", "Male Reproductive System", "Female Reproductive System"] },
  ],
  Physics: [
    { id: "ch1", name: "Force and Laws of Motion", concepts: ["Force", "Newton's Laws", "Friction", "Pressure", "Gravity"] },
    { id: "ch2", name: "Sound", concepts: ["Vibration", "Frequency", "Amplitude", "Pitch", "Noise Pollution"] },
    { id: "ch3", name: "Light", concepts: ["Reflection", "Refraction", "Lenses", "Mirrors", "Human Eye"] },
    { id: "ch4", name: "Electric Current", concepts: ["Conductors", "Insulators", "Circuit", "Voltage", "Resistance"] },
  ],
  Chemistry: [
    { id: "ch1", name: "Matter & Its States", concepts: ["Solid", "Liquid", "Gas", "Plasma", "Phase Change"] },
    { id: "ch2", name: "Elements & Compounds", concepts: ["Atom", "Molecule", "Periodic Table", "Chemical Bond", "Mixture"] },
    { id: "ch3", name: "Acids, Bases & Salts", concepts: ["pH Scale", "Indicator", "Neutralization", "Salt Formation"] },
    { id: "ch4", name: "Chemical Reactions", concepts: ["Combination", "Decomposition", "Displacement", "Oxidation", "Reduction"] },
  ],
  Mathematics: [
    { id: "ch1", name: "Rational Numbers", concepts: ["Fractions", "Decimals", "Number Line", "Operations"] },
    { id: "ch2", name: "Algebra", concepts: ["Variables", "Equations", "Inequalities", "Polynomials"] },
    { id: "ch3", name: "Geometry", concepts: ["Angles", "Triangles", "Quadrilaterals", "Circles", "Area"] },
    { id: "ch4", name: "Data Handling", concepts: ["Mean", "Median", "Mode", "Bar Graph", "Probability"] },
  ],
};

const getChaptersForSubject = (subject) => {
  return SUBJECT_CHAPTERS[subject] || [
    { id: "ch1", name: "Chapter 1", concepts: ["Concept A", "Concept B", "Concept C"] },
    { id: "ch2", name: "Chapter 2", concepts: ["Concept D", "Concept E", "Concept F"] },
  ];
};

const SECTIONS = ["A", "B", "C", "D"];
const STUDENT_COUNT_OPTIONS = [10, 20, 30, 40, 50];

const getGrade = (total, maxMarks) => {
  const pct = maxMarks ? (total / maxMarks) * 100 : 0;
  return GRADES.find((g) => pct >= (g.min / 40) * 100) || GRADES[GRADES.length - 1];
};

const DropZone = ({ files, onAdd, onRemove, testId, acceptLabel = "JPEG or PNG" }) => {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) onAdd(e.dataTransfer.files); }}
        data-testid={`${testId}-dropzone`}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-blue-800 bg-blue-50" : "border-stone-300 bg-stone-50 hover:border-blue-400 hover:bg-blue-50/40"}`}
      >
        <UploadCloud size={24} className="text-blue-800 mx-auto" />
        <div className="mt-2 text-sm font-medium text-stone-700">Click or drop files</div>
        <div className="text-xs text-stone-400 mt-1">{acceptLabel}</div>
        <input ref={ref} type="file" multiple accept="image/jpeg,image/png" capture="environment" className="hidden" data-testid={`${testId}-input`} onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-40 overflow-auto">
          {files.map((f, i) => (
            <div key={f.id || i} className="relative group aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              <button onClick={() => onRemove(f.id || i)} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 truncate">{f.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EditableCell = ({ value, onChange, onKeyDown, className = "" }) => {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(String(value ?? ""));
  const ref = useRef(null);

  useEffect(() => { setLocalVal(String(value ?? "")); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.select(); }, [editing]);

  const commit = () => {
    const num = parseFloat(localVal);
    if (!isNaN(num) && num >= 0) onChange(num);
    else if (localVal === "" || localVal === "-") onChange(0);
    else setLocalVal(String(value ?? ""));
    setEditing(false);
  };

  if (!editing) {
    return (
      <div tabIndex={0} onClick={() => setEditing(true)} onFocus={() => setEditing(true)} className={`h-9 min-w-[52px] px-2 flex items-center justify-center text-sm font-mono cursor-pointer rounded hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 ${className}`}>
        {value != null && value !== "" ? value : <span className="text-stone-300">—</span>}
      </div>
    );
  }

  return (
    <input
      ref={ref} type="number" min="0" step="0.5" value={localVal}
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
      className="h-9 w-full min-w-[52px] px-1 text-center text-sm font-mono border-2 border-blue-500 rounded bg-white focus:outline-none"
    />
  );
};

const ScoreEntry = () => {
  const { t, user, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const excelInputRef = useRef(null);

  const subjects = user?.subjects?.length ? user.subjects : ["Biology"];

  const [name, setName] = useState("");
  const [subject, setSubject] = useState(activeSubject || "Biology");
  const [klass, setKlass] = useState(activeClass || "Class 8");
  const [type, setType] = useState("Unit Test");
  const [totalMarks, setTotalMarks] = useState(40);

  const [questions, setQuestions] = useState([]);
  const [qSection, setQSection] = useState("A");
  const [qMarks, setQMarks] = useState(1);
  const [qCount, setQCount] = useState(10);
  const [qChapter, setQChapter] = useState("ch1");
  const [qConcept, setQConcept] = useState("");

  const [studentCount, setStudentCount] = useState(30);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [qImages, setQImages] = useState([]);
  const [qTextInput, setQTextInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [showQPaperUpload, setShowQPaperUpload] = useState(false);

  const chapters = useMemo(() => getChaptersForSubject(subject), [subject]);

  const selectedChapterConcepts = useMemo(() => {
    const ch = chapters.find((c) => c.id === qChapter);
    return ch ? ch.concepts : [];
  }, [qChapter, chapters]);

  useEffect(() => {
    if (selectedChapterConcepts.length > 0 && !selectedChapterConcepts.includes(qConcept)) {
      setQConcept(selectedChapterConcepts[0]);
    }
  }, [qChapter, selectedChapterConcepts]);

  const addImages = useCallback((incoming) => {
    const list = Array.from(incoming).map((f, i) => ({
      id: `img-${Date.now()}-${i}`, name: f.name, file: f, preview: URL.createObjectURL(f),
    }));
    setQImages((prev) => [...prev, ...list].slice(0, 10));
  }, []);

  const removeQImage = useCallback((id) => {
    setQImages((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleAnalyzeQPaper = useCallback(async () => {
    if (qImages.length === 0 && !qTextInput.trim()) {
      toast.error("Upload question paper images or paste text first");
      return;
    }

    if (qImages.length === 0 && qTextInput.trim()) {
      try {
        const parsed = qTextInput.trim().split("\n").filter(Boolean).map((line, i) => {
          const num = i + 1;
          return { number: num, section: "A", maxMarks: 1, chapter: "ch1", concept: "" };
        });
        if (parsed.length > 0) {
          setQuestions(parsed);
          toast.success(`Parsed ${parsed.length} questions from text`);
        }
      } catch (e) { toast.error("Could not parse text"); }
      return;
    }

    setAnalyzing(true);
    const metadata = { name: name || "Draft", class: klass, subject: subject === "__custom__" ? subjects[0] : subject, type, totalMarks };

    try {
      const token = localStorage.getItem("evalassist-token");
      const formData = new FormData();
      formData.append("name", metadata.name);
      formData.append("class", metadata.class);
      formData.append("subject", metadata.subject);
      formData.append("type", metadata.type);
      formData.append("totalMarks", String(metadata.totalMarks));
      for (const img of qImages) { if (img.file) formData.append("questionFiles", img.file); }
      if (qTextInput.trim()) formData.append("questionsText", qTextInput);

      const res = await fetch("/api/assessments/", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const created = await res.json();
      const assessmentId = created._id || created.id;
      if (!assessmentId) throw new Error("Failed to create draft assessment");

      const r2 = await fetch(`/api/assessments/${assessmentId}/analyze-qpaper`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
      });
      const analysis = await r2.json();

      if (analysis.status === "ok") {
        const qs = await apiClient.getQuestions(assessmentId);
        if (qs && qs.length > 0) {
          const mapped = qs.map((q) => ({
            number: q.number, section: q.section || "A",
            maxMarks: q.maxMarks || 1, chapter: q.chapter || "ch1",
            concept: q.concept || "",
          }));
          setQuestions(mapped);
          toast.success(`AI extracted ${mapped.length} questions`);
        } else {
          toast.error("Questions extracted but none were mapped");
        }
      } else if (analysis.status === "skipped") {
        toast("Could not analyze images. Use templates or manual entry instead.");
      } else {
        toast.error(analysis.message || "Analysis failed");
      }
    } catch (err) {
      toast.error(err.message || "Analysis failed. Try templates or manual entry.");
    } finally {
      setAnalyzing(false);
    }
  }, [qImages, qTextInput, name, klass, subject, type, totalMarks, subjects]);

  const addQuestions = useCallback(() => {
    const startNum = questions.length + 1;
    const newQs = [];
    for (let i = 0; i < qCount; i++) {
      newQs.push({ number: startNum + i, section: qSection, maxMarks: qMarks, chapter: qChapter, concept: qConcept || selectedChapterConcepts[0] || "" });
    }
    setQuestions((prev) => [...prev, ...newQs]);
  }, [questions.length, qCount, qSection, qMarks, qChapter, qConcept, selectedChapterConcepts]);

  const applyTemplate = useCallback((template) => {
    const chs = chapters;
    const chLen = chs.length || 1;
    const templates = {
      "10-mcq": Array.from({ length: 10 }, (_, i) => { const ch = chs[i % chLen]; return { number: i + 1, section: "A", maxMarks: 1, chapter: ch.id, concept: ch.concepts[i % ch.concepts.length] }; }),
      "17-standard": [
        ...Array.from({ length: 10 }, (_, i) => { const ch = chs[i % chLen]; return { number: i + 1, section: "A", maxMarks: 1, chapter: ch.id, concept: ch.concepts[i % ch.concepts.length] }; }),
        ...Array.from({ length: 3 }, (_, i) => { const ch = chs[i % chLen]; return { number: 11 + i, section: "B", maxMarks: 2, chapter: ch.id, concept: ch.concepts[(i + 2) % ch.concepts.length] }; }),
        ...Array.from({ length: 2 }, (_, i) => { const ch = chs[i % chLen]; return { number: 14 + i, section: "C", maxMarks: 4, chapter: ch.id, concept: ch.concepts[(i + 4) % ch.concepts.length] }; }),
        ...Array.from({ length: 2 }, (_, i) => { const ch = chs[i % chLen]; return { number: 16 + i, section: "D", maxMarks: 8, chapter: ch.id, concept: ch.concepts[(i + 6) % ch.concepts.length] }; }),
      ],
    };
    if (templates[template]) setQuestions(templates[template]);
  }, [chapters]);

  const updateQuestion = useCallback((idx, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "chapter") {
        const ch = chapters.find((c) => c.id === value);
        if (ch?.concepts.length) updated[idx].concept = ch.concepts[0];
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

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const rows = text.split("\n").filter((line) => line.trim());
      const newScores = { ...scores };
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].split("\t");
        const rollCell = cells[0]?.trim();
        if (!rollCell || rollCell.toLowerCase() === "roll" || rollCell.toLowerCase() === "#") continue;
        const rollNum = parseInt(rollCell, 10);
        if (isNaN(rollNum) || rollNum < 1 || rollNum > studentCount) continue;
        const studentScores = {};
        for (let j = 1; j < cells.length && j <= questions.length + 1; j++) {
          const val = parseFloat(cells[j]?.trim());
          if (!isNaN(val)) studentScores[String(j)] = val;
        }
        if (Object.keys(studentScores).length > 0) {
          newScores[rollNum - 1] = studentScores;
          count++;
        }
      }
      if (count > 0) {
        setScores(newScores);
        toast.success(`Pasted scores for ${count} students`);
      } else {
        toast.error("No score data found. Format: Roll [Tab] Q1 [Tab] Q2...");
      }
    } catch (err) {
      toast.error("Clipboard access denied.");
    }
  }, [scores, studentCount, questions.length]);

  const handleExcelUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const newScores = { ...scores };
      let count = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const rollCell = String(row[0] || "").trim();
        if (!rollCell || rollCell.toLowerCase() === "roll" || rollCell.toLowerCase() === "#") continue;
        const rollNum = parseInt(rollCell, 10);
        if (isNaN(rollNum) || rollNum < 1 || rollNum > studentCount) continue;
        const studentScores = {};
        for (let j = 1; j < row.length && j <= questions.length + 1; j++) {
          const val = parseFloat(row[j]);
          if (!isNaN(val)) studentScores[String(j)] = val;
        }
        if (Object.keys(studentScores).length > 0) {
          newScores[rollNum - 1] = studentScores;
          count++;
        }
      }
      if (count > 0) {
        setScores(newScores);
        toast.success(`Imported scores for ${count} students from ${file.name}`);
      } else {
        toast.error("No scores found. Expected columns: Roll, Q1, Q2, ...");
      }
    } catch (err) {
      toast.error("Could not parse Excel file. Try a .xlsx file with columns: Roll, Q1, Q2...");
    }
  }, [scores, studentCount, questions.length]);

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

  const hasScore = useCallback((studentIdx) => {
    const studentScores = scores[studentIdx] || {};
    return Object.values(studentScores).some((v) => v > 0);
  }, [scores]);

  const classStats = useMemo(() => {
    if (questions.length === 0) return { avg: 0, passRate: 0, highest: 0, lowest: 0, scored: 0 };
    const totals = [];
    for (let i = 0; i < studentCount; i++) {
      if (hasScore(i)) totals.push(getStudentTotal(i));
    }
    if (totals.length === 0) return { avg: 0, passRate: 0, highest: 0, lowest: 0, scored: 0 };
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const passMark = totalMarks * 0.5;
    const passed = totals.filter((t) => t >= passMark).length;
    return { avg: Math.round(avg * 10) / 10, passRate: Math.round((passed / totals.length) * 100), highest: Math.max(...totals), lowest: Math.min(...totals), scored: totals.length };
  }, [studentCount, questions, getStudentTotal, hasScore, totalMarks]);

  const canSave = name && questions.length > 0 && classStats.scored > 0;

  const handleSave = async () => {
    if (!canSave || submitting) return;
    setSubmitting(true);
    const payload = {
      name, class: klass, subject: subject === "__custom__" ? subjects[0] : subject, type, totalMarks,
      questions: questions.map((q) => ({ number: q.number, section: q.section, maxMarks: q.maxMarks, chapter: q.chapter, concept: q.concept })),
      students: [],
    };
    for (let i = 0; i < studentCount; i++) {
      if (!hasScore(i)) continue;
      const studentScores = scores[i] || {};
      const scoreMap = {};
      questions.forEach((q) => { scoreMap[String(q.number)] = studentScores[String(q.number)] || 0; });
      payload.students.push({ name: `Roll ${String(i + 1).padStart(2, "0")}`, roll: String(i + 1).padStart(2, "0"), scores: scoreMap });
    }
    try {
      const data = await apiClient.createScoreEntry(payload);
      toast.success(`Saved ${payload.students.length} student scores. Opening insights...`);
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
    if (nextIdx >= 0 && nextIdx < cells.length) { cells[nextIdx].focus(); cells[nextIdx].click(); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 md:py-12" data-testid="score-entry-page">
      <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 mb-2">
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0"><Zap size={20} /></div>
          <div>
            <div className="text-sm font-semibold tracking-[0.08em] uppercase text-emerald-800">Quick Score Entry</div>
            <h1 className="mt-0.5 font-display text-3xl font-semibold text-stone-900">Enter Marks Directly</h1>
            <p className="text-sm text-stone-600 mt-1">Upload Q paper images for AI extraction, or use quick templates. Enter scores manually or import from Excel.</p>
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

      {/* Step 2: Question Structure */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm mb-6">
        <div className="text-sm font-semibold text-stone-700 mb-4">2. Question Structure</div>

        {/* Q Paper Upload — collapsible */}
        <div className="mb-4">
          <button
            onClick={() => setShowQPaperUpload((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showQPaperUpload ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-800"}`}
          >
            <ImageIcon size={16} />
            AI Extract from Q Paper Images
            <span className="text-xs text-stone-400 ml-1">{showQPaperUpload ? "(close)" : "(optional)"}</span>
          </button>
          {showQPaperUpload && (
            <div className="mt-3 p-4 rounded-lg bg-blue-50/30 border border-blue-100">
              <p className="text-xs text-stone-500 mb-3">
                Upload photos of the question paper. AI will extract question numbers, sections, marks, chapters, and concepts.
                Multiple screenshots, textbook paragraphs, and board-written questions are all supported — the AI will do its best to structure them.
              </p>
              <DropZone files={qImages} onAdd={addImages} onRemove={removeQImage} testId="zone-qpaper" acceptLabel="JPEG or PNG — Q paper, paragraphs, screenshots" />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleAnalyzeQPaper}
                  disabled={analyzing || (qImages.length === 0 && !qTextInput.trim())}
                  className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg font-medium text-sm transition-colors ${analyzing ? "bg-blue-100 text-blue-600" : "bg-blue-800 text-white hover:bg-blue-900"} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing with AI...</> : <><Search size={14} /> Analyze Q Paper</>}
                </button>
                <span className="text-xs text-stone-400">or paste text below</span>
              </div>
              <textarea
                value={qTextInput}
                onChange={(e) => setQTextInput(e.target.value)}
                placeholder="Paste question text here if you prefer...&#10;1. Identify the odd one with respect to fertilization&#10;2. Best way to prevent Hepatitis A?&#10;..."
                rows={3}
                className="mt-3 w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 resize-none"
              />
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-stone-500 mb-2">Quick templates {questions.length > 0 ? "(will replace)" : ""}:</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => applyTemplate("10-mcq")} className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 hover:border-emerald-200 text-sm font-medium transition-colors">10 MCQs (1 mark each)</button>
            <button onClick={() => applyTemplate("17-standard")} className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 hover:border-emerald-200 text-sm font-medium transition-colors">17 Qs Standard</button>
          </div>
        </div>

        {/* Manual builder */}
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
              {chapters.map((c) => <option key={c.id} value={c.id}>{c.name.split(":")[0]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">Concept</label>
            <select value={qConcept} onChange={(e) => setQConcept(e.target.value)} className="h-9 px-2 rounded border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {selectedChapterConcepts.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={addQuestions} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5"><Plus size={14} /> Add</button>
        </div>

        {questions.length > 0 && (
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[44px_64px_64px_1fr_1fr_44px] gap-1 px-3 py-2 bg-stone-50 border-b border-stone-200 text-xs font-semibold tracking-wide text-stone-500">
              <div>#</div><div>Section</div><div>Marks</div><div>Chapter</div><div>Concept</div><div></div>
            </div>
            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
              {questions.map((q, i) => {
                const ch = chapters.find((c) => c.id === q.chapter);
                const concepts = ch ? ch.concepts : [];
                return (
                  <div key={i} className="grid grid-cols-[44px_64px_64px_1fr_1fr_44px] gap-1 px-3 py-1.5 items-center hover:bg-stone-50/50">
                    <div className="text-sm font-mono text-stone-600">{q.number}</div>
                    <select value={q.section} onChange={(e) => updateQuestion(i, "section", e.target.value)} className="h-8 px-1 rounded border border-stone-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      {SECTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <input type="number" min="0.5" step="0.5" value={q.maxMarks} onChange={(e) => updateQuestion(i, "maxMarks", parseFloat(e.target.value || "1"))} className="h-8 w-full px-1 rounded border border-stone-200 bg-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <select value={q.chapter} onChange={(e) => updateQuestion(i, "chapter", e.target.value)} className="h-8 px-1 rounded border border-stone-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      {chapters.map((c) => <option key={c.id} value={c.id}>{c.name.split(":")[0]}</option>)}
                    </select>
                    <select value={q.concept} onChange={(e) => updateQuestion(i, "concept", e.target.value)} className="h-8 px-1 rounded border border-stone-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500">
                      {concepts.map((c) => <option key={c} value={c}>{c}</option>)}
                      {!concepts.includes(q.concept) && q.concept && <option value={q.concept}>{q.concept}</option>}
                    </select>
                    <button onClick={() => removeQuestion(i)} className="h-7 w-7 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Score Grid */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm font-semibold text-stone-700">3. Enter Scores</div>
              <div className="text-xs text-stone-500 mt-0.5">Click any cell or use Tab/Enter to navigate. Only rows with scores are saved.</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-stone-500">Students:</label>
              <select value={studentCount} onChange={(e) => setStudentCount(parseInt(e.target.value, 10))} className="h-8 px-2 rounded border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                {STUDENT_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePasteFromClipboard} disabled={questions.length === 0} className="h-9 px-3 rounded-lg bg-white border border-stone-300 text-stone-600 text-xs font-medium hover:bg-stone-50 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed" title="Paste tab-separated scores from clipboard">
              <ClipboardPaste size={14} /> Paste
            </button>
            <button
              onClick={() => excelInputRef.current?.click()}
              disabled={questions.length === 0}
              className="h-9 px-3 rounded-lg bg-white border border-stone-300 text-stone-600 text-xs font-medium hover:bg-stone-50 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Upload an Excel (.xlsx) file"
            >
              <FileSpreadsheet size={14} /> Upload Excel
            </button>
            <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="px-5 py-12 text-center text-stone-400 text-sm">Define question structure above to begin entering scores.</div>
        ) : (
          <>
            <div className="px-5 py-2 border-b border-stone-100 flex items-center gap-4 text-xs text-stone-500">
              <span>Avg: <strong className="text-stone-800">{classStats.avg}</strong></span>
              <span>Pass: <strong className={classStats.passRate >= 50 ? "text-emerald-700" : "text-rose-700"}>{classStats.passRate}%</strong></span>
              <span>High: <strong className="text-stone-800">{classStats.highest}</strong></span>
              <span>Low: <strong className="text-stone-800">{classStats.lowest}</strong></span>
              <span className="text-stone-400">| Scored: {classStats.scored}/{studentCount}</span>
            </div>
            <div className="overflow-x-auto" ref={gridRef}>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-stone-50 border-b border-r border-stone-200 px-3 py-2 text-center text-xs font-semibold text-stone-600 min-w-[52px]">#</th>
                    {questions.map((q) => (
                      <th key={q.number} className="bg-stone-50 border-b border-r border-stone-100 px-2 py-2 text-center text-xs font-semibold text-stone-600 min-w-[60px]" title={`${q.concept} (${q.maxMarks} marks)`}>
                        <div>Q{q.number}</div><div className="text-[10px] text-stone-400 font-normal">{q.maxMarks}</div>
                      </th>
                    ))}
                    <th className="bg-stone-50 border-b border-stone-200 px-3 py-2 text-center text-xs font-semibold text-stone-600 min-w-[72px]">Total</th>
                    <th className="bg-stone-50 border-b border-stone-200 px-3 py-2 text-center text-xs font-semibold text-stone-600 min-w-[56px]">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: studentCount }, (_, i) => {
                    const rollNum = String(i + 1).padStart(2, "0");
                    const total = getStudentTotal(i);
                    const grade = getStudentGradeLabel(i);
                    const active = hasScore(i);
                    return (
                      <tr key={i} className={`hover:bg-stone-50/50 border-b border-stone-100 ${!active ? "opacity-40" : ""}`}>
                        <td className="sticky left-0 z-10 bg-white border-r border-stone-200 px-2 py-1.5 text-center">
                          <span className="text-sm font-mono font-bold text-stone-600">{rollNum}</span>
                        </td>
                        {questions.map((q) => {
                          const cellValue = (scores[i] || {})[String(q.number)];
                          return (
                            <td key={q.number} className="border-r border-stone-50 px-0 py-0 text-center">
                              <div data-cell={`${i}-${q.number}`}>
                                <EditableCell value={cellValue} onChange={(val) => updateScore(i, q.number, val)} onKeyDown={handleCellKey(i, q.number)} />
                              </div>
                            </td>
                          );
                        })}
                        <td className="border-r border-stone-100 px-3 py-1.5 text-center">
                          <span className="text-sm font-bold font-mono text-stone-900">{total}</span>
                          <span className="text-stone-400 text-xs font-normal">/{totalMarks}</span>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`inline-flex items-center justify-center h-7 w-10 rounded-md text-xs font-bold ${grade.color === "emerald" ? "bg-emerald-100 text-emerald-800" : grade.color === "blue" ? "bg-blue-100 text-blue-800" : grade.color === "amber" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"} ${!active ? "opacity-30" : ""}`}>
                            {active ? grade.grade : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button onClick={() => navigate("/dashboard")} className="h-12 px-5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium">Cancel</button>
        <button disabled={!canSave || submitting} onClick={handleSave} className={`inline-flex items-center gap-2 h-12 px-6 rounded-lg font-medium text-white transition-colors ${canSave ? "bg-emerald-700 hover:bg-emerald-800" : "bg-stone-300 cursor-not-allowed"}`} data-testid="btn-save-scores">
          {submitting ? (<><Loader2 size={18} className="animate-spin" /> Saving...</>) : (<><BarChart3 size={18} /> Save & View Insights ({classStats.scored} students)</>)}
        </button>
      </div>
    </div>
  );
};

export default ScoreEntry;
