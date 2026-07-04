import { useState, useEffect } from "react";
import { Search, ShoppingBag, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "react-i18next";
import SEO from "../SEO";
import { PRODUCTS_SEED } from "../../data/mockData";

interface LiveProduct {
  id: string;
  slug: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  priceXaf: number;
  pvPoints: number;
  category: string;
  images: string[];
  isActive: boolean;
  strikePrice?: number;
}

interface ProductsProps {
  onAddToCart: (product: any) => void;
}

function mapDbRow(row: any): LiveProduct {
  return {
    id: row.id,
    slug: row.slug ?? "",
    name: row.name_en ?? row.name ?? "",
    nameFr: row.name_fr ?? "",
    description: row.description_en ?? row.description ?? "",
    descriptionFr: row.description_fr ?? "",
    priceXaf: row.price_xaf ?? 0,
    pvPoints: row.pv_points ?? 0,
    category: row.product_categories?.name ?? row.category ?? "Health",
    images: row.images ?? (row.image ? [row.image] : []),
    isActive: row.is_active ?? true,
    strikePrice: row.strike_price_xaf ?? undefined,
  };
}

// Fallback mapping from seed data
const FALLBACK: LiveProduct[] = PRODUCTS_SEED.map(p => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  nameFr: p.name,
  description: p.description,
  descriptionFr: p.description,
  priceXaf: p.priceXaf,
  pvPoints: p.pvPoints,
  category: p.category,
  images: p.images,
  isActive: p.isActive,
}));

export default function Products({ onAddToCart }: ProductsProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr" : "en";

  const [products, setProducts] = useState<LiveProduct[]>(FALLBACK);
  const [selectedProduct, setSelectedProduct] = useState<LiveProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [dbCategories, setDbCategories] = useState<string[]>([]);

  // Fetch category list from product_categories table (ordered by display_order)
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("name, name_fr, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (data && data.length > 0) {
        setDbCategories(data.map((c: any) =>
          locale === "fr" ? (c.name_fr || c.name || "") : (c.name || "")
        ));
      }
    };
    fetchCategories();
  }, [locale]);

  // Fetch products from Supabase + subscribe to Realtime
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setProducts(data.map(mapDbRow));
      }
    };

    fetchProducts();

    const channel = supabase
      .channel("products_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Use DB-driven category list; fall back to deriving from product data
  const categories = dbCategories.length > 0
    ? ["All", ...dbCategories]
    : ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const getName = (p: LiveProduct) => locale === "fr" && p.nameFr ? p.nameFr : p.name;
  const getDesc = (p: LiveProduct) => locale === "fr" && p.descriptionFr ? p.descriptionFr : p.description;

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const name = getName(p).toLowerCase();
    const matchesSearch = !q || name.includes(q) || getDesc(p).toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (selectedProduct) {
    const p = selectedProduct;
    const name = getName(p);
    const desc = getDesc(p);
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
        <SEO
          title={name}
          description={desc.slice(0, 160)}
          image={p.images[0]}
          type="product"
          breadcrumbs={[{ name: "Products", url: "/?page=products" }, { name, url: `/?page=products&slug=${p.slug}` }]}
        />
        {/* Soft radial backdrop */}
        <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-[#0A7D32]/5 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
          {/* Back button */}
          <button
            onClick={() => setSelectedProduct(null)}
            className="flex items-center gap-2 text-stone-400 hover:text-white font-bold text-xs cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Products Catalog</span>
          </button>

          {/* Core Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start bg-stone-900/20 border border-stone-850 p-6 sm:p-8 rounded-[32px]">
            {/* Gallery images (Col 5) */}
            <div className="md:col-span-5 space-y-4">
              <div className="aspect-square rounded-2xl overflow-hidden bg-stone-950 border border-stone-850">
                <img
                  src={p.images[0] || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800"}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
              {p.images.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {p.images.map((img, idx) => (
                    <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-stone-950 border border-stone-850">
                      <img src={img} alt="Product view" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta & Actions (Col 7) */}
            <div className="md:col-span-7 space-y-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#C9A227] tracking-wider bg-[#C9A227]/10 px-2.5 py-1 border border-[#C9A227]/20 rounded-full">
                  {p.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">{name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  {p.strikePrice && (
                    <span className="text-sm text-stone-500 line-through font-mono">{p.strikePrice.toLocaleString()} XAF</span>
                  )}
                  <span className="text-xl font-black text-[#C9A227]">{p.priceXaf.toLocaleString()} XAF</span>
                  <span className="text-xs text-stone-400 font-mono px-2 py-1 bg-stone-950 border border-stone-850 rounded-md">
                    +{p.pvPoints} Volume Points (PV)
                  </span>
                </div>
              </div>

              <div className="text-stone-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line border-t border-stone-900 pt-4">
                {desc}
              </div>

              {/* Buy action */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onAddToCart({
                      id: p.id,
                      slug: p.slug,
                      name,
                      description: desc,
                      priceXaf: p.priceXaf,
                      pvPoints: p.pvPoints,
                      category: p.category,
                      image: p.images[0] || "",
                    });
                  }}
                  className="w-full py-4 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                >
                  <ShoppingBag className="w-4 h-4 text-[#C9A227]" />
                  <span>Add {name} to Your Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <SEO
        title="Products"
        description="Shop premium wellness, beauty, and agriculture products from Songtai Life — sourced from West African botanical heritage."
        breadcrumbs={[{ name: "Products", url: "/?page=products" }]}
      />
      {/* Soft gradient backgrounds */}
      <div className="absolute top-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-[#0A7D32]/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">

        {/* Header Title Section */}
        <div className="border-b border-stone-900 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Premium Catalog</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Sovereign Products</h1>
            <p className="text-stone-400 text-xs">High-end nutrition, organic cosmetics, and eco-agriculture catalysts.</p>
          </div>

          {/* Search bar & Category filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-850 rounded-xl text-xs text-white outline-none focus:border-[#0A7D32]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit self-start">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-[#0A7D32] text-white"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog list grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-24 text-center text-stone-500 space-y-3">
            <ShieldAlert className="w-12 h-12 text-stone-800 mx-auto" />
            <p className="text-sm">No products found matching your active search filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(p => {
              const name = getName(p);
              const desc = getDesc(p);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-stone-900/20 border border-stone-850/60 rounded-[28px] p-5 flex flex-col justify-between group transition-all duration-500 hover:bg-stone-900/45 cursor-pointer hover:border-emerald-500/20 hover:-translate-y-1.5 hover:scale-[1.015] hover:shadow-xl hover:shadow-emerald-950/20"
                >
                  <div className="space-y-4">
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-950">
                      <img
                        src={p.images[0] || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800"}
                        alt={name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-stone-900/90 backdrop-blur-md text-[10px] font-bold text-[#C9A227] rounded-md border border-stone-850">
                        {p.pvPoints} PV
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold block">{p.category}</span>
                      <h4 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors">{name}</h4>
                      <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">{desc}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.strikePrice && (
                        <span className="text-xs text-stone-600 line-through font-mono">{p.strikePrice.toLocaleString()}</span>
                      )}
                      <span className="text-sm font-black text-white">{p.priceXaf.toLocaleString()} XAF</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 group-hover:underline">
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
