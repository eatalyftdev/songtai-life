import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Users, Wallet, Award,
  BookOpen, Calendar, Star, Image, CalendarCheck, Mail, Send,
  Library, Settings, History, LogOut, ChevronLeft, ChevronRight, Menu,
  HelpCircle, Layers, Sliders, BookMarked, Phone, Leaf, CreditCard, Bot, FileEdit, Globe, Zap
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard",        path: "/admin/dashboard",     icon: LayoutDashboard, roles: ["admin","superadmin","content_editor"] },
  { label: "Products",         path: "/admin/products",      icon: ShoppingBag,     roles: ["admin","superadmin"] },
  { label: "Orders",           path: "/admin/orders",        icon: ShoppingCart,    roles: ["admin","superadmin"] },
  { label: "Distributors",     path: "/admin/distributors",  icon: Users,           roles: ["admin","superadmin"] },
  { label: "Wallets",          path: "/admin/wallets",       icon: Wallet,          roles: ["admin","superadmin"] },
  { label: "Commissions",      path: "/admin/commissions",   icon: Award,           roles: ["admin","superadmin"] },
  { label: "Blog",             path: "/admin/blog",          icon: BookOpen,        roles: ["admin","superadmin","content_editor"] },
  { label: "Events",           path: "/admin/events",        icon: Calendar,        roles: ["admin","superadmin","content_editor"] },
  { label: "Testimonials",     path: "/admin/testimonials",  icon: Star,            roles: ["admin","superadmin","content_editor"] },
  { label: "Page Edits",       path: "/admin/pages",                icon: FileEdit,     roles: ["admin","superadmin","content_editor"] },
  { label: "Homepage",         path: "/admin/homepage",             icon: LayoutDashboard, roles: ["admin","superadmin","content_editor"] },
  { label: "Our Story",        path: "/admin/our-story",            icon: BookMarked,   roles: ["admin","superadmin","content_editor"] },
  { label: "Contact Page",     path: "/admin/contact-page",         icon: Phone,        roles: ["admin","superadmin","content_editor"] },
  { label: "Wellness Hub",     path: "/admin/wellness-hub",         icon: Leaf,         roles: ["admin","superadmin","content_editor"] },
  { label: "Become Distrib.",  path: "/admin/become-distributor",   icon: Users,        roles: ["admin","superadmin","content_editor"] },
  { label: "Payment Config",   path: "/admin/payment-config",       icon: CreditCard,   roles: ["admin","superadmin"] },
  { label: "AI Settings",      path: "/admin/ai-settings",          icon: Bot,          roles: ["admin","superadmin","content_editor"] },
  { label: "Hero Carousel",    path: "/admin/hero-carousel",        icon: Sliders,      roles: ["admin","superadmin","content_editor"] },
  { label: "Gallery",          path: "/admin/gallery",             icon: Image,        roles: ["admin","superadmin","content_editor"] },
  { label: "FAQ",              path: "/admin/faq",                 icon: HelpCircle,   roles: ["admin","superadmin","content_editor"] },
  { label: "Prod. Categories", path: "/admin/products/categories", icon: Layers,       roles: ["admin","superadmin"] },
  { label: "Appointments",     path: "/admin/appointments",  icon: CalendarCheck,   roles: ["admin","superadmin"] },
  { label: "Contact Messages", path: "/admin/contacts",      icon: Mail,            roles: ["admin","superadmin"] },
  { label: "Newsletter",       path: "/admin/newsletter",    icon: Send,            roles: ["admin","superadmin"] },
  { label: "Media Library",    path: "/admin/media",         icon: Library,         roles: ["admin","superadmin","content_editor"] },
  { label: "Partner Sites",    path: "/admin/partners",      icon: Globe,           roles: ["admin","superadmin"] },
  { label: "God Mode",         path: "/admin/god-mode",      icon: Zap,             roles: ["admin","superadmin"] },
  { label: "Site Settings",    path: "/admin/settings",      icon: Settings,        roles: ["admin","superadmin"] },
  { label: "Audit Log",        path: "/admin/audit",         icon: History,         roles: ["admin","superadmin"] },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarContent({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: (v: boolean) => void }) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const role = userProfile?.role ?? "admin";
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));
  const initials = (userProfile?.email ?? "AD").slice(0, 2).toUpperCase();
  const name = userProfile?.email?.split("@")[0] ?? "Admin";

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 border-r border-stone-800/60">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-stone-800/60 flex-shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-xl bg-[#0A7D32] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-black">SL</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="text-white text-sm font-bold tracking-tight whitespace-nowrap overflow-hidden"
            >
              Songtai Life
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {visibleItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                isActive
                  ? "bg-[#0A7D32]/15 border-l-2 border-[#0A7D32] text-white pl-[calc(0.75rem-2px)]"
                  : "text-stone-400 hover:text-white hover:bg-stone-800/60 border-l-2 border-transparent pl-[calc(0.75rem-2px)]"
              } ${collapsed ? "justify-center" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-[#C9A227]" : "text-stone-500 group-hover:text-stone-300"}`} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-xs font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer: user + collapse toggle */}
      <div className="flex-shrink-0 border-t border-stone-800/60 p-2 space-y-1">
        {/* User info */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${collapsed ? "justify-center" : ""}`}>
          <div className="w-7 h-7 rounded-lg bg-[#0A7D32]/20 border border-[#0A7D32]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#C9A227] text-[10px] font-bold">{initials}</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <p className="text-white text-xs font-semibold whitespace-nowrap">{name}</p>
                <p className="text-stone-500 text-[10px] whitespace-nowrap capitalize">{role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? "Log out" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-400 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xs font-medium whitespace-nowrap overflow-hidden"
              >
                Log out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-500 hover:text-white hover:bg-stone-800/60 transition-all cursor-pointer ${collapsed ? "justify-center" : ""}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-xs font-medium whitespace-nowrap overflow-hidden"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: AdminSidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="hidden md:flex flex-col flex-shrink-0 overflow-hidden h-screen sticky top-0"
      >
        <SidebarContent collapsed={collapsed} onCollapse={onCollapse} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/70 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden"
            >
              <SidebarContent collapsed={false} onCollapse={() => {}} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export { Menu };
