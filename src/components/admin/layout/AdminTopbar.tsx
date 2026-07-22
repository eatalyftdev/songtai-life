import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, Search, Bell, Sun, Moon, ChevronDown, User, KeyRound, LogOut, X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import { useNavigate } from "react-router-dom";

const LABEL_MAP: Record<string, string> = {
  admin: "Admin", dashboard: "Dashboard", products: "Products", orders: "Orders",
  distributors: "Distributors", wallets: "Wallets", commissions: "Commissions",
  blog: "Blog", events: "Events", testimonials: "Testimonials", gallery: "Gallery",
  appointments: "Appointments", contacts: "Contact Messages", newsletter: "Newsletter",
  media: "Media Library", settings: "Site Settings", audit: "Audit Log",
};

interface AdminTopbarProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
  onMenuClick: () => void;
}

export default function AdminTopbar({ theme, toggleTheme, onMenuClick }: AdminTopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Breadcrumbs from path
  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: LABEL_MAP[seg] ?? seg,
    path: "/" + segments.slice(0, i + 1).join("/"),
  }));

  // Fetch pending actions count (new KYC + new appointments)
  useEffect(() => {
    const fetchPending = async () => {
      const [kycRes, aptRes] = await Promise.all([
        supabase.from("distributors").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "requested"),
      ]);
      setPendingCount((kycRes.count ?? 0) + (aptRes.count ?? 0));
    };
    fetchPending();
    const ch = supabase.channel("topbar-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "distributors" }, fetchPending)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Debounced global search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const q = searchQuery.toLowerCase();
      const [prodRes, orderRes, distRes] = await Promise.all([
        supabase.from("products").select("id, name_en").ilike("name_en", `%${q}%`).limit(4),
        supabase.from("orders").select("id, order_id, phone").ilike("order_id", `%${q}%`).limit(4),
        supabase.from("profiles").select("id, email").ilike("email", `%${q}%`).limit(4),
      ]);
      const results: any[] = [
        ...(prodRes.data ?? []).map(p => ({ type: "Product", label: p.name_en, path: "/admin/products" })),
        ...(orderRes.data ?? []).map(o => ({ type: "Order", label: o.order_id, path: "/admin/orders" })),
        ...(distRes.data ?? []).map(u => ({ type: "User", label: u.email, path: "/admin/distributors" })),
      ];
      setSearchResults(results);
      setSearching(false);
    }, 300);
  }, [searchQuery]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchQuery("");
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = (userProfile?.email ?? "AD").slice(0, 2).toUpperCase();

  return (
    <header className="h-14 border-b border-stone-800/60 bg-stone-950/95 backdrop-blur-sm flex items-center px-4 gap-4 flex-shrink-0 sticky top-0 z-30">
      {/* Mobile menu */}
      <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-all cursor-pointer">
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs overflow-hidden flex-1">
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5 whitespace-nowrap">
            {i > 0 && <span className="text-stone-600">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="text-stone-300 font-medium">{crumb.label}</span>
            ) : (
              <Link to={crumb.path} className="text-stone-500 hover:text-stone-300 transition-colors">{crumb.label}</Link>
            )}
          </span>
        ))}
      </nav>

      {/* Global search */}
      <div ref={searchRef} className="relative hidden sm:block">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-500" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search…"
          className="pl-8 pr-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-[#0A7D32] w-44 transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-stone-500 hover:text-white cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        )}
        {(searchResults.length > 0 || searching) && searchQuery && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden z-50">
            {searching && <div className="px-4 py-3 text-stone-500 text-xs">Searching…</div>}
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => { navigate(r.path); setSearchQuery(""); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-800 text-left transition-all cursor-pointer"
              >
                <span className="text-[10px] text-stone-500 uppercase font-bold w-14 flex-shrink-0">{r.type}</span>
                <span className="text-stone-200 text-xs truncate">{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme} className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all cursor-pointer">
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Notification bell */}
      <Link to="/admin/appointments" className="relative p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all">
        <Bell className="w-4 h-4" />
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C9A227] text-stone-950 text-[9px] font-black rounded-full flex items-center justify-center">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </Link>

      {/* User avatar dropdown */}
      <div ref={userMenuRef} className="relative">
        <button
          onClick={() => setUserMenuOpen(v => !v)}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-800 transition-all cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#0A7D32]/20 border border-[#0A7D32]/30 flex items-center justify-center">
            <span className="text-[#C9A227] text-[10px] font-bold">{initials}</span>
          </div>
          <ChevronDown className="w-3 h-3 text-stone-500" />
        </button>
        {userMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-stone-800">
              <p className="text-white text-xs font-semibold truncate">{userProfile?.email}</p>
              <p className="text-stone-500 text-[10px] capitalize">{userProfile?.role}</p>
            </div>
            <button onClick={() => { setUserMenuOpen(false); navigate("/admin/settings"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-stone-300 hover:bg-stone-800 text-xs cursor-pointer transition-all">
              <Settings className="w-3.5 h-3.5" /> Settings
            </button>
            <button
              onClick={async () => { setUserMenuOpen(false); await logout(); navigate("/admin/login"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:bg-red-950/20 text-xs cursor-pointer transition-all">
              <LogOut className="w-3.5 h-3.5" /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function Settings(props: any) { return <User {...props} />; }
