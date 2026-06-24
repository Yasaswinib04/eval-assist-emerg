import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BookCheck, ShieldCheck, Sparkles, Languages } from "lucide-react";

const Login = () => {
  const { t, login } = useApp();
  const navigate = useNavigate();
  const [id, setId] = useState("teacher@school.gov.in");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
