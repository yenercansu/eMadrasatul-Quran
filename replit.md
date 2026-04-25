# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Quran App (Mobile - Expo)
- **Path**: `artifacts/quran-app/`
- **Preview**: `/` (root)
- **Description**: Full-featured Quran mobile app inspired by Quran.com

**Features:**
- Audio playback with 6 reciters via Islamic Network CDN API
- Play/pause/next/prev controls with repeat per ayah (swipe left on AyahItem → set repeat count)
- Progress tracking with AsyncStorage — resumes from last position
- Translation (en.asad), transliteration, Tafsir toggles via floating bottom bar in reader
- Mushaf mode (parchment background #F5EDD6) toggled from top mode selector bar
- Word-level interaction: long-press any word → save to vocabulary library
- Per-ayah "Meanings" toggle: shows transliteration word-by-word under Arabic words
- Reader floating bottom bar: Meaning | Roman | Tafsir | Range — quick toggles without opening settings
- Top mode/nav bar in reader: ← Prev | [Normal|Mushaf] | Next → with page indicator
- Pagination: both Normal and Mushaf modes show max 10 ayahs per page
- Saved Ayah: swipe-left on ayah saves full ayah (text + translation) to savedAyahs in QuranContext
- Quiz tab (was Library): shows "Saved Ayah" with card stack UI, Words, By Surah, Starred filters
- Card deck UI for saved ayahs: swipe left to remove, deck visual shows stacked cards
- Vocabulary quiz CTA at bottom of words view
- Quran tab filters: All | Meccan | Medinan | Alphabetic (sorts A-Z by English name)
- Settings sheet redesigned: theme circles (Light/Sepia/Dark/Auto), font size stepper with preview, tile grid for display toggles, reciter chips
- Black active filter chips across all tabs (not green)
- Home screen with resume CTA, recently read surahs, daily goal stats
- Tab navigation: Home, Quran, Quiz, Settings

**Services:**
- Quran text: https://api.alquran.cloud/v1
- Audio CDN: https://cdn.islamic.network/quran/audio/128/{reciter}/{surah}{ayah}.mp3
- Local persistence: AsyncStorage (no backend)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
