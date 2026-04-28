# Quran Memorization App — Workspace Guide

## Project Overview

A pnpm workspace monorepo containing a Quran memorization mobile app built with **Expo / React Native**.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Package manager**: pnpm 10.19.0 (enforced via `packageManager` field)
- **Node.js**: 22.20.0 (see `.nvmrc`)
- **TypeScript**: 5.9
- **Mobile app**: Expo SDK 54, React Native 0.81.5, React 19, Expo Router
- **API (optional)**: Express 5 + Drizzle ORM + PostgreSQL
- **UI**: Tailwind CSS (v4), React Native Reanimated, Gesture Handler
- **State**: React Context + AsyncStorage
- **Data fetching**: TanStack Query

## Workspace Packages

| Package | Path | Description |
|---------|------|-------------|
| `@workspace/quran-app` | `artifacts/quran-app/` | Main Expo mobile app |
| `@workspace/api-server` | `artifacts/api-server/` | Express API server |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox/` | Vite-based design sandbox |
| `@workspace/api-spec` | `lib/api-spec/` | OpenAPI spec + Orval codegen |
| `@workspace/api-zod` | `lib/api-zod/` | Shared Zod schemas |
| `@workspace/api-client-react` | `lib/api-client-react/` | React Query API client |
| `@workspace/db` | `lib/db/` | Drizzle ORM + PostgreSQL schema |
| `@workspace/scripts` | `scripts/` | Shared workspace scripts |

## Quick Start

```bash
# Use correct Node version
nvm use

# Install all workspace dependencies
pnpm install

# Run the Quran app
pnpm run dev

# Or run platform-specific
pnpm run dev:android
pnpm run dev:ios
pnpm run dev:web
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run typecheck` | Type-check entire workspace |
| `pnpm run build` | Type-check + build all packages |
| `pnpm run dev` | Start the Quran Expo app |
| `pnpm --filter @workspace/api-server run dev` | Start API server locally |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |

## App Architecture

The Quran app (`artifacts/quran-app/`) uses:
- **Expo Router** for file-based navigation (`app/` directory)
- **React Context** for global state (QuranContext, AudioContext, SettingsContext, SavedAyahsContext)
- **AsyncStorage** for local persistence (no backend required)
- **Islamic Network CDN** for audio: `https://cdn.islamic.network/quran/audio/128/{reciter}/{surah}{ayah}.mp3`
- **Alquran.cloud API** for text & translations

## Best Practices Enforced

- `packageManager` field prevents accidental `npm install` / `yarn install`
- `.nvmrc` ensures consistent Node version
- `autoInstallPeers: false` in pnpm config to avoid implicit peer dep issues
- Strict TypeScript enabled across all packages
- Metro config is monorepo-aware (`watchFolders`, `nodeModulesPaths`)
- No Replit-specific config in the repo — runs cleanly on any machine
