import { motion } from "motion/react";
import { Shield, Sparkles, Award, Sprout, Heart, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-16 font-sans relative overflow-hidden text-left">
      {/* Background elements */}
      <div className="absolute top-[15%] left-[5%] w-[400px] h-[400px] rounded-full bg-[#0A7D32]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-[#C9A227]/5 blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Header */}
        <div className="space-y-4">
          <span className="text-xs uppercase tracking-widest text-[#C9A227] font-bold">About Songtai Life</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            Empowering Through Science, Sourcing Locally
          </h1>
          <p className="text-stone-400 text-sm max-w-2xl leading-relaxed">
            Our mission is to engineer West Africa’s most respected wellness brand, transforming biological resources into sovereign streams of health and economic security.
          </p>
        </div>

        {/* 1. Our Story */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-stone-900/30 border border-stone-850 p-8 rounded-[32px]">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-400" /> Our Story & Heritage
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Songtai Life began with a single vision in Douala: to bridge the gap between traditional West African plant wisdom and cutting-edge pharmaceutical standards. We realized that our local crops—such as northern Moringa, wild ginger, shea, and adaptogenic roots—possessed incredible bioactive benefits that, when scientifically processed, could transform lives.
            </p>
            <p className="text-stone-400 text-xs leading-relaxed">
              Today, we have established direct-trade partnerships with organic agricultural cooperatives across Cameroon's West, Centre, and Littoral regions, securing premium incomes for local farmers while delivering pure, high-potency products to our global network of distributors.
            </p>
          </div>
          <div className="aspect-video rounded-2xl overflow-hidden bg-stone-950 border border-stone-800">
            <img 
              src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600" 
              alt="Cameroon organic farms"
              className="w-full h-full object-cover opacity-80"
            />
          </div>
        </div>

        {/* 2. Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-stone-900/10 border border-stone-850 p-8 rounded-[24px] space-y-3">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-emerald-400" /> Our Sovereign Mission
            </h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              To deliver premium-quality botanical solutions and direct-selling templates that provide families with robust health, biological food yields, and sovereign financial independence.
            </p>
          </div>

          <div className="bg-stone-900/10 border border-stone-850 p-8 rounded-[24px] space-y-3">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C9A227]" /> Our Pan-African Vision
            </h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              To become the absolute standard of organic direct-marketing across Sub-Saharan Africa, proving that local natural resources can fuel global-scale enterprises.
            </p>
          </div>
        </div>

        {/* 3. Leadership */}
        <div className="space-y-8">
          <h3 className="text-xl font-bold text-white border-b border-stone-900 pb-2">Our Executive Leadership</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Dr. Elena Ndip",
                role: "Chief Medical & Botanical Officer",
                desc: "Over 18 years of clinical pharmacology, specializes in phytomedicine research at the University of Yaoundé.",
                image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300"
              },
              {
                name: "Francois Beyene",
                role: "Agronomist & Sourcing Expert",
                desc: "Advises our cacao, moringa, and coffee farmer cooperatives in Bafoussam on biological growth multipliers.",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300"
              },
              {
                name: "Amadou Diallo",
                role: "Double Diamond Global Ambassador",
                desc: "An executive business coach who has mentored thousands of direct-selling entrepreneurs throughout CEMAC.",
                image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300"
              }
            ].map((member, idx) => (
              <div key={idx} className="bg-stone-900/30 border border-stone-850 p-6 rounded-2xl space-y-4">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover border border-stone-800"
                />
                <div>
                  <h4 className="font-bold text-white text-base">{member.name}</h4>
                  <span className="text-[10px] text-[#C9A227] font-bold block uppercase">{member.role}</span>
                  <p className="text-stone-400 text-xs mt-2.5 leading-relaxed">{member.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Certifications */}
        <div className="bg-stone-900/40 border border-stone-850 p-8 rounded-[32px] space-y-6">
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-white text-xl flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> Guaranteed Quality & Certifications
            </h3>
            <p className="text-stone-400 text-xs">Every Songtai Life release complies strictly with local and international food & drug safety mandates.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {[
              { label: "MINSANTE Approved", sub: "Ministry of Public Health Cameroon" },
              { label: "100% Organic Sourcing", sub: "Biological chemical-free crops" },
              { label: "HALAL Certified", sub: "Pure processing standards" },
              { label: "ISO 9001 Compliant", sub: "Global quality frameworks" }
            ].map((cert, idx) => (
              <div key={idx} className="bg-stone-950 p-4 rounded-xl border border-stone-900/80 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#C9A227]" />
                  <span className="text-white text-xs font-bold">{cert.label}</span>
                </div>
                <p className="text-stone-500 text-[10px]">{cert.sub}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
