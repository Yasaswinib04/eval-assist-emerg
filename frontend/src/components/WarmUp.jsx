import { useState, useEffect, useCallback, useRef } from "react";
import { BookCheck, Loader2, RefreshCw, Coffee } from "lucide-react";

function checkHealth(timeout = 3000) {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); resolve(false); }, timeout);
    fetch("/api/auth/health", { signal: controller.signal })
      .then((r) => { clearTimeout(timer); resolve(r.ok); })
      .catch(() => { clearTimeout(timer); resolve(false); });
  });
}

function WarmUp({ children }) {
  const [status, setStatus] = useState("checking");
  const [dotCount, setDotCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [warming, setWarming] = useState(false);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkHealth().then((up) => {
      if (mountedRef.current) setStatus(up ? "up" : "down");
    });
    return () => { mountedRef.current = false; };
  }, []);

  const startWarming = useCallback(() => {
    setWarming(true);
    let ticks = 0;
    intervalRef.current = setInterval(() => {
      ticks++;
      setElapsed(ticks);
      setDotCount((d) => (d + 1) % 4);
      checkHealth().then((up) => {
        if (up && mountedRef.current) setStatus("up");
      });
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const dots = ".".repeat(dotCount);

  if (status === "up") return children;

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-blue-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4" data-testid="warmup-screen">
      <div className="max-w-sm w-full text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-blue-800 text-white mb-6">
          <BookCheck size={28} strokeWidth={2.5} />
        </div>

        <h2 className="font-display text-2xl font-semibold text-stone-900 mb-1">
          EvalAssist
        </h2>

        <div className="flex items-center justify-center gap-2 mt-3 mb-4">
          <Coffee size={16} className="text-amber-500 shrink-0" />
          <p className="text-stone-500 text-sm">
            {warming
              ? `Waking up the app${dots}`
              : "The app has been idle for a while and needs a moment to wake up."}
          </p>
        </div>

        {!warming ? (
          <button
            onClick={startWarming}
            className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-md"
          >
            <RefreshCw size={18} />
            Wake Up the App
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-800" />
              <span className="text-sm text-stone-500">Waking up{dots}</span>
            </div>

            <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min((elapsed / 24) * 100, 92)}%` }}
              />
            </div>

            <p className="text-xs text-stone-400">
              This usually takes 30-60 seconds on the free tier.
            </p>

            <button
              onClick={() => {
                setWarming(false);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                setElapsed(0);
              }}
              className="text-xs text-stone-400 underline hover:text-stone-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WarmUp;
