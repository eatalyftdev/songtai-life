import { useState, useEffect, useCallback } from "react";
import { Clock, MapPin, Users, Calendar, ArrowLeft, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "react-i18next";

interface DBEvent {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  capacity: number | null;
  description: string | null;
  image: string | null;
}

interface EventsProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function Events({ addNotification }: EventsProps) {
  const { t } = useTranslation();
  const [allEvents, setAllEvents] = useState<DBEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DBEvent | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("start_at", { ascending: true });
    setAllEvents(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
    const ch = supabase
      .channel("public_events_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, fetchEvents)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchEvents]);

  // Countdown timer
  useEffect(() => {
    const calc = () => {
      const updated: { [key: string]: string } = {};
      allEvents.forEach(ev => {
        const diff = new Date(ev.start_at).getTime() - Date.now();
        if (diff <= 0) {
          updated[ev.id] = t("events.live", "Live Now");
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          updated[ev.id] = `${days}d ${hours}h ${mins}m ${secs}s`;
        }
      });
      setCountdowns(updated);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [allEvents, t]);

  const now = Date.now();
  const upcomingEvents = allEvents.filter(ev => new Date(ev.start_at).getTime() >= now);
  const pastEvents = allEvents.filter(ev => new Date(ev.start_at).getTime() < now).reverse();
  const activeList = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  const handleRegister = (eventId: string, eventTitle: string) => {
    if (registeredEvents.includes(eventId)) return;
    setRegisteredEvents(prev => [...prev, eventId]);
    addNotification(`Successfully registered for: ${eventTitle}! Entrance passes sent to your email.`, "success");
  };

  if (selectedEvent) {
    const ev = selectedEvent;
    const isPast = new Date(ev.start_at).getTime() < now;
    const isRegistered = registeredEvents.includes(ev.id);

    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">

          <button
            onClick={() => setSelectedEvent(null)}
            className="flex items-center gap-2 text-stone-400 hover:text-white font-bold text-xs cursor-pointer group transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
            <span>Back to Events Hub</span>
          </button>

          <div className="bg-stone-900/20 border border-stone-850 p-6 sm:p-8 rounded-[32px] space-y-6">
            <div className="relative h-64 sm:h-80 bg-stone-950 rounded-2xl overflow-hidden border border-stone-850">
              {ev.image ? (
                <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                  <Calendar className="w-12 h-12 text-stone-700" />
                </div>
              )}
              {!isPast && (
                <div className="absolute top-4 left-4 px-4 py-1.5 bg-stone-950/90 backdrop-blur-md border border-[color:var(--color-gold)] text-[color:var(--color-gold)] font-mono text-xs font-bold rounded-full flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{countdowns[ev.id] || "Calculating..."}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Calendar className="w-4 h-4" />
                <span>{new Date(ev.start_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{ev.title}</h1>
              {ev.description && (
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">{ev.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-900 text-xs text-stone-400">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-900 flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[color:var(--color-gold)] flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Location</span>
                  <span className="text-white font-semibold">{ev.location || "TBD"}</span>
                </div>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-900 flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Max Capacity</span>
                  <span className="text-white font-semibold">{ev.capacity ?? "—"} Seats</span>
                </div>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-900 flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[color:var(--color-gold)] flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Event Time</span>
                  <span className="text-white font-semibold">
                    {new Date(ev.start_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {ev.end_at ? ` — ${new Date(ev.end_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {!isPast && (
              <div className="pt-4">
                <button
                  disabled={isRegistered}
                  onClick={() => handleRegister(ev.id, ev.title)}
                  className={`w-full py-4 rounded-2xl text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                    isRegistered
                      ? "bg-emerald-950/40 border border-emerald-900/30 text-emerald-400"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white"
                  }`}
                >
                  {isRegistered ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-[color:var(--color-gold)]" />
                      <span>Registration Confirmed • Check Your Inbox</span>
                    </>
                  ) : (
                    <span>Register / RSVP for this Summit</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">

        {/* Title */}
        <div className="border-b border-stone-900 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Active Hub</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Events & Summit Gatherings</h1>
            <p className="text-stone-400 text-xs">Join our physical brand networks and accelerate your distributor volume.</p>
          </div>

          <div className="flex gap-2 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit">
            <button
              onClick={() => { setActiveTab("upcoming"); setSelectedEvent(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "upcoming" ? "bg-emerald-700 text-white" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Upcoming Summits
            </button>
            <button
              onClick={() => { setActiveTab("past"); setSelectedEvent(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                activeTab === "past" ? "bg-emerald-700 text-white" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Past Conventions
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-stone-900/20 border border-stone-850 rounded-[24px] overflow-hidden h-72 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && activeList.length === 0 && (
          <div className="text-center py-20 text-stone-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-sm">
              {activeTab === "upcoming" ? "No upcoming events scheduled yet." : "No past events to display."}
            </p>
          </div>
        )}

        {/* Cards */}
        {!loading && activeList.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeList.map(ev => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className="bg-stone-900/20 border border-stone-850 rounded-[24px] overflow-hidden group flex flex-col justify-between cursor-pointer hover:bg-stone-900/35 hover:border-stone-700 transition-all duration-200"
              >
                <div>
                  <div className="relative h-48 bg-stone-950">
                    {ev.image ? (
                      <img src={ev.image} alt={ev.title} className="w-full h-full object-cover opacity-85 transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                        <Calendar className="w-10 h-10 text-stone-700" />
                      </div>
                    )}
                    {activeTab === "upcoming" && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-stone-950/90 backdrop-blur-md border border-[color:var(--color-gold)]/40 text-[color:var(--color-gold)] font-mono text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{countdowns[ev.id] || "Calculating..."}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-3">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ev.start_at).toLocaleDateString()}
                    </span>
                    <h4 className="font-extrabold text-white text-base leading-snug group-hover:text-emerald-400 transition-colors duration-150 line-clamp-1">{ev.title}</h4>
                    {ev.description && (
                      <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">{ev.description}</p>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-stone-900 flex items-center justify-between text-xs text-stone-500">
                  <span>{ev.location || "Location TBD"}</span>
                  {ev.capacity && <span className="font-bold text-stone-400">Seats: {ev.capacity}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
