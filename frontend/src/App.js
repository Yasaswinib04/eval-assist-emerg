import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Upload from "@/pages/Upload";
import Processing from "@/pages/Processing";
import Analysis from "@/pages/Analysis";
import Review from "@/pages/Review";
import Insights from "@/pages/Insights";
import StudentProfile from "@/pages/StudentProfile";
import Interventions from "@/pages/Interventions";
import { Toaster } from "@/components/ui/sonner";

const Protected = ({ children }) => {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
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
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Public><Login /></Public>} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/analysis/:id" element={<Analysis />} />
              <Route path="/processing/:id" element={<Processing />} />
              <Route path="/review/:id" element={<Review />} />
              <Route path="/insights/:id" element={<Insights />} />
              <Route path="/interventions/:id" element={<Interventions />} />
              <Route path="/student/:id/:studentId" element={<StudentProfile />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AppProvider>
    </div>
  );
}

export default App;
