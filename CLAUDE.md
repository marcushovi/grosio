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
