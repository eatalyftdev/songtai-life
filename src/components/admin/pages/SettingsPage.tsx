import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import SettingsTab from "../SettingsTab";
import PageShell from "../shared/PageShell";

export default function SettingsPage() {
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: string }[]>([]);

  const addNotification = (msg: string, type: "success" | "info" | "gold") => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  return (
    <PageShell title="Site Settings" subtitle="Configure SEO, socials, analytics, and WhatsApp">
      <SettingsTab addNotification={addNotification} />

      {/* Local toasts */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold pointer-events-auto ${t.type === "success" ? "bg-emerald-950 border border-emerald-900/50 text-emerald-300" : "bg-stone-900 border border-stone-700 text-stone-300"}`}
            >
              {t.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-stone-400" />}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
