import { useState, FormEvent } from "react";
import { Phone, MapPin, Mail, Clock, Send, ShieldAlert, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface ContactProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function Contact({ addNotification }: ContactProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    // Rate limit: 3 contact messages per 10 minutes per email
    const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
      p_bucket: "contact_form",
      p_identifier: email.toLowerCase(),
      p_max_attempts: 3,
      p_window_seconds: 600,
    });
    if (!rlError && allowed === false) {
      addNotification("Too many messages submitted. Please wait 10 minutes.", "info");
      return;
    }

    // Insert into contact_messages table — only proceed on success
    const { error: insertError } = await supabase.from("contact_messages").insert({
      name: name.trim(),
      email: email.trim(),
      phone: null,
      message: (subject.trim() ? `[${subject.trim()}] ` : "") + message.trim(),
      status: "unread",
    });

    if (insertError) {
      addNotification("Failed to send message. Please try again.", "info");
      return;
    }

    setSubmitted(true);
    addNotification("Your message has been logged! Our Yaoundé head office will reply in 24 hours.", "success");
    setTimeout(() => {
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setSubmitted(false);
    }, 3000);
  };

  const handleWhatsApp = () => {
    // Quick link to WhatsApp support
    const text = encodeURIComponent("Hello Songtai Life, I would like to inquire about becoming a distributor.");
    window.open(`https://wa.me/237655000000?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      {/* Background shape */}
      <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#0A7D32]/5 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Title */}
        <div className="space-y-4 max-w-xl">
          <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Get In Touch</span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Contact Our Offices</h1>
          <p className="text-stone-400 text-sm leading-relaxed">
            Have questions about our botanical lines or unilevel commission structures? Send us a direct message or stop by our physical offices.
          </p>
        </div>

        {/* Info & Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          
          {/* Info Details (Col 5) */}
          <div className="md:col-span-5 space-y-8">
            <div className="space-y-6">
              <h3 className="font-extrabold text-white text-lg">National Headquarters</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-[#C9A227] rounded-xl flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Yaoundé Office</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-medium mt-0.5">
                      Avenue Kennedy, Near Boulangerie Calafatas, Yaoundé, Cameroon
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-[#C9A227] rounded-xl flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Douala Office</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-medium mt-0.5">
                      Rue Akwa, Opposite Pharmacie du Centre, Douala, Cameroon
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-emerald-400 rounded-xl flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Hotline Support</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-semibold mt-0.5">
                      +237 655 000 000 / +237 222 111 222
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-emerald-400 rounded-xl flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Email Support</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-semibold mt-0.5">
                      support@songtailife.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick WhatsApp Support */}
            <div className="p-5 bg-[#0A7D32]/10 border border-emerald-950 rounded-2xl space-y-3">
              <h4 className="font-extrabold text-white text-sm">Need Instant Assistance?</h4>
              <p className="text-stone-400 text-xs">
                In West Africa, rapid connectivity is everything. Chat instantly with our registration consultants via WhatsApp.
              </p>
              <button 
                onClick={handleWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Chat via WhatsApp Support</span>
              </button>
            </div>
          </div>

          {/* Contact Form (Col 7) */}
          <div className="md:col-span-7 bg-stone-900/20 border border-stone-850 p-6 sm:p-8 rounded-[32px] space-y-6">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">Write To Our Officers</span>
            
            {submitted ? (
              <div className="p-8 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-xs font-semibold rounded-2xl flex flex-col items-center justify-center text-center gap-2 py-16">
                <CheckCircle2 className="w-10 h-10 text-[#C9A227] mb-2" />
                <h4 className="text-white text-base font-bold">Message Submitted Successfully</h4>
                <p className="text-stone-400 max-w-xs mt-1 leading-relaxed">
                  We have successfully logged your inquiry inside the Songtai queue. Our administrative officers will reach back shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-stone-400 text-[10px] uppercase font-bold">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jean-Pierre Nchoutou"
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
                      placeholder="e.g. jean@example.cm"
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Inquiry Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Requesting Bulk Bio-Yield Max Agri-Fertilizer Sourcing"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Your Message / Inquiry Details</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your request in detail. Specify if you require office pickup or agency transport."
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                  >
                    <Send className="w-4 h-4 text-[#C9A227]" />
                    <span>Send Secure Message</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
