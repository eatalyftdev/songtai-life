import { useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: string;
}

export default function SlideOver({ open, onClose, title, subtitle, children, width = "w-full max-w-xl" }: SlideOverProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className={`fixed right-0 top-0 bottom-0 ${width} bg-stone-950 border-l border-stone-800 z-50 flex flex-col`}
          >
            <div className="flex items-start justify-between p-5 border-b border-stone-800 flex-shrink-0">
              <div>
                <h3 className="text-white font-bold text-base">{title}</h3>
                {subtitle && <p className="text-stone-500 text-xs mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
