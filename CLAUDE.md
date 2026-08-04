# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Corredor Sólido" — a Spanish-language running/training-plan PWA. It shows a runner's home screen ("today's workout") and a weekly training plan (timeline, load chart, coach messages, gear/shoe data), with a distinctive time-of-day visual theme (sunrise/day/sunset/night) applied globally.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview the production build

No lint, test, or type-check scripts are configured. No `vite.config.js` exists — the project runs on Vite's zero-config defaults for a plain JS SPA.

## Architecture

The **only** live code path is `src/`, entered via `index.html` → `<script type="module" src="/src/main.js">`. Everything renders into a single `<div id="app">`. There is no framework — "components" are plain functions returning HTML template-literal strings, wired together by a tiny hand-rolled router/state module.

### Rendering flow
- `src/main.js` — entry point: imports fonts, `iconify-icon`, global styles, calls `applyAutomaticTheme()`, then `start(Plan)` (or `start(Home)`) from `src/core/router.js`.
- `src/core/state.js` — single plain-object store (`currentPage`, `selectedWorkout`, `selectedRun`, `selectedExercise`, `selectedShoe`) with `getState`/`setState`.
- `src/core/render.js` — `render()` calls `app.innerHTML = state.currentPage()` then re-runs `createIcons` from `lucide` to hydrate icon markup.
- `src/core/router.js` — `start(page)` / `navigate(page)` set state and call `render()`.

When adding a new page or navigation flow, use `src/core/router.js` + `src/core/state.js` — **do not** use `src/router/router.js` or `src/pages/Home.js` (see Known duplication below).

### Structure
- `src/pages/Home/` and `src/pages/Plan/` — page-level components. `Plan/` also has `planStore.js`, `initPlanEvents.js`, and a `components/` subfolder (`PlanHeader`, `PlanTimeline`, `PlanWorkoutCard`, `PlanSummary`, `PlanLoadChart`, `TimelineDay`).
- `src/components/` — shared UI: `Hero/`, `MasterCard/` (composed of `SessionCard`, `CoachCard`, `StatusCard`), `Navigation/BottomNavigation.js`, `WorkoutCard/`, `WorkoutIcon/`, `Logo/`.
- `src/data/` — plain JS modules exporting the app's data (not JSON): `planData.js` (the weekly plan), `todayWorkout.js`, `sessionData.js`, `shoeData.js`, `motivationalQuotes.js`, `trainingTips.js`, `weeklyGoals.js`, `workoutTypes.js`, `heroData.js`, `selectedWorkout.js`.
- `src/theme/` — `themeManager.js` (persists choice to localStorage key `corredor-solido-theme`), `themes.js`, `timeTheme.js` (`getAutomaticTheme()` maps hour-of-day to sunrise/day/sunset/night).
- `src/styles/` — global CSS loaded via JS imports in `main.js` (`app.css`, `hero.css`, plus `variables.css`, `cards.css`, `buttons.css`, `glass.css`, `typography.css`, `animations.css`, `utilities.css`).
- `src/design-system/` — a second, overlapping design-token system (`tokens.css`, `colors.css`, `spacing.css`, `radius.css`, `shadows.css`, `typography.css`). See Known duplication below.
- `src/design/HOME.md` — design-philosophy doc for the Home screen (Spanish): the Hero is untouchable, one master card, time-of-day theming applies everywhere, minimalism ("Hoy entrenas").
- `src/utils/` — `format.js`, `storage.js`, `date.js`.
- `src/assets/` — hero images per time-of-day (day/night/sunrise/sunset/rain/snow) plus plan header image.
- `public/` — served as-is (`favicon.svg`, `icons.svg` sprite sheet).

### Known duplication / dead code (do not extend, safe to ignore or consolidate)
- `src/router/router.js` is a near-duplicate of `src/core/router.js` (own local `currentPage` variable, calls `initPlanEvents()` directly). Not imported by `main.js`.
- `src/pages/Home.js` duplicates `src/pages/Home/Home.js` with off-by-one relative import paths.
- `src/design-system/*.css` defines `--color-*`/`--radius-*`/`--space-*` tokens that overlap with, and differ in value from, `src/styles/variables.css` — an in-progress/unfinished consolidation.
- Root-level `js/`, `css/`, `legacy/`, `data/`, `images/` are **not part of the build** — `index.html` only loads `/src/main.js`. `js/app.js` even imports a nonexistent path (`../components/Hero.js`). Most files in `js/` and `css/` are empty stubs; `legacy/`, `data/`, `images/` (root) are empty directories.
- `manifest.json` and `sw.js` at the root are empty (0 bytes) despite PWA-flavored meta tags in `index.html` — no manifest content, no service worker registration, and no `<link rel="manifest">` tag exist yet. PWA support is not implemented.
- `src/components/DesignSystem/MasterCard/` contains versioned experiments (`MasterCard.js`, `MasterCard.css`, `MasterCard_v2.css`, `master-card-v3.svg`) — design iteration scratch space, not necessarily the version in active use (check `src/components/MasterCard/` for the live one).
