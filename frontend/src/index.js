import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import posthog from "posthog-js";
import "@/index.css";
import App from "@/App";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });

  // When a new service worker takes control (new deploy), reload once to
  // pick up the fresh JS/CSS instead of leaving the old bundle running.
  let refreshingAfterSwUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingAfterSwUpdate) return;
    refreshingAfterSwUpdate = true;
    window.location.reload();
  });
}

fetch("/api/config")
  .then((res) => res.json())
  .then((config) => {
    if (config.posthogKey) {
      posthog.init(config.posthogKey, {
        api_host: config.posthogHost || "https://us.i.posthog.com",
        autocapture: true,
        capture_pageview: true,
      });
    }
  })
  .catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
