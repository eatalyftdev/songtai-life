import { useState, useEffect } from "react";
import { ShieldCheck, X, FileText, Check, Landmark, Lock, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  addNotification: (message: string, type: "success" | "info" | "gold") => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose, addNotification }: PrivacyPolicyModalProps) {
  const { user } = useAuth();
  const [isChecked, setIsChecked] = useState(false);
  const [hasAcceptedBefore, setHasAcceptedBefore] = useState(false);
  const [acceptedDate, setAcceptedDate] = useState<string | null>(null);

  useEffect(() => {
    const acceptedVal = localStorage.getItem("songtai_privacy_accepted");
    const acceptedAt = localStorage.getItem("songtai_privacy_accepted_at");
    if (acceptedVal === "true") {
      setHasAcceptedBefore(true);
      setIsChecked(true);
      if (acceptedAt) {
        setAcceptedDate(new Date(Number(acceptedAt)).toLocaleDateString("en-CM", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }));
      }
    } else {
      setHasAcceptedBefore(false);
      setIsChecked(false);
      setAcceptedDate(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!isChecked) return;

    try {
      const timestamp = Date.now();
      localStorage.setItem("songtai_privacy_accepted", "true");
      localStorage.setItem("songtai_privacy_accepted_at", timestamp.toString());

      if (user?.id) {
        await supabase
          .from("profiles")
          .update({
            privacy_accepted_at: new Date().toISOString(),
            privacy_accepted_version: "1.0.0",
          })
          .eq("id", user.id)
          .then(({ error }) => {
            if (error) console.warn("Failed to sync privacy acceptance to profile:", error.message);
          });
      }

      addNotification("Privacy & Cybersecurity Policy accepted successfully.", "success");
      onClose();
    } catch (error) {
      console.error("Error accepting privacy policy:", error);
      addNotification("Unable to save acceptance. Please try again.", "info");
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-left font-sans select-none animate-fade-in">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-[32px] max-w-2xl w-full max-h-[85vh] flex flex-col relative z-10 overflow-hidden shadow-2xl shadow-emerald-950/20">

        {/* Modal Header */}
        <div className="p-6 bg-stone-950 border-b border-stone-850 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/80 border border-emerald-900/50 rounded-xl text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-white leading-tight">Privacy & Data Security Policy</h3>
              <p className="text-[10px] text-stone-500 font-semibold tracking-wider uppercase mt-0.5">Songtai Life Digital Compliance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Policy Content */}
        <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-stone-950/30 text-stone-300 text-xs sm:text-sm leading-relaxed scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent">

          {hasAcceptedBefore && acceptedDate && (
            <div className="p-3 bg-emerald-950/25 border border-emerald-900/30 rounded-xl flex items-center gap-2.5 text-emerald-400 text-xs mb-4">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>You previously accepted this security policy on <strong>{acceptedDate}</strong>.</span>
            </div>
          )}

          {/* Section 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>1. Data Handling & Unilevel Network Records</span>
            </div>
            <p className="text-stone-400">
              To operate the Songtai Life unilevel business model, we collect, process, and synchronize specific personal and transactional identifiers. This includes:
            </p>
            <ul className="list-disc list-inside pl-2 text-stone-400 space-y-1">
              <li>Profile data (Email, Mobile Phone Number, Locale preferences).</li>
              <li>Network genealogy mappings (Sponsor referrals, Placement lines, current Rank status).</li>
              <li>Operational records (Volume Points/PV, commission overrides, wallet withdrawal queues).</li>
              <li>MeSomb payment gateway payloads (MTN MoMo and Orange Money unique carrier references).</li>
            </ul>
            <p className="text-stone-500 text-[11px] italic">
              *All network coordinates are strictly utilized for payout routing and network calculations. We do not rent, monetize, or sell downline data to external marketing syndicates.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Lock className="w-4 h-4 text-[color:var(--color-gold)]" />
              <span>2. State-of-the-Art Cryptography & Secure Handshakes</span>
            </div>
            <p className="text-stone-400">
              Your security is backed by industry-leading storage and transmission standards:
            </p>
            <ul className="list-disc list-inside pl-2 text-stone-400 space-y-1">
              <li>
                <strong>Encryption at Rest (AES-256):</strong> All persistent customer profiles, unilevel hierarchy nodes, wallet allocations, and financial logs stored in Supabase PostgreSQL are fully encrypted using the <strong>AES-256</strong> standard.
              </li>
              <li>
                <strong>Encryption in Transit (TLS 1.3):</strong> Any telemetry, payment calls (via MeSomb API handshakes), or authentication commands traveling between your device and our servers are protected using <strong>TLS 1.3</strong>.
              </li>
              <li>
                <strong>Server-Side Security Bounds:</strong> Secrets like your private key vectors, payment authorization tokens, and API credentials never compile on or leak to client-side browsers.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Landmark className="w-4 h-4 text-emerald-500" />
              <span>3. Cameroon & CEMAC Regulatory Compliance</span>
            </div>
            <p className="text-stone-400">
              Songtai Life operates strictly under CEMAC trade statutes and national legal protocols. This secure architecture is designed in strict compliance with:
            </p>
            <ul className="list-decimal list-inside pl-2 text-stone-400 space-y-1.5">
              <li>
                <strong>Cameroon Law No. 2010/012 of 21 December 2010 on cybersecurity and cybercriminality in Cameroon:</strong> Governing transactional message integrity, payload hashing (via HMAC-SHA256), digital trace auditing, and data storage confidentiality.
              </li>
              <li>
                <strong>MINPOSTEL (Ministry of Posts and Telecommunications) Directives:</strong> Enforcing strict user consent before data enrollment, end-to-end telemetry encryption, and regional server residency guidelines.
              </li>
              <li>
                <strong>Sovereign Consumer Protections:</strong> Providing clear self-service mechanisms allowing you to request full audit summaries of your unilevel profile or request account decommissioning through our help channel.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <HelpCircle className="w-4 h-4 text-stone-400" />
              <span>4. Automated Lifecycle Management & Purging Protocols</span>
            </div>
            <p className="text-stone-400">
              In accordance with regional compliance laws and efficient resource handling, we enforce a strict, automated lifecycle for all digital footprints:
            </p>
            <ul className="list-disc list-inside pl-2 text-stone-400 space-y-1.5">
              <li>
                <strong>Automated Session & Token Expiry:</strong> Active client-side session tokens are automatically invalidated after 24 hours of inactivity, requiring re-authentication.
              </li>
              <li>
                <strong>Ephemeral Audit Logs Purging:</strong> Secondary network trace logs and audit snapshots are systematically purged from the database after 90 days.
              </li>
              <li>
                <strong>Abandoned Checkout & Cart Lifecycle:</strong> Uncompleted checkouts and guest transactions are automatically scrubbed from local memory structures within 30 days.
              </li>
              <li>
                <strong>Coordinated Account Decommissioning:</strong> Upon an official request under the "Right to be Forgotten", all associated PII, transaction archives, and downline coordinates are fully scrubbed within 14 business days.
              </li>
            </ul>
          </div>

        </div>

        {/* Modal Footer / Acceptance Controls */}
        <div className="p-6 bg-stone-950 border-t border-stone-850 flex flex-col gap-4 flex-shrink-0">

          {/* Interactive Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="sr-only"
                disabled={hasAcceptedBefore}
              />
              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                isChecked
                  ? "bg-emerald-700 border-emerald-700 text-white"
                  : "border-stone-700 bg-stone-900 group-hover:border-stone-500"
              } ${hasAcceptedBefore ? "opacity-60 cursor-not-allowed" : ""}`}>
                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <span className="text-[11px] sm:text-xs text-stone-400 leading-snug font-medium select-none">
              I acknowledge, understand, and agree to the data handling terms, AES-256 encryption standards, and legal compliance structures under Cameroon Law No. 2010/012.
            </span>
          </label>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-white transition-all text-xs font-bold cursor-pointer"
            >
              {hasAcceptedBefore ? "Dismiss" : "Cancel"}
            </button>

            {!hasAcceptedBefore && (
              <button
                onClick={handleAccept}
                disabled={!isChecked}
                className={`px-6 py-2.5 rounded-xl text-white font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer ${
                  isChecked
                    ? "bg-emerald-700 hover:bg-emerald-800 shadow-emerald-950/40"
                    : "bg-stone-800 text-stone-500 border border-stone-850 opacity-55 cursor-not-allowed"
                }`}
              >
                Accept & Continue
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
