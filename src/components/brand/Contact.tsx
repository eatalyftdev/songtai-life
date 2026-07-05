import { useState, useEffect, FormEvent } from "react";
import { Phone, MapPin, Mail, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface ContactProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

interface ContactPageData {
  tagline_en: string; tagline_fr: string;
  headline_en: string; headline_fr: string;
  intro_en: string; intro_fr: string;
  office_yaounde_en: string; office_yaounde_fr: string;
  office_douala_en: string; office_douala_fr: string;
  phone_primary: string; phone_secondary: string;
  email_support: string;
  whatsapp_number: string;
  whatsapp_message_en: string; whatsapp_message_fr: string;
}

const DEFAULTS: ContactPageData = {
  tagline_en: "Get In Touch", tagline_fr: "Contactez-Nous",
  headline_en: "Contact Our Offices", headline_fr: "Contacter Nos Bureaux",
  intro_en: "Have questions about our botanical lines or unilevel commission structures? Send us a direct message or stop by our physical offices.",
  intro_fr: "Des questions sur nos gammes botaniques ? Envoyez-nous un message ou passez dans nos bureaux.",
  office_yaounde_en: "Avenue Kennedy, Near Boulangerie Calafatas, Yaoundé, Cameroon",
  office_yaounde_fr: "Avenue Kennedy, Près de la Boulangerie Calafatas, Yaoundé, Cameroun",
  office_douala_en: "Rue Akwa, Opposite Pharmacie du Centre, Douala, Cameroon",
  office_douala_fr: "Rue Akwa, En face de la Pharmacie du Centre, Douala, Cameroun",
  phone_primary: "+237 655 000 000",
  phone_secondary: "+237 222 111 222",
  email_support: "support@songtailife.com",
  whatsapp_number: "237655000000",
  whatsapp_message_en: "Hello Songtai Life, I would like to inquire about becoming a distributor.",
  whatsapp_message_fr: "Bonjour Songtai Life, je souhaite des informations pour devenir distributeur.",
};

export default function Contact({ addNotification }: ContactProps) {
  const [info, setInfo] = useState<ContactPageData>(DEFAULTS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const lang = "en";

  useEffect(() => {
    supabase.from("homepage_sections").select("content").eq("section_key", "page_contact").maybeSingle()
      .then(({ data: row }) => { if (row?.content) setInfo(d => ({ ...d, ...row.content as Partial<ContactPageData> })); });

    const channel = supabase.channel("page_contact_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "homepage_sections", filter: "section_key=eq.page_contact" },
        () => supabase.from("homepage_sections").select("content").eq("section_key", "page_contact").maybeSingle()
          .then(({ data: row }) => { if (row?.content) setInfo(d => ({ ...d, ...row.content as Partial<ContactPageData> })); }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const t = (en: string, fr: string) => lang === "fr" ? (fr || en) : en;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

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
      setName(""); setEmail(""); setSubject(""); setMessage(""); setSubmitted(false);
    }, 3000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(t(info.whatsapp_message_en, info.whatsapp_message_fr));
    window.open(`https://wa.me/${info.whatsapp_number}?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#0A7D32]/5 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        <div className="space-y-4 max-w-xl">
          <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">{t(info.tagline_en, info.tagline_fr)}</span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">{t(info.headline_en, info.headline_fr)}</h1>
          <p className="text-stone-400 text-sm leading-relaxed">{t(info.intro_en, info.intro_fr)}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          
          <div className="md:col-span-5 space-y-8">
            <div className="space-y-6">
              <h3 className="font-extrabold text-white text-lg">National Headquarters</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-[#C9A227] rounded-xl flex-shrink-0"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Yaoundé Office</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-medium mt-0.5">{t(info.office_yaounde_en, info.office_yaounde_fr)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-[#C9A227] rounded-xl flex-shrink-0"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Douala Office</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-medium mt-0.5">{t(info.office_douala_en, info.office_douala_fr)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-emerald-400 rounded-xl flex-shrink-0"><Phone className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Hotline Support</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-semibold mt-0.5">
                      {info.phone_primary}{info.phone_secondary ? ` / ${info.phone_secondary}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-stone-900 border border-stone-800 text-emerald-400 rounded-xl flex-shrink-0"><Mail className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-stone-500 block font-bold uppercase">Email Support</span>
                    <p className="text-stone-300 text-xs sm:text-sm font-semibold mt-0.5">{info.email_support}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#0A7D32]/10 border border-emerald-950 rounded-2xl space-y-3">
              <h4 className="font-extrabold text-white text-sm">Need Instant Assistance?</h4>
              <p className="text-stone-400 text-xs">In West Africa, rapid connectivity is everything. Chat instantly with our registration consultants via WhatsApp.</p>
              <button onClick={handleWhatsApp} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all">
                <span>Chat via WhatsApp Support</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-7 bg-stone-900/20 border border-stone-850 p-6 sm:p-8 rounded-[32px] space-y-6">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">Write To Our Officers</span>
            
            {submitted ? (
              <div className="p-8 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-xs font-semibold rounded-2xl flex flex-col items-center justify-center text-center gap-2 py-16">
                <CheckCircle2 className="w-10 h-10 text-[#C9A227] mb-2" />
                <h4 className="text-white text-base font-bold">Message Submitted Successfully</h4>
                <p className="text-stone-400 max-w-xs mt-1 leading-relaxed">We have successfully logged your inquiry inside the Songtai queue. Our administrative officers will reach back shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-stone-400 text-[10px] uppercase font-bold">Your Full Name</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jean-Pierre Nchoutou"
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-stone-400 text-[10px] uppercase font-bold">Your Email Address</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. jean@example.cm"
                      className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Inquiry Subject</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Requesting Bulk Bio-Yield Max Agri-Fertilizer Sourcing"
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-400 text-[10px] uppercase font-bold">Your Message / Inquiry Details</label>
                  <textarea required rows={4} value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Describe your request in detail. Specify if you require office pickup or agency transport."
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-850 focus:border-[#0A7D32] rounded-xl text-xs text-white outline-none resize-none" />
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full py-4 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">
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
