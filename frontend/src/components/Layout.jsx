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
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
