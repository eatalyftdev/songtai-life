import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../context/AuthContext";
import {
  Award, ArrowRight, ShieldCheck, Sparkles
} from "lucide-react";

// ==========================================
// DISTRIBUTOR LOGIN VIEW
// ==========================================
export function DistributorLogin({ addNotification }: { addNotification: any }) {
  const { login } = useAuth();

  const handleLogin = () => {
    addNotification("Redirecting to secure sign-in...", "info");
    login();
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 font-sans select-none antialiased">
      <div className="absolute inset-0 bg-radial-gradient from-emerald-950/20 to-stone-950 pointer-events-none" />
      <Helmet><meta name="robots" content="noindex, nofollow" /><title>Distributor Login — Songtai Life</title></Helmet>
      <div className="w-full max-w-md bg-stone-900 border border-stone-850 rounded-[32px] p-8 shadow-2xl relative z-10 text-left">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-[#ecc246] font-bold">Unilevel Network Entrance</span>
          <h2 className="font-sans font-black text-2xl text-white mt-1">Distributor Operations</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            Formulating sovereign health solutions and unilevel business networks across Africa.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full py-3.5 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Sign In Securely</span>
          <ArrowRight className="w-4 h-4 text-[#ecc246]" />
        </button>

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
  const [sponsorCode, setSponsorCode] = useState("");
  const [loading, setLoading] = useState(false);

  const { user, becomeDistributor, login } = useAuth();
  const navigate = useNavigate();

  const handleApply = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      addNotification("Please sign in first to apply as a distributor.", "info");
      login();
      return;
    }

    setLoading(true);
    try {
      await becomeDistributor(sponsorCode);
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
      <Helmet><meta name="robots" content="noindex, nofollow" /><title>Become a Distributor — Songtai Life</title></Helmet>
      <div className="w-full max-w-md bg-stone-900 border border-stone-850 rounded-[32px] p-8 shadow-2xl relative z-10 text-left">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-[#ecc246] font-bold">Unilevel Matrix Recruitment</span>
          <h2 className="font-sans font-black text-2xl text-white mt-1">Become a Distributor</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            Register and unlock unilevel overrides, binary margins, and bio-yield agricultural overrides.
          </p>
        </div>

        {!user && (
          <div className="mb-6 p-3.5 bg-stone-800/50 border border-stone-700/50 rounded-xl text-left">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
              You'll need to sign in before submitting your application.
            </span>
          </div>
        )}

        <form onSubmit={handleApply} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#0A7D32] hover:bg-[#086327] text-white font-bold text-xs rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-6"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{user ? "Register & Launch Portal" : "Sign In to Apply"}</span>
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
  const { login } = useAuth();

  const handleLogin = () => {
    addNotification("Redirecting to secure sign-in...", "gold");
    login();
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 font-sans select-none antialiased">
      <div className="absolute inset-0 bg-radial-gradient from-yellow-950/25 to-stone-950 pointer-events-none" />
      <Helmet><meta name="robots" content="noindex, nofollow" /><title>Admin Login — Songtai Life</title></Helmet>

      <div className="w-full max-w-md bg-stone-900 border border-yellow-950/20 rounded-[32px] p-8 shadow-2xl relative z-10 text-left">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-[#ecc246] font-bold">Corporate Auditing Hub</span>
          <h2 className="font-sans font-black text-2xl text-white mt-1">Admin Operations</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            Verify KYC uploads, monitor total unilevel ledger volumes, and dispatch commission adjustments.
          </p>

          <div className="mt-4 p-3.5 bg-stone-800/50 border border-stone-700/50 rounded-xl text-left">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
              Sign in with an account previously promoted to admin.
            </span>
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-stone-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Enter Administration Workspace</span>
          <ShieldCheck className="w-4 h-4 text-stone-950" />
        </button>

        <div className="mt-8 pt-6 border-t border-stone-850/60 text-center text-xs">
          <Link to="/distributor/login" className="text-stone-500 hover:text-white font-bold hover:underline">
            ← Return to Distributor Login
          </Link>
        </div>
      </div>
    </div>
  );
}
