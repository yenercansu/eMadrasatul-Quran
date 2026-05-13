# Mushaf Rendering System

## Files
- `MushafTheme.ts` — Theme tokens (colors, font size, spacing). Two themes: `quranCom` (default) and `indopak`.
- `MushafPageView.tsx` — Page renderer. Accepts a `theme` prop so styles swap without touching rendering logic.

## Adding a new theme
Add an entry to `MUSHAF_THEMES` in `MushafTheme.ts` and pass it as `<MushafPageView theme={MUSHAF_THEMES.myTheme} />`.

## Adding a proper Quran font
1. Add the font to `assets/fonts/` (e.g. `AmiriQuran-Regular.ttf`).
2. Load it via `useFonts` in `app/_layout.tsx`.
3. Set `arabicFontFamily: "AmiriQuran_400Regular"` in the desired theme entry.

Recommended fonts:
- **Amiri Quran** (`@expo-google-fonts/amiri`) — open source, clean naskh
- **Scheherazade New** (SIL) — designed for Quranic Arabic, supports all diacritics
- **KFGQPC Uthmanic** — the standard Saudi Arabia typeset (license-restricted)

## Word highlighting
`activeAyah` prop marks all words of the playing ayah with `theme.activeAyahBackground`.
When word-by-word highlighting is needed, extend `Props` with `activeWordRange: { start: number; end: number } | null`
and apply `theme.activeWordBackground` to words within that range.
