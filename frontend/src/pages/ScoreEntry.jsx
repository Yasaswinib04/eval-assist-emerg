import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { apiClient } from "@/data/apiClient";
import { GRADES } from "@/data/gradeUtils";
import {
  ArrowLeft, BarChart3, ClipboardPaste,
  Loader2, UploadCloud, X, Image as ImageIcon, FileSpreadsheet,
  Search, Type, AlertTriangle, RotateCw
} from "lucide-react";
import { toast } from "sonner";

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

  const [studentCount, setStudentCount] = useState(30);
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [qImages, setQImages] = useState([]);
  const [qTextInput, setQTextInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [qInputMode, setQInputMode] = useState("images");

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

    setAnalyzing(true);
    setAnalysisError("");
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
            maxMarks: q.maxMarks || 1, chapter: q.chapter || "",
            concept: q.concept || "",
          }));
          setQuestions(mapped);
          toast.success(`AI extracted ${mapped.length} questions`);
        } else {
          setAnalysisError("Questions were extracted but none could be mapped. Try a clearer photo or re-paste the text.");
        }
      } else if (analysis.status === "skipped") {
        setAnalysisError("Could not read the question paper. Try a clearer photo, or switch to pasting the text instead.");
      } else {
        setAnalysisError(analysis.message || "Analysis failed. Please try again.");
      }
    } catch (err) {
      setAnalysisError(err.message || "Network error. Check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  }, [qImages, qTextInput, name, klass, subject, type, totalMarks, subjects]);

  const scoreColumns = useMemo(() => {
    const cols = [];
    questions.forEach((q) => {
      cols.push(String(q.number));
      if (q.subQuestions && q.subQuestions.length > 0) {
        q.subQuestions.forEach((sq) => cols.push(`${q.number}-${sq.number}`));
      }
    });
    return cols;
  }, [questions]);

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
        for (let j = 1; j < cells.length && j <= scoreColumns.length + 1; j++) {
          const val = parseFloat(cells[j]?.trim());
          if (!isNaN(val)) studentScores[scoreColumns[j - 1]] = val;
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
  }, [scores, studentCount, scoreColumns]);

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
        for (let j = 1; j < row.length && j <= scoreColumns.length + 1; j++) {
          const val = parseFloat(row[j]);
          if (!isNaN(val)) studentScores[scoreColumns[j - 1]] = val;
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
  }, [scores, studentCount, scoreColumns]);

  const updateScore = useCallback((studentIdx, qNum, value) => {
    setScores((prev) => {
      const studentScores = { ...(prev[studentIdx] || {}) };
      studentScores[String(qNum)] = value;
      return { ...prev, [studentIdx]: studentScores };
    });
  }, []);

  const getStudentTotal = useCallback((studentIdx) => {
    const studentScores = scores[studentIdx] || {};
    return questions.reduce((sum, q) => {
      let qSum = studentScores[String(q.number)] || 0;
      if (q.subQuestions && q.subQuestions.length > 0) {
        qSum = q.subQuestions.reduce((s, sq) => s + (studentScores[`${q.number}-${sq.number}`] || 0), 0);
      }
      return sum + qSum;
    }, 0);
  }, [scores, questions]);

  const getStudentGradeLabel = useCallback((studentIdx) => {
    return getGrade(getStudentTotal(studentIdx), totalMarks);
  }, [getStudentTotal, totalMarks]);

  const hasScore = useCallback((studentIdx) => {
    const studentScores = scores[studentIdx] || {};
    return Object.values(studentScores).some((v) => v > 0) || Object.keys(studentScores).some((k) => k.includes("-") && studentScores[k] > 0);
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
      questions: questions.map((q) => ({
        number: q.number, section: q.section, maxMarks: q.maxMarks, chapter: q.chapter, concept: q.concept,
        subQuestions: q.subQuestions && q.subQuestions.length > 0 ? q.subQuestions.map((sq) => ({
          number: sq.number, text: sq.text, maxMarks: sq.maxMarks,
        })) : [],
      })),
      students: [],
    };
    for (let i = 0; i < studentCount; i++) {
      if (!hasScore(i)) continue;
      const studentScores = scores[i] || {};
      const scoreMap = {};
      questions.forEach((q) => {
        const qKey = String(q.number);
        if (q.subQuestions && q.subQuestions.length > 0) {
          const subTotal = q.subQuestions.reduce((s, sq) => s + (studentScores[`${q.number}-${sq.number}`] || 0), 0);
          scoreMap[qKey] = subTotal;
          q.subQuestions.forEach((sq) => {
            scoreMap[`${q.number}-${sq.number}`] = studentScores[`${q.number}-${sq.number}`] || 0;
          });
        } else {
          scoreMap[qKey] = studentScores[qKey] || 0;
        }
      });
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 md:py-6" data-testid="score-entry-page">
      <div className="flex items-center justify-between gap-3 mb-3">
        <button onClick={() => navigate("/dashboard")} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 shrink-0">
          <ArrowLeft size={14} /> Dashboard
        </button>
        <div className="text-right min-w-0">
          <span className="font-display text-base md:text-lg font-semibold text-stone-900">Quick Score Entry</span>
          <span className="hidden sm:inline text-xs text-stone-400 italic ml-2">— upload the question paper, AI structures it, you enter marks</span>
        </div>
      </div>

      {/* Step 1: Assessment Metadata (compact) */}
      <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 shadow-sm mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[11px] font-semibold tracking-wide text-stone-500 mb-0.5">Assessment Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Unit Test 3 — Reproduction" className="w-full h-9 px-2.5 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" data-testid="input-se-name" />
          </div>
          <div className="w-28">
            <label className="block text-[11px] font-semibold tracking-wide text-stone-500 mb-0.5">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-9 px-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {subjects.map((s) => <option key={s}>{s}</option>)}
              <option value="__custom__">+ Custom</option>
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[11px] font-semibold tracking-wide text-stone-500 mb-0.5">Class</label>
            <select value={klass} onChange={(e) => setKlass(e.target.value)} className="w-full h-9 px-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {["Class 6","Class 7","Class 8","Class 9","Class 10"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-[11px] font-semibold tracking-wide text-stone-500 mb-0.5">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-9 px-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
              {["Revision Test","Unit Test","Formative Assessment","Summative Assessment","Practice Quiz"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-20">
            <label className="block text-[11px] font-semibold tracking-wide text-stone-500 mb-0.5">Total Marks</label>
            <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value || "40", 10))} className="w-full h-9 px-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600" />
          </div>
        </div>
      </div>

      {/* Step 2: Question Paper (unified input) */}
      <div className="bg-white border border-stone-200 rounded-xl px-4 py-4 md:px-5 md:py-5 shadow-sm mb-4">
        <div className="mb-3">
          <div className="text-sm font-semibold text-stone-800">Question Paper</div>
          <div className="text-xs text-stone-500 italic mt-0.5">Upload photos of the paper, or paste the text. AI will structure the questions for you.</div>
        </div>

        <div className="flex gap-1 mb-3 bg-stone-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setQInputMode("images")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${qInputMode === "images" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
          >
            <ImageIcon size={14} /> Photos
          </button>
          <button
            onClick={() => setQInputMode("text")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${qInputMode === "text" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}
          >
            <Type size={14} /> Text
          </button>
        </div>

        {qInputMode === "images" ? (
          <DropZone
            files={qImages}
            onAdd={addImages}
            onRemove={removeQImage}
            testId="zone-qpaper"
            acceptLabel="JPEG or PNG · up to 10 pages"
          />
        ) : (
          <textarea
            value={qTextInput}
            onChange={(e) => setQTextInput(e.target.value)}
            placeholder="Paste the questions here...&#10;&#10;1. First question&#10;2. Second question&#10;..."
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-y"
          />
        )}

        <div className="mt-4">
          <button
            onClick={handleAnalyzeQPaper}
            disabled={analyzing || (qImages.length === 0 && !qTextInput.trim())}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg font-medium text-sm transition-colors ${analyzing ? "bg-emerald-100 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : <><Search size={14} /> Analyze with AI</>}
          </button>
        </div>

        {analysisError && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-red-800">{analysisError}</div>
              <button onClick={handleAnalyzeQPaper} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 underline underline-offset-2">
                <RotateCw size={12} /> Try again
              </button>
            </div>
          </div>
        )}

        {questions.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-2 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
            <div className="text-sm text-emerald-900">
              <span className="font-semibold">{questions.length} question{questions.length === 1 ? "" : "s"}</span>
              <span className="text-emerald-700"> · {questions.reduce((s, q) => s + (q.maxMarks || 0), 0)} marks total</span>
            </div>
            <button onClick={() => { setQuestions([]); setQImages([]); setQTextInput(""); }} className="text-xs text-emerald-700 underline hover:text-emerald-900">
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Step 3: Score Grid */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm font-semibold text-stone-700">Enter Scores</div>
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
          <div className="px-5 py-12 text-center text-stone-400 text-sm">Analyze the question paper above to begin entering scores.</div>
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
                    <th className="sticky left-0 z-10 bg-stone-50 border-b border-r border-stone-200 px-3 py-1 text-center text-xs font-semibold text-stone-600 min-w-[52px]">#</th>
                    {questions.map((q) => {
                      const hasSubs = q.subQuestions && q.subQuestions.length > 0;
                      const colSpan = hasSubs ? q.subQuestions.length + 1 : 1;
                      return (
                        <th key={q.number} colSpan={colSpan} className="bg-stone-50 border-b border-r border-stone-100 px-2 py-1 text-center text-xs font-semibold text-stone-600" title={`${q.concept} (${q.maxMarks} marks)`}>
                          <div>Q{q.number}</div>
                          <div className="text-[10px] text-stone-400 font-normal">{q.maxMarks}m</div>
                        </th>
                      );
                    })}
                    <th className="bg-stone-50 border-b border-stone-200 px-3 py-1 text-center text-xs font-semibold text-stone-600 min-w-[72px]">Total</th>
                    <th className="bg-stone-50 border-b border-stone-200 px-3 py-1 text-center text-xs font-semibold text-stone-600 min-w-[56px]">Grade</th>
                  </tr>
                  {questions.some((q) => q.subQuestions && q.subQuestions.length > 0) && (
                    <tr>
                      <th className="sticky left-0 z-10 bg-stone-50/80 border-b border-r border-stone-200 px-3 py-1"></th>
                      {questions.map((q) => {
                        const hasSubs = q.subQuestions && q.subQuestions.length > 0;
                        if (hasSubs) {
                          return (
                            <Fragment key={q.number}>
                              <th className="bg-stone-50/80 border-b border-r border-stone-100 px-1 py-1 text-center text-[10px] font-medium text-stone-400">total</th>
                              {q.subQuestions.map((sq) => (
                                <th key={sq.number} className="bg-stone-50/80 border-b border-r border-stone-100 px-1 py-1 text-center text-[10px] font-medium text-stone-500 min-w-[48px]" title={sq.text || sq.number}>
                                  {sq.number}
                                </th>
                              ))}
                            </Fragment>
                          );
                        }
                        return <th key={q.number} className="bg-stone-50/80 border-b border-r border-stone-100 px-1 py-1"></th>;
                      })}
                      <th className="bg-stone-50/80 border-b border-stone-200 px-3 py-1"></th>
                      <th className="bg-stone-50/80 border-b border-stone-200 px-3 py-1"></th>
                    </tr>
                  )}
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
                          const hasSubs = q.subQuestions && q.subQuestions.length > 0;
                          return (
                            <Fragment key={q.number}>
                              <td className="border-r border-stone-50 px-0 py-0 text-center">
                                <div data-cell={`${i}-${q.number}`}>
                                  <EditableCell value={cellValue} onChange={(val) => updateScore(i, q.number, val)} onKeyDown={handleCellKey(i, q.number)} />
                                </div>
                              </td>
                              {hasSubs && q.subQuestions.map((sq) => {
                                const subVal = (scores[i] || {})[`${q.number}-${sq.number}`];
                                return (
                                  <td key={sq.number} className="border-r border-stone-50 px-0 py-0 text-center bg-stone-50/20">
                                    <div data-cell={`${i}-${q.number}-${sq.number}`}>
                                      <EditableCell value={subVal} onChange={(val) => updateScore(i, `${q.number}-${sq.number}`, val)} onKeyDown={handleCellKey(i, `${q.number}-${sq.number}`)} />
                                    </div>
                                  </td>
                                );
                              })}
                            </Fragment>
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
