import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { BookCheck, FileText, Sparkles, LayoutDashboard, CheckCircle } from "lucide-react";

const steps = [
  { label: "Loaded Class 8 Biology curriculum", icon: FileText },
  { label: "Imported 8 sample student papers", icon: FileText },
  { label: "AI is evaluating answers right now...", icon: Sparkles },
  { label: "Preparing your dashboard", icon: LayoutDashboard },
];

const Loading = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const name = location.state?.name || user?.name || "Teacher";
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timers = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setCurrentStep(i);
        setCompleted((prev) => new Set([...prev, i]));
      }, i * 1000));
    });

    timers.push(setTimeout(() => {
      navigate("/dashboard", { state: { fromLoader: true, name } });
    }, steps.length * 1000 + 400));

    return () => timers.forEach(clearTimeout);
  }, [navigate, name]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4" data-testid="loading-page">
      <div className="flex items-center gap-2.5 mb-12">
        <div className="h-10 w-10 rounded-lg bg-blue-800 text-white flex items-center justify-center">
          <BookCheck size={20} strokeWidth={2.5} />
        </div>
        <div className="font-display font-semibold text-stone-900 text-xl">EvalAssist</div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = completed.has(i);
          const active = currentStep === i;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                active ? "bg-white border border-blue-200 shadow-sm scale-[1.02]" : "bg-transparent"
              } ${done && !active ? "opacity-60" : ""}`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                done ? "bg-emerald-100 text-emerald-700" :
                active ? "bg-blue-100 text-blue-800" :
                "bg-stone-100 text-stone-400"
              }`}>
                {done ? <CheckCircle size={18} /> : <Icon size={18} className={active ? "animate-pulse" : ""} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-900">{step.label}</div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {done ? "Done" : active ? "Now" : i < currentStep ? "Done" : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 w-full max-w-sm">
        <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-800 transition-all duration-500 rounded-full"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-8 text-sm text-stone-500 text-center">
        You'll land in your teacher view — <span className="font-medium text-stone-800">{name}</span>
      </div>
    </div>
  );
};

export default Loading;
