import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BookCheck, ShieldCheck, Sparkles, Languages, Loader2 } from "lucide-react";
import { apiClient } from "@/data/apiClient";

const Login = () => {
  const { t, login, googleLogin } = useApp();
  const navigate = useNavigate();
  const [id, setId] = useState("teacher@school.gov.in");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");

  useEffect(() => {
    apiClient.getGoogleConfig().then((cfg) => {
      if (cfg.clientId) {
        setGoogleClientId(cfg.clientId);
      }
    });
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const checkGoogle = setInterval(() => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              await googleLogin(response.credential, "");
              navigate("/dashboard");
            } catch (err) {
              setError("Google sign-in failed. Use demo credentials below.");
              setGoogleLoading(false);
            }
          },
        });
        setGoogleReady(true);
        clearInterval(checkGoogle);
      }
    }, 200);
    return () => clearInterval(checkGoogle);
  }, [googleClientId]);

  const handleGoogle = () => {
    if (!window.google?.accounts?.id) return;
    setGoogleLoading(true);
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setGoogleLoading(false);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(id, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-stone-50" data-testid="login-page">
      {/* Left visual panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-blue-800 text-white relative overflow-hidden grain">
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">
            <BookCheck size={22} />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">EvalAssist</div>
            <div className="text-xs text-blue-100">Government Schools Initiative</div>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-tight">
            Spend less time marking. <span className="text-amber-300">More time teaching.</span>
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            EvalAssist evaluates 30–60 answer sheets in under two minutes — you stay in control of the final marks.
          </p>

          <div className="space-y-3 pt-4">
            {[
              { icon: ShieldCheck, title: "You decide the final mark", body: "AI suggests; teacher approves. Every override is saved." },
              { icon: Sparkles, title: "Trained on NCERT-style rubrics", body: "Handles handwriting, diagrams, partial answers." },
              { icon: Languages, title: "Hindi, Telugu & English", body: "Switch the interface to your comfort language." },
            ].map((f, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <f.icon size={18} />
                </div>
                <div>
                  <div className="font-medium">{f.title}</div>
                  <div className="text-sm text-blue-100">{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-blue-200">
          A pilot product · Designed for Andhra Pradesh & Telangana state boards
        </div>

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-700/40 blur-3xl" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      </div>

      {/* Right form panel */}
      <div className="flex flex-col">
        <div className="flex justify-end p-6">
          <LanguageToggle />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-2 mb-8">
              <div className="h-10 w-10 rounded-lg bg-blue-800 flex items-center justify-center text-white">
                <BookCheck size={22} />
              </div>
              <div className="font-display text-xl font-semibold text-stone-900">EvalAssist</div>
            </div>

            <h2 className="font-display text-3xl font-semibold text-stone-900">{t("welcome")}</h2>
            <p className="mt-2 text-stone-600">{t("loginSubtitle")}</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("teacherId")}</label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  data-testid="login-id-input"
                  className="w-full h-12 px-4 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{t("password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                  className="w-full h-12 px-4 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit-button"
                className="w-full h-12 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? "Signing in..." : t("signIn")}
              </button>

              <div className="relative mt-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-stone-50 px-2 text-stone-400">or</span></div>
              </div>

              <button
                onClick={handleGoogle}
                disabled={!googleReady || googleLoading}
                className="w-full h-12 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {googleLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Connecting...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-amber-800 font-medium mb-1">Demo Credentials</p>
                <p className="text-[11px] text-amber-700">
                  Email: <span className="font-mono font-semibold">teacher@school.gov.in</span><br />
                  Password: <span className="font-mono font-semibold">demo1234</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
