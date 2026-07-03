import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { BookCheck, Zap, Shield, TrendingUp, BarChart3, CheckCircle } from "lucide-react";

const features = [
  { label: "Grade 60 answer sheets in under 2 minutes", icon: Zap },
  { label: "Teacher stays in control of every mark", icon: Shield },
  { label: "Built for AP & Telangana state board exams", icon: TrendingUp },
  { label: "Classroom insights at your fingertips", icon: BarChart3 },
];

const CYCLE_INTERVAL = 1200;
const NAV_DELAY = features.length * CYCLE_INTERVAL + 200;

const Loading = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const name = location.state?.name || user?.name || "Teacher";
  const done = useRef(false);

  const go = useCallback(() => {
    if (done.current) return;
    done.current = true;
    navigate("/dashboard", { state: { fromLoader: true, name } });
  }, [navigate, name]);

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      setCurrent((c) => (c + 1) % features.length);
    }, CYCLE_INTERVAL);

    const navTimer = setTimeout(go, NAV_DELAY);

    return () => {
      clearInterval(cycleTimer);
      clearTimeout(navTimer);
    };
  }, [go]);

  const pct = ((current + 1) / features.length) * 100;

  return (
    <div
      className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 cursor-pointer"
      data-testid="loading-page"
      onClick={go}
    >
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-10 w-10 rounded-lg bg-blue-800 text-white flex items-center justify-center">
          <BookCheck size={20} strokeWidth={2.5} />
        </div>
        <div className="font-display font-semibold text-stone-900 text-xl">EvalAssist</div>
      </div>

      <div className="w-full max-w-sm relative overflow-hidden" style={{ height: 100 }}>
        {features.map((f, i) => {
          const Icon = f.icon;
          const pos = i - current;
          const isActive = i === current;
          const offset = pos * 100;

          return (
            <div
              key={i}
              className="absolute inset-0 flex items-center gap-4 px-4 rounded-xl bg-white border border-blue-100 shadow-sm transition-all duration-500"
              style={{
                transform: `translateX(${offset}%)`,
                opacity: Math.abs(pos) <= 1 ? 1 - Math.abs(pos) * 0.4 : 0,
              }}
            >
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
                {isActive ? (
                  <div className="relative">
                    <Icon size={20} className="animate-pulse" />
                    <CheckCircle size={12} className="absolute -bottom-1 -right-1 text-emerald-600" />
                  </div>
                ) : (
                  <Icon size={20} />
                )}
              </div>
              <div className="text-sm font-medium text-stone-800 leading-snug">{f.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 w-full max-w-sm">
        <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-800 transition-all duration-500 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-6 text-sm text-stone-500 text-center">
        Setting up your workspace — <span className="font-medium text-stone-800">{name}</span>
      </div>
    </div>
  );
};

export default Loading;
