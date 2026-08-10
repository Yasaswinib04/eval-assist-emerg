import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { BookCheck, Upload, Sparkles, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/data/apiClient";

const Bar = ({ label, right, color, width }) => (
  <>
    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 first:mt-0">
      <span>{label}</span>
      <span>{right}</span>
    </div>
    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden"><div className={`h-full ${color}`} style={{ width }} /></div>
  </>
);

// All three slides show the SAME example test so the numbers tell one story:
// Unit Test — Mathematics, 40 marks, 36 papers. Ravi scores 26/40 on every slide.
const SLIDES = [
  {
    caption: "Unit Test — Mathematics",
    label: "AI suggests a mark for each answer — you accept or change it",
    content: (
      <div>
        <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-lg bg-blue-50 border border-blue-100">
          <span className="text-[11px] font-semibold text-stone-800">Ravi's answer sheet <span className="font-normal text-stone-500">· Roll 11</span></span>
          <span className="text-[11px] font-bold text-blue-800">26/40 total</span>
        </div>
        <div className="space-y-2">
          {[
            { q: "Q3 · Solve for x: 2x + 5 = 15", mark: "2/2 marks", state: "ok" },
            { q: "Q4 · Area of a triangle, b=6 h=4", mark: "1/2 · check", state: "review" },
            { q: "Q5 · Simplify 3(a + 2b) − 2a", mark: "3/3 marks", state: "ok" },
            { q: "Q6 · Word problem: train speed", mark: "2/4 · check", state: "review" },
          ].map((r) => (
            <div key={r.q} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-stone-50 border border-stone-100">
              <span className="text-[11px] text-stone-700 truncate">{r.q}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${r.state === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {r.mark}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    caption: "Unit Test — Mathematics",
    label: "After grading, see which chapters the class found hard",
    content: (
      <div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-[10px] text-stone-500 uppercase font-bold">Papers Graded</div>
            <div className="text-xl font-display font-semibold text-stone-900">36</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <div className="text-[10px] text-stone-500 uppercase font-bold">Class Avg</div>
            <div className="text-xl font-display font-semibold text-stone-900">24/40</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <div className="text-[10px] text-stone-500 uppercase font-bold">To Review</div>
            <div className="text-xl font-display font-semibold text-stone-900">9</div>
          </div>
        </div>
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-stone-400">Chapter-wise class average</div>
        <div className="space-y-1.5">
          <Bar label="Linear Equations" right="Class avg 82%" color="bg-emerald-600" width="82%" />
          <Bar label="Algebraic Expressions" right="Class avg 71%" color="bg-blue-600" width="71%" />
          <Bar label="Mensuration" right="Class avg 48%" color="bg-amber-600" width="48%" />
          <Bar label="Word Problems" right="Class avg 34%" color="bg-rose-600" width="34%" />
        </div>
      </div>
    ),
  },
  {
    caption: "Unit Test — Mathematics",
    label: "And how each student did — out of 40 marks",
    content: (
      <div className="space-y-2">
        {[
          { name: "Ananya", roll: "Roll 3", score: "34/40", pct: 85, color: "bg-emerald-600" },
          { name: "Ravi", roll: "Roll 11", score: "26/40", pct: 65, color: "bg-blue-600" },
          { name: "Meena", roll: "Roll 7", score: "21/40", pct: 52, color: "bg-amber-600" },
          { name: "Kiran", roll: "Roll 15", score: "14/40", pct: 35, color: "bg-rose-600" },
        ].map((s) => (
          <div key={s.roll} className="px-3 py-2 rounded-lg bg-stone-50 border border-stone-100">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-stone-800">{s.name} <span className="text-stone-400">· {s.roll}</span></span>
              <span className="font-semibold text-stone-700">{s.score}</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-stone-200 rounded-full overflow-hidden"><div className={`h-full ${s.color}`} style={{ width: `${s.pct}%` }} /></div>
          </div>
        ))}
        <p className="text-[10px] text-stone-400 text-center pt-1">Example data — your own classes appear after sign-in</p>
      </div>
    ),
  },
];

const Landing = () => {
  const { user, googleLogin } = useApp();
  const navigate = useNavigate();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(null);
  const clientIdRef = useRef("");

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, [paused]);

  const goToSlide = (i) => {
    setPaused(true);
    setSlide((i + SLIDES.length) % SLIDES.length);
  };

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 40) goToSlide(slide + (dx < 0 ? 1 : -1));
  };

  useEffect(() => {
    if (user) return;
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");
      if (idToken) {
        window.location.hash = "";
        googleLogin(idToken, "").then(() => navigate("/loading")).catch((err) => {
          setError(err.message || "Google sign-in failed.");
        });
        return;
      }
    }
    let check = null;
    apiClient.getGoogleConfig().then((cfg) => {
      if (!cfg.clientId) return;
      clientIdRef.current = cfg.clientId;
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
      setError("");
      setGoogleLoading(true);
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
          const reason = notification.isNotDisplayed() ? notification.getNotDisplayedReason() : "skipped";
          console.warn("[Google] One Tap not shown, falling back to redirect. Reason:", reason);
          const redirectUri = window.location.origin;
          const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientIdRef.current}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token id_token&scope=email profile openid&nonce=${Date.now()}&prompt=select_account`;
          window.location.href = oauthUrl;
          return;
        }
        setGoogleLoading(false);
      });
    }
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:overflow-hidden bg-stone-50" data-testid="landing-page">
      <header className="flex items-center justify-between h-14 shrink-0 px-4 sm:px-6 lg:px-10 border-b border-stone-200 bg-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-800 text-white flex items-center justify-center shrink-0">
            <BookCheck size={18} strokeWidth={2.5} />
          </div>
          <div className="font-display font-semibold text-stone-900 text-lg">EvalAssist</div>
        </Link>
      </header>

      <main className="flex-1 min-h-0 flex items-center max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-0">
        <div className="w-full grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
        <div className="text-center lg:text-left">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-stone-900 leading-tight">
            Grade answer sheets <span className="text-blue-800">faster, with AI</span>.
            You approve every mark.
          </h1>

          <p className="mt-4 text-base lg:text-lg text-stone-600">
            Upload photos of handwritten answer sheets. EvalAssist suggests marks question by question and shows you where your class needs help.
          </p>

          <div className="mt-6 flex flex-col items-center lg:items-start justify-center gap-3">
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
                <Loader2 size={20} className="animate-spin" /> Loading sign-in...
              </div>
            )}

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
          </div>

          {/* How it works */}
          <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2">
            {[
              { icon: Upload, label: "1. Upload sheets" },
              { icon: Sparkles, label: "2. AI suggests marks" },
              { icon: CheckCircle2, label: "3. You approve" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 shadow-sm">
                <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
                  <f.icon size={13} />
                </div>
                <div className="text-xs font-medium text-stone-900">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview carousel */}
        <div className="max-w-md w-full mx-auto select-none">
          <div className="relative">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-lg p-5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <div className="flex-1" />
                <span className="text-[10px] text-stone-400 font-medium">{SLIDES[slide].caption}</span>
              </div>
              <div className="min-h-[250px]">{SLIDES[slide].content}</div>
            </div>
            <button
              onClick={() => goToSlide(slide - 1)}
              aria-label="Previous"
              className="absolute -left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white border border-stone-200 shadow text-stone-600 hover:text-blue-800 hover:border-blue-300 flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => goToSlide(slide + 1)}
              aria-label="Next"
              className="absolute -right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white border border-stone-200 shadow text-stone-600 hover:text-blue-800 hover:border-blue-300 flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-blue-800" : "w-2 bg-stone-300 hover:bg-stone-400"}`}
              />
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-stone-500">{SLIDES[slide].label} · <span className="text-stone-400">swipe to explore</span></p>
        </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
