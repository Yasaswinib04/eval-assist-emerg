import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BookCheck, User, Shield, Loader2 } from "lucide-react";
import { apiClient } from "@/data/apiClient";

const Welcome = () => {
  const { t, loginWithName, googleLogin, user } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
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
        const displayName = name.trim() || "";
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              await googleLogin(response.credential, displayName);
              navigate("/loading", { state: { name: displayName || "Teacher" } });
            } catch (err) {
              setError("Google sign-in failed. Try demo instead.");
              setGoogleLoading(false);
            }
          },
        });
        setGoogleReady(true);
        clearInterval(checkGoogle);
      }
    }, 200);
    return () => clearInterval(checkGoogle);
  }, [googleClientId, name]);

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-stone-600 mb-4">You're already signed in.</p>
          <button onClick={() => navigate("/dashboard")} className="h-10 px-6 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleDemoSubmit = async (e) => {
    e.preventDefault();
    const displayName = name.trim() || "Teacher";
    setError("");
    setLoading(true);
    try {
      await loginWithName("teacher@school.gov.in", "demo1234", displayName);
      navigate("/loading", { state: { name: displayName } });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!window.google?.accounts?.id) return;
    setGoogleLoading(true);
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setGoogleLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-stone-50" data-testid="welcome-page">
      <header className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-10 border-b border-stone-200 bg-white">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-blue-800 text-white flex items-center justify-center shrink-0">
            <BookCheck size={20} strokeWidth={2.5} />
          </div>
          <div className="font-display font-semibold text-stone-900 text-lg">EvalAssist</div>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link to="/login" className="h-10 px-4 rounded-lg border-2 border-blue-800 text-blue-800 text-sm font-medium hover:bg-blue-50 transition-colors inline-flex items-center">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto mb-4">
                <User size={22} />
              </div>
              <h1 className="font-display text-2xl font-semibold text-stone-900">Just one quick thing</h1>
              <p className="mt-2 text-sm text-stone-500">We'll use this to personalize your dashboard. No account created.</p>
            </div>

            <form onSubmit={handleDemoSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">What should we call you?</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anjali"
                  autoFocus
                  className="w-full h-12 px-4 rounded-lg border border-stone-300 bg-white text-stone-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-blue-800"
                />
              </div>

              {error && <p className="text-red-600 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : "Continue to demo  →"}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-stone-400">or</span></div>
              </div>

              <button
                onClick={handleGoogle}
                disabled={!googleReady || googleLoading}
                className="mt-4 w-full h-12 rounded-lg border border-stone-300 bg-white text-stone-800 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {googleLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Connecting...</>
                ) : googleReady ? (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                  </>
                ) : (
                  "Loading..."
                )}
              </button>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-stone-400">
              <Shield size={14} className="shrink-0 mt-0.5" />
              <span>We only use your email to identify your session. No spam.</span>
            </div>

            <div className="mt-4 text-center text-xs text-stone-500">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-800 hover:underline font-medium">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Welcome;
