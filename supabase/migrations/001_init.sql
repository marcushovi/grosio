-- Create brokers table
create table if not exists public.brokers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text not null default '#006fee',
  created_at timestamptz default now() not null
);

-- Create positions table
create table if not exists public.positions (
  id uuid default gen_random_uuid() primary key,
  broker_id uuid references public.brokers(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  shares numeric(12,6) not null check (shares > 0),
  avg_buy_price numeric(12,4) not null check (avg_buy_price > 0),
  currency text not null default 'USD',
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists brokers_user_id_idx on public.brokers(user_id);
create index if not exists positions_user_id_idx on public.positions(user_id);
create index if not exists positions_broker_id_idx on public.positions(broker_id);

-- Enable RLS
alter table public.brokers enable row level security;
alter table public.positions enable row level security;

-- RLS policies: brokers
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

-- RLS policies: positions
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
