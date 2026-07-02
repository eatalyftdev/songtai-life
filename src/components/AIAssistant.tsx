import { useState, useEffect, useRef, FormEvent } from "react";
import { MessageSquareCode, Send, X, Bot, Sparkles, User, HelpCircle } from "lucide-react";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "model";
  text: string;
}

export default function AIAssistant({ isOpen, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Bonjour! I am your Songtai Life AI Architect. I can explain the NestJS/Next.js decoupled monolith architecture, the unilevel genealogy downline schemas, the MeSomb payment callbacks, or draft PostgreSQL migration logs for you. How can I help you build today?"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText;
    setInputText("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      // Call our Express server endpoint which proxies the Gemini API
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          history: messages
        })
      });

      const data = await response.json();

      if (response.ok && data.text) {
        setMessages(prev => [...prev, { role: "model", text: data.text }]);
      } else {
        // Fallback rule-based smart response if Gemini key is missing or server is starting up
        const fallbackText = getLocalFallbackResponse(userText);
        setMessages(prev => [...prev, { role: "model", text: fallbackText }]);
      }
    } catch (err) {
      console.error("Chat Error:", err);
      const fallbackText = getLocalFallbackResponse(userText);
      setMessages(prev => [...prev, { role: "model", text: fallbackText }]);
    } finally {
      setLoading(false);
    }
  };

  // Safe Rule-based fallback answers to ensure zero disruption
  const getLocalFallbackResponse = (query: string): string => {
    const q = query.toLowerCase();
    
    if (q.includes("mesomb") || q.includes("payment") || q.includes("momo") || q.includes("orange")) {
      return `### MeSomb Payment Integration Blueprint
In Songtai Life, all transactions are settled in CFA Francs (XAF) with MTN Mobile Money and Orange Money via the **MeSomb Gateway**.
Key verification metrics:
- **Callback Signature**: The server validates the callback signature using an \`HMAC-SHA256\` hash of the request body with the \`MESOMB_WEBHOOK_SECRET\`.
- **Idempotency**: Webhook headers include a unique transaction UUID. The endpoint validates this key against the database to guarantee zero double-crediting of user wallets.

*AI Studio Tip: To test full live calls, configure your \`GEMINI_API_KEY\` inside the Secrets Panel.*`;
    }

    if (q.includes("genealogy") || q.includes("tree") || q.includes("unilevel") || q.includes("placement")) {
      return `### Genealogy Tree Database Schema
The unilevel organizational tree handles high-mutating nodes through an adjacency-list pattern.
\`\`\`sql
-- Adjacency hierarchy
ALTER TABLE "Distributor" 
  ADD CONSTRAINT "Distributor_sponsorId_fkey" 
  FOREIGN KEY ("sponsorId") REFERENCES "Distributor"("id");
\`\`\`
- **Read Cache**: Redis hashes maintain subtree node listings down to 5 generations, avoiding expensive nested SQL joins.
- **PV Recalculation**: Appending a child initiates a BullMQ job that bubbles PV points up the tree, updating downline totals.`;
    }

    if (q.includes("schema") || q.includes("table") || q.includes("migration") || q.includes("prisma")) {
      return `### Database Table Definitions (Prisma Engine)
Our modular monolith includes the following core schemas:
1. **User**: Credentials, profiles, and Locale configuration.
2. **Distributor**: Referral keys, ranks (Bronze, Gold, Diamond), and Sponsor codes.
3. **Wallet**: Balance ledger in XAF avoiding float discrepancies.
4. **Commission**: Direct referrals overrides ledger.

You can inspect and copy full schemas inside the **Prisma Model Definition** panel under the "Technical Specs" section!`;
    }

    return `### Songtai AI Architect
I am responding with local architectural files because the Gemini server is resolving keys.
Key features of the **Songtai Life Technical Specification**:
- **NestJS Modular Monolith**: Scalable backend with Zod-validated configuration models.
- **Next.js 15 App Router**: Modern front-end with responsive grid alignment and GSAP transitions.
- **MeSomb Money Ledger**: MTN MoMo and Orange Money payout validation loops.

Feel free to ask about "MeSomb payment verification", "Genealogy tree database schemas", or "Prisma table definitions" for instant blueprint code!`;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-stone-900 border-l border-stone-800 shadow-2xl flex flex-col justify-between animate-slide-in text-left">
      
      {/* Drawer Header */}
      <div className="flex justify-between items-center p-4 bg-stone-950 border-b border-stone-850">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#006224]/20 border border-emerald-500/20 text-[#ecc246] rounded-xl">
            <MessageSquareCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-sans font-bold text-white text-sm">Songtai AI Architect</h4>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#ecc246]" /> Gemini 3.5-Flash Active
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message list area */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-stone-950/40">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-[85%] ${
              m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar */}
            <div className={`p-2 rounded-xl h-fit flex-shrink-0 ${
              m.role === "user" ? "bg-stone-800 text-[#ecc246]" : "bg-[#006224] text-white"
            }`}>
              {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-stone-800 text-stone-200"
                : "bg-stone-900 border border-stone-850 text-stone-300"
            }`}>
              {m.text.split("\n").map((line, lIdx) => {
                if (line.startsWith("### ")) {
                  return <h5 key={lIdx} className="font-bold text-sm text-white mt-3 mb-1">{line.replace("### ", "")}</h5>;
                }
                if (line.startsWith("- ")) {
                  return <li key={lIdx} className="ml-4 list-disc mt-1 text-stone-300">{line.replace("- ", "")}</li>;
                }
                if (line.startsWith("`")) {
                  return <code key={lIdx} className="block bg-stone-950 p-2.5 rounded-xl border border-stone-850 text-emerald-400 font-mono text-[10px] my-2 whitespace-pre overflow-x-auto">{line.replace(/`/g, "")}</code>;
                }
                return <p key={lIdx} className="mt-1 text-stone-300">{line}</p>;
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="p-2 bg-[#006224] text-white rounded-xl h-fit">
              <Bot className="w-3.5 h-3.5 animate-bounce" />
            </div>
            <div className="p-3.5 bg-stone-900 border border-stone-850 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 bg-[#ecc246] rounded-full animate-ping" />
              <span className="text-xs text-stone-500 font-mono">Architect is thinking...</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Suggested prompts helper */}
      <div className="px-4 py-2 bg-stone-950 border-t border-stone-850/60 flex flex-wrap gap-1.5">
        {[
          "Genealogy DDL Schema",
          "MeSomb HMAC Webhook",
          "Unilevel commissions rules"
        ].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => setInputText(prompt)}
            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-850 border border-stone-850 hover:border-stone-800 rounded-full text-[10px] text-stone-400 hover:text-white font-medium transition-all cursor-pointer flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3 text-[#ecc246]" />
            {prompt}
          </button>
        ))}
      </div>

      {/* Message input area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-stone-950 border-t border-stone-850 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask AI Architect..."
          className="flex-grow px-4 py-3 bg-stone-900 border border-stone-850 focus:border-[#006224] focus:ring-1 focus:ring-[#006224] rounded-xl text-white placeholder-stone-600 text-xs sm:text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="p-3 bg-[#006224] hover:bg-[#00531d] disabled:opacity-50 text-white rounded-xl transition-all cursor-pointer"
        >
          <Send className="w-4 h-4 text-[#ecc246]" />
        </button>
      </form>

    </div>
  );
}
