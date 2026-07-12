import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../context/AuthContext";
import {
  Smartphone, Mail, Lock, Sparkles, Award,
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff
} from "lucide-react";

// ─── Inline field error helper ────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />{msg}
    </p>
  );
}

// ─── Password strength indicator ─────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-[color:var(--color-border)]"}`} />
        ))}
      </div>
      {score > 0 && <p className={`text-[10px] font-bold ${score >= 3 ? "text-emerald-400" : score === 2 ? "text-yellow-400" : "text-red-400"}`}>{labels[score]}</p>}
    </div>
  );
}

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputBase = (hasError?: boolean) =>
  `w-full pl-10 pr-4 py-3 bg-[color:var(--color-bg)] border ${hasError
    ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
    : "border-[color:var(--color-border)] focus:border-[color:var(--color-primary)] focus:ring-[color:var(--color-primary)]/20"
  } rounded-xl text-[color:var(--color-fg)] placeholder-[color:var(--color-muted)]/50 outline-none text-sm focus:ring-2 transition-all`;

function FieldWrapper({ label, icon, error, children }: { label: string; icon: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[color:var(--color-muted)] text-xs block mb-1.5 font-bold">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-3.5 w-4 h-4 text-[color:var(--color-muted)]">{icon}</span>
        {children}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

// ─── Validators ───────────────────────────────────────────────────────────────
function validateEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Enter a valid email address"; }
function validatePassword(v: string) { return v.length >= 6 ? "" : "Password must be at least 6 characters"; }
function validatePhone(v: string) { return v.replace(/\D/g, "").length >= 9 ? "" : "Enter a valid Cameroon phone number"; }

// ─── Shared auth card layout ──────────────────────────────────────────────────
function AuthCard({ title, subtitle, badge, accent = "green", children }: {
  title: string; subtitle: string; badge: string;
  accent?: "green" | "gold"; children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-[color:var(--color-bg)] flex flex-col justify-center items-center p-4 font-sans select-none antialiased`}>
      <div className={`absolute inset-0 pointer-events-none ${accent === "gold" ? "bg-radial-gradient from-yellow-950/20 to-transparent" : "bg-radial-gradient from-emerald-950/20 to-transparent"}`} />

      <div className="w-full max-w-md bg-[color:var(--color-surface)] border border-[color:var(--color-border)] rounded-[28px] p-7 shadow-2xl relative z-10 text-left">
        {/* Brand header */}
        <div className="text-center mb-7">
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold)] font-bold">{badge}</span>
          <h2 className="font-sans font-black text-2xl text-[color:var(--color-fg)] mt-1">{title}</h2>
          <p className="text-[color:var(--color-muted)] text-xs mt-1.5 leading-relaxed max-w-xs mx-auto">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTOR LOGIN
// ══════════════════════════════════════════════════════════════════════════════
export function DistributorLogin({ addNotification }: { addNotification: any }) {
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, simulatePhoneOTP, verifyPhoneOTPAndLogin } = useAuth();
  const navigate = useNavigate();

  const validateEmailForm = () => {
    const e: Record<string, string> = {};
    const emailErr = validateEmail(email); if (emailErr) e.email = emailErr;
    const pwErr = validatePassword(password); if (pwErr) e.password = pwErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEmailLogin = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validateEmailForm()) return;
    setLoading(true);
    try {
      await login(email, password);
      addNotification("Welcome back to Songtai Life!", "success");
      navigate("/distributor/dashboard");
    } catch (err: any) {
      setErrors({ form: err.message || "Invalid credentials — please try again." });
    } finally { setLoading(false); }
  };

  const handleSendOTP = async (ev: FormEvent) => {
    ev.preventDefault();
    const phoneErr = validatePhone(phone);
    if (phoneErr) { setErrors({ phone: phoneErr }); return; }
    setLoading(true);
    try {
      const code = await simulatePhoneOTP(phone);
      setGeneratedOtp(code); setOtpSent(true);
      addNotification(`OTP sent. Demo code: ${code}`, "success");
    } catch { setErrors({ form: "Failed to send OTP. Try again." }); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!enteredOtp) { setErrors({ otp: "Enter the verification code." }); return; }
    setLoading(true);
    try {
      await verifyPhoneOTPAndLogin(phone, generatedOtp, enteredOtp);
      addNotification("Phone verified. Welcome back!", "success");
      navigate("/distributor/dashboard");
    } catch { setErrors({ otp: "Incorrect or expired code. Try again." }); }
    finally { setLoading(false); }
  };

  return (
    <AuthCard badge="Distributor Portal" title="Sign In" subtitle="Access your network dashboard, wallet, and commission reports.">
      <Helmet><meta name="robots" content="noindex, nofollow" /><title>Distributor Login — Songtai Life</title></Helmet>

      {/* Method toggle */}
      <div className="grid grid-cols-2 gap-1.5 bg-[color:var(--color-bg)] p-1 rounded-xl mb-5 border border-[color:var(--color-border)]/60">
        {(["email", "phone"] as const).map(m => (
          <button key={m} onClick={() => { setAuthMethod(m); setOtpSent(false); setErrors({}); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${authMethod === m
              ? "bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/30 text-[color:var(--color-primary)]"
              : "text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"}`}>
            {m === "email" ? "Email & Password" : "Mobile OTP"}
          </button>
        ))}
      </div>

      {errors.form && (
        <div className="mb-4 p-3 bg-red-950/30 border border-red-800/40 rounded-xl flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{errors.form}
        </div>
      )}

      {authMethod === "email" ? (
        <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
          <FieldWrapper label="Email Address" icon={<Mail className="w-4 h-4" />} error={errors.email}>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: "", form: ""})); }}
              placeholder="name@domain.com" className={inputBase(!!errors.email)} autoComplete="email" />
          </FieldWrapper>

          <FieldWrapper label="Password" icon={<Lock className="w-4 h-4" />} error={errors.password}>
            <input type={showPwd ? "text" : "password"} value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: "", form: ""})); }}
              placeholder="••••••" className={`${inputBase(!!errors.password)} pr-10`} autoComplete="current-password" />
            <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
              className="absolute right-3.5 top-3.5 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] transition-colors">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </FieldWrapper>

          <button type="submit" disabled={loading}
            className="w-full mt-2 py-3.5 bg-[color:var(--color-primary)] hover:opacity-90 text-white keep-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4" noValidate>
              <FieldWrapper label="Cameroon Phone Number" icon={<Smartphone className="w-4 h-4" />} error={errors.phone}>
                <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setErrors(p => ({...p, phone: ""})); }}
                  placeholder="+237 6xx xxx xxx" className={inputBase(!!errors.phone)} />
              </FieldWrapper>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[color:var(--color-primary)] hover:opacity-90 text-white keep-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><span>Send OTP Code</span><Smartphone className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4" noValidate>
              <div className="p-3.5 bg-[color:var(--color-bg)] rounded-xl border border-[color:var(--color-gold)]/20 text-center">
                <p className="text-[10px] text-[color:var(--color-gold)] font-bold uppercase mb-1">Demo OTP</p>
                <p className="text-[color:var(--color-muted)] text-xs">
                  Code for <strong className="text-[color:var(--color-fg)]">{phone}</strong>: <strong className="text-emerald-400 font-mono">{generatedOtp}</strong>
                </p>
              </div>
              <div>
                <label className="text-[color:var(--color-muted)] text-xs block mb-1.5 font-bold">Verification Code</label>
                <input type="password" maxLength={6} value={enteredOtp} onChange={e => { setEnteredOtp(e.target.value); setErrors(p => ({...p, otp: ""})); }}
                  placeholder="••••••" className={`${inputBase(!!errors.otp)} text-center font-bold text-lg tracking-widest`} />
                <FieldError msg={errors.otp} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[color:var(--color-primary)] hover:opacity-90 text-white keep-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><ShieldCheck className="w-4 h-4" /><span>Verify & Sign In</span></>}
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setEnteredOtp(""); setErrors({}); }}
                className="w-full py-2 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] text-xs font-semibold cursor-pointer">
                ← Use a different number
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-7 pt-6 border-t border-[color:var(--color-border)]/60 text-center text-xs space-y-2">
        <p className="text-[color:var(--color-muted)]">
          New to Songtai Life?{" "}
          <Link to="/distributor/signup" className="text-[color:var(--color-gold)] font-bold hover:underline">Apply Now</Link>
        </p>
        <p><Link to="/admin/login" className="text-[color:var(--color-muted)]/60 hover:text-[color:var(--color-muted)]">Admin Login</Link></p>
      </div>
    </AuthCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DISTRIBUTOR SIGNUP
// ══════════════════════════════════════════════════════════════════════════════
export function DistributorSignup({ addNotification }: { addNotification: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [phone, setPhone] = useState("");
  const [sponsorCode, setSponsorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e: Record<string, string> = {};
    const emailErr = validateEmail(email); if (emailErr) e.email = emailErr;
    const pwErr = validatePassword(password); if (pwErr) e.password = pwErr;
    const phoneErr = validatePhone(phone); if (phoneErr) e.phone = phoneErr;
    if (!agreed) e.agreed = "You must accept the terms to continue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(email, password, phone, "distributor");
      addNotification("Account created! Welcome to Songtai Life.", "success");
      addNotification("Complete your KYC to unlock all features.", "gold");
      navigate("/distributor/dashboard");
    } catch (err: any) {
      setErrors({ form: err.message || "Registration failed. Try a different email." });
    } finally { setLoading(false); }
  };

  return (
    <AuthCard badge="Join the Network" title="Become a Distributor" subtitle="Register to earn commissions on sales across your team, up to 5 levels deep.">
      <Helmet><meta name="robots" content="noindex, nofollow" /><title>Become a Distributor — Songtai Life</title></Helmet>

      {errors.form && (
        <div className="mb-4 p-3 bg-red-950/30 border border-red-800/40 rounded-xl flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{errors.form}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4" noValidate>
        <FieldWrapper label="Sponsor Code (optional)" icon={<Award className="w-4 h-4" />}>
          <input type="text" value={sponsorCode} onChange={e => setSponsorCode(e.target.value.toUpperCase())}
            placeholder="ST-XXXX-00 (leave blank for default)" className={`${inputBase()} font-mono`} />
        </FieldWrapper>

        <FieldWrapper label="Email Address" icon={<Mail className="w-4 h-4" />} error={errors.email}>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: "", form: ""})); }}
            placeholder="name@domain.com" className={inputBase(!!errors.email)} autoComplete="email" />
        </FieldWrapper>

        <FieldWrapper label="Cameroon Phone Number" icon={<Smartphone className="w-4 h-4" />} error={errors.phone}>
          <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setErrors(p => ({...p, phone: ""})); }}
            placeholder="+237 6xx xxx xxx" className={inputBase(!!errors.phone)} />
        </FieldWrapper>

        <FieldWrapper label="Password" icon={<Lock className="w-4 h-4" />} error={errors.password}>
          <input type={showPwd ? "text" : "password"} value={password}
            onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: ""})); }}
            placeholder="Min. 6 characters" className={`${inputBase(!!errors.password)} pr-10`} autoComplete="new-password" />
          <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
            className="absolute right-3.5 top-3.5 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] transition-colors">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </FieldWrapper>
        <PasswordStrength password={password} />

        {/* Terms acceptance */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all cursor-pointer
            ${agreed ? "bg-[color:var(--color-primary)] border-[color:var(--color-primary)]" : "border-[color:var(--color-border)] bg-[color:var(--color-bg)]"}`}
            onClick={() => { setAgreed(v => !v); setErrors(p => ({...p, agreed: ""})); }}>
            {agreed && <CheckCircle2 className="w-3 h-3 text-white" />}
          </div>
          <span className="text-xs text-[color:var(--color-muted)]">
            I agree to the{" "}
            <a href="/" className="text-[color:var(--color-gold)] hover:underline">Terms & Privacy Policy</a>
            {" "}and confirm I am 18 or older.
          </span>
        </label>
        <FieldError msg={errors.agreed} />

        <button type="submit" disabled={loading}
          className="w-full mt-2 py-3.5 bg-[color:var(--color-primary)] hover:opacity-90 text-white keep-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
          {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Sparkles className="w-4 h-4" /><span>Create My Account</span></>}
        </button>
      </form>

      <div className="mt-7 pt-6 border-t border-[color:var(--color-border)]/60 text-center text-xs">
        <p className="text-[color:var(--color-muted)]">
          Already have an account?{" "}
          <Link to="/distributor/login" className="text-[color:var(--color-gold)] font-bold hover:underline">Sign In</Link>
        </p>
      </div>
    </AuthCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN LOGIN
// ══════════════════════════════════════════════════════════════════════════════
export function AdminLogin({ addNotification }: { addNotification: any }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogin = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    const emailErr = validateEmail(email); if (emailErr) e.email = emailErr;
    if (!password) e.password = "Password is required.";
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      await login(email, password);
      addNotification("Admin panel ready.", "gold");
      navigate("/admin/dashboard");
    } catch (err: any) {
      setErrors({ form: "Invalid admin credentials or restricted access." });
    } finally { setLoading(false); }
  };

  return (
    <AuthCard badge="Corporate Operations" title="Admin Login" subtitle="Manage distributors, commissions, and platform configuration." accent="gold">
      <Helmet><meta name="robots" content="noindex, nofollow" /><title>Admin Login — Songtai Life</title></Helmet>

      <div className="mb-5 p-3.5 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-xl text-xs text-[color:var(--color-muted)]">
        Use the credentials created via the admin bootstrap script. Contact your superadmin if you've lost access.
      </div>

      {errors.form && (
        <div className="mb-4 p-3 bg-red-950/30 border border-red-800/40 rounded-xl flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{errors.form}
        </div>
      )}

      <form onSubmit={handleAdminLogin} className="space-y-4" noValidate>
        <FieldWrapper label="Admin Email" icon={<Mail className="w-4 h-4" />} error={errors.email}>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: "", form: ""})); }}
            placeholder="admin@songtailife.com" className={inputBase(!!errors.email)} autoComplete="email" />
        </FieldWrapper>

        <FieldWrapper label="Password" icon={<Lock className="w-4 h-4" />} error={errors.password}>
          <input type={showPwd ? "text" : "password"} value={password}
            onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: "", form: ""})); }}
            placeholder="••••••" className={`${inputBase(!!errors.password)} pr-10`} autoComplete="current-password" />
          <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
            className="absolute right-3.5 top-3.5 text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)] transition-colors">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </FieldWrapper>

        <button type="submit" disabled={loading}
          className="w-full mt-2 py-3.5 bg-[color:var(--color-gold)] hover:opacity-90 text-[color:var(--color-bg)] font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
          {loading ? <span className="w-4 h-4 border-2 border-[color:var(--color-bg)] border-t-transparent rounded-full animate-spin" />
            : <><ShieldCheck className="w-4 h-4" /><span>Enter Admin Dashboard</span></>}
        </button>
      </form>

      <div className="mt-7 pt-6 border-t border-[color:var(--color-border)]/60 text-center text-xs">
        <Link to="/distributor/login" className="text-[color:var(--color-muted)]/60 hover:text-[color:var(--color-muted)] font-semibold">
          ← Distributor Login
        </Link>
      </div>
    </AuthCard>
  );
}
