import { useState } from "react";
import { SPEC_CHAPTERS, SCHEMA_TABLES } from "../data/specification";
import { BookOpen, Database, Play, Terminal, Cpu, FileJson, ArrowRight, ShieldCheck, CheckCircle, Code } from "lucide-react";

export default function TechSpecBrowser() {
  const [activeChapterId, setActiveChapterId] = useState("executive-summary");
  const [activeTable, setActiveTable] = useState("USER");
  const [apiMethod, setApiMethod] = useState<"GET" | "POST">("GET");
  const [apiEndpoint, setApiEndpoint] = useState("/distributors/me/genealogy");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  const activeChapter = SPEC_CHAPTERS.find(c => c.id === activeChapterId) || SPEC_CHAPTERS[0];
  const selectedSchemaTable = SCHEMA_TABLES.find(t => t.name === activeTable) || SCHEMA_TABLES[0];

  // Map endpoints to simulated response datasets
  const handleRunApi = () => {
    setApiLoading(true);
    setApiResponse(null);

    setTimeout(() => {
      setApiLoading(false);
      if (apiEndpoint === "/distributors/me/genealogy") {
        setApiResponse({
          status: "success",
          timestamp: new Date().toISOString(),
          data: {
            nodeId: "ST-YOU-77",
            sponsorId: "ST-ELENA-88",
            rank: "Bronze",
            downlineSummary: {
              totalLeftPV: 240,
              totalRightPV: 180,
              activeDirectReferrals: 2
            },
            tree: {
              name: "You (Sovereign Leader)",
              left: { name: "Amadou Diallo", pv: 80 },
              right: { name: "Sita Oumarou", pv: 95 }
            }
          }
        });
      } else if (apiEndpoint === "/wallet/transactions") {
        setApiResponse({
          status: "success",
          count: 3,
          data: [
            { id: "tx-883", type: "commission", amountXaf: 15000, desc: "Direct Referral Bonus: Sita Oumarou" },
            { id: "tx-223", type: "withdrawal", amountXaf: 10000, desc: "MeSomb MoMo Payout" }
          ]
        });
      } else if (apiEndpoint === "/orders" && apiMethod === "POST") {
        setApiResponse({
          status: "initiated",
          orderId: "ord-773a-bc29",
          totalXaf: 52000,
          paymentIntent: {
            provider: "MeSomb",
            redirectUrl: "https://mesomb.com/checkout/ord-773a",
            token: "ms_tkn_883aa32f11ad92"
          }
        });
      } else {
        setApiResponse({
          status: "success",
          message: "Endpoint executed successfully.",
          payload: {
            method: apiMethod,
            endpoint: apiEndpoint,
            pingMs: 42
          }
        });
      }
    }, 1200);
  };

  // Dynamic DDL / Prisma schema generator for selected schema table
  const generatePrismaSchema = (tableName: string) => {
    if (tableName === "USER") {
      return `model User {
  id           String        @id @default(uuid()) @db.Uuid
  email        String        @unique
  phone        String        @unique
  passwordHash String
  role         UserRole      @default(CUSTOMER)
  locale       String        @default("en")
  createdAt    DateTime      @default(now())
  distributor  Distributor?
  orders       Order[]
}`;
    } else if (tableName === "DISTRIBUTOR") {
      return `model Distributor {
  id              String         @id @default(uuid()) @db.Uuid
  userId          String         @unique @db.Uuid
  user            User           @relation(fields: [userId], references: [id])
  distributorCode String         @unique
  sponsorId       String?        @db.Uuid
  placementId     String?        @db.Uuid
  rank            DistributorRank @default(BRONZE)
  kycStatus       KycStatus      @default(PENDING)
  wallet          Wallet?
  commissions     Commission[]
}`;
    } else if (tableName === "WALLET") {
      return `model Wallet {
  id            String      @id @default(uuid()) @db.Uuid
  distributorId String      @unique @db.Uuid
  distributor   Distributor @relation(fields: [distributorId], references: [id])
  balanceXaf    Int         @default(0)
  updatedAt     DateTime    @updatedAt
}`;
    } else {
      return `model Commission {
  id            String         @id @default(uuid()) @db.Uuid
  distributorId String         @db.Uuid
  distributor   Distributor    @relation(fields: [distributorId], references: [id])
  type          CommissionType
  amountXaf     Int
  status        EarningStatus  @default(PENDING)
  createdAt     DateTime       @default(now())
}`;
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-12 font-sans relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Specification Header */}
        <div className="pb-6 border-b border-stone-850 text-left">
          <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">System Blueprint</span>
          <h1 className="font-sans font-extrabold text-3xl text-white mt-1">Technical Specification</h1>
          <p className="text-stone-400 text-sm mt-1">Browsable system architectures, entity relations schemas, and REST endpoints sandbox.</p>
        </div>

        {/* 1. SIDEBAR & TEXT BROWSER SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidenav (Col of 3) */}
          <div className="lg:col-span-3 flex flex-col gap-2 h-fit bg-stone-900/40 p-3 rounded-2xl border border-stone-850/60 text-left">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider px-3 mb-2 block">Specifications Index</span>
            {SPEC_CHAPTERS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChapterId(ch.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl font-sans text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeChapterId === ch.id
                    ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/30"
                    : "text-stone-400 hover:text-white hover:bg-stone-850/40"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                {ch.title}
              </button>
            ))}
          </div>

          {/* Core content (Col of 9) */}
          <div className="lg:col-span-9 bg-stone-900/20 border border-stone-850 rounded-[32px] p-8 text-left relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-950/10 blur-3xl rounded-full" />
            
            <div className="space-y-6">
              <span className="text-[10px] uppercase font-bold text-[color:var(--color-gold)] px-2.5 py-1 bg-[color:var(--color-gold)]/10 border border-[color:var(--color-gold)]/20 rounded-full">
                Decoupled Monolith Blueprint
              </span>
              <h2 className="font-sans font-extrabold text-3xl text-white mt-4">{activeChapter.title}</h2>
              <div className="text-stone-300 text-sm leading-relaxed space-y-4 whitespace-pre-line">
                {activeChapter.content}
              </div>

              {activeChapter.codeSnippet && (
                <div className="mt-6">
                  <span className="text-[10px] text-stone-500 uppercase font-bold block mb-2">Architectural Code Reference</span>
                  <pre className="bg-stone-950 p-5 rounded-2xl border border-stone-850 overflow-x-auto text-xs font-mono text-emerald-400 leading-relaxed">
                    <code>{activeChapter.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-12 pt-6 border-t border-stone-850/60 flex items-center justify-between">
              <span className="text-xs text-stone-500 font-mono">Decoupled NestJS controller reference v1.0</span>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-stone-900 border border-stone-850 text-emerald-400 text-[10px] font-bold rounded-md">
                  Active Security Checked
                </span>
                <span className="px-2.5 py-1 bg-stone-900 border border-stone-850 text-[color:var(--color-gold)] text-[10px] font-bold rounded-md">
                  HMAC Verified
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* 2. DYNAMIC DB SCHEMA ERD EXPLORER */}
        <div className="bg-stone-900/40 border border-stone-850 rounded-[32px] p-8 text-left">
          <div className="border-b border-stone-850 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-700" />
                Relational DB Schema ERD Explorer
              </h3>
              <p className="text-stone-400 text-xs mt-1">Click tables to inspect column constraints, relations, and auto-generated Prisma models.</p>
            </div>

            {/* Selector tabs */}
            <div className="flex gap-2 p-1 bg-stone-950 rounded-xl border border-stone-850 w-fit">
              {SCHEMA_TABLES.map(t => (
                <button
                  key={t.name}
                  onClick={() => setActiveTable(t.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTable === t.name
                      ? "bg-emerald-700 text-white"
                      : "text-stone-500 hover:text-stone-300"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Columns Grid list (Col 7) */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                Table schema: {selectedSchemaTable.name}
              </span>
              <p className="text-stone-300 text-xs italic">{selectedSchemaTable.description}</p>
              
              <div className="border border-stone-850 rounded-2xl overflow-hidden bg-stone-950/60">
                <table className="w-full text-left text-xs text-stone-400">
                  <thead className="bg-stone-950 uppercase text-stone-500 font-bold border-b border-stone-850">
                    <tr>
                      <th className="px-4 py-3">Column</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Constraints</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850/40">
                    {selectedSchemaTable.columns.map((c, idx) => (
                      <tr key={idx} className="hover:bg-stone-900/30">
                        <td className="px-4 py-3 font-mono font-bold text-white">{c.name}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">{c.type}</td>
                        <td className="px-4 py-3 font-mono text-[color:var(--color-gold)]">
                          {c.constraints.join(", ") || "-"}
                        </td>
                        <td className="px-4 py-3 text-stone-400">{c.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Prisma Model Generator (Col 5) */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-stone-950 rounded-2xl border border-stone-850 p-6">
              <div className="space-y-4">
                <span className="text-[10px] text-stone-500 uppercase font-bold flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-[color:var(--color-gold)]" />
                  Prisma Model Definition
                </span>
                <pre className="text-xs font-mono text-emerald-400 leading-relaxed overflow-x-auto select-all">
                  <code>{generatePrismaSchema(selectedSchemaTable.name)}</code>
                </pre>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-850 text-[10px] text-stone-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Schema constraints fully verified with strict PostgreSQL typings.
              </div>
            </div>
          </div>
        </div>

        {/* 3. REST API PLAYGROUND TERMINAL */}
        <div className="bg-stone-900/40 border border-stone-850 rounded-[32px] p-8 text-left">
          <div className="border-b border-stone-850 pb-4 mb-6">
            <h3 className="font-sans font-bold text-lg text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[color:var(--color-gold)]" />
              Rest API Sandbox / Controller Playground
            </h3>
            <p className="text-stone-400 text-xs mt-1">Simulate real-time NestJS endpoint requests and inspect JSON payloads.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Input params (Col 4) */}
            <div className="lg:col-span-4 space-y-4 bg-stone-950 p-5 rounded-2xl border border-stone-850 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Method selector */}
                <div>
                  <label className="text-stone-500 text-[10px] uppercase font-bold block mb-1.5">Request Method</label>
                  <div className="flex gap-2">
                    {(["GET", "POST"] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setApiMethod(m);
                          if (m === "POST") setApiEndpoint("/orders");
                          else setApiEndpoint("/distributors/me/genealogy");
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          apiMethod === m
                            ? m === "GET"
                              ? "bg-emerald-600 text-white"
                              : "bg-[#ecc246] text-stone-950"
                            : "bg-stone-900 text-stone-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Endpoint selector */}
                <div>
                  <label className="text-stone-500 text-[10px] uppercase font-bold block mb-1.5">API Endpoint URL</label>
                  <select
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-850 text-white text-xs rounded-xl p-3 outline-none"
                  >
                    {apiMethod === "GET" ? (
                      <>
                        <option value="/distributors/me/genealogy">GET /distributors/me/genealogy</option>
                        <option value="/wallet/transactions">GET /wallet/transactions</option>
                        <option value="/products/cellular-vitality-pro">GET /products/:slug</option>
                      </>
                    ) : (
                      <>
                        <option value="/orders">POST /orders (Create checkout session)</option>
                        <option value="/wallet/withdrawals">POST /wallet/withdrawals (MeSomb Cashout)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunApi}
                disabled={apiLoading}
                className="w-full py-3 bg-[#006224] hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer mt-4"
              >
                {apiLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Querying NestJS...
                  </span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-[color:var(--color-gold)] text-[color:var(--color-gold)]" />
                    Run Request
                  </>
                )}
              </button>
            </div>

            {/* Terminal console output (Col 8) */}
            <div className="lg:col-span-8 bg-stone-950 border border-stone-850 rounded-2xl overflow-hidden flex flex-col justify-between">
              {/* Toolbar */}
              <div className="flex justify-between items-center px-4 py-2 bg-stone-900 border-b border-stone-850/80">
                <span className="text-[10px] text-stone-500 font-mono flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block" />
                  <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full inline-block" />
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block" />
                  NestJS Terminal Emulator
                </span>
                <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                  <FileJson className="w-3 h-3 text-[color:var(--color-gold)]" /> Response JSON
                </span>
              </div>

              {/* Console logs */}
              <div className="p-5 font-mono text-xs leading-relaxed overflow-y-auto flex-grow min-h-[250px] max-h-[350px]">
                {apiLoading ? (
                  <div className="space-y-2 text-stone-500">
                    <p className="text-stone-300 animate-pulse">&gt; {apiMethod} http://localhost:3000/api{apiEndpoint}</p>
                    <p>&gt; Establishing secure socket connection...</p>
                    <p>&gt; Resolving unilevel downlines structure...</p>
                  </div>
                ) : apiResponse ? (
                  <div className="space-y-4">
                    <div className="text-stone-500">
                      <p className="text-emerald-400">&gt; {apiMethod} http://localhost:3000/api{apiEndpoint}</p>
                      <p>&gt; Status: 200 OK • Response Time: 45ms</p>
                      <p>&gt; Content-Type: application/json; charset=utf-8</p>
                    </div>
                    <pre className="text-emerald-300 select-all font-mono leading-tight">
                      <code>{JSON.stringify(apiResponse, null, 2)}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="text-stone-600 flex flex-col items-center justify-center h-full py-16">
                    <Terminal className="w-8 h-8 text-stone-800 mb-2" />
                    <span>Terminal Idle. Choose params on left and click Run Request.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
