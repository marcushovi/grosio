-- Rename positions.avg_buy_price -> positions.buy_price.
-- The column holds the buy price of a single tranche (one position = one buy);
-- "avg_" was misleading and pairs poorly with the upcoming sold_price column.
--
-- Postgres automatically rewrites CHECK constraint expressions to follow the
-- new column name, so the `check (avg_buy_price > 0)` from 001_init.sql
-- becomes `check (buy_price > 0)` without an explicit DROP/ADD.

alter table public.positions
  rename column avg_buy_price to buy_price;
