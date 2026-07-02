-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. Create Product Categories
create table product_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null
);

-- 3. Create Products Table
create table products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  price_xaf integer not null,
  pv_points integer default 0,
  category_id uuid references product_categories(id),
  images text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. Create Blog Categories
create table blog_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null
);

-- 5. Create Blog Posts Table
create table blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  body text not null,
  category_id uuid references blog_categories(id),
  status text default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz default now()
);

-- 6. Create Events Table
create table events (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  capacity integer
);

-- 7. Create Event Registrations Table
create table event_registrations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) not null,
  user_id uuid references auth.users(id),
  status text default 'registered' check (status in ('registered','attended','cancelled')),
  unique(event_id, user_id)
);

-- 8. Create Gallery Images Table
create table gallery_images (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  album text,
  caption text
);

-- 9. Create Testimonials Table
create table testimonials (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  rank text,
  region text,
  quote text not null,
  video_url text
);

-- 10. Create Contact Messages Table
create table contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  message text not null,
  spam_flagged boolean default false,
  created_at timestamptz default now()
);

-- 11. Create Newsletter Subscribers Table
create table newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  locale text default 'en',
  confirmed boolean default false
);

-- 12. Row Level Security Policies
alter table products enable row level security;
alter table blog_posts enable row level security;
alter table events enable row level security;
alter table gallery_images enable row level security;
alter table testimonials enable row level security;
alter table contact_messages enable row level security;
alter table newsletter_subscribers enable row level security;

create policy "Public read active products" on products for select using (is_active = true);
create policy "Public read published posts" on blog_posts for select using (status = 'published');
create policy "Public read events" on events for select using (true);
create policy "Public read gallery" on gallery_images for select using (true);
create policy "Public read testimonials" on testimonials for select using (true);

create policy "Public insert contact" on contact_messages for insert with check (true);
create policy "Public insert newsletter" on newsletter_subscribers for insert with check (true);

-- 13. Seed Initial Sample Data
-- Seed Product Categories
insert into product_categories (id, name, slug) values
('f8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'Health', 'health'),
('f8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'Beauty', 'beauty'),
('f8d68965-0a18-47e2-895c-9c7ef2b6e1b3', 'Agriculture', 'agriculture'),
('f8d68965-0a18-47e2-895c-9c7ef2b6e1b4', 'New Arrivals', 'new-arrivals')
on conflict (slug) do nothing;

-- Seed Products
insert into products (slug, name, description, price_xaf, pv_points, category_id, images, is_active) values
('cellular-vitality', 'Cellular Vitality Capsules', 'High-purity organic moringa and ginseng complex designed to renew cellular energy and boost regional immune health.', 18500, 25, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b1', array['https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800'], true),
('luminous-elixir', 'Luminous Facial Elixir', 'Anti-aging daily serum rich in shea oil esters, wild ginger, and vitamin C to smooth and brighten West African skin.', 22000, 30, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b2', array['https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=800'], true),
('bio-yield-booster', 'Bio-Yield Soil Booster', '100% ecological organic agricultural fertilizer to accelerate seed germination and crop yield in Cameroon farm soils.', 15000, 20, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b3', array['https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=800'], true),
('shampoo-bar', 'Botanical Purifying Shampoo Bar', 'Zero-waste premium conditioning hair cleanser formulated with wild tea tree and rosemary leaf extracts.', 8500, 10, 'f8d68965-0a18-47e2-895c-9c7ef2b6e1b4', array['https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&q=80&w=800'], true)
on conflict (slug) do nothing;

-- Seed Blog Categories
insert into blog_categories (id, name) values
('a8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'Nutraceuticals'),
('a8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'Direct Selling'),
('a8d68965-0a18-47e2-895c-9c7ef2b6e1b3', 'Eco Agriculture')
on conflict do nothing;

-- Seed Blog Posts
insert into blog_posts (slug, title, body, category_id, status) values
('moringa-cellular-benefits', 'Sourcing Northern Moringa: Active Botanical Cellular Benefits', 'Moringa Oleifera grown in northern Cameroon boasts extraordinary concentration of vitamins and active antioxidants...', 'a8d68965-0a18-47e2-895c-9c7ef2b6e1b1', 'published'),
('unilevel-mlm-growth', 'Unlocking Sovereign Income: Mastering the Unilevel Compensation Matrix', 'The direct-selling business template represents a reliable path toward organic network growth across pan-African markets...', 'a8d68965-0a18-47e2-895c-9c7ef2b6e1b2', 'published')
on conflict (slug) do nothing;

-- Seed Events
insert into events (slug, title, start_at, location, capacity) values
('yaounde-summit-2026', 'National Leadership Summit - Yaoundé', '2026-10-15T09:00:00Z', 'Avenue Kennedy Conference Hall, Yaoundé', 300),
('douala-workshop-2026', 'Douala Bio-Yield Agricultural Workshop', '2026-11-05T10:00:00Z', 'Akwa District Business Hotel, Douala', 150)
on conflict (slug) do nothing;

-- Seed Testimonials
insert into testimonials (name, rank, region, quote) values
('Sophie Ebongue', 'Diamond Director', 'Littoral (Douala)', 'Songtai Life completely reshaped my perspective on micro-franchise networks. By introducing organic wellness supplements to our community, my team secured financial independence for over 50 local families within six months.'),
('Jean-Paul Amadou', 'Gold Distributor', 'North (Garoua)', 'The Bio-Yield soil organic enhancer has dramatically increased our corn harvest yields by over 40% while rebuilding the microbial life of our soils. This is the product that direct-selling in Cameroon has been waiting for.')
on conflict do nothing;

-- Seed Gallery Images
insert into gallery_images (url, album, caption) values
('https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600', 'Farms', 'Direct botanical sourcing with our agricultural farming cooperatives.'),
('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=600', 'Summits', 'Our physical business forum training and entrepreneur coaching sessions in Douala.')
on conflict do nothing;
