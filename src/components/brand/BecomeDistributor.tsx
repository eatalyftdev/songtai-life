import { useState, FormEvent } from "react";
import { Check, ShieldCheck, CreditCard, Smartphone, Award, Lock, Sparkles, Loader } from "lucide-react";

interface BecomeDistributorProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
  onNavigate: (page: string) => void;
}

export default function BecomeDistributor({ addNotification, onNavigate }: BecomeDistributorProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pack, setPack] = useState("bronze");
  const [paymentMethod, setPaymentMethod] = useState("momo");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"form" | "momo_verify" | "success">("form");

  const getPrice = () => {
    if (pack === "silver") return "75,000 XAF";
    if (pack === "gold") return "180,000 XAF";
    return "25,000 XAF";
  };

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
      {/* Background visual graphics */}
      <div className="absolute top-[20%] left-[10%] w-[550px] h-[550px] rounded-full bg-[#0A7D32]/5 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        {/* Header */}
        <div className="space-y-4 max-w-xl">
          <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Unlocking Abundance</span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none">Become a Distributor</h1>
          <p className="text-stone-400 text-sm leading-relaxed">
            Fill in the direct-selling franchise activation profile. Settle your starter pack volume through mobile money using our MeSomb payment gateway wrapper.
          </p>
        </div>

        {/* Form or States */}
        {step === "form" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Form inputs (Col 7) */}
            <form onSubmit={handleRegister} className="md:col-span-7 bg-stone-900/20 border border-stone-850 p-6 sm:p-8 rounded-[32px] space-y-6">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">Activation Profile details</span>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Samuel Eto'o"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Your Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. samuel@example.cm"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Cameroon Phone Number (MoMo / Orange)</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +237 655 123 456"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                {/* Package select */}
                <div className="space-y-2">
                  <label className="text-stone-400 text-[10px] uppercase font-bold block">Choose Starter Level</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: "bronze", label: "Bronze Pack", price: "25,000 XAF" },
                      { key: "silver", label: "Silver Pack", price: "75,000 XAF" },
                      { key: "gold", label: "Gold Pack", price: "180,000 XAF" }
                    ].map(p => (
                      <div
                        key={p.key}
                        onClick={() => setPack(p.key)}
                        className={`p-4 rounded-xl border text-center cursor-pointer transition-all ${
                          pack === p.key 
                            ? "bg-[#0A7D32]/10 border-[#0A7D32] text-emerald-400" 
                            : "bg-stone-950 border-stone-850 text-stone-400"
                        }`}
                      >
                        <span className="text-xs font-bold block">{p.label}</span>
                        <span className="text-[10px] block mt-1 font-mono">{p.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment method select */}
                <div className="space-y-2">
                  <label className="text-stone-400 text-[10px] uppercase font-bold block">Select Settle Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { key: "momo", label: "MTN Mobile Money", icon: <Smartphone className="w-4 h-4" /> },
                      { key: "orange", label: "Orange Money", icon: <Smartphone className="w-4 h-4" /> },
                      { key: "credit", label: "Credit / Visa Card", icon: <CreditCard className="w-4 h-4" /> }
                    ].map(pm => (
                      <div
                        key={pm.key}
                        onClick={() => setPaymentMethod(pm.key)}
                        className={`p-3 rounded-xl border text-center cursor-pointer flex items-center justify-center gap-2 transition-all text-xs ${
                          paymentMethod === pm.key 
                            ? "bg-[#0A7D32]/10 border-[#0A7D32] text-emerald-400" 
                            : "bg-stone-950 border-stone-850 text-stone-400"
                        }`}
                      >
                        {pm.icon}
                        <span className="font-bold">{pm.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin text-[#C9A227]" />
                      <span>Initiating Secure MeSomb Handshake...</span>
                    </>
                  ) : (
                    <span>Register & Settle {getPrice()}</span>
                  )}
                </button>
              </div>

            </form>

            {/* Sidebar info checklist (Col 5) */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-stone-900/10 border border-stone-850 p-6 rounded-2xl space-y-4">
                <h3 className="font-extrabold text-white text-base">Your Starter Franchise Includes:</h3>
                
                <div className="space-y-3 text-xs text-stone-400">
                  {[
                    "Standard physical product package collection at Douala or Yaoundé head offices.",
                    "Active unilevel node credentials registered instantly on the regional system.",
                    "Direct access to our physical business summits and printable materials.",
                    "Immediate 10% direct refer commissions, biweekly mobile money payouts."
                  ].map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-stone-950 border border-stone-900 rounded-xl flex items-center gap-2 text-xs text-stone-500">
                <Lock className="w-4 h-4 text-[#C9A227]" />
                <span>Protected by MeSomb SSL Mobile Handshake.</span>
              </div>
            </div>

          </div>
        )}

        {/* Mobile Money Verification Simulated Pin overlay */}
        {step === "momo_verify" && (
          <div className="max-w-md mx-auto bg-stone-900 border border-stone-850 p-8 rounded-[32px] text-center space-y-6">
            <Smartphone className="w-12 h-12 text-[#C9A227] mx-auto animate-bounce" />
            
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">Verification Pending</h3>
              <p className="text-stone-400 text-xs sm:text-sm">
                We have pushed an active MeSomb USSD payment request of <span className="font-bold text-white">{getPrice()}</span> to your handset <span className="font-mono text-white">{phone}</span>.
              </p>
            </div>

            <div className="p-4 bg-stone-950 border border-stone-850 rounded-2xl text-stone-400 text-xs leading-relaxed">
              Please check your phone, enter your <span className="text-[#C9A227] font-semibold">MTN/Orange Mobile Money PIN</span> inside the popup dialog box to authorize the node transfer, then click verification confirm below.
            </div>

            <div className="space-y-3">
              <button
                onClick={handleVerifyPin}
                disabled={isProcessing}
                className="w-full py-3 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-[#C9A227]" />
                    <span>Confirming Mobile Transfer...</span>
                  </>
                ) : (
                  <span>I Have Authorized payment on My Phone</span>
                )}
              </button>

              <button
                onClick={() => setStep("form")}
                className="w-full py-2.5 bg-transparent text-stone-500 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel Registration
              </button>
            </div>
          </div>
        )}

        {/* Registration Success state */}
        {step === "success" && (
          <div className="max-w-md mx-auto bg-stone-900 border border-stone-[#0A7D32]/50 p-8 rounded-[32px] text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-900 flex items-center justify-center mx-auto text-[#C9A227]">
              <Sparkles className="w-8 h-8 fill-[#C9A227]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white">Welcome, Ambassador!</h3>
              <p className="text-[#C9A227] text-xs uppercase font-extrabold tracking-widest">Active Node Credential: ST-{Math.floor(100000 + Math.random() * 900000)}</p>
              <p className="text-stone-400 text-xs leading-relaxed">
                Congratulations, <span className="font-bold text-white">{name}</span>! Your distributor activation has been finalized. Your physical starter package is prepared at our Yaoundé office pick-up point.
              </p>
            </div>

            <div className="p-4 bg-stone-950 border border-stone-850 rounded-xl text-stone-500 text-[11px] leading-relaxed">
              An onboarding brochure and presentation slide template pack have been forwarded to your registered address: <span className="text-stone-400 font-mono font-bold">{email}</span>.
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onNavigate("home");
                  setStep("form");
                  setName("");
                  setEmail("");
                  setPhone("");
                }}
                className="w-full py-3.5 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Return to Brand Homepage
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
