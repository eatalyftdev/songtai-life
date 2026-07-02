import { useState, useEffect, FormEvent } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Product } from "./types";
import Navbar from "./components/Navbar";
import BrandShowcase from "./components/BrandShowcase";
import PrivacyPolicyModal from "./components/PrivacyPolicyModal";
import DistributorPortal from "./components/DistributorPortal";
import TechSpecBrowser from "./components/TechSpecBrowser";
import AIAssistant from "./components/AIAssistant";
import ProtectedRoute from "./components/ProtectedRoute";
import { DistributorLogin, DistributorSignup, AdminLogin } from "./components/auth/AuthViews";
import AdminPortal from "./components/admin/AdminPortal";
import { runCommissionEngine } from "./lib/commissionEngine";

import { 
  ShoppingBag, X, Plus, Minus, Trash2, ShieldCheck, 
  Sparkles, CheckCircle2, Smartphone, KeyRound, AlertCircle 
} from "lucide-react";

interface CartItem {
  product: Product;
  quantity: number;
}

interface Notification {
  id: string;
  message: string;
  type: "success" | "info" | "gold";
}

// =========================================================================
// INNER APP WRAPPER FOR REACT ROUTER HOOKS
// =========================================================================
function AppContent() {
  const [brandPage, setBrandPage] = useState<string>("home");
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("songtai_theme") as "dark" | "light") || "dark");

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("songtai_theme", nextTheme);
      return nextTheme;
    });
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Automatically trigger Privacy Policy modal on first visit
  useEffect(() => {
    const accepted = localStorage.getItem("songtai_privacy_accepted");
    if (accepted !== "true") {
      const timer = setTimeout(() => {
        setPrivacyOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Checkout simulator overlay states
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"phone" | "pin" | "processing" | "success">("phone");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutPin, setCheckoutPin] = useState("");
  const [checkoutProvider, setCheckoutProvider] = useState<"mtn" | "orange">("mtn");
  const [currentOrderId, setCurrentOrderId] = useState("");

  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Notifications manager
  const addNotification = (message: string, type: "success" | "info" | "gold") => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Add to cart handler
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    addNotification(`Added ${product.name} to cart.`, "success");
    setCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const nextQ = item.quantity + delta;
        return { ...item, quantity: nextQ < 1 ? 1 : nextQ };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    addNotification("Item removed from cart.", "info");
  };

  const cartTotalXaf = cart.reduce((acc, item) => acc + (item.product.priceXaf * item.quantity), 0);
  const cartTotalPV = cart.reduce((acc, item) => acc + (item.product.pvPoints * item.quantity), 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Real full-stack MeSomb checkout flow triggering server-side APIs
  const handleInitiateCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutPhone.trim()) return;

    try {
      setCheckoutStep("processing");
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountXaf: cartTotalXaf,
          pvPoints: cartTotalPV,
          phone: checkoutPhone,
          provider: checkoutProvider,
          userId: user?.id || "guest",
          cart: cart.map(item => ({ id: item.product.id, name: item.product.name, qty: item.quantity }))
        })
      });

      const data = await res.json();
      if (data.success) {
        setCurrentOrderId(data.orderId);
        setCheckoutStep("pin");
        addNotification("Carrier secure payment channel established.", "info");
      } else {
        throw new Error(data.error || "Failed to initiate payment");
      }
    } catch (err: any) {
      console.error(err);
      addNotification(`Checkout Error: ${err.message}`, "info");
      setCheckoutStep("phone");
    }
  };

  const handleVerifyPin = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutPin.trim()) return;

    setCheckoutStep("processing");

    // Trigger secure server-side webhook simulation for immediate order fulfillment
    setTimeout(async () => {
      try {
        const res = await fetch("/api/payment/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: currentOrderId,
            transactionId: `tx-momo-${Math.floor(100000 + Math.random() * 900000)}`,
            status: "SUCCESS"
          })
        });

        const data = await res.json();
        if (data.success) {
          setCheckoutStep("success");
          addNotification(`Payment Confirmed! Order ${currentOrderId} is fully fulfilled.`, "success");
          if (user && userProfile && userProfile.role === "distributor") {
            addNotification(`Unilevel MLM overrides calculated. +${cartTotalPV} PV awarded.`, "gold");
          }
          // Clear local cart
          setCart([]);
        } else {
          throw new Error(data.error || "Webhook processing failed");
        }
      } catch (err: any) {
        console.error("Error finalizing commission checkout:", err);
        addNotification("Payment Verification Handshake Failed.", "info");
        setCheckoutStep("pin");
      }
    }, 2000);
  };

  // Navigation tab wrapper matching Phase 1 navbar tab toggling
  const activeTab = location.pathname.startsWith("/distributor") 
    ? "portal" 
    : location.pathname.startsWith("/tech") 
    ? "tech-spec" 
    : "brand";

  const handleTabChange = (tab: "brand" | "portal" | "tech-spec") => {
    if (tab === "brand") navigate("/");
    else if (tab === "portal") navigate("/distributor/dashboard");
    else if (tab === "tech-spec") navigate("/tech-spec");
  };

  return (
    <div className={`min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none antialiased transition-colors duration-300 ${theme === "light" ? "light-theme" : ""}`}>
      {/* Shared Header Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        brandPage={brandPage}
        setBrandPage={(page) => {
          setBrandPage(page);
          navigate("/");
        }}
        cartCount={cartCount}
        openCart={() => setCartOpen(true)}
        toggleAI={() => setAiOpen(prev => !prev)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Core Router Switch */}
      <main className="flex-grow">
        <Routes>
          {/* Landing / Marketing Pages */}
          <Route path="/" element={
            <BrandShowcase 
              brandPage={brandPage}
              setBrandPage={setBrandPage}
              addToCart={addToCart} 
              setActiveTab={handleTabChange} 
              addNotification={addNotification} 
              openPrivacyPolicy={() => setPrivacyOpen(true)}
            />
          } />

          {/* Authentication Pages */}
          <Route path="/distributor/login" element={<DistributorLogin addNotification={addNotification} />} />
          <Route path="/distributor/signup" element={<DistributorSignup addNotification={addNotification} />} />
          <Route path="/admin/login" element={<AdminLogin addNotification={addNotification} />} />

          {/* Protected Distributor Operations Portal */}
          <Route path="/distributor/dashboard" element={
            <ProtectedRoute allowedRoles={["distributor"]}>
              <DistributorPortal addNotification={addNotification} />
            </ProtectedRoute>
          } />

          {/* Protected Admin Auditing Area */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={["admin", "superadmin"]} fallbackPath="/admin/login">
              <AdminPortal addNotification={addNotification} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          } />

          {/* Tech Spec Browser */}
          <Route path="/tech-spec" element={<TechSpecBrowser />} />

          {/* Fallbacks */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* FLOATING SYSTEM NOTIFICATIONS TOAST */}
      <div className="fixed top-24 right-4 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 pointer-events-auto animate-slide-in text-left ${
              n.type === "success" 
                ? "bg-emerald-950/90 border-emerald-900/40 text-emerald-300"
                : n.type === "gold"
                ? "bg-stone-900/90 border-[#ecc246]/30 text-[#ecc246]"
                : "bg-stone-900/90 border-stone-800 text-stone-200"
            }`}
          >
            {n.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            {n.type === "gold" && <Sparkles className="w-5 h-5 text-[#ecc246] flex-shrink-0" />}
            {n.type === "info" && <AlertCircle className="w-5 h-5 text-stone-400 flex-shrink-0" />}
            
            <p className="text-xs font-semibold leading-relaxed">{n.message}</p>
          </div>
        ))}
      </div>

      {/* INTELLIGENT COMPANION (GEMINI CHAT SIDE PANEL) */}
      <AIAssistant isOpen={aiOpen} onClose={() => setAiOpen(false)} />

      {/* PRIVACY & CYBERSECURITY COMPLIANCE MODAL */}
      <PrivacyPolicyModal 
        isOpen={privacyOpen} 
        onClose={() => setPrivacyOpen(false)} 
        addNotification={addNotification} 
      />

      {/* SLIDE-OVER SHOPPING CART DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-left font-sans">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-stone-900 border-l border-stone-850 shadow-2xl flex flex-col justify-between">
              
              {/* Drawer Header */}
              <div className="p-6 bg-stone-950 border-b border-stone-850 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#ecc246]" />
                  <h3 className="font-sans font-bold text-lg text-white">Sovereign Cart</h3>
                </div>
                <button 
                  onClick={() => setCartOpen(false)} 
                  className="p-1 hover:bg-stone-850 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-grow p-6 overflow-y-auto divide-y divide-stone-850/60 bg-stone-950/40">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-stone-500 py-16">
                    <ShoppingBag className="w-12 h-12 text-stone-800 mb-2" />
                    <span>Your shopping cart is currently empty.</span>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="py-4 flex gap-4">
                      <img 
                        src={item.product.image} 
                        alt={item.product.name}
                        className="w-16 h-16 rounded-xl object-cover bg-stone-950 border border-stone-850"
                      />
                      <div className="flex-grow">
                        <h4 className="font-bold text-sm text-white">{item.product.name}</h4>
                        <span className="text-stone-500 text-[10px] uppercase font-semibold block mt-0.5">{item.product.category}</span>
                        <div className="flex justify-between items-center mt-3">
                          <div className="flex items-center gap-2 bg-stone-950 border border-stone-850 rounded-lg p-1 text-xs">
                            <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:text-white"><Minus className="w-3 h-3" /></button>
                            <span className="font-bold text-white px-2">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:text-white"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="font-extrabold text-sm text-white">{(item.product.priceXaf * item.quantity).toLocaleString()} XAF</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-600 hover:text-red-400 self-start p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer Summary */}
              {cart.length > 0 && (
                <div className="p-6 bg-stone-950 border-t border-stone-850 space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-stone-400">
                      <span>Total Volume Points</span>
                      <span className="font-bold text-[#ecc246]">{cartTotalPV} PV</span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                      <span>Subtotal</span>
                      <span>{cartTotalXaf.toLocaleString()} XAF</span>
                    </div>
                    <div className="flex justify-between text-white font-extrabold text-base pt-2 border-t border-stone-850">
                      <span>Order Total</span>
                      <span>{cartTotalXaf.toLocaleString()} XAF</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCheckoutOpen(true);
                      setCheckoutStep("phone");
                    }}
                    className="w-full py-4 bg-[#006224] hover:bg-[#00531d] text-white rounded-2xl font-bold tracking-wide shadow-xl shadow-emerald-950/40 text-xs sm:text-sm cursor-pointer"
                  >
                    Checkout with MeSomb Mobile Money
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL WINDOW */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left font-sans select-none">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setCheckoutOpen(false)} />
          
          <div className="bg-stone-900 border border-stone-850 rounded-[32px] max-w-md w-full p-6 relative z-10 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-stone-850">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#ecc246]" />
                <h4 className="font-sans font-bold text-white text-base">MeSomb Mobile Money Checkout</h4>
              </div>
              <button 
                onClick={() => setCheckoutOpen(false)} 
                className="p-1 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 1: Enter phone */}
            {checkoutStep === "phone" && (
              <form onSubmit={handleInitiateCheckout} className="space-y-4">
                <p className="text-stone-400 text-xs leading-relaxed">
                  Enter your Cameroon mobile money credentials. The platform will dispatch a simulated transaction push notification.
                </p>

                {/* Network provider tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutProvider("mtn")}
                    className={`p-3.5 rounded-xl border text-xs font-bold transition-all ${
                      checkoutProvider === "mtn"
                        ? "bg-yellow-500/15 border-yellow-500 text-yellow-500"
                        : "bg-stone-950 border-stone-850 text-stone-400"
                    }`}
                  >
                    MTN Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutProvider("orange")}
                    className={`p-3.5 rounded-xl border text-xs font-bold transition-all ${
                      checkoutProvider === "orange"
                        ? "bg-orange-500/15 border-orange-500 text-orange-500"
                        : "bg-stone-950 border-stone-850 text-stone-400"
                    }`}
                  >
                    Orange Money
                  </button>
                </div>

                <div>
                  <label className="text-stone-400 text-xs block mb-1.5 font-bold">Cameroon Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={checkoutPhone}
                    onChange={(e) => setCheckoutPhone(e.target.value)}
                    placeholder="+237 6xx xxx xxx"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#006224] focus:ring-1 focus:ring-[#006224] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
                  />
                </div>

                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-850 space-y-1.5 text-xs text-stone-400">
                  <div className="flex justify-between font-bold text-white">
                    <span>Order Price</span>
                    <span>{cartTotalXaf.toLocaleString()} XAF</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>PV Points generated</span>
                    <span>+{cartTotalPV} PV</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#006224] hover:bg-[#00531d] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Initiate Secure Collect
                </button>
              </form>
            )}

            {/* STEP 2: Enter PIN */}
            {checkoutStep === "pin" && (
              <form onSubmit={handleVerifyPin} className="space-y-4 text-center">
                <p className="text-[#ecc246] text-xs font-semibold">
                  Push verification sent to your handset. Please enter your mock 4-digit PIN code to authorize.
                </p>

                <div className="flex justify-center max-w-xs mx-auto">
                  <div className="relative w-full">
                    <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={checkoutPin}
                      onChange={(e) => setCheckoutPin(e.target.value)}
                      placeholder="• • • •"
                      className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#006224] focus:ring-1 focus:ring-[#006224] rounded-xl text-white placeholder-stone-700 outline-none text-center font-bold text-lg tracking-widest"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#ecc246] hover:bg-[#dbb13b] text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Confirm Authorization PIN
                </button>
              </form>
            )}

            {/* STEP 3: Processing */}
            {checkoutStep === "processing" && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <span className="w-10 h-10 border-4 border-[#ecc246] border-t-transparent rounded-full animate-spin" />
                <div>
                  <h5 className="font-bold text-white text-sm">Validating Mobile Ledger...</h5>
                  <p className="text-[10px] text-stone-500 uppercase mt-1">Calling MeSomb transaction verification webhooks</p>
                </div>
              </div>
            )}

            {/* STEP 4: Success */}
            {checkoutStep === "success" && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-full text-[#ecc246]">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div>
                  <h5 className="font-bold text-white text-base">Payment Complete!</h5>
                  <p className="text-stone-400 text-xs mt-1">Transaction recorded on the unilevel database securely.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutOpen(false);
                    setCartOpen(false);
                    navigate("/distributor/dashboard");
                  }}
                  className="px-6 py-2.5 bg-[#006224] hover:bg-[#00531d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  View My Distributor Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
