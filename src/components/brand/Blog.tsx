import { useState } from "react";
import { BlogPostSeed, BLOG_SEED } from "../../data/mockData";
import { ArrowLeft, User, Calendar, BookOpen, Clock } from "lucide-react";

export default function Blog() {
  const [selectedPost, setSelectedPost] = useState<BlogPostSeed | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "Wellness", "MLM Success", "Agri-Tech", "Beauty Tips"];

  const filteredPosts = activeCategory === "All"
    ? BLOG_SEED
    : BLOG_SEED.filter(p => p.category === activeCategory);

  if (selectedPost) {
    const post = selectedPost;
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
          
          <button
            onClick={() => setSelectedPost(null)}
            className="flex items-center gap-2 text-stone-400 hover:text-white font-bold text-xs cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Wellness Hub</span>
          </button>

          <article className="space-y-8">
            {/* Meta */}
            <div className="space-y-4">
              <span className="text-xs uppercase font-bold text-[#C9A227] bg-[#C9A227]/10 px-3 py-1 border border-[#C9A227]/20 rounded-full w-fit inline-block">
                {post.category}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-xs text-stone-500 font-medium pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#0A7D32]/20 border border-emerald-500/20 flex items-center justify-center text-[#C9A227]">
                    <User className="w-3 h-3" />
                  </div>
                  <span>{post.author}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Published on {post.publishedAt}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>5 mins read</span>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="aspect-[21/9] rounded-[32px] overflow-hidden bg-stone-950 border border-stone-850">
              <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
            </div>

            {/* Content Body */}
            <div className="bg-stone-900/10 border border-stone-850 p-6 sm:p-10 rounded-[32px] text-stone-300 text-sm sm:text-base leading-relaxed space-y-6">
              {post.body.split("\n\n").map((chunk, idx) => {
                if (chunk.startsWith("### ")) {
                  return <h3 key={idx} className="text-xl font-bold text-white mt-8 mb-2 first:mt-0">{chunk.replace("### ", "")}</h3>;
                }
                if (chunk.startsWith("#### ")) {
                  return <h4 key={idx} className="text-base font-bold text-[#C9A227] mt-6 mb-2">{chunk.replace("#### ", "")}</h4>;
                }
                if (chunk.startsWith("- ") || chunk.startsWith("1. ")) {
                  return (
                    <div key={idx} className="pl-4 space-y-2 font-medium text-stone-300">
                      {chunk.split("\n").map((line, lIdx) => (
                        <li key={lIdx} className="list-disc">{line.replace(/^[-1.\s]+/, "")}</li>
                      ))}
                    </div>
                  );
                }
                return <p key={idx} className="text-stone-300">{chunk}</p>;
              })}
            </div>
          </article>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        {/* Title / Filter */}
        <div className="border-b border-stone-900 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">Science & News</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Wellness Hub & Science</h1>
            <p className="text-stone-400 text-xs">Botanical research reviews, entrepreneurship diaries, and MLM expansion strategies.</p>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-900 w-fit">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedPost(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat ? "bg-[#0A7D32] text-white" : "text-stone-500 hover:text-stone-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Post List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map(post => (
            <div 
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="bg-stone-900/20 border border-stone-850 rounded-[28px] p-5 flex flex-col justify-between group cursor-pointer hover:bg-stone-900/35 transition-all"
            >
              <div className="space-y-4">
                <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-stone-950">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-[#C9A227] uppercase tracking-wider">{post.category}</span>
                  <h4 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">{post.title}</h4>
                  <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">{post.excerpt}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-900/60 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                <span>{post.publishedAt}</span>
                <span className="text-emerald-400 font-bold font-sans group-hover:underline">Read Article &rarr;</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
