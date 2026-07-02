import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  Smartphone, Mail, Lock, Sparkles, User, Award, 
  ArrowRight, ShieldCheck, ChevronRight, CheckCircle2 
} from "lucide-react";

// ==========================================
// DISTRIBUTOR LOGIN VIEW
// ==========================================
export function DistributorLogin({ addNotification }: { addNotification: any }) {
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, simulatePhoneOTP, verifyPhoneOTPAndLogin } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await login(email, password);
      addNotification("Welcome back to Songtai Life operations!", "success");
      navigate("/distributor/dashboard");
    } catch (err: any) {
      console.error(err);
      addNotification(err.message || "Invalid credentials.", "info");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone) return;

    setLoading(true);
    try {
      const code = await simulatePhoneOTP(phone);
      setGeneratedOtp(code);
      setOtpSent(true);
      addNotification(`OTP Code sent successfully. Try entering: ${code}`, "success");
    } catch (err: any) {
      addNotification("Error dispatching simulated OTP.", "info");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!enteredOtp) return;

    setLoading(true);
    try {
      await verifyPhoneOTPAndLogin(phone, generatedOtp, enteredOtp);
      addNotification("Phone authenticated. Welcome back!", "success");
      navigate("/distributor/dashboard");
    } catch (err: any) {
      addNotification("Incorrect or expired OTP verification code.", "info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 font-sans select-none antialiased">
      <div className="absolute inset-0 bg-radial-gradient from-emerald-950/20 to-stone-950 pointer-events-none" />
      
      <div className="w-full max-w-md bg-stone-900 border border-stone-850 rounded-[32px] p-8 shadow-2xl relative z-10 text-left">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-[#ecc246] font-bold">Unilevel Network Entrance</span>
          <h2 className="font-sans font-black text-2xl text-white mt-1">Distributor Operations</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            Formulating sovereign health solutions and unilevel business networks across Africa.
          </p>
        </div>

        {/* Auth Method Toggles */}
        <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1 rounded-xl mb-6 border border-stone-850/60">
          <button
            onClick={() => { setAuthMethod("email"); setOtpSent(false); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authMethod === "email"
                ? "bg-[#0A7D32]/15 border border-[#0A7D32]/30 text-emerald-400"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Email & Password
          </button>
          <button
            onClick={() => { setAuthMethod("phone"); setOtpSent(false); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              authMethod === "phone"
                ? "bg-[#0A7D32]/15 border border-[#0A7D32]/30 text-emerald-400"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Mobile OTP Login
          </button>
        </div>

        {/* Email form */}
        {authMethod === "email" ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-stone-400 text-xs block mb-1.5 font-bold">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-stone-400 text-xs block mb-1.5 font-bold">Secret Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="• • • • • •"
                  className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-6"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Sovereign Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-[#ecc246]" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Phone OTP Flow */
          <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="text-stone-400 text-xs block mb-1.5 font-bold">Cameroon Phone Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+237 6xx xxx xxx"
                      className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Dispatch Simulated OTP Code</span>
                      <Smartphone className="w-4 h-4 text-[#ecc246]" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="p-4 bg-stone-950 rounded-xl border border-[#ecc246]/10 text-center">
                  <span className="text-[10px] text-[#ecc246] font-bold block uppercase mb-1">Simulated Carrier Handshake</span>
                  <p className="text-stone-400 text-xs">
                    Verification code sent to <strong className="text-white">{phone}</strong>. Use code: <strong className="text-emerald-400 text-sm font-mono">{generatedOtp}</strong>
                  </p>
                </div>

                <div>
                  <label className="text-stone-400 text-xs block mb-1.5 font-bold">Verification PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    placeholder="• • • • • •"
                    className="w-full py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-center font-bold text-lg tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Confirm Authorization Code</span>
                      <ShieldCheck className="w-4 h-4 text-[#ecc246]" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-stone-850/60 text-center text-xs space-y-2">
          <p className="text-stone-500">
            Don't have a unilevel business account yet?{" "}
            <Link to="/distributor/signup" className="text-[#ecc246] font-bold hover:underline">
              Apply Now
            </Link>
          </p>
          <p>
            <Link to="/admin/login" className="text-stone-600 hover:text-stone-400">
              Admin Entry Hub
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DISTRIBUTOR SIGNUP / APPLICATION VIEW
// ==========================================
export function DistributorSignup({ addNotification }: { addNotification: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [sponsorCode, setSponsorCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !phone) return;

    setLoading(true);
    try {
      // Create user and setup distributor roles
      await signup(email, password, phone, "distributor");
      
      // If sponsor is entered, log it
      addNotification("Sovereign Distributor profile generated successfully!", "success");
      addNotification("Please configure KYC document parameters in your dashboard.", "gold");
      navigate("/distributor/dashboard");
    } catch (err: any) {
      console.error(err);
      addNotification(err.message || "Failed to create distributor.", "info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 font-sans select-none antialiased">
      <div className="absolute inset-0 bg-radial-gradient from-emerald-950/20 to-stone-950 pointer-events-none" />
      
      <div className="w-full max-w-md bg-stone-900 border border-stone-850 rounded-[32px] p-8 shadow-2xl relative z-10 text-left">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-[#ecc246] font-bold">Unilevel Matrix Recruitment</span>
          <h2 className="font-sans font-black text-2xl text-white mt-1">Become a Distributor</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            Register and unlock unilevel overrides, binary margins, and bio-yield agricultural overrides.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">Sponsor's Referral Code</label>
            <div className="relative">
              <Award className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type="text"
                value={sponsorCode}
                onChange={(e) => setSponsorCode(e.target.value)}
                placeholder="ST-ELENA-88 (Default Sponsor)"
                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-sm uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">Cameroon Phone Number</label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6xx xxx xxx"
                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-6"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Register & Launch Portal</span>
                <Sparkles className="w-4 h-4 text-[#ecc246]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-850/60 text-center text-xs">
          <p className="text-stone-500">
            Already registered as a network distributor?{" "}
            <Link to="/distributor/login" className="text-[#ecc246] font-bold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ADMIN LOGIN VIEW
// ==========================================
export function AdminLogin({ addNotification }: { addNotification: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await login(email, password);
      addNotification("Sovereign Admin Panel loaded.", "gold");
      navigate("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      addNotification("Invalid admin credentials or restricted resource.", "info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 font-sans select-none antialiased">
      <div className="absolute inset-0 bg-radial-gradient from-yellow-950/25 to-stone-950 pointer-events-none" />
      
      <div className="w-full max-w-md bg-stone-900 border border-yellow-950/20 rounded-[32px] p-8 shadow-2xl relative z-10 text-left">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-[#ecc246] font-bold">Corporate Auditing Hub</span>
          <h2 className="font-sans font-black text-2xl text-white mt-1">Admin Operations</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            Verify KYC uploads, monitor total unilevel ledger volumes, and dispatch commission adjustments.
          </p>
          
          <div className="mt-4 p-3.5 bg-stone-800/50 border border-stone-700/50 rounded-xl text-left">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
              Use the credentials created via the admin bootstrap script.
            </span>
          </div>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">Admin Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@songtailife.com"
                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#ecc246] focus:ring-1 focus:ring-[#ecc246] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">Admin Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="• • • • • •"
                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#ecc246] focus:ring-1 focus:ring-[#ecc246] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-stone-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-6"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter Administration Workspace</span>
                <ShieldCheck className="w-4 h-4 text-stone-950" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-850/60 text-center text-xs">
          <Link to="/distributor/login" className="text-stone-500 hover:text-white font-bold hover:underline">
            ← Return to Distributor Login
          </Link>
        </div>
      </div>
    </div>
  );
}
