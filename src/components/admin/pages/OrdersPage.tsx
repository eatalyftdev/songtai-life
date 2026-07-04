import { useState, useEffect } from "react";
import { ShoppingCart, Copy, Check, MessageCircle, RefreshCw, AlertTriangle, MapPin, User, Phone } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import PageShell, { Card, TableWrapper, Th, Td, Btn, SearchInput, Select } from "../shared/PageShell";
import SlideOver from "../shared/SlideOver";
import { SkeletonTable } from "../shared/Skeleton";
import EmptyState from "../shared/EmptyState";
import StatusBadge from "../shared/StatusBadge";

interface Order {
  id: string;
  orderId: string;
  userId: string;
  amountXaf: number;
  pvPoints: number;
  phone: string;
  provider: string;
  status: string;
  createdAt: string;
  cart: any[];
  distributorId?: string;
  // Delivery fields
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  // WhatsApp notification
  whatsappNotified: boolean;
  whatsappNotifiedAt?: string;
  whatsappNotificationError?: string;
}

const STATUSES = ["pending","paid","processing","shipped","delivered","cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [copied, setCopied] = useState("");
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data ?? []).map(o => ({
      id: o.id,
      orderId: o.order_id,
      userId: o.user_id,
      amountXaf: o.amount_xaf ?? 0,
      pvPoints: o.pv_points ?? 0,
      phone: o.phone ?? "",
      provider: o.provider ?? "",
      status: o.status ?? "pending",
      createdAt: o.created_at,
      cart: o.cart ?? [],
      distributorId: o.distributor_id ?? undefined,
      customerName: o.customer_name ?? undefined,
      customerPhone: o.customer_phone ?? undefined,
      deliveryAddress: o.delivery_address ?? undefined,
      deliveryNotes: o.delivery_notes ?? undefined,
      whatsappNotified: o.whatsapp_notified ?? false,
      whatsappNotifiedAt: o.whatsapp_notified_at ?? undefined,
      whatsappNotificationError: o.whatsapp_notification_error ?? undefined,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || o.orderId.toLowerCase().includes(q) || o.phone.includes(q) || o.userId.toLowerCase().includes(q);
  });

  const handleStatusChange = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    await supabase.from("audit_logs").insert({ action: "Order Status Updated", details: `${id} → ${status}` });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const handleResendNotification = async (orderId: string) => {
    setResending(true);
    setResendResult(null);
    try {
      const res = await fetch("/api/payment/resend-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        setResendResult({ ok: true, message: "WhatsApp notification sent successfully." });
        // Refresh the selected order state
        await load();
        setSelected(prev => prev && prev.orderId === orderId
          ? { ...prev, whatsappNotified: true, whatsappNotifiedAt: new Date().toISOString(), whatsappNotificationError: undefined }
          : prev
        );
      } else {
        setResendResult({ ok: false, message: data.error || "Failed to resend notification." });
      }
    } catch (err: any) {
      setResendResult({ ok: false, message: err.message });
    } finally {
      setResending(false);
    }
  };

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 2000);
  };

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const WaStatusBadge = ({ order }: { order: Order }) => {
    if (order.status !== "paid") return null;
    if (order.whatsappNotified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-950/40 border border-emerald-900/40 text-emerald-400">
          <MessageCircle className="w-2.5 h-2.5" /> Notified
        </span>
      );
    }
    if (order.whatsappNotificationError) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-950/40 border border-red-900/40 text-red-400">
          <AlertTriangle className="w-2.5 h-2.5" /> Notif. Failed
        </span>
      );
    }
    return null;
  };

  return (
    <PageShell title="Orders" subtitle={`${orders.length} orders total`}>
      <Card>
        <div className="flex flex-wrap gap-3 p-4 border-b border-stone-800">
          <SearchInput value={search} onChange={setSearch} placeholder="Order ID, phone…" />
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>

        <TableWrapper>
          <thead>
            <tr>
              <Th>Order ID</Th>
              <Th>Customer</Th>
              <Th>Provider</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>When</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          {loading ? <SkeletonTable cols={7} /> : (
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={ShoppingCart} title="No orders found" description="Orders will appear here once customers purchase." /></td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="border-b border-stone-800/50 hover:bg-stone-800/20 cursor-pointer transition-colors" onClick={() => { setSelected(o); setResendResult(null); }}>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-[#C9A227]">{o.orderId.slice(0, 12)}</span>
                      <button onClick={e => { e.stopPropagation(); copyId(o.orderId); }} className="text-stone-500 hover:text-white cursor-pointer">
                        {copied === o.orderId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <WaStatusBadge order={o} />
                  </Td>
                  <Td>
                    <div>
                      {o.customerName && <p className="text-stone-200 text-xs font-semibold">{o.customerName}</p>}
                      <p className="text-stone-500 text-[11px]">{o.phone || "—"}</p>
                    </div>
                  </Td>
                  <Td><StatusBadge status={o.provider || "—"} /></Td>
                  <Td><span className="font-mono font-semibold text-white">{o.amountXaf.toLocaleString()} XAF</span></Td>
                  <Td><StatusBadge status={o.status} /></Td>
                  <Td><span className="text-stone-500">{relTime(o.createdAt)}</span></Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <Select value={o.status} onChange={v => handleStatusChange(o.id, v)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Td>
                </tr>
              ))}
            </tbody>
          )}
        </TableWrapper>
        <div className="px-4 py-3 border-t border-stone-800 text-stone-500 text-xs">
          Showing {filtered.length} of {orders.length} orders
        </div>
      </Card>

      <SlideOver open={!!selected} onClose={() => { setSelected(null); setResendResult(null); }} title={`Order ${selected?.orderId?.slice(0, 16) ?? ""}`} subtitle={selected ? relTime(selected.createdAt) : ""}>
        {selected && (
          <div className="space-y-5">

            {/* Core order details */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Status",   value: <StatusBadge status={selected.status} /> },
                { label: "Amount",   value: <span className="text-white font-mono font-bold">{selected.amountXaf.toLocaleString()} XAF</span> },
                { label: "PV Points", value: <span className="text-[#C9A227] font-mono">{selected.pvPoints} PV</span> },
                { label: "Provider", value: selected.provider || "—" },
              ].map(row => (
                <div key={row.label} className="bg-stone-800/40 rounded-xl p-3">
                  <p className="text-stone-500 text-[10px] uppercase font-semibold mb-1">{row.label}</p>
                  <div className="text-xs">{row.value}</div>
                </div>
              ))}
            </div>

            {/* Customer & Delivery info */}
            {(selected.customerName || selected.customerPhone || selected.phone || selected.deliveryAddress) && (
              <div>
                <p className="text-stone-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer & Delivery
                </p>
                <div className="space-y-2">
                  {selected.customerName && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-stone-800/40 rounded-xl text-xs">
                      <User className="w-3 h-3 text-stone-500 flex-shrink-0" />
                      <span className="text-stone-200">{selected.customerName}</span>
                    </div>
                  )}
                  {(selected.customerPhone || selected.phone) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-stone-800/40 rounded-xl text-xs">
                      <Phone className="w-3 h-3 text-stone-500 flex-shrink-0" />
                      <span className="text-stone-200">{selected.customerPhone || selected.phone}</span>
                    </div>
                  )}
                  {selected.deliveryAddress && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-stone-800/40 rounded-xl text-xs">
                      <MapPin className="w-3 h-3 text-stone-500 flex-shrink-0 mt-0.5" />
                      <span className="text-stone-200 whitespace-pre-line">{selected.deliveryAddress}</span>
                    </div>
                  )}
                  {selected.deliveryNotes && (
                    <div className="px-3 py-2 bg-stone-800/40 rounded-xl text-xs">
                      <p className="text-stone-500 text-[10px] uppercase font-semibold mb-1">Delivery Notes</p>
                      <p className="text-stone-300 whitespace-pre-line">{selected.deliveryNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* WhatsApp notification status */}
            {selected.status === "paid" && (
              <div>
                <p className="text-stone-400 text-xs font-semibold mb-2 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Notification
                </p>
                <div className="px-3 py-3 bg-stone-800/40 rounded-xl text-xs space-y-2">
                  {selected.whatsappNotified ? (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>Sent {selected.whatsappNotifiedAt ? `at ${new Date(selected.whatsappNotifiedAt).toLocaleString()}` : ""}</span>
                    </div>
                  ) : selected.whatsappNotificationError ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>Failed: {selected.whatsappNotificationError}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-stone-500">No notification sent yet.</span>
                  )}

                  {/* Resend button — always available for paid orders */}
                  <div className="pt-1">
                    <button
                      onClick={() => handleResendNotification(selected.orderId)}
                      disabled={resending}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-900/40 text-emerald-400 text-[11px] font-bold rounded-lg transition-all cursor-pointer disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                      {resending ? "Sending…" : selected.whatsappNotified ? "Resend Notification" : "Send Notification"}
                    </button>
                    {resendResult && (
                      <p className={`mt-2 text-[11px] font-semibold ${resendResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                        {resendResult.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cart items */}
            {selected.cart.length > 0 && (
              <div>
                <p className="text-stone-400 text-xs font-semibold mb-2">Items ({selected.cart.length})</p>
                <div className="space-y-2">
                  {selected.cart.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2 bg-stone-800/40 rounded-xl text-xs">
                      <span className="text-stone-200">{item.name ?? item.id}</span>
                      <span className="text-stone-400">×{item.qty ?? 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-stone-400 text-xs font-semibold mb-2">Update Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => handleStatusChange(selected.id, s)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selected.status === s ? "bg-[#0A7D32] text-white" : "bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </PageShell>
  );
}
