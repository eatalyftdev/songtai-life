import { useState, type FormEvent } from "react";
import { Calendar, Clock, User, Mail, Phone, CheckCircle2, XCircle, AlertCircle, Filter, Plus, Pencil, X } from "lucide-react";
import { useAdminResource } from "../../hooks/useAdminResource";
import { supabase } from "../../lib/supabase";

interface Appointment {
  id: string;
  typeName: string;
  name: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
  status: "requested" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
}

interface AppointmentType {
  id: string;
  nameEn: string;
}

interface AppointmentsTabProps {
  addNotification: (msg: string, type: "success" | "info" | "gold") => void;
}

const STATUS_CONFIG = {
  requested:  { label: "Requested",  color: "text-amber-400  bg-amber-900/20  border-amber-900/40" },
  confirmed:  { label: "Confirmed",  color: "text-emerald-400 bg-emerald-900/20 border-emerald-900/40" },
  completed:  { label: "Completed",  color: "text-blue-400   bg-blue-900/20   border-blue-900/40" },
  cancelled:  { label: "Cancelled",  color: "text-red-400    bg-red-900/20    border-red-900/40" },
};

export default function AppointmentsTab({ addNotification }: AppointmentsTabProps) {
  const { data: appointments, loading, update } = useAdminResource<Appointment>({
    tableName: "appointments",
    select: "*, appointment_types(name_en)",
    orderBy: { column: "created_at", ascending: false },
    map: r => ({
      id: r.id,
      typeName: r.appointment_types?.name_en ?? "—",
      name: r.name ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      preferredDate: r.preferred_date ?? "",
      preferredTime: r.preferred_time ?? "",
      message: r.message ?? "",
      status: r.status ?? "requested",
      createdAt: r.created_at ?? "",
    }),
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Appointment type management
  const { data: types, insert: insertType, remove: removeType } = useAdminResource<AppointmentType>({
    tableName: "appointment_types",
    orderBy: { column: "display_order", ascending: true },
    map: r => ({ id: r.id, nameEn: r.name_en ?? "" }),
  });

  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeNameFr, setNewTypeNameFr] = useState("");
  const [addingType, setAddingType] = useState(false);

  const filtered = statusFilter === "all"
    ? appointments
    : appointments.filter(a => a.status === statusFilter);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await update(id, { status });
    setUpdatingId(null);
    if (error) addNotification("Error updating status.", "info");
    else addNotification(`Appointment ${status}.`, "success");
  };

  const handleAddType = async (e: FormEvent) => {
    e.preventDefault();
    setAddingType(true);
    const { error } = await insertType({
      name_en: newTypeName.trim(),
      name_fr: newTypeNameFr.trim() || null,
      duration_minutes: 30,
      is_active: true,
      display_order: types.length,
    });
    setAddingType(false);
    if (error) addNotification("Error adding type.", "info");
    else { addNotification("Appointment type added.", "success"); setNewTypeName(""); setNewTypeNameFr(""); }
  };

  const selectedAppt = appointments.find(a => a.id === selectedId);
  const counts = {
    requested: appointments.filter(a => a.status === "requested").length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    completed: appointments.filter(a => a.status === "completed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
  };

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-extrabold text-lg text-stone-100">Appointments</h3>
          <p className="text-xs text-stone-500">Manage booking requests and appointment types.</p>
        </div>
        <button onClick={() => setShowTypeManager(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-lg cursor-pointer">
          <Plus className="w-3.5 h-3.5" />Manage Types
        </button>
      </div>

      {/* Appointment type manager */}
      {showTypeManager && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4 max-w-xl">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-stone-100">Appointment Types</h4>
            <button onClick={() => setShowTypeManager(false)} className="text-stone-500 hover:text-stone-200 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
          {types.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-sm text-stone-300">
              <span>{t.nameEn}</span>
              <button onClick={() => removeType(t.id)} className="text-red-400 hover:text-red-300 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
          <form onSubmit={handleAddType} className="flex gap-2 flex-wrap">
            <input required value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
              placeholder="Name (EN)" className="flex-1 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-white outline-none min-w-24" />
            <input value={newTypeNameFr} onChange={e => setNewTypeNameFr(e.target.value)}
              placeholder="Nom (FR)" className="flex-1 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-white outline-none min-w-24" />
            <button type="submit" disabled={addingType}
              className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-60">
              {addingType ? "…" : "Add"}
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(counts) as [string, number][]).map(([s, n]) => {
          const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG];
          return (
            <div key={s} className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${cfg.color}`}>
              <span className="text-2xl font-black">{n}</span>
              <span className="text-xs font-bold">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "requested", "confirmed", "completed", "cancelled"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize ${statusFilter === s ? "bg-[#ecc246] text-stone-950" : "bg-stone-900 text-stone-400 hover:text-stone-200"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-stone-700 border-t-[#ecc246] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-stone-500 text-sm py-12 text-center">No appointments found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-stone-100">{a.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${STATUS_CONFIG[a.status].color}`}>
                    {STATUS_CONFIG[a.status].label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-400 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{a.preferredDate}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.preferredTime}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</span>
                  {a.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</span>}
                </div>
                <p className="text-xs text-stone-500">{a.typeName}</p>
                {a.message && <p className="text-xs text-stone-500 italic line-clamp-1">"{a.message}"</p>}
              </div>

              {/* Status actions */}
              <div className="flex gap-1.5 flex-shrink-0">
                {a.status !== "confirmed" && a.status !== "completed" && (
                  <button onClick={() => updateStatus(a.id, "confirmed")} disabled={updatingId === a.id}
                    title="Confirm" className="p-2 bg-stone-800 hover:bg-emerald-900/30 text-emerald-400 rounded-lg cursor-pointer transition-all disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                {a.status === "confirmed" && (
                  <button onClick={() => updateStatus(a.id, "completed")} disabled={updatingId === a.id}
                    title="Mark Completed" className="p-2 bg-stone-800 hover:bg-blue-900/30 text-blue-400 rounded-lg cursor-pointer transition-all disabled:opacity-50">
                    <AlertCircle className="w-4 h-4" />
                  </button>
                )}
                {a.status !== "cancelled" && a.status !== "completed" && (
                  <button onClick={() => updateStatus(a.id, "cancelled")} disabled={updatingId === a.id}
                    title="Cancel" className="p-2 bg-stone-800 hover:bg-red-900/30 text-red-400 rounded-lg cursor-pointer transition-all disabled:opacity-50">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
