-- Baseline migration for Grosio.

-- Brokers
create table if not exists public.brokers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#006fee',
  created_at timestamptz default now() not null
);

-- Positions. One row = one buy tranche, optionally closed by one full sale.
-- The three sold_* columns are all NULL together (open) or all NOT NULL (sold).
create table if not exists public.positions (
  id uuid default gen_random_uuid() primary key,
  broker_id uuid references public.brokers(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  shares numeric(12,6) not null check (shares > 0),
  buy_price numeric(12,4) not null check (buy_price > 0),
  currency text not null default 'USD',
  buy_date date,
  sold_at date,
  sold_price numeric(12,4),
  sold_shares numeric(12,6),
  created_at timestamptz default now() not null,
  constraint positions_sold_consistency check (
    (sold_at is null and sold_price is null and sold_shares is null)
    or
    (sold_at is not null and sold_price is not null and sold_shares is not null)
  ),
  constraint positions_sold_full check (
    sold_shares is null or sold_shares = shares
  ),
  constraint positions_sold_after_buy check (
    sold_at is null or buy_date is null or sold_at >= buy_date
  )
);

-- Indexes
create index if not exists brokers_user_id_idx on public.brokers(user_id);
create index if not exists positions_user_id_idx on public.positions(user_id);
create index if not exists positions_broker_id_idx on public.positions(broker_id);

-- RLS
alter table public.brokers enable row level security;
alter table public.positions enable row level security;

-- Brokers policies
create policy "Users can view own brokers"
  on public.brokers for select
  using (auth.uid() = user_id);

create policy "Users can insert own brokers"
  on public.brokers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own brokers"
  on public.brokers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own brokers"
  on public.brokers for delete
  using (auth.uid() = user_id);

-- Positions policies
create policy "Users can view own positions"
  on public.positions for select
  using (auth.uid() = user_id);

create policy "Users can insert own positions"
  on public.positions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own positions"
  on public.positions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own positions"
  on public.positions for delete
  using (auth.uid() = user_id);
