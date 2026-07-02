import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BookCheck, Zap, Shield, TrendingUp, Loader2, Mail } from "lucide-react";
import { apiClient } from "@/data/apiClient";

const Landing = () => {
  const { t, user, googleLogin, login } = useApp();
  const navigate = useNavigate();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
      return;
    }
    let check = null;
    apiClient.getGoogleConfig().then((cfg) => {
      if (!cfg.clientId) return;
      let attempts = 0;
      check = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: cfg.clientId,
            callback: async (response) => {
              try {
                console.log("[Google] Credential received, length:", response.credential?.length);
                await googleLogin(response.credential, "");
                navigate("/loading");
              } catch (err) {
                console.error("[Google] Login failed:", err.message, err);
                setGoogleLoading(false);
              }
            },
          });
          setGoogleReady(true);
          clearInterval(check);
          check = null;
        }
        if (attempts >= 40) {
          clearInterval(check);
          check = null;
          console.warn("[Google] GIS script did not load after 8s on landing");
        }
      }, 200);
    });
    return () => { if (check) clearInterval(check); };
  }, [user]);

  const handleGoogle = () => {
    if (window.google?.accounts?.id) {
      setGoogleLoading(true);
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
          setGoogleLoading(false);
          setShowEmail(true);
        }
      });
    } else {
      setShowEmail(true);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    try {
      await login(email, password);
      navigate("/loading");
    } catch (err) {
      setEmailError(err.message || "Login failed");
    } finally {
      setEmailLoading(false);
    }
  };

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
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-20 lg:py-28">
        <div className="text-center">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-stone-900 leading-tight">
            Grade 60 answer sheets<br />
            <span className="text-blue-800">in 2 minutes</span>. You stay in<br />
            control of every mark.
          </h1>

          <p className="mt-6 text-lg text-stone-600 max-w-2xl mx-auto">
            EvalAssist uses AI to evaluate handwritten answer sheets for AP &amp; Telangana state board exams. Teachers approve every final mark.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            {googleReady ? (
              <button
                onClick={handleGoogle}
                className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-xl bg-blue-800 text-white font-semibold hover:bg-blue-900 transition-colors shadow-lg text-lg"
              >
                {googleLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Connecting...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Sign in with Google
                  </>
                )}
              </button>
            ) : (
              <div className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-xl bg-stone-100 border border-stone-200 text-stone-400 font-semibold text-lg cursor-not-allowed select-none">
                <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google sign-in unavailable
              </div>
            )}

            <button
              onClick={() => setShowEmail(true)}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg border-2 border-blue-800 text-blue-800 font-medium hover:bg-blue-50 transition-colors text-sm"
            >
              <Mail size={15} /> Sign in with email
            </button>
          </div>

          {showEmail && (
            <form onSubmit={handleEmailSubmit} className="mt-6 max-w-sm mx-auto space-y-3">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full h-11 px-4 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-11 px-4 rounded-lg border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-800"
              />
              {emailError && <p className="text-red-600 text-sm">{emailError}</p>}
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full h-11 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900 transition-colors disabled:opacity-50"
              >
                {emailLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}
        </div>

        {/* Metrics */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
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

        {/* Preview card */}
        <div className="mt-12 max-w-md mx-auto">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-lg p-5">
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
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 w-[10%]" /></div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                <span>Microorganisms — Friend &amp; Foe</span>
                <span>4 Q · 7 marks</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-600 w-[20%]" /></div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                <span>Crop Production &amp; Management</span>
                <span>3 Q · 4 marks</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-amber-600 w-[15%]" /></div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2">
                <span>Reproduction in Animals</span>
                <span>8 Q · 26 marks</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className="h-full bg-rose-600 w-[55%]" /></div>
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
