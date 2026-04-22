-- Add sold_* columns so a position can be marked as fully sold.
-- Rules:
--   * A position represents one buy + optionally one full sale (no partials, no DCA).
--   * sold_at, sold_price, sold_shares must all be NULL (open position) or all NOT NULL (closed).
--   * sold_shares must equal shares (full sale only).
--   * sold_at must be on or after buy_date.

alter table public.positions
  add column if not exists sold_at date,
  add column if not exists sold_price numeric(12,4),
  add column if not exists sold_shares numeric(12,6);

alter table public.positions
  add constraint positions_sold_consistency check (
    (sold_at is null and sold_price is null and sold_shares is null)
    or
    (sold_at is not null and sold_price is not null and sold_shares is not null)
  );

alter table public.positions
  add constraint positions_sold_full check (
    sold_shares is null or sold_shares = shares
  );

-- Note: buy_date is nullable on legacy rows. When buy_date is NULL the
-- comparison yields UNKNOWN, which CHECK treats as satisfied — so legacy
-- rows without a buy_date can still be marked sold.
alter table public.positions
  add constraint positions_sold_after_buy check (
    sold_at is null or buy_date is null or sold_at >= buy_date
  );
