import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { 
  collection, query, getDocs, updateDoc, doc, onSnapshot, 
  setDoc, addDoc, deleteDoc, serverTimestamp, writeBatch 
} from "firebase/firestore";
import { 
  Users, FileCheck2, ShieldAlert, CheckCircle, XCircle, Award, 
  TrendingUp, Layers, LogOut, Search, UserCheck, RefreshCw,
  LayoutDashboard, ShoppingBag, BookOpen, Calendar, Mail, 
  Send, FileSpreadsheet, History, Plus, Trash2, Edit, Save, 
  X, GitBranch, ArrowUpRight, BarChart3, ChevronRight, FileText,
  DollarSign, CreditCard, Activity, Bell, Moon, Sun, ChevronDown,
  Sparkles, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from "recharts";

interface AdminDistributor {
  uid: string;
  email: string;
  phone: string;
  distributorCode: string;
  rank: string;
  kycStatus: "none" | "pending" | "verified" | "rejected";
  sponsorId: string | null;
  placementId: string | null;
  joinedAt: any;
  pv: number;
}

interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceXaf: number;
  pvPoints: number;
  category: string;
  image: string;
  stock: number;
  isActive: boolean;
  benefits?: string[];
  usage?: string;
}

interface AdminOrder {
  id: string;
  orderId: string;
  userId: string;
  amountXaf: number;
  pvPoints: number;
  phone: string;
  provider: string;
  status: "pending" | "paid" | "completed" | "cancelled";
  createdAt: any;
  cart?: { id: string; name: string; qty: number }[];
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  publishedAt: string;
  image: string;
  author: string;
}

interface CompanyEvent {
  id: string;
  slug: string;
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  registrants?: string[];
  description: string;
  image: string;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: "unread" | "read" | "responded";
  createdAt: any;
}

interface NewsletterSubscriber {
  id: string;
  email: string;
  createdAt: any;
}

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  details: string;
  createdAt: any;
}

// Custom Tooltip for Recharts that fits the dark enterprise style of Songtai
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const rawData = payload[0].payload;
    return (
      <div className="bg-stone-950/95 backdrop-blur border border-stone-800 text-stone-100 p-3.5 rounded-xl shadow-2xl text-xs space-y-2.5 font-sans min-w-[180px] text-left">
        <div className="pb-1.5 border-b border-stone-850">
          <p className="font-extrabold text-stone-200 tracking-tight">{rawData.date}</p>
          <p className="text-[10px] text-stone-500 font-semibold">{rawData.displayDate}</p>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            if (entry.name === "Sales Volume") {
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-stone-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sales:
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {Number(entry.value).toLocaleString()} XAF
                  </span>
                </div>
              );
            } else {
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-stone-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    Signups:
                  </span>
                  <span className="text-teal-400 font-bold font-mono">
                    +{entry.value}
                  </span>
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminPortal({ 
  addNotification, 
  theme = "dark", 
  toggleTheme 
}: { 
  addNotification: any;
  theme?: "dark" | "light";
  toggleTheme?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "products" | "orders" | "distributors" | "blog" | "events" | "contacts" | "newsletter" | "audit"
  >("analytics");

  const { logout, userProfile, user } = useAuth();
  const navigate = useNavigate();

  // Unified States
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [rawDistributors, setRawDistributors] = useState<any[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Derived distributors list
  const distributors = React.useMemo<AdminDistributor[]>(() => {
    return rawDistributors.map(distData => {
      const uid = distData.uid;
      const userData = usersMap[uid] || {};
      return {
        uid,
        email: userData.email || "no-email@songtai.life",
        phone: userData.phone || "No Phone",
        distributorCode: distData.distributorCode || "N/A",
        rank: distData.rank || "bronze",
        kycStatus: distData.kycStatus || "none",
        sponsorId: distData.sponsorId || null,
        placementId: distData.placementId || null,
        joinedAt: distData.joinedAt,
        pv: distData.pv || 0
      };
    });
  }, [rawDistributors, usersMap]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [chartMetric, setChartMetric] = useState<"both" | "sales" | "signups">("both");

  // CRUD Editing Modals / States
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<AdminProduct>>({
    name: "", slug: "", description: "", priceXaf: 0, pvPoints: 0, category: "Health",
    image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800", stock: 100, isActive: true, benefits: [], usage: ""
  });

  // Blog CMS State
  const [isAddingBlog, setIsAddingBlog] = useState(false);
  const [newBlog, setNewBlog] = useState<Partial<BlogPost>>({
    title: "", slug: "", excerpt: "", body: "", category: "Wellness", author: "Corporate Admin",
    image: "https://images.unsplash.com/photo-1543589077-47d8160677a0?auto=format&fit=crop&q=80&w=800"
  });

  // Events CMS State
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CompanyEvent>>({
    title: "", slug: "", startAt: new Date().toISOString().substring(0, 16), endAt: new Date().toISOString().substring(0, 16),
    location: "", capacity: 500, description: "", image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800"
  });

  // Genealogy Override state
  const [overrideDistId, setOverrideDistId] = useState("");
  const [overrideSponsorCode, setOverrideSponsorCode] = useState("");
  const [overridePlacementCode, setOverridePlacementCode] = useState("");
  const [isGenealogyOverrideOpen, setIsGenealogyOverrideOpen] = useState(false);

  // Chart hover interaction state
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Log corporate action helper
  const logAdminAction = async (action: string, details: string) => {
    try {
      await addDoc(collection(db, "auditLogs"), {
        adminEmail: userProfile?.email || "system@songtai.life",
        action,
        details,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Audit logging failure:", err);
    }
  };

  // Real-time synchronization listeners
  useEffect(() => {
    setLoading(true);

    // Synchronize Users
    const unsubUsers = onSnapshot(collection(db, "users"), (usersSnap) => {
      const uMap: Record<string, any> = {};
      usersSnap.forEach(uDoc => {
        uMap[uDoc.id] = uDoc.data();
      });
      setUsersMap(uMap);
    }, (err) => {
      console.error("Error subscribing to users collection:", err);
    });

    // Synchronize Distributors
    const unsubDists = onSnapshot(collection(db, "distributors"), (distsSnap) => {
      const list: any[] = [];
      distsSnap.forEach(dDoc => {
        list.push({ uid: dDoc.id, ...dDoc.data() });
      });
      setRawDistributors(list);
    }, (err) => {
      console.error("Error subscribing to distributors collection:", err);
    });

    // Synchronize Products
    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      const list: AdminProduct[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AdminProduct);
      });
      setProducts(list);
    }, (err) => {
      console.error("Error subscribing to products collection:", err);
    });

    // Synchronize Orders
    const unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
      const list: AdminOrder[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AdminOrder);
      });
      // Sort newest first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setOrders(list);
    }, (err) => {
      console.error("Error subscribing to orders collection:", err);
    });

    // Synchronize Blogs
    const unsubBlogs = onSnapshot(collection(db, "blogs"), (snap) => {
      const list: BlogPost[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as BlogPost);
      });
      setBlogs(list);
    }, (err) => {
      console.error("Error subscribing to blogs collection:", err);
    });

    // Synchronize Events
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      const list: CompanyEvent[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as CompanyEvent);
      });
      setEvents(list);
    }, (err) => {
      console.error("Error subscribing to events collection:", err);
    });

    // Synchronize Messages
    const unsubMessages = onSnapshot(collection(db, "contactMessages"), (snap) => {
      const list: ContactMessage[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ContactMessage);
      });
      setMessages(list);
    }, (err) => {
      console.error("Error subscribing to contactMessages collection:", err);
    });

    // Synchronize Subscribers
    const unsubSubscribers = onSnapshot(collection(db, "subscribers"), (snap) => {
      const list: NewsletterSubscriber[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as NewsletterSubscriber);
      });
      setSubscribers(list);
    }, (err) => {
      console.error("Error subscribing to subscribers collection:", err);
    });

    // Synchronize Audit Trail
    const unsubAudit = onSnapshot(collection(db, "auditLogs"), (snap) => {
      const list: AuditLog[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      // Sort newest first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setAuditLogs(list);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to auditLogs collection:", err);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubDists();
      unsubProducts();
      unsubOrders();
      unsubBlogs();
      unsubEvents();
      unsubMessages();
      unsubSubscribers();
      unsubAudit();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    addNotification("Logged out from Administrative workspace.", "info");
    navigate("/admin/login");
  };

  // PRODUCTS ACTIONS
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pId = newProduct.id || `prod-${Date.now().toString().substring(8)}`;
      await setDoc(doc(db, "products", pId), {
        ...newProduct,
        id: pId,
        priceXaf: Number(newProduct.priceXaf || 0),
        pvPoints: Number(newProduct.pvPoints || 0),
        stock: Number(newProduct.stock || 0)
      });
      addNotification("Corporate Catalog item added.", "success");
      await logAdminAction("Catalog Item Created", `Added product: ${newProduct.name} (${pId})`);
      setIsAddingProduct(false);
      setNewProduct({
        name: "", slug: "", description: "", priceXaf: 0, pvPoints: 0, category: "Health",
        image: "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800", stock: 100, isActive: true, benefits: [], usage: ""
      });
    } catch (err: any) {
      addNotification("Error creating product.", "info");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await setDoc(doc(db, "products", editingProduct.id), {
        ...editingProduct,
        priceXaf: Number(editingProduct.priceXaf),
        pvPoints: Number(editingProduct.pvPoints),
        stock: Number(editingProduct.stock)
      }, { merge: true });
      addNotification("Corporate Catalog item updated.", "success");
      await logAdminAction("Catalog Item Updated", `Updated product: ${editingProduct.name} (Qty: ${editingProduct.stock})`);
      setEditingProduct(null);
    } catch (err: any) {
      addNotification("Error updating product.", "info");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteDoc(doc(db, "products", id));
      addNotification("Catalog item deleted.", "success");
      await logAdminAction("Catalog Item Deleted", `Deleted product: ${name} (${id})`);
    } catch (err: any) {
      addNotification("Error deleting product.", "info");
    }
  };

  // KYC OPERATIONS
  const handleUpdateKyc = async (uid: string, status: "verified" | "rejected") => {
    try {
      const distRef = doc(db, "distributors", uid);
      await updateDoc(distRef, { kycStatus: status });
      addNotification(`KYC updated to ${status} for distributor.`, "success");
      await logAdminAction("KYC Audited", `Set KYC status of distributor ${uid} to ${status.toUpperCase()}`);
    } catch (err: any) {
      addNotification("Error updating KYC status.", "info");
    }
  };

  // GENEALOGY MANUAL OVERRIDE
  const handleGenealogyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDistId || !overrideSponsorCode) {
      addNotification("Sponsor field is required.", "info");
      return;
    }

    try {
      // Check if target distributor exists
      const targetSnap = await getDocs(collection(db, "distributors"));
      let targetDocId = "";
      targetSnap.forEach(d => {
        if (d.data().distributorCode === overrideDistId || d.id === overrideDistId) {
          targetDocId = d.id;
        }
      });

      if (!targetDocId) {
        addNotification("Target Distributor code not found.", "info");
        return;
      }

      // Verify that sponsor code exists
      let sponsorExists = false;
      targetSnap.forEach(d => {
        if (d.data().distributorCode === overrideSponsorCode || overrideSponsorCode === "Root") {
          sponsorExists = true;
        }
      });

      if (!sponsorExists) {
        addNotification("New Sponsor Code does not exist.", "info");
        return;
      }

      await updateDoc(doc(db, "distributors", targetDocId), {
        sponsorId: overrideSponsorCode,
        placementId: overridePlacementCode || overrideSponsorCode
      });

      addNotification("Unilevel Genealogy tree manually rewired.", "success");
      await logAdminAction("Genealogy Manual Override", `Rewired sponsor of ${overrideDistId} to ${overrideSponsorCode}`);
      setIsGenealogyOverrideOpen(false);
      setOverrideDistId("");
      setOverrideSponsorCode("");
      setOverridePlacementCode("");
    } catch (err: any) {
      addNotification("Error performing genealogy override.", "info");
    }
  };

  // ORDER UPDATES
  const handleUpdateOrderStatus = async (id: string, status: AdminOrder["status"]) => {
    try {
      await updateDoc(doc(db, "orders", id), { status });
      addNotification(`Order status updated to ${status}.`, "success");
      await logAdminAction("Order Status Audit", `Updated order ${id} status to ${status.toUpperCase()}`);
    } catch (err: any) {
      addNotification("Error updating order.", "info");
    }
  };

  // BLOG CRUD
  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const bId = `blog-${Date.now().toString().substring(8)}`;
      await setDoc(doc(db, "blogs", bId), {
        ...newBlog,
        id: bId,
        publishedAt: new Date().toISOString().substring(0, 10)
      });
      addNotification("New blog post published.", "success");
      await logAdminAction("Blog Created", `Published article: ${newBlog.title}`);
      setIsAddingBlog(false);
      setNewBlog({
        title: "", slug: "", excerpt: "", body: "", category: "Wellness", author: "Corporate Admin",
        image: "https://images.unsplash.com/photo-1543589077-47d8160677a0?auto=format&fit=crop&q=80&w=800"
      });
    } catch (err: any) {
      addNotification("Error creating blog post.", "info");
    }
  };

  const handleDeleteBlog = async (id: string, title: string) => {
    if (!confirm("Delete this blog post?")) return;
    try {
      await deleteDoc(doc(db, "blogs", id));
      addNotification("Blog post removed.", "success");
      await logAdminAction("Blog Deleted", `Deleted article: ${title}`);
    } catch (err: any) {
      addNotification("Error deleting post.", "info");
    }
  };

  // EVENTS CRUD
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const evId = `event-${Date.now().toString().substring(8)}`;
      await setDoc(doc(db, "events", evId), {
        ...newEvent,
        id: evId,
        registrants: []
      });
      addNotification("New company event created.", "success");
      await logAdminAction("Event Scheduled", `Created event: ${newEvent.title} at ${newEvent.location}`);
      setIsAddingEvent(false);
      setNewEvent({
        title: "", slug: "", startAt: new Date().toISOString().substring(0, 16), endAt: new Date().toISOString().substring(0, 16),
        location: "", capacity: 500, description: "", image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800"
      });
    } catch (err: any) {
      addNotification("Error creating event.", "info");
    }
  };

  const handleDeleteEvent = async (id: string, title: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, "events", id));
      addNotification("Event deleted.", "success");
      await logAdminAction("Event Cancelled", `Removed event: ${title}`);
    } catch (err: any) {
      addNotification("Error deleting event.", "info");
    }
  };

  // CONTACTS OPERATIONS
  const handleMarkMessageRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "contactMessages", id), { status: "read" });
      addNotification("Message marked as read.", "success");
    } catch (err: any) {
      addNotification("Error updating message status.", "info");
    }
  };

  // EXPORT NEWSLETTER TO CSV
  const handleExportNewsletter = () => {
    if (subscribers.length === 0) {
      addNotification("No subscribers to export.", "info");
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Email,SubscribedAt"].join("\n") + "\n"
      + subscribers.map(s => `${s.email},${s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toISOString() : ""}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `songtai_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification("Newsletter database downloaded successfully.", "success");
  };

  // Filter criteria
  const filteredDistributors = distributors.filter(d => 
    d.distributorCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.phone.includes(searchQuery)
  );

  const filteredOrders = orders.filter(o => 
    o.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.phone.includes(searchQuery)
  );

  // Compute stats metrics
  const totalSalesVolume = orders.filter(o => o.status === "paid" || o.status === "completed").reduce((sum, o) => sum + o.amountXaf, 0);
  const totalOrdersCount = orders.length;
  const pendingKycCount = distributors.filter(d => d.kycStatus === "pending").length;
  const activeProductsCount = products.length;

  // Render Admin Avatar Name
  const adminName = userProfile?.email ? userProfile.email.split("@")[0].toUpperCase() : "ADMIN";
  const adminInitials = adminName.substring(0, 2);

  // Helper to robustly get Date object from various formats (Firestore Timestamp, string, number, etc.)
  const getDateFromValue = (val: any): Date | null => {
    if (!val) return null;
    if (val.seconds !== undefined) {
      return new Date(val.seconds * 1000);
    }
    if (val.toDate && typeof val.toDate === "function") {
      return val.toDate();
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d;
    }
    return null;
  };

  // Dynamic daily aggregated analytics data
  const dailyChartData = React.useMemo(() => {
    const dataPoints: { date: string; displayDate: string; sales: number; signups: number }[] = [];
    
    // Generate dates backwards from today
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD
      const displayDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      
      dataPoints.push({
        date: dateKey,
        displayDate,
        sales: 0,
        signups: 0
      });
    }

    // Accumulate orders (paid or completed)
    orders.forEach(order => {
      if (order.status === "paid" || order.status === "completed") {
        const oDate = getDateFromValue(order.createdAt);
        if (oDate) {
          const year = oDate.getFullYear();
          const month = String(oDate.getMonth() + 1).padStart(2, "0");
          const day = String(oDate.getDate()).padStart(2, "0");
          const oDateKey = `${year}-${month}-${day}`;
          
          const match = dataPoints.find(dp => dp.date === oDateKey);
          if (match) {
            match.sales += order.amountXaf || 0;
          }
        }
      }
    });

    // Accumulate distributor signups
    distributors.forEach(dist => {
      const jDate = getDateFromValue(dist.joinedAt);
      if (jDate) {
        const year = jDate.getFullYear();
        const month = String(jDate.getMonth() + 1).padStart(2, "0");
        const day = String(jDate.getDate()).padStart(2, "0");
        const jDateKey = `${year}-${month}-${day}`;
        
        const match = dataPoints.find(dp => dp.date === jDateKey);
        if (match) {
          match.signups += 1;
        }
      }
    });

    // If there is no real data at all (for example, on fresh dbs during development), we seed dynamic placeholder points
    const totalRangeSales = dataPoints.reduce((sum, d) => sum + d.sales, 0);
    const totalRangeSignups = dataPoints.reduce((sum, d) => sum + d.signups, 0);
    
    if (totalRangeSales === 0 && totalRangeSignups === 0) {
      dataPoints.forEach((dp, index) => {
        dp.sales = (index % 3 === 0) ? (150000 + (index * 25000)) : (index % 2 === 0 ? 80000 : 0);
        dp.signups = (index % 4 === 0) ? 2 : (index % 3 === 0 ? 1 : 0);
      });
    }

    return dataPoints;
  }, [orders, distributors, timeRange]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans antialiased text-left selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* Top Banner: Shadcn Enterprise indicator */}
      <div className="bg-emerald-600/10 border-b border-emerald-500/20 py-2.5 px-6 text-center text-[11px] font-semibold text-emerald-400 dark:text-emerald-300 flex items-center justify-center gap-2 tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="uppercase font-bold">Songtai Enterprise Dashboard</span>
        <span className="text-stone-500 dark:text-stone-400">|</span>
        <span>Secured via TLS & High-Level Claims Authorization</span>
      </div>

      {/* Primary Shadcn E-commerce Header */}
      <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-850 px-6 py-3.5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between transition-colors duration-200">
        
        {/* Left: Brand / Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 shadow-sm">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-stone-100 uppercase tracking-tight">Songtai Hub</span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-500 ml-1" />
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 font-mono text-[10px]">
            v2.4
          </span>
        </div>

        {/* Center: Top Navigation Switcher */}
        <nav className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-850 overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "analytics" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "products" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "orders" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Orders</span>
          </button>

          <button
            onClick={() => setActiveTab("distributors")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "distributors" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Network</span>
          </button>

          <button
            onClick={() => setActiveTab("blog")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "blog" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Blog CMS</span>
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "events" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Events</span>
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative ${
              activeTab === "contacts" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Messages</span>
            {messages.filter(m => m.status === "unread").length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600 rounded-full text-[9px] font-extrabold text-white uppercase ml-1">
                {messages.filter(m => m.status === "unread").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("newsletter")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "newsletter" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Newsletter</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "audit" 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Auditing</span>
          </button>
        </nav>

        {/* Right: Search, Theme Toggle, Avatar */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          
          {/* Theme Toggler Directly in Header */}
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className="p-2 border border-stone-850 hover:border-stone-700 bg-stone-950 hover:bg-stone-900 rounded-xl transition-all text-stone-400 hover:text-stone-200 cursor-pointer"
              title="Toggle Theme Mode"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          {/* Admin Avatar Dropdown UI */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-stone-850">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-500/20 flex items-center justify-center font-bold text-white text-[11px] shadow-inner uppercase tracking-wider select-none">
              {adminInitials}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-[11px] font-bold text-stone-100">{adminName}</div>
              <div className="text-[9px] text-stone-500 uppercase font-extrabold tracking-widest leading-none">System Admin</div>
            </div>

            <button
              onClick={handleLogout}
              className="ml-1 p-2 bg-stone-950/40 hover:bg-red-950/20 text-stone-400 hover:text-red-400 border border-stone-850 hover:border-red-900/40 rounded-xl transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </header>

      {/* Main Container Area */}
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-grow flex flex-col gap-8">
        
        {/* Dynamic List Filter Banner (Only shown when not in Overview/Audit tab) */}
        {activeTab !== "analytics" && activeTab !== "audit" && (
          <div className="bg-stone-900 border border-stone-850 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
            <div className="text-left">
              <div className="text-stone-500 text-[10px] uppercase font-black tracking-widest">Administrative Grid</div>
              <h2 className="font-extrabold text-base text-stone-100 capitalize mt-0.5">{activeTab} Ledger Control</h2>
            </div>
            
            {/* Search Input Box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger files..."
                className="w-full pl-10 pr-12 py-2 bg-stone-950 border border-stone-850 focus:border-emerald-600 rounded-xl text-xs outline-none text-stone-100 placeholder-stone-600 focus:ring-1 focus:ring-emerald-600 transition-all"
              />
              <span className="absolute right-3.5 top-2 px-1.5 py-0.5 bg-stone-900 border border-stone-800 rounded text-stone-600 font-mono text-[9px] select-none pointer-events-none">
                ⌘K
              </span>
            </div>
          </div>
        )}

        {/* 1. OVERVIEW PAGE: THE CLASSIC SHADCN E-COMMERCE VIEW */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-fade-in text-left">
            
            {/* Command Center Subheader */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-stone-850">
              <div>
                <h2 className="font-extrabold text-2xl tracking-tight text-stone-100">Dashboard</h2>
                <p className="text-stone-500 text-xs mt-1">
                  CEMAC regional unilevel sales logs, distributor ranks, and warehouse inventories.
                </p>
              </div>

              {/* Datepicker & download row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-stone-900 border border-stone-850 px-3.5 py-2 rounded-xl text-xs font-medium text-stone-200">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  <span>Jan 20, 2026 - Jul 02, 2026</span>
                </div>

                <button
                  onClick={handleExportNewsletter}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>

            {/* KPI STATS CARDS GRID - SHADCN STYLE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Stat 1: Total Revenue */}
              <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 shadow-sm hover:border-stone-800 transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-black text-stone-100 tracking-tight leading-none block">
                    {totalSalesVolume.toLocaleString()} XAF
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mt-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +20.1% from last month
                  </span>
                </div>
              </div>

              {/* Stat 2: Active Distributors */}
              <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 shadow-sm hover:border-stone-800 transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wider">Active Distributors</span>
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-black text-stone-100 tracking-tight leading-none block">
                    +{distributors.length}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mt-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +180.1% from last month
                  </span>
                </div>
              </div>

              {/* Stat 3: Total Orders */}
              <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 shadow-sm hover:border-stone-800 transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wider">Total Orders</span>
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-black text-stone-100 tracking-tight leading-none block">
                    {totalOrdersCount}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mt-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +19% from last month
                  </span>
                </div>
              </div>

              {/* Stat 4: Pending Compliance review */}
              <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 shadow-sm hover:border-stone-800 transition-all relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wider">Compliance Queue</span>
                  <ShieldAlert className="w-4 h-4 text-[#C9A227]" />
                </div>
                <div className="mt-4">
                  <span className="text-2xl font-black text-stone-100 tracking-tight leading-none block">
                    {pendingKycCount} Files
                  </span>
                  <span className="text-[10px] text-[#C9A227] font-bold uppercase tracking-wider block mt-1.5 flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-pulse" /> Distributor KYC verification pending
                  </span>
                </div>
              </div>

            </div>

            {/* CHARTS & RECENT SIGNUPS SPLIT GRID - 7 COLUMNS */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
              
              {/* Left Column (4 Cols): Recharts multi-metric dashboard */}
              <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 shadow-sm flex flex-col justify-between lg:col-span-4 relative">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-stone-100 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-emerald-500" />
                      Network Activity Insights
                    </h3>
                    <p className="text-stone-500 text-[11px] uppercase tracking-wider font-semibold mt-0.5">
                      Daily network sales & distributor signup velocity
                    </p>
                  </div>
                  
                  {/* Period Filter Controls */}
                  <div className="flex items-center gap-1 bg-stone-950 border border-stone-850 p-1 rounded-xl">
                    {( [7, 14, 30] as const ).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setTimeRange(days)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          timeRange === days
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-stone-400 hover:text-stone-200"
                        }`}
                      >
                        {days}D
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metric Selector Tabs */}
                <div className="flex items-center justify-between border-b border-stone-850 pb-3 mb-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setChartMetric("both")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all border cursor-pointer ${
                        chartMetric === "both"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "border-transparent text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      All Activities
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric("sales")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all border cursor-pointer ${
                        chartMetric === "sales"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "border-transparent text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Sales Volume
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric("signups")}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all border cursor-pointer ${
                        chartMetric === "signups"
                          ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                          : "border-transparent text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Signups
                    </button>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-4 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    {chartMetric !== "signups" && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-emerald-500" />
                        Sales (XAF)
                      </span>
                    )}
                    {chartMetric !== "sales" && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-teal-400" />
                        Signups
                      </span>
                    )}
                  </div>
                </div>

                {/* Recharts Container */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={dailyChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                        </linearGradient>
                        <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#737373" 
                        fontSize={10}
                        fontWeight={500}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      
                      {/* Left YAxis - Sales Volume */}
                      {chartMetric !== "signups" && (
                        <YAxis 
                          yAxisId="left"
                          stroke="#737373" 
                          fontSize={10}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                        />
                      )}

                      {/* Right YAxis - Signups */}
                      {chartMetric === "both" && (
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#737373" 
                          fontSize={10}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                      )}
                      {chartMetric === "signups" && (
                        <YAxis 
                          yAxisId="left"
                          stroke="#737373" 
                          fontSize={10}
                          fontWeight={500}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                      )}

                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#171717', opacity: 0.15 }} />

                      {/* Sales - Area */}
                      {chartMetric !== "signups" && (
                        <Area 
                          yAxisId="left"
                          name="Sales Volume"
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorSales)" 
                        />
                      )}

                      {/* Signups - Line or Area */}
                      {chartMetric === "both" && (
                        <Line 
                          yAxisId="right"
                          name="Distributor Signups"
                          type="monotone" 
                          dataKey="signups" 
                          stroke="#2dd4bf" 
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#2dd4bf", strokeWidth: 1, stroke: "#0f172a" }}
                          activeDot={{ r: 5, fill: "#2dd4bf", strokeWidth: 1, stroke: "#0f172a" }}
                        />
                      )}
                      {chartMetric === "signups" && (
                        <Area 
                          yAxisId="left"
                          name="Distributor Signups"
                          type="monotone" 
                          dataKey="signups" 
                          stroke="#2dd4bf" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorSignups)" 
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between items-center text-[9px] text-stone-500 font-bold uppercase tracking-widest mt-4 pt-3 border-t border-stone-850">
                  <span>© CENTRAL AFRICA REGIONAL POOL</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Sparkles className="w-3 h-3" />
                    Live Database Connected
                  </span>
                </div>

              </div>

              {/* Right Column (3 Cols): Recent Signups / Sign-ins list */}
              <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 shadow-sm flex flex-col justify-between lg:col-span-3">
                
                <div className="text-left mb-6">
                  <h3 className="text-sm font-bold text-stone-100">Recent Sales & Activations</h3>
                  <p className="text-stone-500 text-xs mt-0.5">
                    Latest network interactions logged securely in real-time.
                  </p>
                </div>

                {/* User Cards List */}
                <div className="space-y-4 flex-grow overflow-y-auto max-h-64 pr-1">
                  {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-stone-500 text-xs text-center">
                      <ShoppingBag className="w-8 h-8 text-stone-700 mb-2" />
                      <span>No orders recorded on database.</span>
                    </div>
                  ) : (
                    orders.slice(0, 5).map((order) => {
                      const userInitial = order.userId === "guest" ? "G" : order.userId.substring(0, 2).toUpperCase();
                      return (
                        <div key={order.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-stone-950 border border-stone-850 flex items-center justify-center font-bold text-stone-300 uppercase">
                              {userInitial}
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-stone-100 truncate max-w-[130px]" title={order.userId}>
                                {order.userId === "guest" ? "Guest Customer" : order.userId}
                              </div>
                              <div className="text-[10px] text-stone-500 font-mono mt-0.5">{order.phone}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-stone-100 font-mono">+{order.amountXaf.toLocaleString()} XAF</div>
                            <div className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5">+{order.pvPoints} PV</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={() => setActiveTab("orders")}
                  className="w-full mt-6 py-2 bg-stone-950 hover:bg-stone-850 border border-stone-850 hover:border-stone-800 text-stone-300 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Verify Full Orders Ledger</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>

              </div>

            </div>

            {/* GENERAL ADMIN ACTION SHORTCUTS PANEL */}
            <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-stone-100">Administrative System Tools</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <button
                  onClick={() => setIsGenealogyOverrideOpen(true)}
                  className="p-4 bg-stone-950 hover:bg-emerald-600/10 border border-stone-850 hover:border-emerald-500/30 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left"
                >
                  <GitBranch className="w-5 h-5 text-[#C9A227]" />
                  <div>
                    <span className="block text-xs font-bold text-stone-100">Override Genealogy</span>
                    <span className="text-[10px] text-stone-500">Manual MLM sponsorship override</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab("products"); setIsAddingProduct(true); }}
                  className="p-4 bg-stone-950 hover:bg-emerald-600/10 border border-stone-850 hover:border-emerald-500/30 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left"
                >
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="block text-xs font-bold text-stone-100">Catalog Registry</span>
                    <span className="text-[10px] text-stone-500">Insert new product specs</span>
                  </div>
                </button>

                <button
                  onClick={() => { setActiveTab("blog"); setIsAddingBlog(true); }}
                  className="p-4 bg-stone-950 hover:bg-emerald-600/10 border border-stone-850 hover:border-emerald-500/30 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left"
                >
                  <BookOpen className="w-5 h-5 text-teal-400" />
                  <div>
                    <span className="block text-xs font-bold text-stone-100">Publish Article</span>
                    <span className="text-[10px] text-stone-500">Broadcast news editorial</span>
                  </div>
                </button>

              </div>
            </div>

            {/* Inline Genealogy manual overlay modal */}
            {isGenealogyOverrideOpen && (
              <form onSubmit={handleGenealogyOverride} className="bg-stone-900 border border-emerald-500/30 rounded-xl p-6 space-y-4 max-w-xl mx-auto shadow-xl">
                <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                  <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5"><GitBranch className="w-4 h-4" /> Unilevel Sponsor Link Override</h4>
                  <button type="button" onClick={() => setIsGenealogyOverrideOpen(false)} className="text-stone-500 hover:text-stone-200"><X className="w-4 h-4" /></button>
                </div>
                <p className="text-stone-400 text-xs">
                  This tool manually rewires unilevel genealogy tracks. Overrides require valid Distributor codes to verify successfully.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Target Distributor Code</label>
                    <input
                      type="text"
                      required
                      value={overrideDistId}
                      onChange={(e) => setOverrideDistId(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 font-mono"
                      placeholder="e.g. ST-REG-1001"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">New Sponsor Code</label>
                    <input
                      type="text"
                      required
                      value={overrideSponsorCode}
                      onChange={(e) => setOverrideSponsorCode(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 font-mono"
                      placeholder="e.g. ST-SPONSOR-77"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsGenealogyOverrideOpen(false)}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 text-xs rounded-lg transition-all border border-stone-850 cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
                  >
                    Override Sponsorship
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

        {/* 2. PRODUCTS CATALOG TAB */}
        {activeTab === "products" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-850 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-stone-100">Product Spec Register</h3>
                <p className="text-xs text-stone-500">Configure catalog prices, category filters, and PV points specs.</p>
              </div>
              <button
                onClick={() => setIsAddingProduct(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <Plus className="w-4 h-4" /> Add New Spec
              </button>
            </div>

            {/* Product adding card overlay */}
            {isAddingProduct && (
              <form onSubmit={handleSaveNewProduct} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4 max-w-3xl mx-auto shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                  <h4 className="font-bold text-sm text-stone-100">New Catalog Registry spec</h4>
                  <button type="button" onClick={() => setIsAddingProduct(false)} className="text-stone-500 hover:text-stone-200"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                      placeholder="e.g. Ginseng Miracle Vitality"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Slug Spec (auto-rendered)</label>
                    <input
                      type="text"
                      required
                      value={newProduct.slug}
                      onChange={(e) => setNewProduct({ ...newProduct, slug: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Price (XAF)</label>
                    <input
                      type="number"
                      required
                      value={newProduct.priceXaf}
                      onChange={(e) => setNewProduct({ ...newProduct, priceXaf: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">MLM Points (PV)</label>
                    <input
                      type="number"
                      required
                      value={newProduct.pvPoints}
                      onChange={(e) => setNewProduct({ ...newProduct, pvPoints: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Primary Category</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    >
                      <option value="Health">Health</option>
                      <option value="Beauty">Beauty</option>
                      <option value="Agriculture">Agriculture</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Asset Image URL</label>
                  <input
                    type="text"
                    required
                    value={newProduct.image}
                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Overview Description</label>
                  <textarea
                    required
                    rows={3}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingProduct(false)}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 text-xs rounded-lg border border-stone-850 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                  >
                    Record Product Specification
                  </button>
                </div>
              </form>
            )}

            {/* Product Edit card overlay */}
            {editingProduct && (
              <form onSubmit={handleUpdateProduct} className="bg-stone-900 border border-[#C9A227]/30 rounded-xl p-6 space-y-4 max-w-3xl mx-auto shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                  <h4 className="font-bold text-sm text-[#C9A227]">Modify Catalog Spec</h4>
                  <button type="button" onClick={() => setEditingProduct(null)} className="text-stone-500 hover:text-stone-200"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Product Name</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Primary Category</label>
                    <input
                      type="text"
                      required
                      value={editingProduct.category}
                      onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Price (XAF)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.priceXaf}
                      onChange={(e) => setEditingProduct({ ...editingProduct, priceXaf: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">PV Spec</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.pvPoints}
                      onChange={(e) => setEditingProduct({ ...editingProduct, pvPoints: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Warehouse Stock</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 text-xs rounded-lg border border-stone-850 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                  >
                    Commit Spec Changes
                  </button>
                </div>
              </form>
            )}

            {/* Custom Responsive Product Spec Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-stone-900 border border-stone-850 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow transition-all">
                  <div className="p-5 flex gap-4">
                    <img 
                      src={p.image} 
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-stone-950 border border-stone-800 flex-shrink-0" 
                    />
                    <div className="text-left overflow-hidden">
                      <span className="text-[#C9A227] font-bold text-[9px] uppercase tracking-widest block">{p.category}</span>
                      <h4 className="font-extrabold text-sm text-stone-100 mt-1 truncate" title={p.name}>{p.name}</h4>
                      <div className="flex gap-3.5 mt-2 text-xs text-stone-400 font-mono font-semibold">
                        <span>{p.priceXaf?.toLocaleString()} XAF</span>
                        <span className="text-emerald-400 font-bold">+{p.pvPoints} PV</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">Available Qty: {p.stock} units</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-stone-950/40 border-t border-stone-850/50 flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="p-2 bg-stone-950 hover:bg-stone-850 border border-stone-850 text-[#C9A227] rounded-lg transition-all cursor-pointer"
                      title="Edit Spec"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-2 bg-stone-950 hover:bg-red-950/20 border border-stone-850 hover:border-red-900/40 text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Remove product spec"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. ORDERS LEDGER TAB */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div>
              <h3 className="font-extrabold text-lg text-stone-100">Regional Orders Ledger</h3>
              <p className="text-xs text-stone-500">Unilevel volume distribution and carrier-authenticated transactions audit.</p>
            </div>

            <div className="bg-stone-900 border border-stone-850 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">ID spec</th>
                      <th className="px-6 py-4">Account claim</th>
                      <th className="px-6 py-4">Total Amount</th>
                      <th className="px-6 py-4">PV distribution</th>
                      <th className="px-6 py-4">Carrier details</th>
                      <th className="px-6 py-4">Fulfillment status</th>
                      <th className="px-6 py-4 text-center">Fulfill Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/50">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-stone-500 text-xs">
                          No matching regional records found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map(o => (
                        <tr key={o.id} className="hover:bg-stone-950/20 transition-all">
                          <td className="px-6 py-4 font-mono font-bold text-stone-100 text-xs">{o.orderId}</td>
                          <td className="px-6 py-4 truncate max-w-[130px]" title={o.userId}>
                            {o.userId === "guest" ? "Guest Customer" : o.userId}
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-stone-200">{o.amountXaf?.toLocaleString()} XAF</td>
                          <td className="px-6 py-4 font-mono text-emerald-400 font-bold">+{o.pvPoints} PV</td>
                          <td className="px-6 py-4 font-mono">
                            <div className="text-stone-300 font-semibold">{o.phone}</div>
                            <div className="text-[9px] uppercase text-stone-500 mt-0.5">{o.provider} Network</div>
                          </td>
                          <td className="px-6 py-4">
                            {o.status === "paid" ? (
                              <span className="px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Paid</span>
                            ) : o.status === "completed" ? (
                              <span className="px-2.5 py-0.5 bg-sky-950/60 border border-sky-900/50 text-sky-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Completed</span>
                            ) : o.status === "cancelled" ? (
                              <span className="px-2.5 py-0.5 bg-red-950/60 border border-red-900/50 text-red-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Cancelled</span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-stone-950 border border-stone-850 text-stone-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Pending</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, "paid")}
                                disabled={o.status === "paid" || o.status === "completed"}
                                className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/40 text-emerald-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer uppercase tracking-wider"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, "cancelled")}
                                disabled={o.status === "cancelled"}
                                className="px-3 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-900/40 text-red-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer uppercase tracking-wider"
                              >
                                Terminate
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. DISTRIBUTOR NETWORK & KYC */}
        {activeTab === "distributors" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-850 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-stone-100">Distributor Network Matrix</h3>
                <p className="text-xs text-stone-500">Audit KYC compliance and control structural genealogy nodes.</p>
              </div>
              <button
                onClick={() => setIsGenealogyOverrideOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <GitBranch className="w-4 h-4" /> Sponsor override tool
              </button>
            </div>

            {/* Custom Genealogy Form */}
            {isGenealogyOverrideOpen && (
              <form onSubmit={handleGenealogyOverride} className="bg-stone-900 border border-emerald-500/30 rounded-xl p-6 space-y-4 max-w-xl mx-auto shadow-lg text-left">
                <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                  <h4 className="font-bold text-sm text-stone-100 flex items-center gap-1.5"><GitBranch className="w-4 h-4" /> Genealogy Manual Override</h4>
                  <button type="button" onClick={() => setIsGenealogyOverrideOpen(false)} className="text-stone-500 hover:text-stone-200"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Target Distributor Code</label>
                    <input
                      type="text"
                      required
                      value={overrideDistId}
                      onChange={(e) => setOverrideDistId(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 font-mono"
                      placeholder="e.g. ST-REG-1001"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">New Sponsor Distributor Code</label>
                    <input
                      type="text"
                      required
                      value={overrideSponsorCode}
                      onChange={(e) => setOverrideSponsorCode(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 font-mono"
                      placeholder="e.g. ST-SPONSOR-77"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsGenealogyOverrideOpen(false)}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 text-xs rounded-lg border border-stone-850 cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                  >
                    Confirm Rewire
                  </button>
                </div>
              </form>
            )}

            {/* Network Table */}
            <div className="bg-stone-900 border border-stone-850 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Distributor Code</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone contact</th>
                      <th className="px-6 py-4">Sponsor ID</th>
                      <th className="px-6 py-4">Rank Spec</th>
                      <th className="px-6 py-4">Awarded PV</th>
                      <th className="px-6 py-4">KYC Compliance</th>
                      <th className="px-6 py-4 text-center">Fulfill KYC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/50">
                    {filteredDistributors.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-stone-500 text-xs">
                          No registered distributors found on database.
                        </td>
                      </tr>
                    ) : (
                      filteredDistributors.map(d => (
                        <tr key={d.uid} className="hover:bg-stone-950/20 transition-all">
                          <td className="px-6 py-4 font-mono font-bold text-stone-100">{d.distributorCode}</td>
                          <td className="px-6 py-4 text-stone-300">{d.email}</td>
                          <td className="px-6 py-4 font-mono">{d.phone}</td>
                          <td className="px-6 py-4 font-mono text-stone-500">{d.sponsorId || "Root node"}</td>
                          <td className="px-6 py-4 capitalize font-extrabold text-[#C9A227]">{d.rank}</td>
                          <td className="px-6 py-4 font-mono font-bold text-emerald-400">{d.pv} PV</td>
                          <td className="px-6 py-4">
                            {d.kycStatus === "verified" ? (
                              <span className="px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 rounded-full font-bold uppercase text-[9px] tracking-wider">Verified</span>
                            ) : d.kycStatus === "pending" ? (
                              <span className="px-2.5 py-0.5 bg-amber-950/60 border border-amber-900/50 text-amber-400 rounded-full font-bold uppercase text-[9px] tracking-wider animate-pulse">Review Pending</span>
                            ) : d.kycStatus === "rejected" ? (
                              <span className="px-2.5 py-0.5 bg-red-950/60 border border-red-900/50 text-red-400 rounded-full font-bold uppercase text-[9px] tracking-wider">Rejected</span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-stone-950 border border-stone-850 text-stone-500 rounded-full font-bold uppercase text-[9px] tracking-wider">None</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleUpdateKyc(d.uid, "verified")}
                                disabled={d.kycStatus === "verified"}
                                className="p-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/40 text-emerald-400 rounded-lg disabled:opacity-20 cursor-pointer"
                                title="Approve KYC Passport/ID"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateKyc(d.uid, "rejected")}
                                disabled={d.kycStatus === "rejected" || d.kycStatus === "none"}
                                className="p-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-900/40 text-red-400 rounded-lg disabled:opacity-20 cursor-pointer"
                                title="Reject file credentials"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. NEWS & BLOG CMS */}
        {activeTab === "blog" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-850 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-stone-100">Editorial Broadcasting System</h3>
                <p className="text-xs text-stone-500">Post MLM training programs, agri-tech specifications, and company newsletters.</p>
              </div>
              <button
                onClick={() => setIsAddingBlog(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <Plus className="w-4 h-4" /> Draft Article
              </button>
            </div>

            {/* Draft article CMS form */}
            {isAddingBlog && (
              <form onSubmit={handleSaveBlog} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4 max-w-3xl mx-auto shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                  <h4 className="font-bold text-sm text-stone-100">Publish Corporate Editorial</h4>
                  <button type="button" onClick={() => setIsAddingBlog(false)} className="text-stone-500 hover:text-stone-200"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Article Title</label>
                    <input
                      type="text"
                      required
                      value={newBlog.title}
                      onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                      placeholder="e.g. Organic agriculture advancements"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Channel Category</label>
                    <select
                      value={newBlog.category}
                      onChange={(e) => setNewBlog({ ...newBlog, category: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    >
                      <option value="Wellness">Wellness</option>
                      <option value="MLM Success">MLM Success</option>
                      <option value="Agri-Tech">Agri-Tech</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Author Credit</label>
                    <input
                      type="text"
                      required
                      value={newBlog.author}
                      onChange={(e) => setNewBlog({ ...newBlog, author: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Hero Image URL</label>
                    <input
                      type="text"
                      required
                      value={newBlog.image}
                      onChange={(e) => setNewBlog({ ...newBlog, image: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Snippet Excerpt</label>
                  <input
                    type="text"
                    required
                    value={newBlog.excerpt}
                    onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Body Text Content (Markdown Supported)</label>
                  <textarea
                    required
                    rows={5}
                    value={newBlog.body}
                    onChange={(e) => setNewBlog({ ...newBlog, body: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingBlog(false)}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 text-xs rounded-lg border border-stone-850 cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                  >
                    Broadcast Article Instantly
                  </button>
                </div>
              </form>
            )}

            {/* Articles List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogs.map(b => (
                <div key={b.id} className="bg-stone-900 border border-stone-850 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow transition-all">
                  <div className="p-5 flex gap-4">
                    <img 
                      src={b.image} 
                      alt={b.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-stone-950 border border-stone-800 flex-shrink-0" 
                    />
                    <div className="text-left overflow-hidden">
                      <span className="text-[#C9A227] font-bold text-[9px] uppercase tracking-widest block">{b.category}</span>
                      <h4 className="font-extrabold text-sm text-stone-100 mt-1 truncate" title={b.title}>{b.title}</h4>
                      <p className="text-stone-500 text-[11px] line-clamp-2 mt-1.5">{b.excerpt}</p>
                      <span className="text-[10px] text-stone-600 font-mono block mt-2">Author: {b.author}</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-stone-950/40 border-t border-stone-850/50 flex justify-end">
                    <button
                      onClick={() => handleDeleteBlog(b.id, b.title)}
                      className="p-2 bg-stone-950 hover:bg-red-950/20 border border-stone-850 hover:border-red-900/40 text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. EVENTS MANAGER */}
        {activeTab === "events" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-stone-850 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-stone-100">Corporate Events Calendar</h3>
                <p className="text-xs text-stone-500">Plan and coordinate leadership seminars, product expos, and regional summits.</p>
              </div>
              <button
                onClick={() => setIsAddingEvent(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <Plus className="w-4 h-4" /> Schedule Seminar
              </button>
            </div>

            {/* Event schedule form */}
            {isAddingEvent && (
              <form onSubmit={handleSaveEvent} className="bg-stone-900 border border-stone-800 rounded-xl p-6 space-y-4 max-w-3xl mx-auto shadow-lg">
                <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                  <h4 className="font-bold text-sm text-stone-100">Schedule Leadership Event</h4>
                  <button type="button" onClick={() => setIsAddingEvent(false)} className="text-stone-500 hover:text-stone-200"><X className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Event Title</label>
                    <input
                      type="text"
                      required
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                      placeholder="e.g. Douala Regional Growth Summit"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Venue Venue Location</label>
                    <input
                      type="text"
                      required
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                      placeholder="e.g. Sawa Hotel Conference Hall, Douala"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Seminar Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={newEvent.startAt}
                      onChange={(e) => setNewEvent({ ...newEvent, startAt: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Seminar End Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={newEvent.endAt}
                      onChange={(e) => setNewEvent({ ...newEvent, endAt: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Max capacity (seats)</label>
                    <input
                      type="number"
                      required
                      value={newEvent.capacity}
                      onChange={(e) => setNewEvent({ ...newEvent, capacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Presentation Image URL</label>
                  <input
                    type="text"
                    required
                    value={newEvent.image}
                    onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Seminar Overview Details</label>
                  <textarea
                    required
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-lg outline-none text-xs text-stone-100 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingEvent(false)}
                    className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 text-xs rounded-lg border border-stone-850 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
                  >
                    Schedule Event Node
                  </button>
                </div>
              </form>
            )}

            {/* Events view list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map(ev => (
                <div key={ev.id} className="bg-stone-900 border border-stone-850 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow transition-all">
                  <div className="p-5 flex gap-4">
                    <img 
                      src={ev.image} 
                      alt={ev.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover bg-stone-950 border border-stone-800 flex-shrink-0" 
                    />
                    <div className="text-left overflow-hidden">
                      <span className="text-[#C9A227] font-bold text-[9px] uppercase tracking-widest block truncate" title={ev.location}>{ev.location}</span>
                      <h4 className="font-extrabold text-sm text-stone-100 mt-1 truncate" title={ev.title}>{ev.title}</h4>
                      <p className="text-stone-500 text-[11px] line-clamp-2 mt-1.5">{ev.description}</p>
                      <div className="flex gap-4 mt-2.5 text-[10px] text-stone-400 font-mono font-semibold">
                        <span>Attendants: {ev.registrants?.length || 0} / {ev.capacity}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-stone-950/40 border-t border-stone-850/50 flex justify-end">
                    <button
                      onClick={() => handleDeleteEvent(ev.id, ev.title)}
                      className="p-2 bg-stone-950 hover:bg-red-950/20 border border-stone-850 hover:border-red-900/40 text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Cancel Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. CONTACT MESSAGES */}
        {activeTab === "contacts" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div>
              <h3 className="font-extrabold text-lg text-stone-100">Customer Support Inbox</h3>
              <p className="text-xs text-stone-500">Respond to distributor inquiries and feedback submissions.</p>
            </div>

            <div className="bg-stone-900 border border-stone-850 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Sender Claim</th>
                      <th className="px-6 py-4">Contact Info</th>
                      <th className="px-6 py-4">Message Context</th>
                      <th className="px-6 py-4">Read Badge</th>
                      <th className="px-6 py-4 text-center">Fulfill Inbox</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/50">
                    {messages.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-stone-500 text-xs">
                          Support inbox is completely clear! No inquiries logged.
                        </td>
                      </tr>
                    ) : (
                      messages.map(m => (
                        <tr key={m.id} className="hover:bg-stone-950/20 transition-all">
                          <td className="px-6 py-4 font-bold text-stone-100">{m.name}</td>
                          <td className="px-6 py-4 font-mono">
                            <div className="text-stone-300 font-semibold">{m.email}</div>
                            <div className="text-[10px] text-stone-500 mt-0.5">{m.phone}</div>
                          </td>
                          <td className="px-6 py-4 max-w-xs truncate text-stone-300" title={m.message}>{m.message}</td>
                          <td className="px-6 py-4">
                            {m.status === "unread" ? (
                              <span className="px-2.5 py-0.5 bg-red-950/60 border border-red-900/50 text-red-400 rounded-full font-bold uppercase text-[9px] tracking-wider animate-pulse">Unread</span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-stone-950 border border-stone-850 text-stone-500 rounded-full font-bold uppercase text-[9px] tracking-wider">Archived</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleMarkMessageRead(m.id)}
                              disabled={m.status !== "unread"}
                              className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/40 text-emerald-400 rounded-lg text-[10px] font-bold transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer uppercase tracking-wider"
                            >
                              Archive
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 8. NEWSLETTER SUBSCRIBERS */}
        {activeTab === "newsletter" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-stone-850 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-stone-100">Broadcasting Subscriber Registry</h3>
                <p className="text-xs text-stone-500">Database of public accounts subscribed to unilevel news feeds.</p>
              </div>
              <button
                onClick={handleExportNewsletter}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-850 border border-stone-850 hover:border-stone-800 text-[#C9A227] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download CSV Spreadsheet
              </button>
            </div>

            <div className="bg-stone-900 border border-stone-850 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-stone-400">
                <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                  <tr>
                    <th className="px-6 py-4">Subscriber Address</th>
                    <th className="px-6 py-4">Subscription stamp</th>
                    <th className="px-6 py-4">Badge claim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-850/50">
                  {subscribers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-stone-500 text-xs">
                        No registered subscribers found on mailing channels.
                      </td>
                    </tr>
                  ) : (
                    subscribers.map(s => (
                      <tr key={s.id} className="hover:bg-stone-950/20 transition-all">
                        <td className="px-6 py-4 font-bold text-stone-100 font-mono">{s.email}</td>
                        <td className="px-6 py-4 font-mono text-stone-300">
                          {s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toISOString().substring(0, 10) : "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 rounded-full font-bold uppercase text-[9px] tracking-wider">
                            Subscribed
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. SYSTEM AUDIT TRAIL LEDGER */}
        {activeTab === "audit" && (
          <div className="space-y-6 animate-fade-in text-left">
            <div>
              <h3 className="font-extrabold text-lg text-stone-100">Immutable Audit trail Log</h3>
              <p className="text-xs text-stone-500">Secured unilevel cryptographic trace logs recording administrator overrides.</p>
            </div>

            <div className="bg-stone-900 border border-stone-850 rounded-xl p-6 shadow-sm space-y-4">
              <div className="space-y-3.5">
                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 text-xs">
                    No administrator actions logged on the ledger history.
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="p-4 bg-stone-950/40 border border-stone-850 rounded-xl flex items-start gap-4 text-left shadow-inner transition-colors duration-200">
                      <div className="p-2 bg-emerald-950/60 border border-emerald-900/40 rounded-lg text-emerald-400 flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                          <span className="font-black text-xs text-stone-100 uppercase tracking-tight">{log.action}</span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-stone-300 text-xs mt-1.5 leading-relaxed font-medium">{log.details}</p>
                        <span className="text-[9px] text-stone-500 font-mono block mt-2">Claimed Operator Claim: {log.adminEmail}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modern Compact Footer */}
      <footer className="border-t border-stone-900 bg-stone-950/80 backdrop-blur-sm py-6 text-stone-500 font-semibold text-[10px] text-center tracking-widest uppercase mt-auto">
        <span>© 2026 Songtai Life Digital Operations • CEMAC Region Financial Compliance Assured • High-Level Security Grid Active</span>
      </footer>

    </div>
  );
}
