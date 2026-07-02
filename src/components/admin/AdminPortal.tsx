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
  X, GitBranch, ArrowUpRight, BarChart3, ChevronRight, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export default function AdminPortal({ addNotification }: { addNotification: any }) {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "products" | "orders" | "distributors" | "blog" | "events" | "contacts" | "newsletter" | "audit"
  >("analytics");

  const { logout, userProfile, user } = useAuth();
  const navigate = useNavigate();

  // Unified States
  const [distributors, setDistributors] = useState<AdminDistributor[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Genealogy Override override state
  const [overrideDistId, setOverrideDistId] = useState("");
  const [overrideSponsorCode, setOverrideSponsorCode] = useState("");
  const [overridePlacementCode, setOverridePlacementCode] = useState("");
  const [isGenealogyOverrideOpen, setIsGenealogyOverrideOpen] = useState(false);

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

    // Synchronize Users & Distributors
    const unsubUsers = onSnapshot(collection(db, "users"), (usersSnap) => {
      const usersMap: Record<string, any> = {};
      usersSnap.forEach(uDoc => {
        usersMap[uDoc.id] = uDoc.data();
      });

      const unsubDists = onSnapshot(collection(db, "distributors"), (distsSnap) => {
        const list: AdminDistributor[] = [];
        distsSnap.forEach(dDoc => {
          const uid = dDoc.id;
          const distData = dDoc.data();
          const userData = usersMap[uid] || {};

          list.push({
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
          });
        });
        setDistributors(list);
      });

      return () => unsubDists();
    });

    // Synchronize Products
    const unsubProducts = onSnapshot(collection(db, "products"), (snap) => {
      const list: AdminProduct[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as AdminProduct);
      });
      setProducts(list);
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
    });

    // Synchronize Blogs
    const unsubBlogs = onSnapshot(collection(db, "blogs"), (snap) => {
      const list: BlogPost[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as BlogPost);
      });
      setBlogs(list);
    });

    // Synchronize Events
    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      const list: CompanyEvent[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as CompanyEvent);
      });
      setEvents(list);
    });

    // Synchronize Messages
    const unsubMessages = onSnapshot(collection(db, "contactMessages"), (snap) => {
      const list: ContactMessage[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as ContactMessage);
      });
      setMessages(list);
    });

    // Synchronize Subscribers
    const unsubSubscribers = onSnapshot(collection(db, "subscribers"), (snap) => {
      const list: NewsletterSubscriber[] = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as NewsletterSubscriber);
      });
      setSubscribers(list);
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
    });

    return () => {
      unsubUsers();
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

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none antialiased text-left">
      {/* Top Auditing Status */}
      <div className="bg-amber-600/10 border-b border-amber-500/25 py-2.5 px-6 text-center text-xs font-bold text-amber-400 flex items-center justify-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        SECURE ENTERPRISE AUDIT CONSOLE ACTIVE • HIGH-LEVEL CREDENTIAL CLAIMS ENGAGED
      </div>

      {/* Corporate Header */}
      <header className="sticky top-0 z-40 bg-stone-900/80 backdrop-blur-md border-b border-stone-850 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-[#C9A227]" />
          <div>
            <h1 className="font-sans font-black text-lg sm:text-xl text-white tracking-tight uppercase">Songtai Corporate Hub</h1>
            <p className="text-stone-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">CEMAC Executive Audit Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block px-3 py-1 bg-[#0A7D32]/10 border border-[#0A7D32]/20 rounded-full text-[#0A7D32] text-[10px] font-bold uppercase tracking-wider">
            Admin Workspace
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-stone-800 hover:border-red-950 text-stone-400 hover:text-red-400 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-stone-950/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Multi-Tab Core View Layout */}
      <div className="flex-grow flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        
        {/* Sidebar Nav */}
        <aside className="lg:w-64 flex-shrink-0 flex flex-col gap-1 bg-stone-900/40 border border-stone-850 rounded-[28px] p-4 h-fit">
          <span className="text-stone-600 text-[10px] uppercase font-bold tracking-widest px-3 mb-2 block">Departments</span>
          
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "analytics" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "products" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Products Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "orders" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Orders Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab("distributors")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "distributors" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Distributor Network</span>
          </button>

          <button
            onClick={() => setActiveTab("blog")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "blog" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>News & Blog CMS</span>
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "events" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Events Manager</span>
          </button>

          <button
            onClick={() => setActiveTab("contacts")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
              activeTab === "contacts" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Contact Messages</span>
            {messages.filter(m => m.status === "unread").length > 0 && (
              <span className="absolute right-3 px-1.5 py-0.5 bg-red-600 rounded-full text-[9px] font-bold text-white uppercase">
                {messages.filter(m => m.status === "unread").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("newsletter")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "newsletter" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Newsletter List</span>
          </button>

          <div className="border-t border-stone-850/60 my-2" />

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "audit" ? "bg-[#0A7D32]/15 text-[#C9A227] border border-[#0A7D32]/20" : "text-stone-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail Ledger</span>
          </button>
        </aside>

        {/* Content Panel Area */}
        <main className="flex-grow space-y-6">

          {/* Search box for dynamic lists */}
          {activeTab !== "analytics" && activeTab !== "audit" && (
            <div className="bg-stone-900 border border-stone-850 rounded-[24px] p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-left">
                <h2 className="font-bold text-sm text-white capitalize">{activeTab} Administration</h2>
                <p className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Search records globally inside this list</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-stone-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full pl-10 pr-4 py-2 bg-stone-950 border border-stone-850 focus:border-[#C9A227] rounded-xl text-xs outline-none text-white placeholder-stone-700"
                />
              </div>
            </div>
          )}

          {/* TAB CONTENT: EXECUTIVE OVERVIEW */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* KPI metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-stone-900 border border-stone-850 rounded-[24px] p-6 text-left relative overflow-hidden">
                  <div className="absolute right-4 top-4 p-2 bg-[#0A7D32]/10 rounded-full text-[#0A7D32]">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-stone-400 text-xs font-semibold uppercase block">Total Sales Revenue</span>
                  <span className="block text-2xl font-black text-white mt-2">{totalSalesVolume.toLocaleString()} XAF</span>
                  <p className="text-[9px] text-stone-500 mt-2 uppercase font-bold">Paid orders only</p>
                </div>

                <div className="bg-stone-900 border border-stone-850 rounded-[24px] p-6 text-left relative overflow-hidden">
                  <div className="absolute right-4 top-4 p-2 bg-amber-500/10 rounded-full text-amber-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-stone-400 text-xs font-semibold uppercase block">Total Orders Logged</span>
                  <span className="block text-2xl font-black text-white mt-2">{totalOrdersCount}</span>
                  <p className="text-[9px] text-stone-500 mt-2 uppercase font-bold">Unilevel activity tracking</p>
                </div>

                <div className="bg-stone-900 border border-stone-850 rounded-[24px] p-6 text-left relative overflow-hidden">
                  <div className="absolute right-4 top-4 p-2 bg-amber-600/10 rounded-full text-amber-500">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <span className="text-stone-400 text-xs font-semibold uppercase block">Pending KYC Files</span>
                  <span className="block text-2xl font-black text-amber-400 mt-2">{pendingKycCount}</span>
                  <p className="text-[9px] text-stone-500 mt-2 uppercase font-bold">Distributor compliance queue</p>
                </div>

                <div className="bg-stone-900 border border-stone-850 rounded-[24px] p-6 text-left relative overflow-hidden">
                  <div className="absolute right-4 top-4 p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-stone-400 text-xs font-semibold uppercase block">Catalog Assets</span>
                  <span className="block text-2xl font-black text-emerald-400 mt-2">{activeProductsCount}</span>
                  <p className="text-[9px] text-stone-500 mt-2 uppercase font-bold">Active product nodes</p>
                </div>
              </div>

              {/* Premium Custom SVG Chart for Sales Volume */}
              <div className="bg-stone-900 border border-stone-850 rounded-[32px] p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-sans font-bold text-base text-white">Daily Network Sales Volume</h3>
                    <p className="text-stone-500 text-xs mt-0.5">Corporate transaction trends for Cameroon & central regions</p>
                  </div>
                  <span className="text-[10px] bg-[#C9A227]/10 border border-[#C9A227]/25 text-[#C9A227] px-2.5 py-1 rounded-full uppercase font-bold tracking-widest">
                    Real-time
                  </span>
                </div>

                {/* SVG Line Graph */}
                <div className="h-64 flex items-end relative pt-4">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="border-t border-dashed border-stone-400 w-full" />
                    ))}
                  </div>

                  {/* SVG Canvas for Chart path */}
                  <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0A7D32" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#0A7D32" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0 130 C 50 110, 100 80, 150 95 C 200 110, 250 50, 300 65 C 350 80, 400 30, 450 45 C 475 52, 500 20, 500 20 L 500 150 L 0 150 Z"
                      fill="url(#chartGradient)"
                    />
                    <path
                      d="M 0 130 C 50 110, 100 80, 150 95 C 200 110, 250 50, 300 65 C 350 80, 400 30, 450 45 C 475 52, 500 20, 500 20"
                      fill="none"
                      stroke="#0A7D32"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-stone-500 font-bold uppercase mt-4">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>

              {/* General Admin Quick Actions */}
              <div className="bg-stone-900 border border-stone-850 rounded-[32px] p-6 space-y-4">
                <h3 className="font-sans font-bold text-sm text-white">Administrative Controls</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setIsGenealogyOverrideOpen(true)}
                    className="p-4 bg-stone-950 hover:bg-[#0A7D32]/10 border border-stone-850 hover:border-[#0A7D32]/40 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left"
                  >
                    <GitBranch className="w-5 h-5 text-emerald-500" />
                    <div>
                      <span className="block text-xs font-bold text-white">Override Genealogy</span>
                      <span className="text-[10px] text-stone-500">Rewire MLM Sponsor lines</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveTab("products"); setIsAddingProduct(true); }}
                    className="p-4 bg-stone-950 hover:bg-[#0A7D32]/10 border border-stone-850 hover:border-[#0A7D32]/40 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left"
                  >
                    <Plus className="w-5 h-5 text-[#C9A227]" />
                    <div>
                      <span className="block text-xs font-bold text-white">Create Product</span>
                      <span className="text-[10px] text-stone-500">Add to corporate catalog</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { setActiveTab("blog"); setIsAddingBlog(true); }}
                    className="p-4 bg-stone-950 hover:bg-[#0A7D32]/10 border border-stone-850 hover:border-[#0A7D32]/40 rounded-2xl flex items-center gap-3 transition-all cursor-pointer text-left"
                  >
                    <BookOpen className="w-5 h-5 text-sky-400" />
                    <div>
                      <span className="block text-xs font-bold text-white">Publish Article</span>
                      <span className="text-[10px] text-stone-500">Post news on public site</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: PRODUCTS CRUD */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-500 uppercase font-semibold">Active Catalog Items</span>
                <button
                  onClick={() => setIsAddingProduct(true)}
                  className="px-4 py-2 bg-[#0A7D32] hover:bg-[#00531d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Product
                </button>
              </div>

              {/* Add Product Form Modal */}
              {isAddingProduct && (
                <form onSubmit={handleSaveNewProduct} className="bg-stone-900 border border-stone-800 rounded-[32px] p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                    <h4 className="font-bold text-sm text-white">New Product Form</h4>
                    <button type="button" onClick={() => setIsAddingProduct(false)} className="text-stone-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Product Name</label>
                      <input
                        type="text"
                        required
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                        placeholder="e.g. Aloe Rejuvenate"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Slug (auto-generated)</label>
                      <input
                        type="text"
                        required
                        value={newProduct.slug}
                        onChange={(e) => setNewProduct({ ...newProduct, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
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
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">MLM Volume (PV)</label>
                      <input
                        type="number"
                        required
                        value={newProduct.pvPoints}
                        onChange={(e) => setNewProduct({ ...newProduct, pvPoints: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Category</label>
                      <select
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className="w-full px-3 py-2.5 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-stone-200"
                      >
                        <option value="Health">Health</option>
                        <option value="Beauty">Beauty</option>
                        <option value="Agriculture">Agriculture</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Image URL</label>
                    <input
                      type="text"
                      required
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Product Description</label>
                    <textarea
                      required
                      rows={3}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0A7D32] hover:bg-[#00531d] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Save Product to Ledger
                  </button>
                </form>
              )}

              {/* Edit Product Modal */}
              {editingProduct && (
                <form onSubmit={handleUpdateProduct} className="bg-stone-900 border border-[#C9A227]/30 rounded-[32px] p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                    <h4 className="font-bold text-sm text-[#C9A227]">Edit Catalog Asset</h4>
                    <button type="button" onClick={() => setEditingProduct(null)} className="text-stone-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Product Name</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Category</label>
                      <input
                        type="text"
                        required
                        value={editingProduct.category}
                        onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
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
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">PV Points</label>
                      <input
                        type="number"
                        required
                        value={editingProduct.pvPoints}
                        onChange={(e) => setEditingProduct({ ...editingProduct, pvPoints: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Warehouse Stock</label>
                      <input
                        type="number"
                        required
                        value={editingProduct.stock}
                        onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#C9A227] hover:bg-[#b08d1f] text-stone-950 rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Save Changes
                  </button>
                </form>
              )}

              {/* Products List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map(p => (
                  <div key={p.id} className="bg-stone-900 border border-stone-850 rounded-[28px] overflow-hidden flex flex-col justify-between">
                    <div className="p-5 flex gap-4">
                      <img src={p.image} className="w-20 h-20 rounded-2xl object-cover bg-stone-950 border border-stone-800" />
                      <div>
                        <span className="text-[#C9A227] font-bold text-[9px] uppercase tracking-widest">{p.category}</span>
                        <h4 className="font-sans font-extrabold text-sm text-white mt-1">{p.name}</h4>
                        <div className="flex gap-4 mt-2.5 text-[11px] text-stone-400 font-mono">
                          <span>{p.priceXaf?.toLocaleString()} XAF</span>
                          <span className="text-emerald-400 font-bold">+{p.pvPoints} PV</span>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono block mt-1">Stock Qty: {p.stock}</span>
                      </div>
                    </div>
                    <div className="px-5 pb-5 pt-3 border-t border-stone-850/60 flex justify-end gap-2 bg-stone-950/20">
                      <button
                        onClick={() => setEditingProduct(p)}
                        className="p-2 bg-stone-950 hover:bg-stone-800 border border-stone-850 text-[#C9A227] rounded-xl transition-all cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-2 bg-stone-950 hover:bg-red-950/20 border border-stone-850 hover:border-red-900 text-red-400 rounded-xl transition-all cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: ORDERS LEDGER */}
          {activeTab === "orders" && (
            <div className="bg-stone-900 border border-stone-850 rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">PV Points</th>
                      <th className="px-6 py-4">Phone / carrier</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/60">
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-stone-950/40 transition-all">
                        <td className="px-6 py-4 font-mono font-bold text-white text-xs">{o.orderId}</td>
                        <td className="px-6 py-4 truncate max-w-[120px]" title={o.userId}>{o.userId === "guest" ? "Guest Customer" : o.userId}</td>
                        <td className="px-6 py-4 font-mono font-semibold">{o.amountXaf?.toLocaleString()} XAF</td>
                        <td className="px-6 py-4 font-mono text-[#C9A227] font-bold">+{o.pvPoints} PV</td>
                        <td className="px-6 py-4 font-mono">
                          <div>{o.phone}</div>
                          <div className="text-[9px] uppercase text-stone-500 mt-0.5">{o.provider}</div>
                        </td>
                        <td className="px-6 py-4">
                          {o.status === "paid" ? (
                            <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Paid</span>
                          ) : o.status === "completed" ? (
                            <span className="px-2 py-0.5 bg-sky-950/40 border border-sky-900/40 text-sky-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Completed</span>
                          ) : o.status === "cancelled" ? (
                            <span className="px-2 py-0.5 bg-red-950/40 border border-red-900/40 text-red-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Cancelled</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-stone-950 border border-stone-800 text-stone-400 rounded-full text-[9px] font-bold uppercase tracking-wider">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "paid")}
                              disabled={o.status === "paid" || o.status === "completed"}
                              className="px-2.5 py-1 bg-emerald-950/20 hover:bg-emerald-900/40 border border-emerald-900/30 text-emerald-400 rounded-lg text-[9px] font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer uppercase"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, "cancelled")}
                              disabled={o.status === "cancelled"}
                              className="px-2.5 py-1 bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 rounded-lg text-[9px] font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: DISTRIBUTORS & KYC & GENEALOGY */}
          {activeTab === "distributors" && (
            <div className="space-y-6">
              {/* KYC and Tree tools row */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-stone-900 border border-stone-850 p-5 rounded-[28px]">
                <div>
                  <h3 className="font-bold text-sm text-white">Tree Genealogy & Security Options</h3>
                  <p className="text-stone-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">Control unilevel sponsorship connections</p>
                </div>
                <button
                  onClick={() => setIsGenealogyOverrideOpen(true)}
                  className="px-4 py-2 bg-[#C9A227] hover:bg-[#b08d1f] text-stone-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <GitBranch className="w-4 h-4" /> Genealogy Override Tool
                </button>
              </div>

              {/* Genealogy Override Form */}
              {isGenealogyOverrideOpen && (
                <form onSubmit={handleGenealogyOverride} className="bg-stone-900 border border-[#C9A227]/30 rounded-[32px] p-6 space-y-4 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                    <h4 className="font-bold text-sm text-[#C9A227] flex items-center gap-1.5"><GitBranch className="w-4 h-4" /> Rewire Distributor Sponsor</h4>
                    <button type="button" onClick={() => setIsGenealogyOverrideOpen(false)} className="text-stone-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                  <p className="text-stone-400 text-[11px]">
                    Admins can manually override structural links. Specify the target distributor code and the new sponsor's code.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Target Distributor Code</label>
                      <input
                        type="text"
                        required
                        value={overrideDistId}
                        onChange={(e) => setOverrideDistId(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white font-mono"
                        placeholder="e.g. ST-REG-1234"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">New Sponsor Distributor Code</label>
                      <input
                        type="text"
                        required
                        value={overrideSponsorCode}
                        onChange={(e) => setOverrideSponsorCode(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white font-mono"
                        placeholder="e.g. ST-ELENA-88"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#C9A227] hover:bg-[#b08d1f] text-stone-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Confirm Structural Rewiring
                  </button>
                </form>
              )}

              {/* Roster list */}
              <div className="bg-stone-900 border border-stone-850 rounded-[32px] overflow-hidden">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Distributor Code</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Sponsor</th>
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">PV</th>
                      <th className="px-6 py-4">KYC Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/60">
                    {filteredDistributors.map(d => (
                      <tr key={d.uid} className="hover:bg-stone-950/40 transition-all">
                        <td className="px-6 py-4 font-mono font-bold text-white">{d.distributorCode}</td>
                        <td className="px-6 py-4">{d.email}</td>
                        <td className="px-6 py-4 font-mono">{d.phone}</td>
                        <td className="px-6 py-4 font-mono text-stone-500">{d.sponsorId || "Root"}</td>
                        <td className="px-6 py-4 capitalize font-extrabold text-[#C9A227]">{d.rank}</td>
                        <td className="px-6 py-4 font-mono font-bold">{d.pv} PV</td>
                        <td className="px-6 py-4">
                          {d.kycStatus === "verified" ? (
                            <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 rounded-full font-bold uppercase text-[9px] tracking-wider">Verified</span>
                          ) : d.kycStatus === "pending" ? (
                            <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-900/40 text-amber-400 rounded-full font-bold uppercase text-[9px] tracking-wider animate-pulse">Pending Review</span>
                          ) : d.kycStatus === "rejected" ? (
                            <span className="px-2 py-0.5 bg-red-950/40 border border-red-900/40 text-red-400 rounded-full font-bold uppercase text-[9px] tracking-wider">Rejected</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-stone-950 border border-stone-850 text-stone-500 rounded-full font-bold uppercase text-[9px] tracking-wider">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleUpdateKyc(d.uid, "verified")}
                              disabled={d.kycStatus === "verified"}
                              className="p-1.5 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/30 text-emerald-400 rounded-lg disabled:opacity-30 cursor-pointer"
                              title="Verify Passport/ID document"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateKyc(d.uid, "rejected")}
                              disabled={d.kycStatus === "rejected" || d.kycStatus === "none"}
                              className="p-1.5 bg-red-950/30 hover:bg-red-900/40 border border-red-900/30 text-red-400 rounded-lg disabled:opacity-30 cursor-pointer"
                              title="Reject Verification"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: BLOG CMS */}
          {activeTab === "blog" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-500 uppercase font-semibold">Published Editorial Articles</span>
                <button
                  onClick={() => setIsAddingBlog(true)}
                  className="px-4 py-2 bg-[#0A7D32] hover:bg-[#00531d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Article
                </button>
              </div>

              {/* Add Blog Form */}
              {isAddingBlog && (
                <form onSubmit={handleSaveBlog} className="bg-stone-900 border border-stone-800 rounded-[32px] p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                    <h4 className="font-bold text-sm text-white">New Editorial Article</h4>
                    <button type="button" onClick={() => setIsAddingBlog(false)} className="text-stone-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Article Title</label>
                      <input
                        type="text"
                        required
                        value={newBlog.title}
                        onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                        placeholder="e.g. Healing Properties of Organic Teas"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Category</label>
                      <select
                        value={newBlog.category}
                        onChange={(e) => setNewBlog({ ...newBlog, category: e.target.value })}
                        className="w-full px-3 py-2.5 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-stone-200"
                      >
                        <option value="Wellness">Wellness</option>
                        <option value="MLM Success">MLM Success</option>
                        <option value="Agri-Tech">Agri-Tech</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Author Name</label>
                      <input
                        type="text"
                        required
                        value={newBlog.author}
                        onChange={(e) => setNewBlog({ ...newBlog, author: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Image URL</label>
                      <input
                        type="text"
                        required
                        value={newBlog.image}
                        onChange={(e) => setNewBlog({ ...newBlog, image: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Article Excerpt</label>
                    <input
                      type="text"
                      required
                      value={newBlog.excerpt}
                      onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Article Body Content (Markdown supported)</label>
                    <textarea
                      required
                      rows={6}
                      value={newBlog.body}
                      onChange={(e) => setNewBlog({ ...newBlog, body: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0A7D32] hover:bg-[#00531d] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Publish Article instantly
                  </button>
                </form>
              )}

              {/* Blog articles list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {blogs.map(b => (
                  <div key={b.id} className="bg-stone-900 border border-stone-850 rounded-[28px] overflow-hidden flex flex-col justify-between">
                    <div className="p-5 flex gap-4">
                      <img src={b.image} className="w-20 h-20 rounded-2xl object-cover bg-stone-950 border border-stone-800" />
                      <div>
                        <span className="text-[#C9A227] font-bold text-[9px] uppercase tracking-widest">{b.category}</span>
                        <h4 className="font-sans font-extrabold text-sm text-white mt-1 line-clamp-1">{b.title}</h4>
                        <p className="text-stone-500 text-[11px] line-clamp-2 mt-1.5">{b.excerpt}</p>
                        <span className="text-[10px] text-stone-600 font-mono block mt-2">Author: {b.author}</span>
                      </div>
                    </div>
                    <div className="px-5 pb-5 pt-3 border-t border-stone-850/60 flex justify-end gap-2 bg-stone-950/20">
                      <button
                        onClick={() => handleDeleteBlog(b.id, b.title)}
                        className="p-2 bg-stone-950 hover:bg-red-950/20 border border-stone-850 hover:border-red-900 text-red-400 rounded-xl transition-all cursor-pointer"
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

          {/* TAB CONTENT: EVENTS */}
          {activeTab === "events" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-500 uppercase font-semibold">Corporate Gatherings & Expos</span>
                <button
                  onClick={() => setIsAddingEvent(true)}
                  className="px-4 py-2 bg-[#0A7D32] hover:bg-[#00531d] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Event
                </button>
              </div>

              {/* Add Event Form */}
              {isAddingEvent && (
                <form onSubmit={handleSaveEvent} className="bg-stone-900 border border-stone-800 rounded-[32px] p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-800">
                    <h4 className="font-bold text-sm text-white">Create Corporate Event</h4>
                    <button type="button" onClick={() => setIsAddingEvent(false)} className="text-stone-500 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Event Name</label>
                      <input
                        type="text"
                        required
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                        placeholder="e.g. Yaoundé Leadership Summit"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Location Venue</label>
                      <input
                        type="text"
                        required
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                        placeholder="e.g. Palais des Sports, Yaoundé"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Start Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={newEvent.startAt}
                        onChange={(e) => setNewEvent({ ...newEvent, startAt: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-stone-200"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">End Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={newEvent.endAt}
                        onChange={(e) => setNewEvent({ ...newEvent, endAt: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-stone-200"
                      />
                    </div>
                    <div>
                      <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Max Seat Capacity</label>
                      <input
                        type="number"
                        required
                        value={newEvent.capacity}
                        onChange={(e) => setNewEvent({ ...newEvent, capacity: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Image Presentation URL</label>
                    <input
                      type="text"
                      required
                      value={newEvent.image}
                      onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-stone-400 text-[10px] uppercase font-bold block mb-1">Event Overview Description</label>
                    <textarea
                      required
                      rows={3}
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-850 rounded-xl outline-none text-xs text-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0A7D32] hover:bg-[#00531d] text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                  >
                    Confirm Event Schedule
                  </button>
                </form>
              )}

              {/* Events display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {events.map(ev => (
                  <div key={ev.id} className="bg-stone-900 border border-stone-850 rounded-[28px] overflow-hidden flex flex-col justify-between">
                    <div className="p-5 flex gap-4">
                      <img src={ev.image} className="w-20 h-20 rounded-2xl object-cover bg-stone-950 border border-stone-800" />
                      <div>
                        <span className="text-[#C9A227] font-bold text-[9px] uppercase tracking-widest">{ev.location}</span>
                        <h4 className="font-sans font-extrabold text-sm text-white mt-1 line-clamp-1">{ev.title}</h4>
                        <p className="text-stone-500 text-[11px] line-clamp-2 mt-1.5">{ev.description}</p>
                        <div className="flex gap-4 mt-2.5 text-[10px] text-stone-400 font-mono">
                          <span>Seating: {ev.registrants?.length || 0} / {ev.capacity}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pb-5 pt-3 border-t border-stone-850/60 flex justify-end gap-2 bg-stone-950/20">
                      <button
                        onClick={() => handleDeleteEvent(ev.id, ev.title)}
                        className="p-2 bg-stone-950 hover:bg-red-950/20 border border-stone-850 hover:border-red-900 text-red-400 rounded-xl transition-all cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: CONTACTS MESSAGES */}
          {activeTab === "contacts" && (
            <div className="bg-stone-900 border border-stone-850 rounded-[32px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Sender</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Message Context</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Fulfill Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/60">
                    {messages.map(m => (
                      <tr key={m.id} className="hover:bg-stone-950/40 transition-all">
                        <td className="px-6 py-4 font-bold text-white">{m.name}</td>
                        <td className="px-6 py-4 font-mono">
                          <div>{m.email}</div>
                          <div className="text-[10px] text-stone-500 mt-0.5">{m.phone}</div>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate" title={m.message}>{m.message}</td>
                        <td className="px-6 py-4">
                          {m.status === "unread" ? (
                            <span className="px-2 py-0.5 bg-red-950/40 border border-red-900/40 text-red-400 rounded-full font-bold uppercase text-[9px] tracking-wider animate-pulse">Unread</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-stone-950 border border-stone-800 text-stone-500 rounded-full font-bold uppercase text-[9px] tracking-wider">Read</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleMarkMessageRead(m.id)}
                            disabled={m.status !== "unread"}
                            className="px-2.5 py-1 bg-[#0A7D32]/10 hover:bg-[#0A7D32]/30 border border-[#0A7D32]/30 hover:border-[#0A7D32] text-[#0A7D32] rounded-lg text-[9px] font-bold transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer uppercase"
                          >
                            Mark Read
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: NEWSLETTER LIST */}
          {activeTab === "newsletter" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-500 uppercase font-semibold">Subscribed Users</span>
                <button
                  onClick={handleExportNewsletter}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-stone-750 text-[#C9A227] rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Export CSV Spreadsheet
                </button>
              </div>

              <div className="bg-stone-900 border border-stone-850 rounded-[32px] overflow-hidden">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="text-[10px] uppercase bg-stone-950 border-b border-stone-850 text-stone-500 font-bold">
                    <tr>
                      <th className="px-6 py-4">Subscriber Email</th>
                      <th className="px-6 py-4">Subscription Date</th>
                      <th className="px-6 py-4">Status Badge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/60">
                    {subscribers.map(s => (
                      <tr key={s.id} className="hover:bg-stone-950/40 transition-all">
                        <td className="px-6 py-4 font-bold text-white font-mono">{s.email}</td>
                        <td className="px-6 py-4 font-mono">
                          {s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toISOString().substring(0, 10) : "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 rounded-full font-bold uppercase text-[9px] tracking-wider">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="bg-stone-900 border border-stone-850 rounded-[32px] overflow-hidden p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-stone-850/60 pb-4">
                <div>
                  <h3 className="font-sans font-bold text-base text-white">System Audit Trail</h3>
                  <p className="text-stone-500 text-xs">Immutable system log tracking admin modifications on the corporate network</p>
                </div>
              </div>

              <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 text-xs">
                    No system administrative actions recorded on this block ledger.
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="p-4 bg-stone-950/60 border border-stone-850 rounded-2xl flex items-start gap-4 text-left">
                      <div className="p-2 bg-[#0A7D32]/10 rounded-xl text-[#0A7D32] flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                          <span className="font-bold text-xs text-white uppercase tracking-tight">{log.action}</span>
                          <span className="text-[10px] text-stone-600 font-mono">
                            {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-stone-400 text-xs mt-1.5 leading-relaxed font-sans">{log.details}</p>
                        <span className="text-[10px] text-stone-500 font-mono block mt-2">Operator Claim: {log.adminEmail}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      <footer className="border-t border-stone-900 bg-stone-950 py-8 text-stone-600 font-semibold text-[10px] text-center tracking-widest uppercase mt-12">
        © 2026 Songtai Life Digital Operations. CEMAC Financial Audit Compliance Active.
      </footer>
    </div>
  );
}
