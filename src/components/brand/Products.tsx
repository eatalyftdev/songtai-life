import { useState } from "react";
import { ProductSeed, PRODUCTS_SEED } from "../../data/mockData";
import { Search, ShoppingBag, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";

interface ProductsProps {
  onAddToCart: (product: any) => void;
}

export default function Products({ onAddToCart }: ProductsProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductSeed | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Health", "Beauty", "Agriculture", "New Arrivals"];

  // Filter logic
  const filteredProducts = PRODUCTS_SEED.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.pvPoints.toString().includes(q) ||
      (q.endsWith("pv") && p.pvPoints.toString().includes(q.replace("pv", "").trim())) ||
      (q.startsWith("pv") && p.pvPoints.toString().includes(q.replace("pv", "").trim()));
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (selectedProduct) {
    const p = selectedProduct;
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
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
                  src={p.images[0]} 
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {p.images[1] && (
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
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">{p.name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xl font-black text-[#C9A227]">{p.priceXaf.toLocaleString()} XAF</span>
                  <span className="text-xs text-stone-400 font-mono px-2 py-1 bg-stone-950 border border-stone-850 rounded-md">
                    +{p.pvPoints} Volume Points (PV)
                  </span>
                </div>
              </div>

              <div className="text-stone-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line border-t border-stone-900 pt-4">
                {p.description}
              </div>

              {/* Benefits checklist */}
              <div className="space-y-2 border-t border-stone-900 pt-4">
                <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">Key Sovereign Benefits</span>
                <div className="grid grid-cols-1 gap-2">
                  {p.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-stone-300 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage Instructions */}
              <div className="p-4 bg-stone-950/80 border border-stone-850/80 rounded-2xl text-xs space-y-1.5">
                <span className="text-[#C9A227] font-bold block">Recommended Application & Usage:</span>
                <p className="text-stone-400 leading-relaxed">{p.usage}</p>
              </div>

              {/* Buy action */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onAddToCart(p);
                  }}
                  className="w-full py-4 bg-[#0A7D32] hover:bg-[#086327] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-transparent"
                >
                  <ShoppingBag className="w-4 h-4 text-[#C9A227]" />
                  <span>Add {p.name} to Your Cart</span>
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
            {filteredProducts.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-stone-900/20 border border-stone-850/60 rounded-[28px] p-5 flex flex-col justify-between group transition-all duration-300 hover:bg-stone-900/45 cursor-pointer hover:border-emerald-950/60"
              >
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-950">
                    <img 
                      src={p.images[0]} 
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-stone-900/90 backdrop-blur-md text-[10px] font-bold text-[#C9A227] rounded-md border border-stone-850">
                      {p.pvPoints} PV
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-stone-500 font-bold block">{p.category}</span>
                    <h4 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors">{p.name}</h4>
                    <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">{p.description}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-900 flex items-center justify-between">
                  <span className="text-sm font-black text-white">{p.priceXaf.toLocaleString()} XAF</span>
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 group-hover:underline">
                    View Details &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
