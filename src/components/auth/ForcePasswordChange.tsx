import { useState, FormEvent } from "react";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface ForcePasswordChangeProps {
  onComplete: () => void;
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function ForcePasswordChange({ onComplete, addNotification }: ForcePasswordChangeProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pwErr) throw pwErr;
      // Clear the flag on the profile — must succeed before we continue
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: flagErr } = await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);
        if (flagErr) throw new Error("Password changed but session flag could not be cleared. Please contact support.");
      }
      addNotification("Password updated successfully.", "success");
      onComplete();
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 font-sans antialiased">
      <div className="w-full max-w-sm bg-stone-900 border border-[color:var(--color-gold)]/20 rounded-[28px] p-8 shadow-2xl text-left">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-[color:var(--color-gold)]/10 border border-[color:var(--color-gold)]/20 rounded-2xl mb-3">
            <ShieldCheck className="w-6 h-6 text-[color:var(--color-gold)]" />
          </div>
          <h2 className="font-black text-xl text-white">Set Your Password</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            For security, please set a new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-10 py-3 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
              />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3.5 top-3.5 text-stone-500 hover:text-stone-300">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-stone-400 text-xs block mb-1.5 font-bold">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-600" />
              <input
                type={showPw ? "text" : "password"}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-white placeholder-stone-700 outline-none text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/90 text-stone-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
              : "Update Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
