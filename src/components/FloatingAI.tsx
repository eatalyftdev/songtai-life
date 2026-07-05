import { useState, useEffect, useRef, FormEvent } from "react";
import { MessageSquare, Send, X, Bot, Sparkles, User, HelpCircle, Leaf } from "lucide-react";
import { supabase } from "../lib/supabase";

interface Message {
  role: "user" | "model";
  text: string;
}

const WELCOME: Message = {
  role: "model",
  text: "Bonjour! I'm your Songtai Life wellness guide. I can answer questions about our products, help you understand how to become a distributor, or explain our wellness programs. How can I help you today? / Comment puis-je vous aider?"
};

const PROMPTS = [
  "What products do you offer?",
  "How do I become a distributor?",
  "Tell me about your wellness programs",
];

export default function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!open || context) return;
    const buildContext = async () => {
      try {
        const [sectionsRes, productsRes, settingsRes] = await Promise.all([
          supabase.from("homepage_sections").select("section_key,content").in("section_key", ["company_intro", "page_our_story", "ai_settings"]),
          supabase.from("products").select("name,description,price_xaf,category").eq("status", "active").limit(20),
          supabase.from("site_settings").select("key,value").in("key", ["company_name", "whatsapp_number", "ai_system_prompt"]),
        ]);

        const settingsMap: Record<string, string> = {};
        (settingsRes.data ?? []).forEach((r: any) => { settingsMap[r.key] = r.value; });

        const customPrompt = settingsMap["ai_system_prompt"];
        if (customPrompt) {
          setContext(customPrompt);
          return;
        }

        const companyName = settingsMap["company_name"] ?? "Songtai Life";
        const waNumber = settingsMap["whatsapp_number"] ?? "+237 655 000 000";

        let productList = "";
        if (productsRes.data && productsRes.data.length > 0) {
          productList = "\n\nOUR PRODUCTS:\n" + productsRes.data.map((p: any) =>
            `- ${p.name} (${p.category}): ${(p.description ?? "").slice(0, 120)} — ${(p.price_xaf ?? 0).toLocaleString()} XAF`
          ).join("\n");
        }

        let storyText = "";
        (sectionsRes.data ?? []).forEach((row: any) => {
          if (row.section_key === "company_intro" && row.content?.story_en) {
            storyText = row.content.story_en;
          }
          if (row.section_key === "page_our_story" && row.content?.story1_en) {
            storyText = row.content.story1_en;
          }
          if (row.section_key === "ai_settings" && row.content?.system_prompt) {
            setContext(row.content.system_prompt);
          }
        });

        const ctx = `You are a helpful, friendly customer assistant for ${companyName}, a premium wellness and direct-selling company based in Cameroon, West Africa. 
You help customers and potential distributors with questions about products, pricing, wellness programs, and the distributor opportunity.
Keep responses concise, warm, and helpful. You can respond in English or French based on what the user writes.
WhatsApp contact: ${waNumber}
Company overview: ${storyText || "Songtai Life offers premium botanical wellness products sourced from Cameroon and sold through a unilevel MLM network across West Africa."}
${productList}

For complex questions about registration or payments, invite users to contact via WhatsApp or visit the Contact page.`;
        setContext(ctx);
      } catch {
        setContext("You are a helpful assistant for Songtai Life, a wellness company in Cameroon.");
      }
    };
    buildContext();
  }, [open, context]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || loading) return;

    setInputText("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          systemContext: context,
        }),
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setMessages(prev => [...prev, { role: "model", text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: "model", text: getFallback(text) }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "model", text: getFallback(text) }]);
    } finally {
      setLoading(false);
    }
  };

  const getFallback = (q: string): string => {
    const lq = q.toLowerCase();
    if (lq.includes("product") || lq.includes("produit"))
      return "We offer a range of premium botanical wellness products including nutritional supplements, herbal teas, skincare, and agricultural products — all sourced from Cameroon. Visit our Products page to browse the full catalogue!";
    if (lq.includes("distributor") || lq.includes("distributeur") || lq.includes("join") || lq.includes("rejoindre"))
      return "Becoming a Songtai Life Distributor is simple! Choose a starter pack (Bronze 25,000 XAF, Silver 75,000 XAF, or Gold 180,000 XAF), complete registration, and pay via MTN Mobile Money or Orange Money. Click 'Become a Distributor' in the navigation to get started.";
    if (lq.includes("price") || lq.includes("prix") || lq.includes("cost") || lq.includes("xaf"))
      return "Our products are priced in CFA Francs (XAF) and can be purchased using MTN Mobile Money or Orange Money via the MeSomb payment gateway. Visit our Products page to see current pricing.";
    if (lq.includes("contact") || lq.includes("phone") || lq.includes("office") || lq.includes("bureau"))
      return "You can reach our team at:\n- Yaoundé: Avenue Kennedy, near Boulangerie Calafatas\n- Douala: Rue Akwa, opposite Pharmacie du Centre\n- Phone: +237 655 000 000\n- Email: support@songtailife.com";
    return "Thank you for your question! For the most accurate information, please visit our Contact page or reach us via WhatsApp. Our team in Yaoundé is happy to help. / Merci pour votre question ! Visitez notre page Contact pour plus d'informations.";
  };

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-28 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-[#0A7D32] hover:bg-[#086327] text-white rounded-full shadow-2xl shadow-emerald-950/60 transition-all duration-300 group cursor-pointer border border-emerald-700/40"
        aria-label="Ask AI"
      >
        <Leaf className="w-4 h-4 text-[#ecc246]" />
        <span className="text-xs font-bold">Ask AI</span>
        <Sparkles className="w-3 h-3 text-[#ecc246] animate-pulse" />
      </button>

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-stone-900 border-l border-stone-800 shadow-2xl flex flex-col animate-slide-in text-left">
          <div className="flex justify-between items-center p-4 bg-stone-950 border-b border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#0A7D32]/20 border border-emerald-500/20 rounded-xl">
                <Leaf className="w-4 h-4 text-[#ecc246]" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Songtai AI Guide</h4>
                <span className="text-[10px] text-stone-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#ecc246]" /> Wellness & Distributor Support
                </span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-stone-950/40">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-3 max-w-[88%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                <div className={`p-2 rounded-xl h-fit flex-shrink-0 ${m.role === "user" ? "bg-stone-800 text-[#ecc246]" : "bg-[#0A7D32] text-white"}`}>
                  {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-stone-800 text-stone-200" : "bg-stone-900 border border-stone-800 text-stone-300"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 max-w-[88%] mr-auto">
                <div className="p-2 bg-[#0A7D32] text-white rounded-xl h-fit">
                  <Bot className="w-3.5 h-3.5 animate-bounce" />
                </div>
                <div className="p-3.5 bg-stone-900 border border-stone-800 rounded-2xl flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#ecc246] rounded-full animate-ping" />
                  <span className="text-xs text-stone-500 font-mono">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="px-4 py-2 bg-stone-950 border-t border-stone-800/60 flex flex-wrap gap-1.5">
            {PROMPTS.map((p, i) => (
              <button key={i} onClick={() => setInputText(p)}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-full text-[10px] text-stone-400 hover:text-white font-medium transition-all cursor-pointer flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-[#ecc246]" />
                {p}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-4 bg-stone-950 border-t border-stone-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Ask about products, wellness, distributorship..."
              className="flex-grow px-4 py-3 bg-stone-900 border border-stone-800 focus:border-[#0A7D32] focus:ring-1 focus:ring-[#0A7D32] rounded-xl text-white placeholder-stone-600 text-xs outline-none"
            />
            <button type="submit" disabled={loading || !inputText.trim()}
              className="p-3 bg-[#0A7D32] hover:bg-[#086327] disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer">
              <Send className="w-4 h-4 text-[#ecc246]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
