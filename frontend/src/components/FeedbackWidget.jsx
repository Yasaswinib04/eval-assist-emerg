import { useState } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";

const FeedbackWidget = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const payload = { message: message.trim(), url: window.location.href, timestamp: new Date().toISOString() };
      await fetch("/api/auth/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch {}
    localStorage.setItem("evalassist-feedback", JSON.stringify([...JSON.parse(localStorage.getItem("evalassist-feedback") || "[]"), payload]));
    setSent(true);
    setLoading(false);
    setTimeout(() => { setOpen(false); setSent(false); setMessage(""); }, 1500);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-end p-4 sm:p-6" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 p-5 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 h-7 w-7 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center"><X size={15} /></button>
            <div className="font-medium text-stone-900 mb-1">Share Feedback</div>
            <p className="text-xs text-stone-500 mb-3">Help improve EvalAssist. What's working or not?</p>
            {sent ? (
              <div className="text-center py-6 text-emerald-700 font-medium text-sm">Thanks for your feedback!</div>
            ) : (
              <div className="space-y-3">
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your feedback..." rows={3} className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-800 resize-none" />
                <button onClick={handleSubmit} disabled={loading || !message.trim()} className="w-full h-10 rounded-lg bg-blue-800 text-white text-sm font-medium hover:bg-blue-900 disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Feedback</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-blue-800 text-white shadow-lg hover:bg-blue-900 transition-colors flex items-center justify-center">
        <MessageSquare size={20} />
      </button>
    </>
  );
};

export default FeedbackWidget;
