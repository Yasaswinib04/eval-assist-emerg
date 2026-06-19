import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { BookCheck, LogOut, LayoutDashboard, FileText, ClipboardCheck, BarChart3, Target, Settings, ChevronLeft } from "lucide-react";
import { useState } from "react";

export const Sidebar = () => {
  const { t, user, logout, activeSubject, activeClass } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeAssessmentId } = useParams();
  const aid = routeAssessmentId || "asm-001";
  const [collapsed, setCollapsed] = useState(false);

  const workspace = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard, testId: "nav-dashboard" },
    { to: `/analysis/${aid}`, label: t("assessments"), icon: FileText, testId: "nav-assessments" },
    { to: `/review/${aid}`, label: t("reviewOverride"), icon: ClipboardCheck, testId: "nav-review" },
    { to: `/insights/${aid}`, label: t("insights"), icon: BarChart3, testId: "nav-insights" },
    { to: `/interventions/${aid}`, label: t("interventions"), icon: Target, testId: "nav-interventions" },
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

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {!collapsed && (
          <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mb-2">{t("workspace")}</div>
        )}
        <div className="space-y-0.5">
          {workspace.map((item) => {
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

        {!collapsed && (
          <>
            <div className="text-[10px] font-bold tracking-[0.12em] uppercase text-stone-400 px-3 mt-6 mb-2">{t("account")}</div>
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

// Mobile top bar – simplified for small screens
export const MobileTopBar = () => {
  const { t, user, logout } = useApp();
  const navigate = useNavigate();
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-200">
      <div className="flex items-center justify-between h-14 px-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-800 text-white flex items-center justify-center">
            <BookCheck size={16} strokeWidth={2.5} />
          </div>
          <div className="font-display font-semibold text-stone-900">{t("appName")}</div>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button onClick={() => { logout(); navigate("/login"); }} className="h-8 w-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center" data-testid="mobile-logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-thin">
        {[
          { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
          { to: "/analysis/asm-001", label: t("assessments"), icon: FileText },
          { to: "/review/asm-001", label: t("reviewOverride"), icon: ClipboardCheck },
          { to: "/insights/asm-001", label: t("insights"), icon: BarChart3 },
          { to: "/interventions/asm-001", label: t("interventions"), icon: Target },
        ].map((it) => (
          <Link key={it.to} to={it.to} className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium whitespace-nowrap">
            <it.icon size={13} /> {it.label}
          </Link>
        ))}
      </div>
    </header>
  );
};
