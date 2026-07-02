import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/data/apiClient";
import { ScanLine, Sparkles, BarChart3, Check, Loader2, ArrowRight, FileSearch, Network, AlertCircle, Clock, RefreshCw } from "lucide-react";

const STEPS = [
  { key: "step_ocr", label: "Running OCR on handwritten sheets", icon: ScanLine, backend_status: "step_ocr" },
  { key: "step_qp", label: "Aligning multi-page answer sequences", icon: FileSearch, backend_status: "step_qp" },
  { key: "step_concept", label: "Matching questions to concepts & chapters", icon: Network, backend_status: "step_concept" },
  { key: "step_eval", label: "AI evaluating answers against answer key", icon: Sparkles, backend_status: "step_eval" },
  { key: "step_gap", label: "Identifying learning gaps & patterns", icon: AlertCircle, backend_status: "step_gap" },
  { key: "step_insights", label: "Generating classroom insights dashboard", icon: BarChart3, backend_status: "step_insights" },
];

// Demo simulation pacing: ~1.3s per step, 8s total
const STEP_DURATION = 1300;
const TOTAL_DURATION = STEPS.length * STEP_DURATION;

const Processing = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();

  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [eta, setEta] = useState(Math.ceil(TOTAL_DURATION / 1000));
  const [simulating, setSimulating] = useState(false);
  const started = useRef(false);

  // Poll backend status every 1.5s
  const { data: statusData } = useQuery({
    queryKey: ["assessment-status", id],
    queryFn: () => apiClient.getAssessmentStatus(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "review" || data?.status === "complete" || data?.status === "error") return false;
      return 1500;
    },
  });

  // Backend-driven progress
  useEffect(() => {
    if (!statusData || simulating) return;
    const b_status = statusData.processingStatus || "pending";
    const status = statusData.status || "draft";

    if (status === "error") { setErrorMsg(b_status || "Processing failed"); return; }

    // If status is immediately "review" or "complete", start simulation
    if (status === "review" || b_status === "complete") {
      if (current === 0 && !started.current) {
        setSimulating(true);
        started.current = true;
      } else {
        setCurrent(STEPS.length);
        setProgress(100);
        setDone(true);
      }
      return;
    }

    const index = STEPS.findIndex((s) => s.backend_status === b_status);
    if (index !== -1 && index > current) {
      setCurrent(index);
      setProgress(0);
    }
  }, [statusData, current, simulating]);

  // Simulation mode — run through steps artificially
  useEffect(() => {
    if (!simulating) return;
    const interval = setInterval(() => {
      setCurrent((c) => {
        if (c >= STEPS.length) {
          clearInterval(interval);
          setDone(true);
          setEta(0);
          return c;
        }
        setProgress(0);
        setEta((STEPS.length - c - 1) * 1);
        return c + 1;
      });
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, [simulating]);

  // Animate inner progress bar (for active step)
  useEffect(() => {
    if (done || errorMsg || current >= STEPS.length) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 95 ? p : p + 2));
    }, STEP_DURATION / 45);
    return () => clearInterval(interval);
  }, [current, done, errorMsg]);

  const totalProgress = done ? 100 : ((Math.min(current, STEPS.length - 1) + progress / 100) / STEPS.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20" data-testid="processing-page">
      <div className="text-center mb-8">
        <div className="text-sm font-semibold tracking-[0.08em] uppercase text-blue-800">AI at Work</div>
        <h1 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-stone-900">{t("processingTitle")}</h1>
        <p className="mt-2 text-stone-600 text-lg">{t("processingSub")}</p>
      </div>

      {/* ETA timer */}
      {!done && !errorMsg && (
        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-stone-500">
          <Clock size={15} />
          <span>Estimated time remaining: <strong className="text-stone-800">{eta}s</strong></span>
          {current > 0 && <span className="text-stone-400">· Processing step {Math.min(current+1, STEPS.length)} of {STEPS.length}</span>}
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <div className="font-semibold text-red-900 text-sm">Processing Error</div>
                <div className="text-xs text-red-700 mt-0.5 max-h-20 overflow-auto">{errorMsg}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-red-200">
              <button onClick={() => window.location.reload()} className="h-9 px-3 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 inline-flex items-center gap-1">
                <RefreshCw size={12} /> Retry
              </button>
              <button onClick={() => navigate(`/review/${id}`)} className="h-9 px-3 rounded-lg bg-blue-800 text-white text-xs font-medium hover:bg-blue-900 inline-flex items-center gap-1">
                Skip to Review <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-7">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-stone-600">Overall progress</span>
            <span className="font-semibold text-stone-900">{Math.round(totalProgress)}%</span>
          </div>
          <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-700 to-blue-900 transition-[width] duration-300" style={{ width: `${totalProgress}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const status = i < current ? "done" : i === current ? "active" : "pending";
            return (
              <div key={s.key} data-testid={`step-${s.key}`} className={`flex items-center gap-4 p-4 rounded-xl border ${
                status === "active" ? "border-blue-200 bg-blue-50/60 animate-pulse" :
                status === "done" ? "border-emerald-100 bg-emerald-50/40" :
                "border-stone-200 bg-white opacity-60"
              }`}>
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${
                  status === "done" ? "bg-emerald-600 text-white" :
                  status === "active" ? "bg-blue-800 text-white" :
                  "bg-stone-100 text-stone-400"
                }`}>
                  {status === "done" ? <Check size={20} /> : status === "active" ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${status === "pending" ? "text-stone-500" : "text-stone-900"}`}>{s.label}</div>
                  {status === "active" && (
                    <div className="mt-1.5 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-800 transition-[width] duration-200" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  {status === "done" && <div className="text-xs text-emerald-700 mt-0.5">Completed</div>}
                </div>
              </div>
            );
          })}
        </div>

        {done && (
          <div className="mt-7 pt-6 border-t border-stone-200 text-center animate-fade-in-up">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 animate-check-pop">
              <Check size={24} />
            </div>
            <h3 className="font-display text-xl font-semibold text-stone-900">All papers evaluated!</h3>
            <p className="text-stone-600 mt-1">Evaluations are ready for your review and overrides.</p>
            <button
              onClick={() => navigate(`/review/${id}`)}
              data-testid="btn-open-review"
              className="mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
            >
              Proceed to Review & Grade <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Processing;
