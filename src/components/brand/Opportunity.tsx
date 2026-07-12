import { motion } from "motion/react";
import { Award, Zap, TrendingUp, Users, Target, ShieldCheck, Gem } from "lucide-react";
import { TESTIMONIALS_SEED } from "../../data/mockData";

interface OpportunityProps {
  onNavigate: (page: string) => void;
}

export default function Opportunity({ onNavigate }: OpportunityProps) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans text-left relative overflow-hidden">
      {/* Background visual shapes */}
      <div className="absolute top-[10%] left-[20%] w-[550px] h-[550px] rounded-full bg-emerald-700/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[450px] h-[450px] rounded-full bg-[color:var(--color-gold)]/5 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Header Hero Title */}
        <div className="space-y-4 max-w-2xl">
          <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Luminous Careers</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            Build Generational Wealth, Settle Instantly
          </h1>
          <p className="text-stone-400 text-sm sm:text-base leading-relaxed">
            The Songtai Life distributor model is engineered with simplicity, clear targets, and direct West African mobile money handshakes, removing the complexity of multi-tiered obstacles.
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate("join")}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            >
              Start Your Wellness Franchise
            </button>
          </div>
        </div>

        {/* 1. WHY JOIN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-t border-stone-900 pt-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" /> Why Choose Songtai Life?
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Most direct-selling structures depend on complex parameters, forcing members to wait weeks or buy high volumes to sustain their active state. We offer zero recurring maintenance requirements, direct adjacency tree tracking, and biweekly unilevel overrides.
            </p>
            <div className="space-y-2.5 pt-2">
              {[
                "Instant mobile money withdrawals settled with MeSomb gateway integration.",
                "Zero mandatory monthly volume purchases to qualify for direct refer overrides.",
                "Premium physical training academy centers in Yaoundé, Douala, and Bafoussam."
              ].map((point, idx) => (
                <div key={idx} className="flex items-start gap-2 text-stone-400 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-stone-900/30 border border-stone-850 p-6 rounded-[28px] space-y-6">
            <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">Starter Packages (One-off Activation)</span>
            
            <div className="space-y-3">
              {[
                { name: "Bronze Starter Pack", price: "25,000 XAF", pv: "+50 PV", desc: "Includes Cellular Vitality capsule set + digital distributor profile." },
                { name: "Silver Builder Pack", price: "75,000 XAF", pv: "+160 PV", desc: "Includes 3 capsules set + Luminous Gold serum + business brochures." },
                { name: "Gold Leader Pack", price: "180,000 XAF", pv: "+420 PV", desc: "Complete botanical suite, free regional physical academy access, priority commission pools." }
              ].map((pack, idx) => (
                <div key={idx} className="p-4 bg-stone-950 border border-stone-900 hover:border-emerald-950 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-white">{pack.name}</h4>
                    <p className="text-stone-500 text-[10px] mt-0.5">{pack.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-[color:var(--color-gold)] block">{pack.price}</span>
                    <span className="text-emerald-400 text-[10px] font-mono">{pack.pv}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. VISUAL COMPENSATION OVERVIEW */}
        <div className="space-y-8 border-t border-stone-900 pt-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-widest text-[color:var(--color-gold)] font-bold">Unilevel Incentives</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Interactive Commission Framework</h2>
            <p className="text-stone-400 text-xs sm:text-sm">We share 52% of all product sales volumes back into our leadership structures.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {[
              {
                title: "10% Direct Refer Override",
                desc: "Earn a high-margin 10% direct commission in XAF immediately when your direct recruits purchase or order any catalog products.",
                icon: <Zap className="w-5 h-5 text-emerald-400" />
              },
              {
                title: "Unilevel Volume Overrides",
                desc: "Gain overriding bonuses from 3% down to 8% across 5 generations of downlines, calculated and credited biweekly based on overall team PV.",
                icon: <TrendingUp className="w-5 h-5 text-[color:var(--color-gold)]" />
              },
              {
                title: "Global Leadership Pools",
                desc: "Active Platinum & Diamond directors receive dedicated portions from our 3% global company pool, rewarding physical training support.",
                icon: <Gem className="w-5 h-5 text-emerald-400" />
              }
            ].map((col, idx) => (
              <div key={idx} className="bg-stone-900/10 border border-stone-850 p-6 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="p-2.5 bg-stone-950 border border-stone-850 text-white rounded-xl w-fit">
                    {col.icon}
                  </div>
                  <h4 className="font-extrabold text-white text-base leading-snug">{col.title}</h4>
                  <p className="text-stone-400 text-xs leading-relaxed">{col.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. ROAD TO SUCCESS STORIES */}
        <div className="space-y-8 border-t border-stone-900 pt-12">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" /> Leaders of the Sovereign Circle
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS_SEED.map((t, idx) => (
              <div key={idx} className="bg-stone-900/20 border border-stone-850 p-6 rounded-2xl flex flex-col justify-between">
                <p className="text-stone-300 text-xs italic leading-relaxed">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-stone-900/60">
                  <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-stone-850" />
                  <div>
                    <h5 className="font-bold text-white text-xs">{t.name}</h5>
                    <span className="text-stone-500 text-[9px] uppercase font-bold block">{t.rank} • {t.region}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
