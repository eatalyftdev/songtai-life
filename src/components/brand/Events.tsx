import { useState, useEffect } from "react";
import { EventSeed, EVENTS_SEED } from "../../data/mockData";
import { Clock, MapPin, Users, Calendar, ArrowLeft, CheckCircle } from "lucide-react";

interface EventsProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function Events({ addNotification }: EventsProps) {
  const [selectedEvent, setSelectedEvent] = useState<EventSeed | null>(null);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);

  // Real-time countdown calculation
  const [countdowns, setCountdowns] = useState<{ [key: string]: string }>({});
  useEffect(() => {
    const calc = () => {
      const updated: { [key: string]: string } = {};
      EVENTS_SEED.forEach(ev => {
        const diff = new Date(ev.startAt).getTime() - Date.now();
        if (diff <= 0) {
          updated[ev.id] = "Live Now";
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
  }, []);

  const handleRegister = (eventId: string, eventTitle: string) => {
    if (registeredEvents.includes(eventId)) return;
    setRegisteredEvents(prev => [...prev, eventId]);
    addNotification(`Successfully registered for: ${eventTitle}! Entrance passes sent to your email.`, "success");
  };

  // Past events (simulated by setting start date in the past)
  const PAST_EVENTS: EventSeed[] = [
    {
      id: "event-past-1",
      slug: "yaounde-launch-summit",
      title: "Sovereign launch & wellness seminar",
      startAt: "2026-03-12T10:00:00Z",
      endAt: "2026-03-12T17:00:00Z",
      location: "Hilton Hotel, Yaoundé",
      capacity: 300,
      description: "Official introductory seminar introducing direct-marketing overrides, unilevel compensation models, and raw materials sourcing across northern Cameroon crops.",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800"
    },
    {
      id: "event-past-2",
      slug: "douala-youth-business",
      title: "Youth Digital Entrepreneurship Forum",
      startAt: "2026-04-05T14:00:00Z",
      endAt: "2026-04-05T19:00:00Z",
      location: "Canal Olympia, Bessengue, Douala",
      capacity: 800,
      description: "A digital-first direct selling panel explaining how Cameroon youth can scale unilevel distributor accounts using smartphones and WhatsApp groups.",
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800"
    }
  ];

  if (selectedEvent) {
    const ev = selectedEvent;
    const isPast = activeTab === "past";
    const isRegistered = registeredEvents.includes(ev.id);

    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
          
          <button
            onClick={() => setSelectedEvent(null)}
            className="flex items-center gap-2 text-stone-400 hover:text-white font-bold text-xs cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Events Hub</span>
          </button>

          <div className="bg-stone-900/20 border border-stone-850 p-6 sm:p-8 rounded-[32px] space-y-6">
            <div className="relative h-64 sm:h-80 bg-stone-950 rounded-2xl overflow-hidden border border-stone-850">
              <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
              {!isPast && (
                <div className="absolute top-4 left-4 px-4 py-1.5 bg-stone-950/90 backdrop-blur-md border border-[#C9A227] text-[#C9A227] font-mono text-xs font-bold rounded-full flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{countdowns[ev.id] || "Calculating..."}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Calendar className="w-4 h-4" />
                <span>{new Date(ev.startAt).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{ev.title}</h1>
              <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">{ev.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-900 text-xs text-stone-400">
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-900 flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[#C9A227] flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Location</span>
                  <span className="text-white font-semibold">{ev.location}</span>
                </div>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-900 flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Max Capacity</span>
                  <span className="text-white font-semibold">{ev.capacity} Seats</span>
                </div>
              </div>

              <div className="p-4 bg-stone-950 rounded-xl border border-stone-900 flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#C9A227] flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-stone-500 block uppercase font-bold">Event Time</span>
                  <span className="text-white font-semibold">09:00 - 17:00 (WAT)</span>
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
                      : "bg-[#0A7D32] hover:bg-[#086327] text-white"
                  }`}
                >
                  {isRegistered ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-[#C9A227]" />
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

  const activeList = activeTab === "upcoming" ? EVENTS_SEED : PAST_EVENTS;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        {/* Title */}
        <div className="border-b border-stone-900 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Active Hub</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Events & Summit Gatherings</h1>
            <p className="text-stone-400 text-xs">Join our physical brand networks and accelerate your distributor volume.</p>
          </div>

          <div className="flex gap-2 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit">
            <button
              onClick={() => {
                setActiveTab("upcoming");
                setSelectedEvent(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "upcoming" ? "bg-[#0A7D32] text-white" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Upcoming Summits
            </button>
            <button
              onClick={() => {
                setActiveTab("past");
                setSelectedEvent(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "past" ? "bg-[#0A7D32] text-white" : "text-stone-500 hover:text-stone-300"
              }`}
            >
              Past Conventions
            </button>
          </div>
        </div>

        {/* List of cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeList.map(ev => (
            <div 
              key={ev.id}
              onClick={() => setSelectedEvent(ev)}
              className="bg-stone-900/20 border border-stone-850 rounded-[24px] overflow-hidden group flex flex-col justify-between cursor-pointer hover:bg-stone-900/35 transition-all"
            >
              <div>
                <div className="relative h-48 bg-stone-950">
                  <img src={ev.image} alt={ev.title} className="w-full h-full object-cover opacity-85" />
                  {activeTab === "upcoming" && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-stone-950/90 backdrop-blur-md border border-[#C9A227]/40 text-[#C9A227] font-mono text-[10px] font-bold rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{countdowns[ev.id] || "Calculating..."}</span>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(ev.startAt).toLocaleDateString()}
                  </span>
                  <h4 className="font-extrabold text-white text-base leading-snug group-hover:text-emerald-400 transition-colors line-clamp-1">{ev.title}</h4>
                  <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">{ev.description}</p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4 border-t border-stone-900 flex items-center justify-between text-xs text-stone-500">
                <span>{ev.location}</span>
                <span className="font-bold text-stone-400">Seats: {ev.capacity}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
