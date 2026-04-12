-- Add buy_date to positions so we can track when a holding was acquired.
-- Nullable so existing rows don't break; backfilled from created_at for
-- pre-existing positions.
alter table public.positions
  add column if not exists buy_date date;

update public.positions
  set buy_date = created_at::date
  where buy_date is null;
