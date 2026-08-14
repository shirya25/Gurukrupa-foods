-- ===== CUSTOMERS =====
create table if not exists customers (
  id          bigint generated always as identity primary key,
  name        text not null,
  phone       text,
  address     text,
  member_since date default current_date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== MENU ITEMS =====
create table if not exists menu_items (
  id          bigint generated always as identity primary key,
  name        text not null,
  emoji       text default '🍽',
  description text,
  price       numeric(8,2) not null check (price > 0),
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== DAILY MENUS =====
create table if not exists daily_menus (
  id           bigint generated always as identity primary key,
  menu_date    date not null default current_date,
  menu_item_id bigint not null references menu_items(id) on delete cascade,
  is_available boolean default true,
  created_at   timestamptz default now(),
  unique (menu_date, menu_item_id)
);

-- ===== ORDERS =====
create table if not exists orders (
  id          bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete restrict,
  order_date  date not null default current_date,
  status      text default 'pending' check (status in ('pending','delivered','cancelled')),
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ===== ORDER ITEMS =====
create table if not exists order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references orders(id) on delete cascade,
  menu_item_id bigint references menu_items(id) on delete set null,
  name         text not null,   -- snapshot at time of order
  qty          int not null check (qty > 0),
  unit_price   numeric(8,2) not null check (unit_price >= 0),
  created_at   timestamptz default now()
);

-- ===== PAYMENTS =====
create table if not exists payments (
  id           bigint generated always as identity primary key,
  customer_id  bigint not null references customers(id) on delete restrict,
  amount       numeric(10,2) not null check (amount > 0),
  paid_at      timestamptz default now(),
  method       text default 'upi' check (method in ('upi','cash','card','other')),
  reference    text,
  notes        text,
  created_at   timestamptz default now()
);

-- ===== INDEXES =====
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_date     on orders(order_date);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_daily_menu_date on daily_menus(menu_date);
create index if not exists idx_payments_customer on payments(customer_id);

-- ===== UPDATED_AT TRIGGER =====
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace trigger trg_customers_updated
  before update on customers for each row execute function set_updated_at();
create or replace trigger trg_menu_items_updated
  before update on menu_items for each row execute function set_updated_at();
create or replace trigger trg_orders_updated
  before update on orders for each row execute function set_updated_at();

-- ===== SEED MENU ITEMS =====
insert into menu_items (name, emoji, description, price) values
  ('Dal Fry',        '🍲', 'Yellow dal, tadka, ghee',     60),
  ('Paneer Sabzi',   '🧀', 'Paneer in masala gravy',       90),
  ('Aloo Gobi',      '🥔', 'Potato & cauliflower dry',     70),
  ('Mix Veg',        '🥗', 'Seasonal vegetables',          75),
  ('Chapati (2)',    '🫓', 'Soft wheat roti',              20),
  ('Steamed Rice',   '🍚', 'Plain basmati rice',           40),
  ('Jeera Rice',     '🍛', 'Cumin flavoured rice',         55),
  ('Curd',           '🥛', 'Fresh homemade dahi',          30),
  ('Papad + Pickle', '🌶', 'Crispy papad with achaar',     15)
on conflict do nothing;
