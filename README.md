# Fairy Theme Handoff — Drop-In Files

These files mirror your `dashboard/` structure exactly. Copy them straight in.

## Apply

From `wy8881/scanJob` repo root:

```bash
# 1. Copy the new/replaced files
cp handoff/dashboard/app/layout.tsx        dashboard/app/layout.tsx
cp handoff/dashboard/app/globals.css       dashboard/app/globals.css
cp handoff/dashboard/app/page.tsx          dashboard/app/page.tsx
cp handoff/dashboard/components/Header.tsx dashboard/components/Header.tsx
cp handoff/dashboard/components/StatCard.tsx dashboard/components/StatCard.tsx
cp handoff/dashboard/components/Decorations.tsx dashboard/components/Decorations.tsx
mkdir -p dashboard/components/charts
cp handoff/dashboard/components/charts/*.tsx dashboard/components/charts/

# 2. Remove the old Recharts components (no longer imported)
rm dashboard/components/JobsPostedChart.tsx
rm dashboard/components/LevelChart.tsx
rm dashboard/components/TechChart.tsx

# 3. Remove the dependency
cd dashboard
npm uninstall recharts
npm run dev
```

## What changed

| File | Status | Notes |
|------|--------|-------|
| `app/layout.tsx` | replaced | Adds Fredoka + Quicksand fonts |
| `app/globals.css` | replaced | Tailwind v4 `@theme` tokens + keyframes |
| `app/page.tsx` | replaced | Same data flow; new charts; bg decorations; refresh button; shimmer skeletons |
| `components/Header.tsx` | replaced | Mascot, sparkle wordmark, gradient pill filters, refresh button |
| `components/StatCard.tsx` | replaced | Inline expand, accent prop, gradient mini-bars, no emoji/no corner blob |
| `components/Decorations.tsx` | new | Sparkle, Cloud, Rainbow, FairyMascot, SparkleField |
| `components/charts/FairyLineChart.tsx` | new | Replaces JobsPostedChart |
| `components/charts/FairyDonut.tsx` | new | Replaces LevelChart |
| `components/charts/FairyBars.tsx` | new | Replaces TechChart |
| `components/JobsPostedChart.tsx` | delete | |
| `components/LevelChart.tsx` | delete | |
| `components/TechChart.tsx` | delete | |
| `lib/*` | UNCHANGED | API/types/transforms untouched |

## Acceptance checks

- `npm run dev` — no console errors
- 4 range filter pills work; disabled ones are dimmed
- Refresh button shows spinning sparkle while fetching
- Stat cards expand inline (push content) — not popover
- Donut: hover/click highlights and shows % in centre
- Bar chart: hover/click dims others, sparkle on active tip
- At ~900px viewport: no text overflow on stat cards
- `lib/` files are untouched (`git diff dashboard/lib/` empty)

## Notes

- All decorative SVGs have `pointer-events-none` and `z-0`; content is `relative z-10`.
- Stat card values use `clamp(15px, 1.6vw, 22px)` so they scale with viewport.
- Fairy color tokens are exposed as Tailwind classes (`text-fairy-accent`, `bg-fairy-track`, etc.) via the `@theme` block.
- The Header's `onRefresh` and `refreshing` props are optional — safe to omit if you don't want the button.
