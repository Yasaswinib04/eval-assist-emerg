import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BookCheck, Zap, Shield, TrendingUp, ChevronRight, ArrowRight } from "lucide-react";

const Landing = () => {
  const { t, user } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50" data-testid="landing-page">
      <header className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-10 border-b border-stone-200 bg-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-800 text-white flex items-center justify-center shrink-0">
            <BookCheck size={20} strokeWidth={2.5} />
          </div>
          <div className="font-display font-semibold text-stone-900 text-lg">EvalAssist</div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          {user ? (
            <button onClick={() => navigate("/dashboard")} className="h-10 px-4 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900 transition-colors">
              {t("dashboard")}
            </button>
          ) : (
            <button onClick={() => navigate("/login")} className="h-10 px-4 rounded-lg border-2 border-blue-800 text-blue-800 text-sm font-medium hover:bg-blue-50 transition-colors">
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-20 lg:py-28">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live preview · No signup needed
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-stone-900 leading-tight">
              Grade 60 answer sheets<br />
              <span className="text-blue-800">in 2 minutes</span>. You stay in<br />
              control of every mark.
            </h1>

            <p className="mt-6 text-lg text-stone-600 max-w-xl">
              EvalAssist uses AI to evaluate handwritten answer sheets for AP &amp; Telangana state board exams. Teachers approve every final mark.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <button
                onClick={() => navigate("/welcome")}
                className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-sm text-base"
              >
                Try the live demo <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 transition-colors text-base"
              >
                Sign in
              </button>
            </div>

            <p className="mt-3 text-sm text-stone-500">Takes 30 seconds · No account needed</p>

            <div className="mt-10 flex flex-wrap gap-3 justify-center lg:justify-start">
              {[
                { icon: Zap, label: "Fast", sub: "2 min/paper" },
                { icon: Shield, label: "Trustworthy", sub: "Teacher approves" },
                { icon: TrendingUp, label: "Insights", sub: "Class analytics" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-stone-200 shadow-sm">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                    <f.icon size={15} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-stone-900">{f.label}</div>
                    <div className="text-[11px] text-stone-500">{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full max-w-md lg:max-w-none">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-lg p-5 relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="flex-1" />
                <span className="text-[10px] text-stone-400 font-medium">SA1 — Biological Science</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-stone-500 uppercase font-bold">Papers</div>
                  <div className="text-xl font-display font-semibold text-stone-900">42</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-stone-500 uppercase font-bold">Avg Score</div>
                  <div className="text-xl font-display font-semibold text-stone-900">68%</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-stone-500 uppercase font-bold">Review</div>
                  <div className="text-xl font-display font-semibold text-stone-900">11</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span>Cell — Structure &amp; Functions</span>
                  <span>2 Q · 3 marks</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-[10%]" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                  <span>Microorganisms — Friend &amp; Foe</span>
                  <span>4 Q · 7 marks</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 w-[20%]" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                  <span>Crop Production &amp; Management</span>
                  <span>3 Q · 4 marks</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-600 w-[15%]" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                  <span>Reproduction in Animals</span>
                  <span>8 Q · 26 marks</span>
                </div>
                <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-600 w-[55%]" />
                </div>
              </div>
              <div className="absolute bottom-5 right-5 bg-blue-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-full shadow-lg">
                2 min avg / 60 papers
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        A pilot product · Designed for Andhra Pradesh &amp; Telangana state boards
      </footer>
    </div>
  );
};

export default Landing;
