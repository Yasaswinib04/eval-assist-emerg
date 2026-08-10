import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

const RELOAD_FLAG = "evalassist-chunk-reload";

// A stale bundle after a deploy throws on a chunk that no longer exists.
// One reload fixes it, so do that silently rather than showing an error.
function isStaleBundleError(error) {
  const message = `${error?.name || ""} ${error?.message || ""}`;
  return /ChunkLoadError|Loading chunk|Importing a module script failed|dynamically imported module/i.test(message);
}

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (isStaleBundleError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }
    console.error("Unhandled UI error:", error, info?.componentStack);
    if (window.posthog?.capture) {
      window.posthog.capture("ui_crash", {
        message: error?.message,
        path: window.location.pathname,
      });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4"
        data-testid="error-boundary"
      >
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-amber-100 text-amber-600 mb-6">
            <AlertTriangle size={28} strokeWidth={2.5} />
          </div>

          <h2 className="font-display text-2xl font-semibold text-stone-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-stone-500 text-sm mb-6">
            This screen ran into an unexpected problem. Your saved work is safe —
            reloading usually fixes it.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-xl bg-blue-800 text-white font-medium hover:bg-blue-900 transition-colors shadow-md"
            >
              <RefreshCw size={18} />
              Reload the page
            </button>
            <button
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="text-sm text-stone-500 underline hover:text-stone-700"
            >
              Go back to dashboard
            </button>
          </div>

          {process.env.NODE_ENV !== "production" && (
            <pre className="mt-6 text-left text-xs text-stone-500 bg-stone-100 rounded-lg p-3 overflow-auto max-h-48">
              {error.stack || error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
