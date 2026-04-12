# Grosio — project conventions for Claude

## Styling: always use Tailwind (className), never inline `style` props

This project uses **Uniwind + Tailwind v4**. All styling must be done via `className`.

**Do NOT** reach for `style={{ ... }}` as a shortcut for positioning, z-index, margins, shadows, or any other static visual value. Use Tailwind utilities:

- Positioning: `relative`, `absolute`, `top-0`, `top-full`, `left-0`, `right-0`, `bottom-0`, `inset-0`, `z-10`, `z-20`
- Spacing: `mt-1`, `mr-10`, `p-4`, `gap-2`
- Shadows: `shadow`, `shadow-md`, `shadow-lg` (Uniwind handles iOS shadow + Android elevation cross-platform)
- Dimensions: `w-full`, `h-full`, `min-w-40`, `max-h-40`
- Flex/layout: `flex-1`, `flex-row`, `justify-center`, `items-center`

**When `style` IS acceptable — only for genuinely dynamic/runtime values:**
- Theme colors from `useThemeColor()`: `style={{ backgroundColor: bg }}`
- User-defined colors (e.g., broker's hex): `style={{ backgroundColor: broker.color }}`
- Reanimated shared values
- Measured layout values (e.g., from `measureInWindow`)

Everything static — positioning, z-index, margins, shadow presets — goes through `className`.

## Data caching: never manually write to the TanStack Query cache

All data fetching in this project goes through **TanStack Query** (see `hooks/useBrokers.ts`, `usePositions.ts`, `useDashboardData.ts`, `usePortfolioHistory.ts`). The `QueryClientProvider` lives in `app/_layout.tsx`.

**Do NOT** use `queryClient.setQueryData(...)` to optimistically write mutation results into the cache. **Do NOT** use `.select().single()` on Supabase mutations just to feed the returned row into `setQueryData`.

**Instead, after a mutation:**
- Call `queryClient.invalidateQueries({ queryKey: [...] })` to mark the affected query stale and trigger a refetch.
- If the mutation touches data consumed by several queries (e.g., deleting a broker cascades positions and affects dashboard + history), invalidate all of them with `Promise.all([...])`.
- Make `onSuccess` `async` and `await` the invalidation — that way `mutateAsync` only resolves once the refetch is complete, so the UI (e.g., a closing dialog) sees the fresh data immediately.

```tsx
// ✅ Correct pattern
onSuccess: async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['brokers'] }),
    queryClient.invalidateQueries({ queryKey: ['positions'] }),
  ])
}

// ❌ Do not do this
onSuccess: (newRow) => {
  queryClient.setQueryData(['brokers'], (old) => [...old, newRow])
}
```

**Why:** invalidation is always in sync with server state, avoids stale-cache bugs when the DB applies defaults/triggers/cascades, and doesn't require every mutation to return the inserted row. It's a small latency cost in exchange for correctness and simpler code.

**Exception:** `hooks/usePrices.ts` uses `queryClient.getQueryData`/`setQueryData` as a deliberate KV cache for Yahoo Finance quotes — it's not backed by a `useQuery` call. That pattern is fine when the cache is the source of truth (no server round-trip to validate against). New code should not follow this pattern unless there's an equivalent justification.

## Edge Function auth: send the user's session JWT, not the anon key

Supabase Edge Functions are deployed with JWT verification **enabled** (default). Do NOT deploy with `--no-verify-jwt` — that turns the function into a fully public endpoint anyone can hit. Deploy with:

```bash
npx supabase functions deploy <name>
```

Client calls from the app must use the logged-in user's session access_token as the Bearer, not the anon key:

```tsx
// lib/yahooFinance.ts — single helper for all Edge Function calls
async function authHeaders(): Promise<Record<string, string> | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    Authorization: `Bearer ${session.access_token}`,  // user JWT
    apikey: ANON_KEY,                                  // routing/rate-limiting
  }
}
```

- `Authorization: Bearer <token>` → identity (user JWT). Supabase's gateway rejects the request if this JWT is missing, invalid, or expired.
- `apikey: <anon_key>` → still required, but only for project routing and rate-limiting — it is NOT the identity.

If `authHeaders()` returns `null` (no session), callers should short-circuit and return an empty result. The app's auth guard redirects to `/login` when there's no session, so Edge Function calls should never run unauthenticated in practice.

**Why not the anon key as Bearer:** the anon key is bundled in the client app and therefore public. Using the user's session JWT means the Supabase gateway rejects any request that doesn't come from a currently logged-in user — protecting against bots, scrapers, or anyone who finds the anon key in the app bundle.
