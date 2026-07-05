-- 0010: Homepage Sections CMS table
-- Makes every hardcoded homepage text string admin-editable.

create table if not exists public.homepage_sections (
  id          uuid primary key default uuid_generate_v4(),
  section_key text unique not null,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz default now(),
  updated_by  uuid references public.profiles(id)
);

alter table public.homepage_sections enable row level security;

drop policy if exists "public_read_homepage_sections"  on public.homepage_sections;
drop policy if exists "admin_homepage_sections_all"    on public.homepage_sections;

create policy "public_read_homepage_sections"
  on public.homepage_sections for select using (true);

create policy "admin_homepage_sections_all"
  on public.homepage_sections for all
  using (is_admin()) with check (is_admin());

-- Seed default content (do nothing on conflict so live edits survive re-runs)
insert into public.homepage_sections (section_key, content) values
  ('hero', '{
    "headline_en": "Transform Your Life With Songtai Life",
    "headline_fr": "Transformez Votre Vie Avec Songtai Life",
    "subheadline_en": "Health. Opportunity. Prosperity.",
    "subheadline_fr": "Santé. Opportunité. Prospérité.",
    "cta_primary_en": "Become a Distributor",
    "cta_primary_fr": "Devenir Distributeur",
    "cta_secondary_en": "Explore Products",
    "cta_secondary_fr": "Explorer les Produits"
  }'::jsonb),
  ('company_intro', '{
    "story_en": "",
    "story_fr": "",
    "stat_countries": 12,
    "stat_members": 42800,
    "stat_products": 24,
    "stat_years": 8,
    "stat_awards": 15
  }'::jsonb),
  ('opportunity', '{
    "steps": [
      {"label_en": "Join",  "label_fr": "Rejoindre",  "desc_en": "Register as a distributor and access our full product line.",       "desc_fr": "Inscrivez-vous comme distributeur et accédez à toute notre gamme de produits."},
      {"label_en": "Grow",  "label_fr": "Grandir",    "desc_en": "Build your customer base and recruit your downline team.",          "desc_fr": "Développez votre clientèle et recrutez votre équipe de filleuls."},
      {"label_en": "Lead",  "label_fr": "Diriger",    "desc_en": "Mentor your team, earn leadership bonuses, and level up your rank.","desc_fr": "Encadrez votre équipe, gagnez des bonus de leadership et montez en grade."},
      {"label_en": "Earn",  "label_fr": "Gagner",     "desc_en": "Unlock mobile money payouts, rank rewards, and monthly residuals.",  "desc_fr": "Débloquez des paiements mobile money, des récompenses de rang et des revenus résiduels mensuels."}
    ]
  }'::jsonb),
  ('benefits', '{
    "headline_en": "Why Join Songtai Life?",
    "headline_fr": "Pourquoi Rejoindre Songtai Life ?",
    "sub_en": "Proven products. Real commissions. A community that grows together.",
    "sub_fr": "Des produits éprouvés. De vraies commissions. Une communauté qui grandit ensemble.",
    "items": [
      {"icon": "Award",     "title_en": "Rank-Based Rewards",        "title_fr": "Récompenses basées sur le rang",    "desc_en": "Climb from Bronze to Diamond and unlock exclusive bonuses at every level.",                      "desc_fr": "Passez de Bronze à Diamond et débloquez des bonus exclusifs à chaque niveau."},
      {"icon": "TrendingUp","title_en": "5-Level Commission Engine", "title_fr": "Moteur de commission sur 5 niveaux","desc_en": "Earn unilevel overrides up to 5 levels deep — your team''s success is your success.",           "desc_fr": "Gagnez des remplacements unilevel jusqu''à 5 niveaux — le succès de votre équipe est le vôtre."},
      {"icon": "Users",     "title_en": "Mobile Money Payouts",      "title_fr": "Paiements en argent mobile",        "desc_en": "Receive commissions directly to your MTN or Orange Money wallet — no bank account needed.", "desc_fr": "Recevez des commissions directement sur votre portefeuille MTN ou Orange Money."}
    ]
  }'::jsonb),
  ('newsletter', '{
    "headline_en": "Stay Ahead With Insider News",
    "headline_fr": "Restez en avance avec les nouvelles exclusives",
    "body_en": "Product drops, rank promotions, event alerts, and distributor tips — straight to your inbox.",
    "body_fr": "Nouveaux produits, promotions de rang, alertes événements et conseils de distributeur — directement dans votre boîte mail."
  }'::jsonb)
on conflict (section_key) do nothing;
