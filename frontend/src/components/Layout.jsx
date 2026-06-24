import { Outlet } from "react-router-dom";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { ContextBar } from "@/components/ContextBar";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar />
      <MobileNav />
      <div className="lg:pl-[260px] transition-[padding] duration-200">
        <ContextBar />
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-[11px] text-amber-700 font-medium">
          Demo Prototype · Pre-loaded with sample Class 8 Biology data · Not for production use
        </div>
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
