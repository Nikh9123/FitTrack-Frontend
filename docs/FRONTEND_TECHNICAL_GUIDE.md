# Veera Frontend — Technical Guide

**Version:** 1.0.0  
**Last updated:** June 9, 2026  
**Audience:** Mobile/React Native engineers, UI developers

For product overview and user journeys, see [VEERA_COMPLETE_GUIDE.md](./VEERA_COMPLETE_GUIDE.md).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Environment & Scripts](#4-environment--scripts)
5. [Routing (Expo Router)](#5-routing-expo-router)
6. [State Management](#6-state-management)
7. [API Layer](#7-api-layer)
8. [Key Screens](#8-key-screens)
9. [Component Organization](#9-component-organization)
10. [Theming & Motion](#10-theming--motion)
11. [Local Storage & Offline](#11-local-storage--offline)
12. [Branding & Assets](#12-branding--assets)
13. [Development Workflow](#13-development-workflow)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Overview

The Veera frontend is an **Expo 54 + React Native** mobile app (iOS, Android, Web) that connects to the Veera backend REST API.

**Stack:** Expo Router 6 · React 19 · React Native 0.81 · Reanimated 4 · TypeScript

**Product areas:** Home dashboard · Workout · Diet · Progress · Analysis · AI Coach · InBody · Achievements

---

## 2. Architecture

### Data flow

```
Screen (app/*.tsx)
  → Components (components/*)
  → Hooks (hooks/*) + Context (context/*)
  → API clients (lib/*-api.ts)
  → Backend REST API (JWT)
```

### Design principles

| Principle | Implementation |
|-----------|----------------|
| Server is source of truth | Persistent data from API; AsyncStorage for tokens + cache only |
| Context for global state | Auth, fitness day-log, achievement unlock queue |
| File-based routing | Expo Router `app/` directory |
| Premium UX | Reanimated rings, charts, motion tokens — no IA changes |
| Brand centralization | `constants/branding.ts` for app name, storage keys |

### System context

```
┌─────────────────────┐
│   Veera App (Expo)  │
│  iOS / Android / Web│
└──────────┬──────────┘
           │ HTTPS + JWT
           ▼
┌─────────────────────┐
│  Veera Backend API  │
└─────────────────────┘
```

---

## 3. Project Structure

```
FitTrack-Frontend/
├── app/                      # Expo Router screens
│   ├── _layout.tsx           # Root providers + stack
│   ├── (auth)/               # Login, setup, onboarding
│   ├── (tabs)/               # Main tab bar
│   │   ├── index.tsx         # Home
│   │   ├── analysis.tsx
│   │   ├── workout.tsx
│   │   ├── progress.tsx
│   │   ├── profile.tsx
│   │   ├── diet.tsx          # Hidden tab
│   │   └── trainer.tsx       # AI Coach chat
│   ├── coach/                # Weekly/monthly review, journey
│   ├── inbody/               # Body composition
│   ├── metrics/              # Detail metric screens
│   └── workout/              # AI onboarding, weekly plan
├── components/
│   ├── home/                 # Daily score, rings, quick actions
│   ├── coach/                # Coach tip, report shell, share cards
│   ├── progress/             # Journal, achievements, fitness score
│   ├── workout/              # Session UI, set logging
│   ├── ui/                   # ProgressRing, VeeraLogo, GlassCard
│   └── charts/               # EnergyAreaChart, etc.
├── context/
│   ├── AuthContext.tsx
│   ├── FitnessContext.tsx
│   ├── ThemeContext.tsx
│   └── AchievementUnlockContext.tsx
├── hooks/                    # useProgressAPI, useCountUp, useColors, ...
├── lib/                      # API clients, haptics, metrics, storage
├── constants/
│   ├── Colors.ts
│   ├── animations.ts
│   ├── branding.ts
│   └── energy-glow.ts
├── assets/images/            # icon.png, veera-logo.svg
├── docs/                     # This folder
├── app.json                  # Expo config (name: Veera)
└── package.json
```

---

## 4. Environment & Scripts

### Environment variables

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend base URL, e.g. `http://localhost:5000/api` |
| `EXPO_PUBLIC_APP_URL` | Web app origin for OAuth (optional) |

Configured in `.env` or `app.json` → `extra.appUrl`.

### Scripts

```bash
pnpm install       # Install dependencies
pnpm dev           # Expo dev server
pnpm dev:tunnel    # Expo tunnel (remote device testing)
pnpm web           # Web-only dev
pnpm android       # Run on Android emulator/device
pnpm ios           # Run on iOS simulator/device
pnpm typecheck     # TypeScript check
```

### App config highlights (`app.json`)

| Key | Value |
|-----|-------|
| `name` | Veera |
| `slug` | veera |
| `scheme` | veera (deep links) |
| `icon` | `./assets/images/icon.png` |
| `splash.backgroundColor` | `#070B14` |

---

## 5. Routing (Expo Router)

### Main tabs (visible)

| Tab | Route | Screen |
|-----|-------|--------|
| Home | `/(tabs)/index` | Daily dashboard |
| Analysis | `/(tabs)/analysis` | Body comp analytics |
| Workout | `/(tabs)/workout` | Training hub |
| Progress | `/(tabs)/progress` | Scores, journal, achievements |
| Profile | `/(tabs)/profile` | Settings, profile |

### Hidden / linked routes

| Route | Purpose |
|-------|---------|
| `/(tabs)/diet` | Nutrition logging |
| `/(tabs)/trainer` | AI Coach chat |
| `/(tabs)/gym` | Gym features (partial) |
| `/coach/weekly-review` | Weekly AI review |
| `/coach/monthly-report` | Monthly AI report |
| `/coach/journey` | Achievement journey map |
| `/inbody` | InBody reports list + detail |
| `/(auth)/login` | Sign in / register |
| `/(auth)/setup` | Profile onboarding |

### Auth gating

Root `app/_layout.tsx` wraps providers. `app/index.tsx` redirects based on `AuthContext` (`isAuthenticated`, `onboardingCompleted`).

---

## 6. State Management

### React Context

| Context | File | Holds |
|---------|------|-------|
| `AuthContext` | `context/AuthContext.tsx` | User, JWT, login/logout/register/OAuth |
| `FitnessContext` | `context/FitnessContext.tsx` | Today's log, goals, streak, activity sync |
| `ThemeContext` | `context/ThemeContext.tsx` | Light / dark / system mode |
| `AchievementUnlockContext` | `context/AchievementUnlockContext.tsx` | Unlock modal queue |

### Custom hooks (selected)

| Hook | Purpose |
|------|---------|
| `useProgressAPI` | Progress dashboard + AI insights |
| `useAchievements` | Badge list, journey, evaluate |
| `useWorkoutPlan` | Active workout plan context |
| `useActiveWorkoutSession` | Live session state + persistence |
| `useColors` | Theme-aware color tokens |
| `useCountUp` | Animated number transitions |
| `useReducedMotion` | Accessibility motion preference |

### TanStack Query

Used selectively; many screens use custom hooks with `useCallback` + `useEffect` fetch patterns.

---

## 7. API Layer

**Base URL:** `lib/api.ts` → `getApiBaseUrl()` reads `EXPO_PUBLIC_API_URL`

**Auth header:** `Authorization: Bearer <token>` from `AuthContext`

### API client modules

| Module | Domain |
|--------|--------|
| `lib/coach-api.ts` | Daily digest, weekly/monthly reviews |
| `lib/progress-history-api.ts` | Fitness journal buckets |
| `lib/achievements-api.ts` | Achievements, journey |
| `lib/workout-session-api.ts` | Session start/log/complete |
| `lib/workout-plan-api.ts` | Plans, exercises, PRs |
| `lib/nutrition-api.ts` | Meals, water, targets |
| `lib/inbody/` | InBody upload and reports |
| `lib/google-oauth.ts` | OAuth redirect + token exchange |

### Example: fetch daily digest

```typescript
import { fetchDailyDigest } from "@/lib/coach-api";

const digest = await fetchDailyDigest(token, { refresh: true });
```

---

## 8. Key Screens

### Home (`app/(tabs)/index.tsx`)

- Daily score ring, activity rings (steps, calories, water)
- `DailyCoachTipCard` — AI daily digest
- Quick actions (meal, water, weight, train)
- Weight sparkline, today's workout preview

### Progress (`app/(tabs)/progress.tsx`)

- `AnimatedFitnessScoreCard` — AI fitness score
- `FitnessJournal` — 7D/30D/90D/1Y charts
- Achievements grid, transformation summary
- Weekly review banner → `/coach/weekly-review`

### Workout (`app/(tabs)/workout.tsx`)

- Plan hero, live session via `ActiveWorkoutSession`
- Exercise search, set logging, rest timer
- PR tracking, progression insights

### InBody (`app/inbody/index.tsx`)

- Report list, upload, AI analysis display
- Auto-triggers analysis when stub/incomplete data detected

### Coach reports (`app/coach/`)

- `CoachReportShell` shared layout
- Share via `ShareableCoachCard` + `react-native-view-shot`

---

## 9. Component Organization

| Folder | Examples |
|--------|----------|
| `components/ui/` | `ProgressRing`, `VeeraLogo`, `GlassCard`, `ScreenEntrance` |
| `components/home/` | `DailyScoreRing`, `QuickActionsRow`, `WeightSparkline` |
| `components/coach/` | `DailyCoachTipCard`, `CoachReportShell`, `ForecastSection` |
| `components/progress/` | `FitnessJournal`, `AchievementBadgeGrid`, `AnimatedHistoryBar` |
| `components/workout/` | `ActiveWorkoutSession`, `SetRow`, `RestTimerBar` |
| `components/charts/` | `EnergyAreaChart` |

---

## 10. Theming & Motion

### Colors

`constants/Colors.ts` — light and dark palettes. Access via `useColors()` hook.

Dark mode defaults align with Veera brand: background `#070B14`, primary orange `#FF6B35`.

### Motion tokens

`constants/animations.ts` — shared `MOTION` durations and Reanimated entrance helpers.

`constants/energy-glow.ts` — ring glow colors derived from accent.

### Key animated components

- `ProgressRing` — gradient stroke, glow, endpoint bloom
- `DailyScoreRing` — home daily score
- `AnimatedHistoryBar` — journal bar chart
- `AchievementUnlockModal` — badge reveal

Always pass **numeric** durations to `useCountUp(target, durationMs)` — not config objects.

---

## 11. Local Storage & Offline

### Storage keys

Centralized in `constants/branding.ts` (`STORAGE_KEYS`).

Legacy `@fittrack_*` keys migrated automatically via `lib/storage-migrate.ts` on read.

| Key | Purpose |
|-----|---------|
| `@veera_token` / `@veera_user` | Auth session |
| `@veera_theme_mode` | Theme preference |
| `@veera_workout_history` | Local workout cache |
| `@veera_active_session` | In-progress workout |
| `@veera_daily_activity` | Step/activity cache |

### Background sync

- `lib/background-step-sync.ts` — Expo background fetch for steps
- `lib/activity-sync.ts` — Queue failed API syncs for retry

---

## 12. Branding & Assets

| Asset | Path |
|-------|------|
| App icon (PNG) | `assets/images/icon.png` |
| Logo SVG | `assets/images/veera-logo.svg` |
| Logo component | `components/ui/VeeraLogo.tsx` |

`VeeraLogo` adapts gradient colors to current theme (light/dark) via `useColors()`.

Branding constants: `constants/branding.ts` — `APP_NAME`, `APP_SCHEME`, storage keys.

---

## 13. Development Workflow

```bash
# 1. Start backend first
cd fitTrack-backend && pnpm dev

# 2. Set API URL (FitTrack-Frontend/.env)
EXPO_PUBLIC_API_URL=http://localhost:5000/api

# 3. Start Expo
cd FitTrack-Frontend && pnpm dev
```

### Web testing

Press `w` in Expo CLI or run `pnpm web`. OAuth uses browser origin from `lib/app-url.ts`.

### Device testing

Use LAN IP in `EXPO_PUBLIC_API_URL`, e.g. `http://192.168.1.x:5000/api`.

### Adding a new screen

1. Create file under `app/` following Expo Router conventions
2. Add navigation link from existing screen
3. Create API client in `lib/` if needed
4. Run `pnpm typecheck`

---

## 14. Troubleshooting

| Issue | Fix |
|-------|-----|
| API network error on device | Use LAN IP, not `localhost` |
| OAuth redirect fails | Add `veera://auth/callback` and web URL in Supabase |
| NaN in score ring | Ensure `useCountUp` gets a number for duration |
| Stale auth after rebrand | Log out/in; migration copies old `@fittrack_*` keys |
| Web CORS errors | Backend must allow frontend origin |

---

## Related docs

| Document | Location |
|----------|----------|
| Complete product guide | [VEERA_COMPLETE_GUIDE.md](./VEERA_COMPLETE_GUIDE.md) |
| Backend technical guide | [../../fitTrack-backend/docs/BACKEND_TECHNICAL_GUIDE.md](../../fitTrack-backend/docs/BACKEND_TECHNICAL_GUIDE.md) |
| Backend API reference | [../../fitTrack-backend/README.md](../../fitTrack-backend/README.md) |
| AI coach plan | [../../AI_COACH_IMPLEMENTATION_PLAN.md](../../AI_COACH_IMPLEMENTATION_PLAN.md) |

---

*Document history: June 9, 2026 — Initial frontend technical guide.*
