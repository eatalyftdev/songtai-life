export interface ProductSeed {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceXaf: number;
  pvPoints: number;
  category: "Health" | "Beauty" | "Home Care" | "Agriculture" | "New Arrivals";
  images: string[];
  isActive: boolean;
  benefits: string[];
  usage: string;
}

export interface BlogPostSeed {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: "Wellness" | "MLM Success" | "Agri-Tech" | "Beauty Tips";
  publishedAt: string;
  image: string;
  author: string;
}

export interface EventSeed {
  id: string;
  slug: string;
  title: string;
  startAt: string; // ISO String
  endAt: string;
  location: string;
  capacity: number;
  description: string;
  image: string;
}

export interface GalleryImageSeed {
  id: string;
  url: string;
  album: "Conventions" | "Product Launches" | "Field Training" | "Community Outreach";
  caption: string;
}

export interface TestimonialSeed {
  id: string;
  name: string;
  rank: string;
  region: string;
  quote: string;
  image: string;
}

export const PRODUCTS_SEED: ProductSeed[] = [
  {
    id: "prod-cell-vital",
    slug: "cellular-vitality-pro",
    name: "Cellular Vitality Pro",
    description: "Premium wellness capsule formulated with advanced antioxidants, organic African moringa extracts, and active micro-nutrients. Promotes deep energetic recovery, cellular rejuvenation, and supports your natural daily immune system defense with high-potency bio-availability.",
    priceXaf: 32000,
    pvPoints: 60,
    category: "Health",
    images: [
      "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=800"
    ],
    isActive: true,
    benefits: [
      "Enhances cellular rejuvenation and everyday bio-energy",
      "Rich in natural antioxidants from premium moringa and green tea",
      "Improves daily physical stamina and mental clarity",
      "Formulated for rapid nutrient absorption"
    ],
    usage: "Take 2 capsules daily in the morning with a full glass of warm water, preferably before meals."
  },
  {
    id: "prod-luminous-gold",
    slug: "luminous-gold-serum",
    name: "Luminous Gold Elixir",
    description: "An ultra-premium revitalizing face serum powered by pure rosehip extract, cold-pressed argan oils, and light-reflecting natural minerals. Designed to combat hyperpigmentation, smooth fine lines, and give your skin a beautiful, balanced, golden radiance perfect for the West African climate.",
    priceXaf: 28500,
    pvPoints: 50,
    category: "Beauty",
    images: [
      "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=800"
    ],
    isActive: true,
    benefits: [
      "Visibly brightens and unifies skin tone from first week",
      "Protects against environmental dust and daily stress damage",
      "Intensely hydrates without clogging pores",
      "Optimized for deep African skin types and humid conditions"
    ],
    usage: "Apply 3-4 drops to cleansed face and neck every evening. Gently tap in upward circular motions."
  },
  {
    id: "prod-bio-yield",
    slug: "bio-yield-max-liquid",
    name: "Bio-Yield Max (Agriculture)",
    description: "An ecological liquid bio-stimulant and fertilizer engineered to maximize harvest yield and restore crop soil microbiome. Highly trusted by Cameroonian growers for cacao, coffee, maize, and organic vegetable cultivation. Accelerates seed root-depth development naturally.",
    priceXaf: 18000,
    pvPoints: 35,
    category: "Agriculture",
    images: [
      "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&q=80&w=800"
    ],
    isActive: true,
    benefits: [
      "Increases overall crop output and fruit-weight by up to 35%",
      "100% biodegradable and non-toxic to beneficial field insects",
      "Restores microbial balance and nitrogen fixation in depleted soil",
      "Substantially decreases water requirements via improved root water-retention"
    ],
    usage: "Dilute 50ml of Bio-Yield Max in 15 Liters of irrigation water. Apply to roots or foliage twice per harvest cycle."
  },
  {
    id: "prod-shea-butter-luxe",
    slug: "shea-nourish-body-butter",
    name: "Shea Nourish Body Butter",
    description: "Luxuriously whipped skin butter sourcing raw organic shea from northern Cameroon fields. Combined with organic coconut cream and sweet almond oils, this rich moisturizer locks in deep, long-lasting hydration and repairs dried or damaged skin layers.",
    priceXaf: 12500,
    pvPoints: 22,
    category: "Beauty",
    images: [
      "https://images.unsplash.com/photo-1556229174-5e42a09e45af?auto=format&fit=crop&q=80&w=800"
    ],
    isActive: true,
    benefits: [
      "Provides 24-hour continuous moisture retention",
      "Calms skin irritation, stretch marks, and extreme dryness",
      "Sourced from local organic fair-trade co-operatives",
      "Naturally rich in essential vitamins A, E, and F"
    ],
    usage: "Apply generously over your body immediately after bathing, paying special attention to dry patches, elbows, and knees."
  },
  {
    id: "prod-herb-digest",
    slug: "herbal-digestive-tea",
    name: "Herbal Digestive Cleanse",
    description: "A calming morning and evening infusion of lemongrass, premium local ginger, and high-purity senna leaves. Designed to accelerate healthy digestive metabolism, naturally flush out harmful internal cellular toxins, and promote deep gastrointestinal comfort.",
    priceXaf: 9500,
    pvPoints: 18,
    category: "Health",
    images: [
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800"
    ],
    isActive: true,
    benefits: [
      "Gently cleanses and detoxifies the digestive tract",
      "Alleviates bloating and supports healthy weight management",
      "Crafted with hand-picked organic leaves from West African slopes",
      "Refreshing and naturally caffeine-free"
    ],
    usage: "Steep 1 tea bag in 250ml of boiling water for 5-8 minutes. Drink warm before bed or after heavy meals."
  },
  {
    id: "prod-cocoa-gold",
    slug: "cocoa-gold-power",
    name: "Cocoa Gold Energizer",
    description: "Pure Cameroon single-origin cacao blend fortified with organic ashwagandha and red ginseng extract. Packed with delicious premium natural chocolate taste and healthy vital minerals. Keeps you energized, focused, and stress-free all day long.",
    priceXaf: 14500,
    pvPoints: 26,
    category: "New Arrivals",
    images: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=800"
    ],
    isActive: true,
    benefits: [
      "Provides steady, long-lasting energy without caffeine crashes",
      "Supports adaptogenic stress relief and balanced mood state",
      "Sourced with 100% fair-trade premium Cameroonian cocoa beans",
      "Boosts daily focus and overall cardiovascular wellness"
    ],
    usage: "Mix 1 rounded tablespoon in warm milk or hot water. Stir thoroughly and enjoy as a daily wellness beverage."
  }
];

export const BLOG_SEED: BlogPostSeed[] = [
  {
    id: "blog-moringa-power",
    slug: "harnessing-moringa-african-health",
    title: "Harnessing the Green Power of Moringa for West African Wellness",
    excerpt: "Discover why local organic Moringa is designated as the 'miracle tree' and how integrating its powder into your daily lifestyle can fight fatigue, lower blood pressure, and rejuvenate cellular vitality.",
    body: `### The Mighty Miracle Tree of West Africa

For generations, the Moringa Oleifera tree has stood tall in our villages, a silent sentinel of supreme nutrition and ancestral healing. Now, modern biotechnology and Songtai Life's strict sourcing standards are bringing this incredible organic resource to premium shelves across Cameroon and the continent.

Moringa leaves contain an astonishing nutritional profile, boasting more Vitamin C than oranges, more calcium than milk, and more iron than spinach. In our humid climate, maintaining balanced immune defense is critical, and Moringa acts as a natural shield.

#### Three Core Health Advantages of Daily Moringa:
1. **Unparalleled Cellular Rejuvenation**: The extreme concentration of bio-active flavonoids neutralizes free radicals, reversing daily metabolic damage.
2. **Natural Blood Pressure Control**: High levels of potassium and organic active isothiocyanates help stabilize vascular tension.
3. **Sustained Energetic Focus**: Unlike chemical stimulants or coffee, Moringa delivers organic stamina by optimizing cellular energy release.

At Songtai Life, we strictly cold-process our leaves in northern Cameroon cooperatives to preserve 100% of the active proteins, giving you the absolute highest potency in every dose. Reclaim your vitality naturally!`,
    category: "Wellness",
    publishedAt: "2026-06-15",
    image: "https://images.unsplash.com/photo-1543589077-47d8160677a0?auto=format&fit=crop&q=80&w=800",
    author: "Dr. Elena Ndip, Chief Medical Advisor"
  },
  {
    id: "blog-mlm-success",
    slug: "building-generational-wealth-cameroon",
    title: "How to Build True Generational Wealth Through Direct Selling in Cameroon",
    excerpt: "Network marketing isn't just about sales — it's about leading. Explore our Unilevel reward framework and learn the direct steps to scale from Bronze to Diamond Diamond leadership ranks.",
    body: `### Step-by-Step Direct Selling Leadership

Many embark on direct selling hoping for a quick side income. But true, compounding wealth in West Africa's vibrant markets belongs to those who view this path as an educational franchise and a legacy.

At Songtai Life, our binary and unilevel compensation structures are engineered not for complex calculations, but to directly reward genuine team-building, active training, and product-focused overrides.

#### The Three Golden Pillars of Direct Sales Expansion:
- **Build Depth, Not Just Width**: Focus heavily on mentoring your direct referrals (Generation 1) to recruit and train their downline (Generation 2). A deep, active tree yields robust monthly team overrides.
- **Focus Completely on Product Volume (PV)**: High rank promotions like Diamond are strictly tied to product consumption and genuine customer satisfaction. Ensure your downlines use and advocate for our Cellular Vitality line.
- **Utilize Mobile Handsets for Modern Networking**: Use WhatsApp groups and physical meetings in Yaoundé or Douala to share digital success portfolios, host product samplings, and instantly handle onboarding.

By leveraging Songtai Life's fair payout structures via MeSomb, you can secure reliable, direct mobile money transactions weekly. Turn your dedication into a lifelong digital income machine!`,
    category: "MLM Success",
    publishedAt: "2026-06-28",
    image: "https://images.unsplash.com/photo-1552581230-c01bc9148c00?auto=format&fit=crop&q=80&w=800",
    author: "Amadou Diallo, Double Diamond Ambassador"
  },
  {
    id: "blog-agri-yield",
    slug: "organic-boosters-changing-cacao-farming",
    title: "How Organic Bio-Stimulants are Revolutionizing Cameroon's Cacao Farming",
    excerpt: "Chemical run-offs are degrading soils across central Cameroon. Learn how eco-friendly liquid stimulants like Bio-Yield Max restore crops, enhance fruit weights, and secure fair-trade export premiums.",
    body: `### Restoring the Soils of Our Ancestors

Cameroon's cocoa and coffee farmers are the literal backbone of our national pride. However, years of harsh synthetic pesticides and low-grade chemical fertilizers have left soil profiles depleted, acidic, and increasingly vulnerable to root rot.

The solution lies in bio-technology. Songtai Life's Bio-Yield Max offers an ecological alternative, infusing natural nitrogen-fixing bacteria, kelp-extract minerals, and humic acids directly into crop roots.

#### Impact of Liquid Bio-Stimulants on Local Agriculture:
1. **Dramatic Root Network Enlargement**: Crops absorb up to 40% more soil water, surviving sudden drought spells between rainy seasons.
2. **Organic Export Premium**: European and international buyers are paying premium rates for fair-trade, chemical-free raw cacao. Sourcing organic fertilizers opens global markets.
3. **Soil Restoration**: Rather than destroying soil health, Bio-Yield Max feeds the local earthworms and microbes, ensuring the next generation can farm the same soil.

By switching to eco-fertilization, our cooperative farmers in South and West regions report record-setting harvest yields while preserving their ancestral fields. Invest in sustainable abundance.`,
    category: "Agri-Tech",
    publishedAt: "2026-05-10",
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800",
    author: "Francois Beyene, Agronomist Consultant"
  }
];

export const EVENTS_SEED: EventSeed[] = [
  {
    id: "event-annual-conv",
    slug: "songtai-annual-convention-2026",
    title: "Songtai Life Grand Annual Convention 2026",
    startAt: "2026-08-15T09:00:00Z", // Scheduled in the future (August 2026)
    endAt: "2026-08-15T18:00:00Z",
    location: "Palais des Sports, Yaoundé",
    capacity: 3500,
    description: "Join thousands of visionary leaders, health advocates, and agricultural partners for the largest wellness event of the year! Witness spectacular rank awards, new product releases, live inspirational panels, and top-tier pan-African leadership training. Special musical guests and gala dinner included.",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "event-douala-beauty",
    slug: "luminous-beauty-expo-douala",
    title: "Luminous Beauty & Skincare Masterclass",
    startAt: "2026-07-20T14:00:00Z", // Upcoming
    endAt: "2026-07-20T18:00:00Z",
    location: "Krystal Palace Hotel, Douala",
    capacity: 250,
    description: "Discover the science of African skincare with local dermatologists and beauty experts. Get hands-on experience with our Luminous Gold face line, custom product trials, and exclusive beauty distributor business templates. Registration includes an exclusive product gift pack.",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: "event-agri-bafoussam",
    slug: "agri-tech-forum-bafoussam",
    title: "Sustainable Agri-Yield Forum Bafoussam",
    startAt: "2026-09-02T08:00:00Z",
    endAt: "2026-09-02T16:00:00Z",
    location: "Maison du Parti, Bafoussam",
    capacity: 500,
    description: "A focused, field-level gathering of cooperative leaders, smallholder farmers, and agricultural distributors in the West region. Learn modern biological soil remediation techniques, optimize crop yields using organic catalysts, and discover how to build highly profitable bio-supply operations.",
    image: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800"
  }
];

export const GALLERY_SEED: GalleryImageSeed[] = [
  {
    id: "gal-1",
    url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800",
    album: "Conventions",
    caption: "Diamond Leaders receiving their car award plaques on stage in Yaoundé."
  },
  {
    id: "gal-2",
    url: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&q=80&w=800",
    album: "Product Launches",
    caption: "Official unveiling of Luminous Gold Serum at Douala Grand Gala."
  },
  {
    id: "gal-3",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800",
    album: "Field Training",
    caption: "Young Cameroonian entrepreneurs mastering unilevel binary volume tracking."
  },
  {
    id: "gal-4",
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=800",
    album: "Field Training",
    caption: "Cooperative leaders holding high-yield cacao pods treated with Bio-Yield Max."
  },
  {
    id: "gal-5",
    url: "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&q=80&w=800",
    album: "Community Outreach",
    caption: "Songtai Foundations donation drive for medical equipment in Yaoundé."
  },
  {
    id: "gal-6",
    url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=800",
    album: "Product Launches",
    caption: "Educational focus panels outlining nutritional guidelines to new members."
  }
];

export const TESTIMONIALS_SEED: TestimonialSeed[] = [
  {
    id: "test-1",
    name: "Sita Oumarou",
    rank: "Diamond Director",
    region: "Douala, Littoral",
    quote: "Songtai Life completely rewrote my family's economic future. In less than 18 months, building a team of dedicated health advocates, my monthly commissions went from a survival range to buying my own home. Sourcing wellness products that truly work is the key.",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "test-2",
    name: "Dr. Amadou Diallo",
    rank: "Gold Ambassador",
    region: "Bafoussam, Ouest",
    quote: "As a health consultant, I am highly selective of nutritional supplements. Songtai's Cellular Vitality formulas have provided clinically visible support to my clients' metabolic strength. The business model acts as a wonderful financial lift for young graduates.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "test-3",
    name: "Sovereign Florence",
    rank: "Platinum Leader",
    region: "Yaoundé, Centre",
    quote: "I was a high school teacher looking for flexible hours. Songtai's mentorship program, combined with the instant mobile money payments via MeSomb, gave me the courage to step out. Today I lead over 800 distributors across central Cameroon.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300"
  }
];
