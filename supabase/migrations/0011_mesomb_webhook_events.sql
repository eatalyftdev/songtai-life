-- MeSomb webhook event deduplication ledger
create table if not exists mesomb_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz default now()
);

alter table mesomb_webhook_events enable row level security;

-- Only admins can read webhook events; Edge Function / service role writes
create policy "admin_read_webhook_events"
  on mesomb_webhook_events for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin','superadmin')
    )
  );

-- Add MeSomb transaction ID column to orders for reconciliation
alter table orders
  add column if not exists mesomb_transaction_id text;
