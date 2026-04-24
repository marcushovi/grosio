# Grosio

Mobilná aplikácia pre sledovanie investičného portfólia.
Bakalárska práca — Unicorn VŠ, 2026.
Autor: Marek Hovančák | Vedúci: Ing. Ivo Milota

## Tech stack

- Expo SDK 54 + React Native 0.81.5
- Expo Router (file-based routing)
- Supabase (PostgreSQL + Auth + Edge Functions)
- HeroUI Native + Tailwind CSS (Uniwind)
- TanStack Query v5
- i18next (EN / SK / CS / DE)

## Požiadavky

- Node.js 18+
- Yarn
- Expo Go (iOS / Android) — pre spustenie bez buildu
- Xcode 15+ — pre iOS simulátor
- Účet na [expo.dev](https://expo.dev) — voliteľné

## Inštalácia

```bash
yarn install
```

## Spustenie

```bash
# iOS simulátor
yarn ios

# Android emulátor
yarn android

# Expo Go (naskenuj QR kód)
yarn start
```

## Premenné prostredia

Skopíruj `.env.example` do `.env.local` a doplň hodnoty:

```bash
cp .env.example .env.local
```

Potrebné premenné:

- `EXPO_PUBLIC_SUPABASE_URL` — URL Supabase projektu
- `EXPO_PUBLIC_SUPABASE_KEY` — Supabase publishable (anon) key
- `EXPO_PUBLIC_FRANKFURTER_URL` — endpoint Frankfurter API pre výmenné kurzy (default v `.env.example`)

## Databáza

Schéma databázy je v `supabase/migrations/000_baseline.sql` — obsahuje tabuľky `brokers`, `positions`, Row Level Security politiky a CHECK obmedzenia pre integritu záznamov o predaji.

## Štruktúra projektu

```
app/              — obrazovky (Expo Router)
  (auth)/         — prihlásenie, registrácia
  (app)/          — chránené obrazovky
    (dashboard)/  — prehľad portfólia
    (brokers)/    — zoznam a detail brokerov
    (tax)/        — daňový prehľad
    (settings)/   — nastavenia
components/       — zdieľané UI komponenty
hooks/            — React hooks
lib/              — API, utility, kontext
  api/            — Supabase volania
locales/          — preklady (en/sk/cs/de)
supabase/
  functions/      — Edge Function (yahoo-finance)
  migrations/     — SQL migrácie
types/            — TypeScript typy
assets/           — ikony, obrázky
```

## Funkcie

- Správa brokerských účtov s farebným označením
- Evidencia investičných pozícií s automatickým načítaním cien
- Dashboard s hodnotou portfólia, P&L a rozložením
- Daňový prehľad (SK 1 rok / CZ 3 roky)
- Podpora EUR, USD, CZK
- Tmavá / svetlá / systémová téma
- 4 jazyky: angličtina, slovenčina, čeština, nemčina

## Skripty

```bash
yarn lint                         # ESLint
yarn typecheck                    # TypeScript check
yarn format                       # Prettier
yarn extract-translations [lang]  # Extrakcia prekladových kľúčov
```
