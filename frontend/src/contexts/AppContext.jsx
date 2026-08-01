import { createContext, useContext, useState, useEffect } from "react";
import posthog from "posthog-js";
import { translations } from "@/data/translations";

const AppContext = createContext(null);

const CLASS_OPTIONS = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
const SUBJECTS_KEY = "evalassist-subjects";

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
    return localStorage.getItem("evalassist-active-class") || "";
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

  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setUser(null);
      setActiveSubject("");
      setActiveClass("");
    };
    window.addEventListener("evalassist:auth-expired", handleExpired);
    return () => window.removeEventListener("evalassist:auth-expired", handleExpired);
  }, []);

  const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;

  const login = async (email, password) => {
    const { apiClient } = await import("@/data/apiClient");
    const data = await apiClient.login(email, password);
    localStorage.setItem("evalassist-token", data.access_token);
    localStorage.setItem("evalassist-user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    posthog.identify(data.user.email || data.user._id, { email: data.user.email });
    return data;
  };

  const loginWithName = async (email, password, displayName) => {
    const { apiClient } = await import("@/data/apiClient");
    const data = await apiClient.login(email, password);
    const userWithName = { ...data.user, name: displayName };
    localStorage.setItem("evalassist-token", data.access_token);
    localStorage.setItem("evalassist-user", JSON.stringify(userWithName));
    setToken(data.access_token);
    setUser(userWithName);
    posthog.identify(userWithName.email || userWithName._id, { email: userWithName.email, name: displayName });
    return data;
  };

  const googleLogin = async (credential, displayName) => {
    const { apiClient } = await import("@/data/apiClient");
    const data = await apiClient.googleLogin(credential, displayName);
    const userWithName = displayName ? { ...data.user, name: displayName } : data.user;
    localStorage.setItem("evalassist-token", data.access_token);
    localStorage.setItem("evalassist-user", JSON.stringify(userWithName));
    setToken(data.access_token);
    setUser(userWithName);
    posthog.identify(userWithName.email || userWithName._id, { email: userWithName.email, name: displayName });
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(SUBJECTS_KEY);
    setActiveSubject("");
    setActiveClass("");
    posthog.reset();
  };

  return (
    <AppContext.Provider value={{ lang, setLang, t, user, setUser, login, loginWithName, googleLogin, logout, activeSubject, setActiveSubject, activeClass, setActiveClass, CLASS_OPTIONS }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
