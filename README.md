# Gurukrupa Foods

Next.js 14 · App Router · TypeScript · Supabase Auth + RLS · Vercel

## Setup

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Database

Run in Supabase SQL editor in order:
1. `supabase/schema.sql`  — tables + seed
2. `supabase/rls.sql`     — RLS policies + user_profiles

## Create users (Supabase Dashboard → Authentication → Users)

After creating a user in Supabase Auth, run this SQL to link them:

```sql
-- Link a customer user
insert into user_profiles (id, role, customer_id)
values ('<auth-user-uuid>', 'customer', <customer-row-id>);

-- Create an owner user
insert into user_profiles (id, role, customer_id)
values ('<auth-user-uuid>', 'owner', null);
```

## Routes

| Path                        | Access   |
|-----------------------------|----------|
| `/login`                    | Public   |
| `/menu`                     | Customer |
| `/history`                  | Customer |
| `/paybill`                  | Customer |
| `/profile`                  | Customer |
| `/owner/dashboard`          | Owner    |
| `/owner/customers`          | Owner    |
| `/owner/menu-management`    | Owner    |

## Security
- Middleware blocks wrong-role access at the edge
- RLS enforces data isolation at the DB layer
- Customers cannot access other customers' data even by URL manipulation
- Anon key only — service-role key never exposed

## Not yet implemented
- Billing calculations & payment processing
- Realtime updates
- PWA / analytics
