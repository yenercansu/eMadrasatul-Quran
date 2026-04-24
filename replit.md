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
- Play/pause/next/prev controls with repeat (1x–10x) per ayah
- Progress tracking with AsyncStorage — resumes from last position
- Translation (en.asad), transliteration, and Tafsir toggles
- Clean reading mode (all toggles off)
- Word-level interaction: long-press any word to see meaning + save to library
- Personal vocabulary library with highlighted words
- Quiz/game mode: word-meaning and fill-in-blank questions from saved words
- Settings sheet: reciter selection, repeat count, display toggles, color coding toggle
- Tajweed/translation color coding (mutually exclusive toggles)
- Home screen with resume CTA, recently read surahs, stats
- Tab navigation: Home, Quran (searchable surah list), Library

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
