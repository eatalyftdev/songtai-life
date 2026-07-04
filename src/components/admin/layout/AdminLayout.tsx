import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

interface AdminLayoutProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function AdminLayout({ theme, toggleTheme }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("admin_sidebar_collapsed") === "true"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("admin_sidebar_collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  return (
    <div className="flex h-screen bg-stone-950 text-white overflow-hidden">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin — Songtai Life</title>
      </Helmet>
      <AdminSidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar
          theme={theme}
          toggleTheme={toggleTheme}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
