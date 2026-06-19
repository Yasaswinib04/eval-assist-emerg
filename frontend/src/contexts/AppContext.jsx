import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "@/data/translations";

const AppContext = createContext(null);

const CLASS_OPTIONS = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
const SUBJECTS_KEY = "evalassist-subjects";

function loadPersistedSubjects() {
  try {
    const raw = localStorage.getItem(SUBJECTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("evalassist-lang") || "en");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("evalassist-user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("evalassist-token"));
  const [activeSubject, setActiveSubject] = useState(() => {
    const stored = localStorage.getItem("evalassist-active-subject");
    return stored || "";
  });
  const [activeClass, setActiveClass] = useState(() => {
    const stored = localStorage.getItem("evalassist-active-class");
    return stored || "Class 8";
  });

  useEffect(() => { localStorage.setItem("evalassist-lang", lang); }, [lang]);

  useEffect(() => {
    if (user) localStorage.setItem("evalassist-user", JSON.stringify(user));
    else localStorage.removeItem("evalassist-user");
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem("evalassist-token", token);
    else localStorage.removeItem("evalassist-token");
  }, [token]);

  useEffect(() => {
    localStorage.setItem("evalassist-active-subject", activeSubject);
  }, [activeSubject]);

  useEffect(() => {
    localStorage.setItem("evalassist-active-class", activeClass);
  }, [activeClass]);

  const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  const login = async (email, password) => {
    const { apiClient } = await import("@/data/apiClient");
    const data = await apiClient.login(email, password);
    setToken(data.access_token);
    setUser(data.user);
    const subjects = data.user?.subjects;
    if (subjects?.length) {
      localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
      if (!localStorage.getItem("evalassist-active-subject")) {
        setActiveSubject(subjects[0]);
      }
    }
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(SUBJECTS_KEY);
    setActiveSubject("");
  };

  return (
    <AppContext.Provider value={{ lang, setLang, t, user, login, logout, activeSubject, setActiveSubject, activeClass, setActiveClass, CLASS_OPTIONS }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
