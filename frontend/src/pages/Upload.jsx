import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { UploadCloud, X, ArrowRight, Image as ImageIcon, Type, FileText, Loader2 } from "lucide-react";
import { apiClient } from "@/data/apiClient";

const TabUpload = ({ files, onAdd, onRemove, testId }) => {
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
        <div className="text-xs text-stone-400 mt-1">JPEG or PNG only</div>
        <input ref={ref} type="file" multiple accept="image/jpeg,image/png" className="hidden" data-testid={`${testId}-input`} onChange={(e) => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
      </div>
      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-52 overflow-auto scrollbar-thin">
          {files.map((f, i) => (
            <div key={f.id || i} className="relative group aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(f.id || i)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
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

  const [submitting, setSubmitting] = useState(false);

  // Questions section
  const [qMode, setQMode] = useState("images");
  const [qImages, setQImages] = useState([]);
  const [qText, setQText] = useState("");

  // Answer key section
  const [aMode, setAMode] = useState("text");
  const [aImages, setAImages] = useState([]);
  const [aText, setAText] = useState("");

  // Student sheets section
  const [sheetFiles, setSheetFiles] = useState([]);

  const seedSample = async () => {
    setName("SA1 — Biological Science");
    setQMode("text");
    setQText(`Identify the odd one with respect to their fertilization A) Frog B) Butterfly C) Hen D) Humans
Identify the correct statement about IVF A) The baby in this method develops in test tube B) In IVF method fertilization takes place inside the body of female C) This method is done in females whose oviducts are blocked D) IVF is an asexual reproduction method.
In a village so many people are suffering with Hepatitis A. Which of the following method would you suggest to prevent this disease A) Using mosquito nets B) Drink boiled and cooled drinking water C) Spraying insecticides D) Keep the patient in complete isolation
What is the reason for growing the wheat crop in Rabi season A) Plenty of water is available B) High temperature during this season promotes fast growth C) High humidity and cloudy weather is suitable for growth D) It requires cool environment and dry weather
Metamorphosis is seen in this organism 1) Frog 2) Butterfly 3) Hen 4) Dog A) 1 only B) 1 and 2 only C) 1, 2 and 3 only D) 4 only
Identify the organism given in the picture. A) Paramoecium B) Chlamydomonas C) Amoeba D) Spirogyra
Assertion (A): Combine is a modern tool used for ploughing Reason (R): Ploughing makes the soil loose and porous to air, water and helps in microbial growth A) Both A, R are true, R is correct explanation of A B) Both A, R are true, R is not correct explanation of A C) A is true, R is false D) A is false, R is true
Ramu's village is severly a effected by drought. Which method do you suggest him to grow crops in the scarcity of water? A) Drip irrigation B) Moat and chain pump C) Lever system D) Dhekli
Find the incorrect statement among the following A) Hydra reproduces through budding B) Amoeba reproduce through Binary fission C) Cloning is an example for sexual mode of reproduction D) Butterfly is an oviparous organism
Rahul placed an egg bought from the market along with the eggs laid by his pet hen for incubation. Later, he found that no chick hatched from the market egg. What could be the most likely reason? A) A hen can incubate only its own eggs. B) Eggs sold in markets are not fertilised. C) Eggs sold in the market are treated with chemicals to kill the life in them. D) The market eggs are generally too small to support the growth of a chick.
Section B: Answer the following questions in your answer booklet. 3x2=6
What do we call the unwanted plants growing along with crops? How can we control them?
Raju is taking excessive amounts of Antibiotics. Is it correct? What precautions must be taken while taking antibiotics.
Write any two differences between egg and sperm.
Section C: Answer the following questions in your answer booklet. 2x4=8
List four food preservation methods used at your home and provide examples of foods that are preserved using each method.
Draw a neat labelled diagram of Female reproductive system
Section D: Answer the following questions in your answer booklet. An internal choice is provided for each question. 2x8=16
16. A) i) Which organism causes polio ? ii) Give an example for bacterial diseases ? iii) How can we prevent Malaria disease ? iv) What is the mode of transmission of Chicken pox?
17. A) What is asexual reproduction? Explain any two methods of asexual reproduction in animals.`);

    setAMode("text");
    setAText(`1. B
2. C
3. B
4. D
5. B
6. C
7. D
8. A
9. C
10. B
11. Weeds are unwanted plants. Controlled by weeding, weedicides.
12. No excess antibiotics cause resistance. Doctor advice, full course, not for viral.
13. Egg larger non-motile. Sperm small with tail.
14. Salting, sugar, oil vinegar, heating cooling with examples.
15. Diagram manual review.
16. i) Virus ii) TB iii) Mosquito nets iv) Air contact
17. Single parent reproduction. Budding Hydra, Binary fission Amoeba.`);

    try {
      const res = await fetch("http://localhost:8000/media/samples/answer_sheets/Karan.jpeg");
      const blob = await res.blob();
      const file = new File([blob], "Karan.jpeg", { type: "image/jpeg" });
      setSheetFiles([{
        id: `img-sample-karan`,
        name: "Karan.jpeg",
        file: file,
        preview: URL.createObjectURL(file),
      }]);
    } catch (err) {
      console.warn("Failed to load sample sheet image:", err);
    }
  };

  const addImages = (setter) => (incoming) => {
    const list = Array.from(incoming).map((f, i) => ({
      id: `img-${Date.now()}-${i}`,
      name: f.name,
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setter((prev) => [...prev, ...list]);
  };

  const removeImage = (setter) => (id) => {
    setter((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const canContinue = name && (qImages.length > 0 || qText.trim()) && sheetFiles.length > 0;

  const handleSubmit = async () => {
    if (!canContinue || submitting) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("class", klass);
      formData.append("subject", subject === "__custom__" ? customSubject : subject);
      formData.append("type", type);
      formData.append("totalMarks", String(marks));

      // Questions
      if (qText.trim()) {
        formData.append("questionsText", qText);
      }
      for (const img of qImages) {
        if (img.file) formData.append("questionFiles", img.file);
      }

      // Answer key
      if (aText.trim()) {
        formData.append("answerKeyText", aText);
      }
      for (const img of aImages) {
        if (img.file) formData.append("answerKeyFiles", img.file);
      }

      // Student sheets
      for (const img of sheetFiles) {
        if (img.file) formData.append("sheetFiles", img.file);
      }

      const result = await apiClient.createAssessment(formData);
      if (result) {
        const id = result._id || result.id;
        // Trigger OCR processing in background
        apiClient.processAssessment(id).catch(() => {});
        navigate(`/processing/${id}`);
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Metadata */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("assessmentName")}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-assessment-name" className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800" />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("subject")}</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-10 px-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800">
              {subjects.map((s) => <option key={s}>{s}</option>)}
              <option value="__custom__">+ Custom</option>
            </select>
            {subject === "__custom__" && (
              <input autoFocus value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} onBlur={() => { if (customSubject.trim()) setSubject(customSubject.trim()); else setSubject(subjects[0]); }} className="w-full h-8 mt-1 px-2 rounded border border-blue-300 bg-blue-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800" />
            )}
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("class")}</label>
            <select value={klass} onChange={(e) => setKlass(e.target.value)} className="w-full h-10 px-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800">
              {["Class 6","Class 7","Class 8","Class 9","Class 10"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 px-2.5 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800">
              {["Revision Test","Unit Test","Formative Assessment","Summative Assessment","Practice Quiz"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-20">
            <label className="block text-xs font-semibold tracking-wide text-stone-500 mb-1">{t("totalMarks")}</label>
            <input type="number" value={marks} onChange={(e) => setMarks(parseInt(e.target.value || 0, 10))} className="w-full h-10 px-3 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800" />
          </div>
        </div>
      </div>

      {/* Section 1: Questions */}
      <div className="mt-6 bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center shrink-0"><FileText size={18} /></div>
          <div>
            <div className="font-medium text-stone-900">Questions</div>
            <div className="text-xs text-stone-500">Upload an image of the question paper or paste the questions as text</div>
          </div>
        </div>
        <div className="flex gap-1 mb-4 bg-stone-100 rounded-lg p-1 w-fit">
          <button onClick={() => setQMode("images")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${qMode === "images" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>
            <ImageIcon size={15} /> Images
          </button>
          <button onClick={() => setQMode("text")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${qMode === "text" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>
            <Type size={15} /> Text
          </button>
        </div>
        {qMode === "images" ? (
          <TabUpload files={qImages} onAdd={addImages(setQImages)} onRemove={removeImage(setQImages)} testId="zone-questions" />
        ) : (
          <textarea
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            placeholder="Paste all questions here...&#10;&#10;1. Identify the odd one with respect to fertilization:&#10;2. Identify the correct statement about IVF...&#10;3. Best way to prevent Hepatitis A?..."
            className="w-full h-48 px-4 py-3 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 resize-y"
          />
        )}
      </div>

      {/* Section 2: Answer Key */}
      <div className="mt-4 bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0"><Type size={18} /></div>
          <div>
            <div className="font-medium text-stone-900">Answer Key</div>
            <div className="text-xs text-stone-500">Paste the correct answers — AI will grade student sheets against this</div>
          </div>
        </div>
        <div className="flex gap-1 mb-4 bg-stone-100 rounded-lg p-1 w-fit">
          <button onClick={() => setAMode("text")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${aMode === "text" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>
            <Type size={15} /> Text
          </button>
          <button onClick={() => setAMode("images")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${aMode === "images" ? "bg-white shadow-sm text-stone-900" : "text-stone-500 hover:text-stone-700"}`}>
            <ImageIcon size={15} /> Images
          </button>
        </div>
        {aMode === "text" ? (
          <textarea
            value={aText}
            onChange={(e) => setAText(e.target.value)}
            placeholder="Paste the answer key here...&#10;&#10;1. B&#10;2. C&#10;3. B&#10;4. D&#10;5. B&#10;6. C&#10;7. D&#10;8. A&#10;9. C&#10;10. B&#10;11. Weeds are unwanted plants. Controlled by weeding, weedicides, tilling.&#10;12. No — excess antibiotics cause resistance. Take on doctor's advice..."
            className="w-full h-48 px-4 py-3 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 resize-y"
          />
        ) : (
          <TabUpload files={aImages} onAdd={addImages(setAImages)} onRemove={removeImage(setAImages)} testId="zone-answer-key" />
        )}
      </div>

      {/* Section 3: Student Answer Sheets */}
      <div className="mt-4 bg-white border border-stone-200 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center shrink-0"><ImageIcon size={18} /></div>
          <div>
            <div className="font-medium text-stone-900">Student Answer Sheets</div>
            <div className="text-xs text-stone-500">Required · Scan student handwritten answer sheets (JPEG/PNG)</div>
          </div>
        </div>
        <TabUpload files={sheetFiles} onAdd={addImages(setSheetFiles)} onRemove={removeImage(setSheetFiles)} testId="zone-sheets" />
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <button onClick={() => navigate("/dashboard")} className="h-12 px-5 rounded-lg bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium">{t("cancel")}</button>
        <button
          disabled={!canContinue || submitting}
          onClick={handleSubmit}
          className={`inline-flex items-center gap-2 h-12 px-6 rounded-lg font-medium text-white transition-colors ${canContinue ? "bg-blue-800 hover:bg-blue-900" : "bg-stone-300 cursor-not-allowed"}`}
        >
          {submitting ? <><Loader2 size={18} className="animate-spin" /> Creating...</> : <>{t("continueAnalysis")} <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
};

export default Upload;
