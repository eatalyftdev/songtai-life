import { useState, useEffect, FormEvent } from "react";
import { Check, ShieldCheck, CreditCard, Smartphone, Award, Lock, Sparkles, Loader } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface BecomeDistributorProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
  onNavigate: (page: string) => void;
}

interface PackData { key: string; label_en: string; label_fr: string; price_xaf: number; }
interface BenefitData { text_en: string; text_fr: string; }

interface DistributorPageData {
  tagline_en: string; tagline_fr: string;
  headline_en: string; headline_fr: string;
  intro_en: string; intro_fr: string;
  packs: PackData[];
  benefits: BenefitData[];
  security_note_en: string; security_note_fr: string;
  success_credential_prefix: string;
  success_body_en: string; success_body_fr: string;
  success_email_note_en: string; success_email_note_fr: string;
}

const DEFAULTS: DistributorPageData = {
  tagline_en: "Unlocking Abundance", tagline_fr: "Libérer l'Abondance",
  headline_en: "Become a Distributor", headline_fr: "Devenir Distributeur",
  intro_en: "Fill in the direct-selling franchise activation profile. Settle your starter pack volume through mobile money using our MeSomb payment gateway wrapper.",
  intro_fr: "Remplissez le profil d'activation de la franchise. Payez votre pack de démarrage via Mobile Money avec notre passerelle MeSomb.",
  packs: [
    { key: "bronze", label_en: "Bronze Pack", label_fr: "Pack Bronze", price_xaf: 25000 },
    { key: "silver", label_en: "Silver Pack", label_fr: "Pack Argent", price_xaf: 75000 },
    { key: "gold", label_en: "Gold Pack", label_fr: "Pack Or", price_xaf: 180000 },
  ],
  benefits: [
    { text_en: "Standard physical product package collection at Douala or Yaoundé head offices.", text_fr: "Collecte du kit produit physique dans nos bureaux." },
    { text_en: "Active unilevel node credentials registered instantly on the regional system.", text_fr: "Identifiants de nœud unilevel activés immédiatement." },
    { text_en: "Direct access to our physical business summits and printable materials.", text_fr: "Accès direct à nos sommets d'affaires physiques." },
    { text_en: "Immediate 10% direct refer commissions, biweekly mobile money payouts.", text_fr: "Commissions de parrainage direct de 10 % immédiates." },
  ],
  security_note_en: "Protected by MeSomb SSL Mobile Handshake.",
  security_note_fr: "Protégé par la poignée de main SSL Mobile MeSomb.",
  success_credential_prefix: "ST",
  success_body_en: "Your distributor activation has been finalized. Your physical starter package is prepared at our Yaoundé office pick-up point.",
  success_body_fr: "Votre activation de distributeur est finalisée. Votre kit de démarrage est prêt à être collecté.",
  success_email_note_en: "An onboarding brochure and presentation slide template pack have been forwarded to your registered email address.",
  success_email_note_fr: "Une brochure d'intégration et un pack de diapositives ont été envoyés à votre adresse e-mail.",
};

export default function BecomeDistributor({ addNotification, onNavigate }: BecomeDistributorProps) {
  const [pageData, setPageData] = useState<DistributorPageData>(DEFAULTS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pack, setPack] = useState("bronze");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "momo_verify" | "success">("form");
  const lang: string = "en";

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "page_become_distributor").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setPageData(d => ({ ...d, ...row.content as Partial<DistributorPageData> })); });

    const channel = supabase.channel("page_distributor_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "homepage_sections", filter: "section_key=eq.page_become_distributor" },
        () => supabase.from("homepage_sections").select("content").eq("section_key", "page_become_distributor").maybeSingle()
          .then(({ data: row }) => { if (row?.content) setPageData(d => ({ ...d, ...row.content as Partial<DistributorPageData> })); }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const t = (en: string, fr: string) => lang === "fr" ? (fr || en) : en;

  const activePack = pageData.packs.find(p => p.key === pack) ?? pageData.packs[0];
  const getPrice = () => activePack ? `${activePack.price_xaf.toLocaleString()} XAF` : "25,000 XAF";

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      addNotification("Please complete all registration inputs.", "info");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (paymentMethod === "momo" || paymentMethod === "orange") {
        setStep("momo_verify");
        addNotification("MeSomb payment request sent to your mobile handset!", "gold");
      } else {
        setStep("success");
        addNotification("Congratulations! Your Songtai Distributor node is active.", "success");
      }
    }, 2000);
  };

  const handleVerifyPin = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep("success");
      addNotification("Mobile payment received successfully! Welcome to Songtai Life.", "success");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <div className="absolute top-[20%] left-[10%] w-[550px] h-[550px] rounded-full bg-emerald-700/5 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        <div className="space-y-4 max-w-xl">
          <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">{t(pageData.tagline_en, pageData.tagline_fr)}</span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none">{t(pageData.headline_en, pageData.headline_fr)}</h1>
          <p className="text-stone-400 text-sm leading-relaxed">{t(pageData.intro_en, pageData.intro_fr)}</p>
        </div>

        {step === "form" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            <form onSubmit={handleRegister} className="md:col-span-7 bg-stone-900/20 border border-stone-850 p-6 sm:p-8 rounded-[32px] space-y-6">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">Activation Profile details</span>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Your Full Name</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Samuel Eto'o"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-emerald-700 rounded-xl text-xs text-white outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Your Email Address</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. samuel@example.cm"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-emerald-700 rounded-xl text-xs text-white outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Cameroon Phone Number (MoMo / Orange)</label>
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +237 655 123 456"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-emerald-700 rounded-xl text-xs text-white outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-stone-400 text-[10px] uppercase font-bold block">Choose Starter Level</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {pageData.packs.map(p => (
                      <div key={p.key} onClick={() => setPack(p.key)}
                        className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${pack === p.key ? "bg-emerald-700/10 border-emerald-700 text-emerald-400" : "bg-stone-950 border-stone-850 text-stone-400"}`}>
                        <span className="text-xs font-bold block">{t(p.label_en, p.label_fr)}</span>
                        <span className="text-[10px] block mt-1 font-mono">{p.price_xaf.toLocaleString()} XAF</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-stone-400 text-[10px] uppercase font-bold block">Select Settle Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: "momo", label: "MTN Mobile Money", icon: <Smartphone className="w-4 h-4" /> },
                      { key: "orange", label: "Orange Money", icon: <Smartphone className="w-4 h-4" /> },
                      { key: "credit", label: "Credit / Visa Card", icon: <CreditCard className="w-4 h-4" /> }
                    ].map(pm => (
                      <div key={pm.key} onClick={() => setPaymentMethod(pm.key)}
                        className={`p-3 rounded-xl border text-center cursor-pointer flex items-center justify-center gap-2 transition-all text-xs ${paymentMethod === pm.key ? "bg-emerald-700/10 border-emerald-700 text-emerald-400" : "bg-stone-950 border-stone-850 text-stone-400"}`}>
                        {pm.icon}
                        <span className="font-bold">{pm.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isProcessing}
                  className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-transparent">
                  {isProcessing ? (
                    <><Loader className="w-4 h-4 animate-spin text-[color:var(--color-gold)]" /><span>Initiating Secure MeSomb Handshake...</span></>
                  ) : (
                    <span>Register & Settle {getPrice()}</span>
                  )}
                </button>
              </div>
            </form>

            <div className="md:col-span-5 space-y-6">
              <div className="bg-stone-900/10 border border-stone-850 p-6 rounded-2xl space-y-4">
                <h3 className="font-extrabold text-white text-base">Your Starter Franchise Includes:</h3>
                <div className="space-y-3 text-xs text-stone-400">
                  {pageData.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{t(benefit.text_en, benefit.text_fr)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-stone-950 border border-stone-900 rounded-xl flex items-center gap-2 text-xs text-stone-500">
                <Lock className="w-4 h-4 text-[color:var(--color-gold)]" />
                <span>{t(pageData.security_note_en, pageData.security_note_fr)}</span>
              </div>
            </div>

          </div>
        )}

        {step === "momo_verify" && (
          <div className="max-w-md mx-auto bg-stone-900 border border-stone-850 p-8 rounded-[32px] text-center space-y-6">
            <Smartphone className="w-12 h-12 text-[color:var(--color-gold)] mx-auto animate-bounce" />
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">Verification Pending</h3>
              <p className="text-stone-400 text-xs sm:text-sm">
                We have pushed an active MeSomb USSD payment request of <span className="font-bold text-white">{getPrice()}</span> to your handset <span className="font-mono text-white">{phone}</span>.
              </p>
            </div>
            <div className="p-4 bg-stone-950 border border-stone-850 rounded-2xl text-stone-400 text-xs leading-relaxed">
              Please check your phone, enter your <span className="text-[color:var(--color-gold)] font-semibold">MTN/Orange Mobile Money PIN</span> inside the popup dialog box to authorize the node transfer, then click verification confirm below.
            </div>
            <div className="space-y-3">
              <button onClick={handleVerifyPin} disabled={isProcessing}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                {isProcessing ? (
                  <><Loader className="w-4 h-4 animate-spin text-[color:var(--color-gold)]" /><span>Confirming Mobile Transfer...</span></>
                ) : (
                  <span>I Have Authorized payment on My Phone</span>
                )}
              </button>
              <button onClick={() => setStep("form")} className="w-full py-2.5 bg-transparent text-stone-500 hover:text-white text-xs font-bold transition-all cursor-pointer">
                Cancel Registration
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="max-w-md mx-auto bg-stone-900 border border-stone-800 p-8 rounded-[32px] text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-900 flex items-center justify-center mx-auto text-[color:var(--color-gold)]">
              <Sparkles className="w-8 h-8 fill-[color:var(--color-gold)]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Welcome, Ambassador!</h3>
              <p className="text-[color:var(--color-gold)] text-xs uppercase font-extrabold tracking-widest">
                Active Node Credential: {pageData.success_credential_prefix}-{Math.floor(100000 + Math.random() * 900000)}
              </p>
              <p className="text-stone-400 text-xs leading-relaxed">
                Congratulations, <span className="font-bold text-white">{name}</span>! {t(pageData.success_body_en, pageData.success_body_fr)}
              </p>
            </div>
            <div className="p-4 bg-stone-950 border border-stone-850 rounded-xl text-stone-500 text-[11px] leading-relaxed">
              {t(pageData.success_email_note_en, pageData.success_email_note_fr)}: <span className="text-stone-400 font-mono font-bold">{email}</span>
            </div>
            <button
              onClick={() => { onNavigate("home"); setStep("form"); setName(""); setEmail(""); setPhone(""); }}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Return to Brand Homepage
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
