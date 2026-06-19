import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { UploadCloud, X, ArrowRight, FileText, ListChecks, BookOpen, ClipboardList } from "lucide-react";

const UploadZone = ({ icon: Icon, title, hint, badgeLabel, badgeColor, files, onAdd, onRemove, testId, multiple = false, accept }) => {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-medium text-stone-900">{title}</div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeColor}`}>{badgeLabel}</span>
          </div>
          <div className="text-xs text-stone-500 mt-0.5">{hint}</div>
        </div>
      </div>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files?.length) onAdd(e.dataTransfer.files); }}
        data-testid={`${testId}-dropzone`}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors ${drag ? "border-blue-800 bg-blue-50" : "border-stone-300 bg-stone-50 hover:border-blue-400 hover:bg-blue-50/40"}`}
      >
        <UploadCloud size={20} className="text-blue-800 mx-auto" />
        <div className="mt-1.5 text-sm font-medium text-stone-700">Click or drop file{multiple ? "s" : ""}</div>
        <input ref={ref} type="file" multiple={multiple} accept={accept} className="hidden" data-testid={`${testId}-input`} onChange={(e) => e.target.files && onAdd(e.target.files)} />
      </div>
      {files.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-36 overflow-auto scrollbar-thin">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-200">
              <FileText size={13} className="text-stone-500 shrink-0" />
              <div className="flex-1 min-w-0 truncate text-xs text-stone-800">{f.name}</div>
              <span className="text-[10px] text-stone-500">{(f.size / 1024 / 1024).toFixed(1)}M</span>
              <button onClick={(e) => { e.stopPropagation(); onRemove(f.id); }} className="text-stone-400 hover:text-stone-700" data-testid={`${testId}-remove-${f.id}`}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Upload = () => {
  const { t, user, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();

  const subjects = user?.subjects?.length ? user.subjects : ["Biology"];
  const [name, setName] = useState("SA1 — Biological Science");
  const [subject, setSubject] = useState(activeSubject || subjects[0]);
  const [customSubject, setCustomSubject] = useState("");
  const [klass, setKlass] = useState(activeClass || "Class 8");
  const [type, setType] = useState("Summative Assessment");
  const [marks, setMarks] = useState(40);

  const [qpFiles, setQpFiles] = useState([]);
  const [ansFiles, setAnsFiles] = useState([]);
  const [rubricFiles, setRubricFiles] = useState([]);
  const [modelFiles, setModelFiles] = useState([]);

  const addTo = (setter) => (incoming) => {
    const list = Array.from(incoming).map((f, i) => ({ id: `f-${Date.now()}-${i}`, name: f.name, size: f.size }));
    setter((prev) => [...prev, ...list]);
  };
  const removeFrom = (setter) => (id) => setter((prev) => prev.filter((f) => f.id !== id));

  const seedSample = () => {
    setQpFiles([{ id: "qp-1", name: "SA1_Biology_QuestionPaper.pdf", size: 458000 }]);
    setAnsFiles(Array.from({ length: 8 }).map((_, i) => ({ id: `ans-${i}`, name: `Bio_SA1_Roll-${String(i + 1).padStart(2, "0")}.jpg`, size: 1240000 + i * 23000 })));
    setRubricFiles([{ id: "rub-1", name: "SA1_Rubric.pdf", size: 122000 }]);
  };

  const canContinue = name && qpFiles.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12" data-testid="upload-page">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">{t("upload")}</div>
          <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">{t("createAssessment")}</h1>
          <p className="mt-1.5 text-stone-600 text-lg">{t("createSub")}</p>
        </div>
        <button onClick={seedSample} data-testid="btn-seed-sample" className="self-start text-sm font-medium text-blue-800 hover:text-blue-900 underline underline-offset-4">
          Try with sample papers
        </button>
      </div>

      {/* Metadata — single row */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("assessmentName")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-assessment-name" placeholder={t("assessmentNamePh")} className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800" />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("subject")}</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="select-subject" className="w-full h-10 px-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800">
              {subjects.map((s) => <option key={s}>{s}</option>)}
              <option value="__custom__">+ Custom</option>
            </select>
            {subject === "__custom__" && (
              <input
                autoFocus
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                onBlur={() => { if (customSubject.trim()) setSubject(customSubject.trim()); else setSubject(subjects[0]); }}
                placeholder="Type subject"
                className="w-full h-8 mt-1 px-2 rounded border border-blue-300 bg-blue-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
            )}
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("class")}</label>
            <select value={klass} onChange={(e) => setKlass(e.target.value)} data-testid="select-class" className="w-full h-10 px-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800">
              {["Class 6","Class 7","Class 8","Class 9","Class 10"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} data-testid="select-type" className="w-full h-10 px-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800">
              {["Revision Test","Unit Test","Formative Assessment","Summative Assessment","Practice Quiz"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-20">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("totalMarks")}</label>
            <input type="number" value={marks} onChange={(e) => setMarks(parseInt(e.target.value || 0, 10))} data-testid="input-total-marks" className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800" />
          </div>
        </div>
      </div>

      {/* Upload zones */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <UploadZone
          icon={ClipboardList}
          title={t("uploadQp")}
          hint={t("uploadQpHint")}
          badgeLabel={t("required")}
          badgeColor="bg-rose-100 text-rose-800"
          files={qpFiles}
          onAdd={addTo(setQpFiles)}
          onRemove={removeFrom(setQpFiles)}
          testId="zone-qp"
          accept=".pdf,image/*"
        />
        <UploadZone
          icon={FileText}
          title={t("uploadAns")}
          hint={t("uploadAnsHint")}
          badgeLabel={t("required")}
          badgeColor="bg-rose-100 text-rose-800"
          files={ansFiles}
          onAdd={addTo(setAnsFiles)}
          onRemove={removeFrom(setAnsFiles)}
          testId="zone-ans"
          multiple
          accept=".pdf,image/*"
        />
        <UploadZone
          icon={ListChecks}
          title={t("uploadRubric")}
          hint={t("uploadRubricHint")}
          badgeLabel={t("optional")}
          badgeColor="bg-stone-200 text-stone-700"
          files={rubricFiles}
          onAdd={addTo(setRubricFiles)}
          onRemove={removeFrom(setRubricFiles)}
          testId="zone-rubric"
          accept=".pdf,image/*"
        />
        <UploadZone
          icon={BookOpen}
          title={t("uploadModel")}
          hint={t("uploadModelHint")}
          badgeLabel={t("optional")}
          badgeColor="bg-stone-200 text-stone-700"
          files={modelFiles}
          onAdd={addTo(setModelFiles)}
          onRemove={removeFrom(setModelFiles)}
          testId="zone-model"
          accept=".pdf,image/*"
        />
      </div>

      {/* AI extraction promise */}
      <div className="mt-6 p-5 rounded-xl bg-blue-50/60 border border-blue-100">
        <div className="text-sm font-semibold text-blue-900 mb-1.5">After upload, AI will automatically extract:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-900">
          {["Questions", "Marks distribution", "Chapters covered", "Concepts covered"].map((x) => (
            <div key={x} className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-700" /> {x}
            </div>
          ))}
        </div>
        <div className="text-xs text-blue-800/80 mt-3">You'll be able to review and edit everything before evaluation starts.</div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button onClick={() => navigate("/dashboard")} data-testid="btn-cancel-upload" className="h-12 px-5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium">{t("cancel")}</button>
        <button
          disabled={!canContinue}
          onClick={() => navigate("/analysis/asm-001")}
          data-testid="btn-continue-analysis"
          className={`inline-flex items-center gap-2 h-12 px-6 rounded-lg font-medium text-white transition-colors ${canContinue ? "bg-blue-800 hover:bg-blue-900" : "bg-stone-300 cursor-not-allowed"}`}
        >
          {t("continueAnalysis")} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Upload;
