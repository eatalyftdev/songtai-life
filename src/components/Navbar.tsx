import { Sprout, ShoppingBag, MessageSquareCode, Globe2, Sun, Moon, Home, Info, HelpCircle, Phone, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

interface NavbarProps {
  activeTab: "brand" | "portal" | "tech-spec";
  setActiveTab: (tab: "brand" | "portal" | "tech-spec") => void;
  brandPage: string;
  setBrandPage: (page: string) => void;
  cartCount: number;
  openCart: () => void;
  toggleAI: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  brandPage, 
  setBrandPage, 
  cartCount, 
  openCart, 
  toggleAI, 
  theme, 
  toggleTheme 
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: "home", label: "Home" },
    { id: "about", label: "About Us" },
    { id: "products", label: "Products" },
    { id: "faq", label: "FAQ" },
    { id: "contact", label: "Contact Us" },
  ];

  const handleMenuClick = (id: string) => {
    setActiveTab("brand");
    setBrandPage(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-stone-900/90 backdrop-blur-xl border-b border-stone-800 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div 
            onClick={() => handleMenuClick("home")} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="p-2 bg-gradient-to-tr from-[#006224] to-[#ecc246] rounded-xl text-white shadow-md shadow-emerald-950/20 group-hover:scale-105 transition-transform duration-300">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-sans font-bold text-lg tracking-tight text-white group-hover:text-[#ecc246] transition-colors duration-300">
              Songtai <span className="font-normal text-[#ecc246]">Life</span>
            </span>
          </div>

          {/* Redesigned Navigation Links */}
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            {menuItems.map((item) => {
              const isActive = activeTab === "brand" && brandPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`px-4 py-2 rounded-full font-sans font-semibold text-sm transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "bg-[#0A7D32]/20 border border-[#0A7D32]/50 text-emerald-400 font-extrabold shadow-sm"
                      : "text-stone-300 hover:text-white hover:bg-stone-800/40 border border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Glass Pill Switch */}
            <button
              onClick={toggleTheme}
              className="relative flex items-center justify-between w-14 h-8 bg-stone-800/80 hover:bg-stone-700 border border-stone-700/50 rounded-full p-1 cursor-pointer transition-colors duration-300 shadow-inner overflow-hidden"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {/* Inner sliding circle containing current icon with spring motion and rotation */}
              <motion.div 
                className="absolute w-6 h-6 rounded-full bg-emerald-500 shadow-md flex items-center justify-center z-10"
                animate={{
                  x: theme === "light" ? 22 : 0,
                  rotate: theme === "light" ? 360 : 0
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 24
                }}
              >
                {theme === "light" ? (
                  <Sun className="w-3.5 h-3.5 text-stone-950 stroke-[3]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-stone-950 stroke-[3]" />
                )}
              </motion.div>
              <Moon className="w-3.5 h-3.5 text-stone-500 ml-1.5 pointer-events-none" />
              <Sun className="w-3.5 h-3.5 text-stone-500 mr-1.5 pointer-events-none" />
            </button>

            {/* Shopping Cart */}
            <button
              onClick={openCart}
              className="relative p-2 text-stone-300 hover:text-[#ecc246] hover:bg-stone-800/50 rounded-full transition-all duration-300 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ecc246] text-stone-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* AI Assistant */}
            <button
              onClick={toggleAI}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-white rounded-full text-xs font-semibold border border-[#006224]/30 hover:border-[#ecc246]/50 transition-all duration-300 shadow-md shadow-black/40 cursor-pointer"
            >
              <MessageSquareCode className="w-4 h-4 text-[#ecc246]" />
              <span className="hidden sm:inline">AI Architect</span>
            </button>

            {/* Language Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400 border-l border-stone-800 pl-3">
              <Globe2 className="w-3.5 h-3.5 text-stone-500" />
              <span>EN</span>
              <span className="text-stone-600">/</span>
              <span className="text-stone-500 hover:text-stone-300 cursor-pointer">FR</span>
            </div>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-400 hover:text-white md:hidden hover:bg-stone-800/50 rounded-full transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu panel navigation list */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-stone-800/60 bg-stone-900/95 space-y-1 animate-fade-in">
            {menuItems.map((item) => {
              const isActive = activeTab === "brand" && brandPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#0A7D32]/10 border border-[#0A7D32]/30 text-emerald-400"
                      : "text-stone-400 hover:text-white hover:bg-stone-800/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
