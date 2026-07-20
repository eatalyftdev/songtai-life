import { Home, MessageCircle, AlertTriangle } from "lucide-react";
import Logo from "./Logo";

interface Props {
  slug?: string;
}

export default function PartnerNotAvailable({ slug }: Props) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full flex flex-col items-center text-center space-y-6">
        <Logo className="h-10 w-auto" />

        <div className="w-16 h-16 rounded-full bg-amber-900/30 border border-amber-700/40 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-white">
            This partner page is not currently available
          </h1>
          <p className="text-sm text-stone-400 leading-relaxed">
            The partner page you're looking for is either suspended or doesn't
            exist. Please contact the distributor who shared this link with you.
          </p>
          {slug && (
            <p className="text-xs text-stone-600 font-mono mt-2">/p/{slug}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <a
            href="/"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-2xl transition-colors"
          >
            <Home className="w-4 h-4" />
            Visit the main site
          </a>
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); window.location.href = "/?contact=1"; }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-sm font-bold rounded-2xl transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Songtai Life
          </a>
        </div>

        <div className="w-full border-t border-stone-800 pt-4">
          <div className="w-24 h-0.5 mx-auto rounded-full bg-gradient-to-r from-emerald-700 to-amber-600" />
        </div>

        <p className="text-xs text-stone-600">© {new Date().getFullYear()} Songtai Life</p>
      </div>
    </div>
  );
}
