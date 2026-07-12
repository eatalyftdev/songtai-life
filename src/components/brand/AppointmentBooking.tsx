import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, User, Mail, Phone, MessageSquare, CheckCircle2, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { trackEvent } from "../Analytics";
import SEO from "../SEO";

interface AppointmentType {
  id: string;
  nameEn: string;
  nameFr: string | null;
  durationMinutes: number;
  descriptionEn: string | null;
  descriptionFr: string | null;
}

const TIMES = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

interface AppointmentBookingProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function AppointmentBooking({ addNotification }: AppointmentBookingProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("appointment_types")
      .select("*")
      .order("display_order")
      .then(({ data }) => {
        if (data) {
          setTypes(data.map(r => ({
            id: r.id,
            nameEn: r.name_en,
            nameFr: r.name_fr ?? null,
            durationMinutes: r.duration_minutes ?? 30,
            descriptionEn: r.description_en ?? null,
            descriptionFr: r.description_fr ?? null,
          })));
          if (data.length > 0) setSelectedType({
            id: data[0].id,
            nameEn: data[0].name_en,
            nameFr: data[0].name_fr,
            durationMinutes: data[0].duration_minutes ?? 30,
            descriptionEn: data[0].description_en,
            descriptionFr: data[0].description_fr,
          });
        }
      });
  }, []);

  const localName = (t: AppointmentType) =>
    (lang === "fr" && t.nameFr) ? t.nameFr : t.nameEn;
  const localDesc = (t: AppointmentType) =>
    (lang === "fr" && t.descriptionFr) ? t.descriptionFr : t.descriptionEn;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedType || !date || !time) { setError("Please select an appointment type, date, and time."); return; }

    setSubmitting(true);
    try {
      // Rate limit: 3 bookings per hour per email
      const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
        p_bucket: "appointment",
        p_identifier: email.toLowerCase(),
        p_max_attempts: 3,
        p_window_seconds: 3600,
      });
      if (!rlError && allowed === false) {
        setError("Too many booking requests. Please wait 1 hour and try again.");
        setSubmitting(false);
        return;
      }

      const { error: insertErr } = await supabase.from("appointments").insert({
        appointment_type_id: selectedType.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        preferred_date: date,
        preferred_time: time,
        message: message.trim() || null,
        status: "requested",
      });

      if (insertErr) throw insertErr;

      trackEvent("appointment_booked", {
        appointment_type: selectedType.nameEn,
        preferred_date: date,
      });

      setSuccess(true);
      addNotification("Appointment request sent! Our team will confirm within 24 hours.", "success");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setDate(""); setTime(""); setName(""); setEmail(""); setPhone(""); setMessage(""); setError("");
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 px-4 font-sans antialiased relative overflow-hidden">
      <SEO
        title={lang === "fr" ? "Prendre un Rendez-vous" : "Book an Appointment"}
        description={lang === "fr"
          ? "Planifiez une consultation gratuite avec l'équipe Songtai Life."
          : "Schedule a free consultation with the Songtai Life team."}
        url="/?section=appointment"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Songtai Life",
          address: { "@type": "PostalAddress", addressLocality: "Yaoundé", addressCountry: "CM" },
          url: typeof window !== "undefined" ? window.location.origin : "https://songtailife.cm",
        }}
      />

      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-700/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-12 text-left max-w-xl">
          <span className="text-xs text-[color:var(--color-gold)] font-black uppercase tracking-widest">
            {lang === "fr" ? "Consultation Gratuite" : "Free Consultation"}
          </span>
          <h1 className="text-4xl font-black text-white mt-2 tracking-tight">
            {lang === "fr" ? "Prendre un Rendez-vous" : "Book an Appointment"}
          </h1>
          <p className="text-stone-400 text-sm mt-3 leading-relaxed">
            {lang === "fr"
              ? "Rencontrez notre équipe pour discuter de nos produits ou de la façon de rejoindre le réseau Songtai Life."
              : "Meet with our team to discuss our product range or how to join the Songtai Life network."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center bg-stone-900 border border-emerald-900/40 rounded-3xl p-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex p-4 bg-emerald-950/50 border border-emerald-900/50 rounded-2xl mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-3">
                {lang === "fr" ? "Demande envoyée !" : "Request Submitted!"}
              </h2>
              <p className="text-stone-400 text-sm mb-6 leading-relaxed">
                {lang === "fr"
                  ? "Notre équipe vous contactera dans les 24 heures pour confirmer votre rendez-vous."
                  : "Our team will contact you within 24 hours to confirm your appointment."}
              </p>
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/90 text-stone-950 font-black text-xs rounded-xl transition-all cursor-pointer"
              >
                {lang === "fr" ? "Prendre un autre rendez-vous" : "Book Another Appointment"}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Appointment Type Selector */}
              <div className="lg:col-span-4 space-y-3">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">
                  {lang === "fr" ? "Type de consultation" : "Consultation Type"}
                </h3>
                {types.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedType?.id === t.id
                        ? "border-[color:var(--color-gold)] bg-[color:var(--color-gold)]/5"
                        : "border-stone-800 bg-stone-900/40 hover:border-stone-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{localName(t)}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">{t.durationMinutes} min</p>
                        {localDesc(t) && <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">{localDesc(t)}</p>}
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 ml-2 transition-colors ${
                        selectedType?.id === t.id ? "text-[color:var(--color-gold)]" : "text-stone-600"
                      }`} />
                    </div>
                  </button>
                ))}
                {types.length === 0 && (
                  <p className="text-stone-500 text-xs">Loading appointment types…</p>
                )}
              </div>

              {/* Booking Form */}
              <form onSubmit={handleSubmit} className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-2xl p-8 space-y-5 text-left">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">
                  {lang === "fr" ? "Vos informations" : "Your Details"}
                </h3>

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-black block mb-1.5">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {lang === "fr" ? "Date souhaitée" : "Preferred Date"}
                    </label>
                    <input
                      type="date"
                      required
                      min={todayStr()}
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-black block mb-1.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {lang === "fr" ? "Heure souhaitée" : "Preferred Time"}
                    </label>
                    <select
                      required
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-sm text-white outline-none"
                    >
                      <option value="">-- select --</option>
                      {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-black block mb-1.5">
                      <User className="w-3 h-3 inline mr-1" />
                      {lang === "fr" ? "Nom complet" : "Full Name"}
                    </label>
                    <input
                      type="text" required
                      value={name} onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-400 uppercase font-black block mb-1.5">
                      <Mail className="w-3 h-3 inline mr-1" />
                      {lang === "fr" ? "Adresse e-mail" : "Email Address"}
                    </label>
                    <input
                      type="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-[10px] text-stone-400 uppercase font-black block mb-1.5">
                    <Phone className="w-3 h-3 inline mr-1" />
                    {lang === "fr" ? "Numéro de téléphone (optionnel)" : "Phone Number (optional)"}
                  </label>
                  <input
                    type="tel"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-sm text-white outline-none"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-[10px] text-stone-400 uppercase font-black block mb-1.5">
                    <MessageSquare className="w-3 h-3 inline mr-1" />
                    {lang === "fr" ? "Message (optionnel)" : "Message (optional)"}
                  </label>
                  <textarea
                    rows={3}
                    value={message} onChange={e => setMessage(e.target.value)}
                    placeholder={lang === "fr" ? "Précisez votre demande…" : "Tell us what you'd like to discuss…"}
                    className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 focus:border-[color:var(--color-gold)] rounded-xl text-sm text-white outline-none resize-none"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[color:var(--color-gold)] hover:bg-[color:var(--color-gold)]/90 text-stone-950 font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    : (lang === "fr" ? "Soumettre la demande →" : "Submit Request →")}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
