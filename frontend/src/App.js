import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import WarmUp from "@/components/WarmUp";
import Landing from "@/pages/Landing";
import Loading from "@/pages/Loading";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Processing from "@/pages/Processing";
import Analysis from "@/pages/Analysis";
import Review from "@/pages/Review";
import Insights from "@/pages/Insights";
import ClassPerformance from "@/pages/ClassPerformance";
import StudentProfile from "@/pages/StudentProfile";
import ScoreEntry from "@/pages/ScoreEntry";
import FeedbackWidget from "@/components/FeedbackWidget";
import { Toaster } from "@/components/ui/sonner";

const Protected = ({ children }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/" replace />;
  return children;
};

const Public = ({ children }) => {
  const { user } = useApp();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <div className="App">
      <AppProvider>
        <WarmUp>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/welcome" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/loading" element={<Protected><Loading /></Protected>} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/class/:className" element={<ClassPerformance />} />
              <Route path="/analysis/:id" element={<Analysis />} />
              <Route path="/processing/:id" element={<Processing />} />
              <Route path="/review/:id" element={<Review />} />
              <Route path="/insights/:id" element={<Insights />} />
              <Route path="/score-entry" element={<ScoreEntry />} />
              <Route path="/student/:id/:studentId" element={<StudentProfile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </WarmUp>
        <FeedbackWidget />
        <Toaster richColors position="top-right" />
      </AppProvider>
    </div>
  );
}

export default App;
