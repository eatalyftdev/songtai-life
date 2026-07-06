-- Unified page_sections table for site-wide static content CMS
create table if not exists page_sections (
  id uuid primary key default uuid_generate_v4(),
  page_key text not null,
  section_key text not null,
  content jsonb not null default '{}',
  display_order integer default 0,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id),
  unique (page_key, section_key)
);

alter table page_sections enable row level security;

create policy "public_read_page_sections"
  on page_sections for select using (true);

create policy "admin_page_sections_all"
  on page_sections for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'superadmin', 'content_editor')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'superadmin', 'content_editor')
    )
  );

-- Trigger to auto-update updated_at
create or replace function update_page_sections_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger page_sections_updated_at
  before update on page_sections
  for each row execute function update_page_sections_timestamp();

-- Migrate existing homepage_sections data into page_sections
insert into page_sections (page_key, section_key, content)
select 'home', section_key, content from homepage_sections
on conflict (page_key, section_key) do nothing;
