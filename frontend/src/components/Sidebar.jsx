import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BookCheck, LogOut, LayoutDashboard, FileText, ClipboardCheck, BarChart3, Target, Settings, ChevronLeft, Menu, X, Users, Layers } from "lucide-react";
import { useState, useEffect } from "react";

const isAssessmentPage = (pathname) => {
  return /^\/(analysis|processing|review|insights|interventions|student)\//.test(pathname);
};

export const Sidebar = () => {
  const { t, user, logout, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeAssessmentId } = useParams();
  const aid = routeAssessmentId || "asm-001";
  const [collapsed, setCollapsed] = useState(false);
  const globalLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { to: "/class/class-8-biology", label: "Class Performance", icon: BarChart3, testId: "nav-class" },
  ];

  const onAssessment = isAssessmentPage(location.pathname);

  const assessmentLinks = [
    { to: `/analysis/${aid}`, label: "Analysis", icon: FileText, testId: "nav-analysis" },
    { to: `/review/${aid}`, label: "Review & Override", icon: ClipboardCheck, testId: "nav-review" },
    { to: `/insights/${aid}`, label: "Exam Insights", icon: BarChart3, testId: "nav-insights" },
    { to: `/interventions/${aid}`, label: "Interventions", icon: Target, testId: "nav-interventions" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (to) => {
    if (to === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    const seg = to.split("/")[1];
    return location.pathname.startsWith(`/${seg}`);
  };

  return (
    <aside
      data-testid="sidebar"
      className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-white border-r border-stone-200 transition-[width] duration-200 z-40 ${
        collapsed ? "w-[72px]" : "w-[260px]"
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-stone-200">
        <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0" data-testid="sidebar-brand">
          <div className="h-9 w-9 rounded-lg bg-blue-800 text-white flex items-center justify-center shrink-0">
            <BookCheck size={20} strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="font-display font-semibold text-stone-900 text-lg truncate">{t("appName")}</div>
              <div className="text-[11px] text-stone-500 truncate">Teacher Workspace</div>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          data-testid="sidebar-collapse-toggle"
          className={`ml-auto h-7 w-7 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center ${collapsed ? "rotate-180" : ""}`}
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {!collapsed && (
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mb-2">Global</div>
        )}
        <div className="space-y-0.5">
          {globalLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={item.testId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-blue-50 text-blue-800" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : ""}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {onAssessment && (
          <>
            {!collapsed && (
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mt-6 mb-2">
                SA1 — Biological Science
              </div>
            )}
            <div className="space-y-0.5">
              {assessmentLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-testid={item.testId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active ? "bg-blue-50 text-blue-800" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : ""}
                  >
                    <Icon size={17} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {!collapsed && (
          <>
            <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mt-6 mb-2">Account</div>
            <button
              onClick={() => {}}
              data-testid="nav-settings"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            >
              <Settings size={17} /> <span>{t("settings")}</span>
            </button>
          </>
        )}
      </nav>

      {/* Language + User */}
      <div className="border-t border-stone-200 p-3 space-y-3">
        {!collapsed && <div className="flex justify-center"><LanguageToggle /></div>}
        {user && (
          <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-semibold shrink-0">
              {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            {!collapsed && (
              <div className="leading-tight flex-1 min-w-0">
                <div className="text-sm font-semibold text-stone-900 truncate">{user.name}</div>
                <div className="text-[11px] text-stone-500 truncate">{activeSubject || "Subject"} · {activeClass || "Class"}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="h-8 w-8 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center"
                title={t("logout")}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

// Mobile nav – hamburger overlay drawer
export const MobileNav = () => {
  const { t, user, logout, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeAssessmentId } = useParams();
  const aid = routeAssessmentId || "asm-001";
  const [open, setOpen] = useState(false);
  const onAssessment = isAssessmentPage(location.pathname);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const globalLinks = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { to: "/class/class-8-biology", label: "Class Performance", icon: BarChart3, testId: "nav-class" },
  ];

  const assessmentLinks = [
    { to: `/analysis/${aid}`, label: "Analysis", icon: FileText, testId: "nav-analysis" },
    { to: `/review/${aid}`, label: "Review & Override", icon: ClipboardCheck, testId: "nav-review" },
    { to: `/insights/${aid}`, label: "Exam Insights", icon: BarChart3, testId: "nav-insights" },
    { to: `/interventions/${aid}`, label: "Interventions", icon: Target, testId: "nav-interventions" },
  ];

  const isActive = (to) => {
    if (to === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    const seg = to.split("/")[1];
    return location.pathname.startsWith(`/${seg}`);
  };

  return (
    <>
      {/* Sticky top bar with hamburger */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-200">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setOpen(true)}
            className="h-10 w-10 rounded-lg hover:bg-stone-100 text-stone-600 flex items-center justify-center -ml-1"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-800 text-white flex items-center justify-center">
              <BookCheck size={16} strokeWidth={2.5} />
            </div>
            <div className="font-display font-semibold text-stone-900">{t("appName")}</div>
          </Link>
          <div className="flex items-center gap-1">
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-white shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-800 text-white flex items-center justify-center shrink-0">
              <BookCheck size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-semibold text-stone-900 text-base">{t("appName")}</div>
              <div className="text-[10px] text-stone-500">Teacher Workspace</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-10 w-10 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center -mr-1"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ height: "calc(100% - 56px)" }}>
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mb-2">Global</div>
          <div className="space-y-0.5">
            {globalLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={item.testId}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-blue-50 text-blue-800" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {onAssessment && (
            <>
              <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mt-6 mb-2">
                SA1 — Biological Science
              </div>
              <div className="space-y-0.5">
                {assessmentLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      data-testid={item.testId}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                        active ? "bg-blue-50 text-blue-800" : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mt-6 mb-2">Account</div>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          >
            <Settings size={18} /> <span>{t("settings")}</span>
          </button>

          <div className="mt-auto border-t border-stone-200 pt-3 px-3" style={{ marginTop: "auto" }}>
            <div className="flex justify-center mb-3"><LanguageToggle /></div>
            {user && (
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-semibold shrink-0">
                  {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="leading-tight flex-1 min-w-0">
                  <div className="text-sm font-semibold text-stone-900 truncate">{user.name}</div>
                  <div className="text-[11px] text-stone-500 truncate">{activeSubject || "Subject"} · {activeClass || "Class"}</div>
                </div>
                <button
                  onClick={() => { logout(); navigate("/login"); }}
                  className="h-10 w-10 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center"
                  data-testid="mobile-logout"
                  aria-label={t("logout")}
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
};
