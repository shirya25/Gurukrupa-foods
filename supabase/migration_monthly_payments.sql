-- Run this in Supabase SQL editor

create table if not exists monthly_payments (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
  year        int not null,
  month       int not null check (month between 1 and 12),
  is_paid     boolean not null default false,
  paid_at     timestamptz,
  created_at  timestamptz default now(),
  unique (customer_id, year, month)
);

create index if not exists idx_monthly_payments_customer on monthly_payments(customer_id);
create index if not exists idx_monthly_payments_ym on monthly_payments(year, month);

-- RLS
alter table monthly_payments enable row level security;

create policy "monthly_payments: owner all"
  on monthly_payments for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');

create policy "monthly_payments: customer own"
  on monthly_payments for select
  using (customer_id = auth_customer_id());

