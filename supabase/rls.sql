-- ============================================================
-- RUN THIS AFTER schema.sql
-- Adds: user_profiles table, RLS on all tables, policies
-- ============================================================

-- ===== USER PROFILES =====
-- Links auth.users → customers or owner role
create table if not exists user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null check (role in ('customer', 'owner')),
  customer_id bigint references customers(id) on delete set null,
  created_at  timestamptz default now()
);

comment on table user_profiles is
  'One row per auth user. role=owner has no customer_id.';

-- ===== ENABLE RLS ON ALL TABLES =====
alter table customers       enable row level security;
alter table menu_items      enable row level security;
alter table daily_menus     enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table payments        enable row level security;
alter table user_profiles   enable row level security;

-- ===== HELPER FUNCTIONS =====
-- Returns the calling user's role ('customer' | 'owner' | null)
create or replace function auth_role()
returns text language sql stable security definer as $$
  select role from user_profiles where id = auth.uid();
$$;

-- Returns the calling customer's linked customer_id (null if owner/anonymous)
create or replace function auth_customer_id()
returns bigint language sql stable security definer as $$
  select customer_id from user_profiles
  where id = auth.uid() and role = 'customer';
$$;

-- ===== USER_PROFILES POLICIES =====
-- Users see only their own profile row
create policy "profile: own read"
  on user_profiles for select
  using (id = auth.uid());
-- ===== CUSTOMERS POLICIES =====
create policy "customers: owner all"
  on customers for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');

create policy "customers: own row"
  on customers for select
  using (id = auth_customer_id());

-- ===== MENU_ITEMS POLICIES =====
-- Anyone authenticated can read active items
create policy "menu_items: auth read active"
  on menu_items for select
  using (auth.uid() is not null and is_active = true);

-- Owner can do everything
create policy "menu_items: owner all"
  on menu_items for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');

-- ===== DAILY_MENUS POLICIES =====
create policy "daily_menus: auth read"
  on daily_menus for select
  using (auth.uid() is not null);

create policy "daily_menus: owner all"
  on daily_menus for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');

-- ===== ORDERS POLICIES =====
create policy "orders: owner all"
  on orders for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');

create policy "orders: own rows"
  on orders for select
  using (customer_id = auth_customer_id());

create policy "orders: customer insert own"
  on orders for insert
  with check (customer_id = auth_customer_id());

-- ===== ORDER_ITEMS POLICIES =====
create policy "order_items: owner all"
  on order_items for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');

-- Customers see only items belonging to their orders
create policy "order_items: own orders"
  on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id
        and o.customer_id = auth_customer_id()
    )
  );

-- ===== PAYMENTS POLICIES =====
create policy "payments: owner all"
  on payments for all
  using (auth_role() = 'owner')
  with check (auth_role() = 'owner');

create policy "payments: own rows"
  on payments for select
  using (customer_id = auth_customer_id());
