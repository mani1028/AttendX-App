# AttendX — Deep Codebase Analysis & Production-Grade Upgrade Plan

**Scope analyzed:** 131 TypeScript/TSX files, ~96,600 lines of code, 78 screens across 9 roles (Admin, Director, Principal, Accountant, Teacher, Student, Visitor, Auth, Public).

**Stack confirmed:** React Native (CLI, not web) · React Navigation (native-stack + bottom-tabs) · `react-native-safe-area-context` · `lucide-react-native` (+ legacy `react-native-vector-icons` in places) · `react-native-linear-gradient` · `react-native-svg` · AsyncStorage · Axios-style API client.

**Important correction before anything else:** the request asked for "Framer Motion." Framer Motion is a **web-only** library (it animates DOM elements). This is a React Native app — Framer Motion cannot run here at all. The correct native equivalent, which gives you the same class of capability (gesture-driven, 60fps, interruptible, physics-based animation) is **React Native Reanimated 3 + React Native Gesture Handler**. Everything below — including the master prompt — is written around that correction so you don't waste time asking Antigravity to install something that will not work.

---

## 1. Executive Summary

The app is functionally rich and the UI intent is already fairly modern (gradient headers, card-based dashboards, role-based theming, a real splash animation). The core problem is **not** "the UI looks bad" — it's that the codebase grew organically without a maintained design system, without performance discipline, and without the supporting infrastructure (error boundaries, secure storage, accessibility, code-splitting) that separates a working prototype from a production-grade app. Concretely:

- **5 competing theme/color files** with contradictory brand colors (navy `#1e3a8a` vs purple `#6648dc` for "primary").
- **~1,700 lines of near-identical code** duplicated across 6 separate TabBar components.
- **A real bug**: a duplicate object key in `SchoolUnifiedLayout.tsx` silently overwrites Director menu config.
- **76 files reach directly into `AsyncStorage`** with inconsistent key naming (`branchId` vs `branch_id`, `role` vs `userRole`) — no central data-access layer.
- **Auth tokens stored in plain, unencrypted AsyncStorage** — a security gap for a production app handling student/financial data.
- **318 hardcoded pixel values** and only 5 files use the reactive `useWindowDimensions` hook (29 use the stale `Dimensions.get('window')` pattern) — real responsive/rotation risk.
- **36 of 39 form screens have no `KeyboardAvoidingView`** — keyboard will likely cover inputs on many screens.
- **1,845 `TouchableOpacity` instances, only 10 files use any accessibility props** — screen readers are effectively unsupported.
- **Zero error boundaries, zero dark mode, zero font-scaling control, zero data-fetching/caching library.**
- **3,030-line, 2,688-line, 2,379-line single-file screens** ("god components") mixing data, logic, and UI.
- **224 legacy `Animated` API call sites**, almost no Reanimated — heavy, verbose, CPU-thread-bound animation code that could be 70% shorter and smoother on Reanimated's UI thread.
- **824 uses of TypeScript `any`** — type safety is largely bypassed, which is exactly why the key-naming bugs above aren't caught at compile time.

None of this means a rewrite is needed. It means: **stabilize the foundation (storage, types, security, perf) in parallel with the visual/animation pass**, because shipping beautiful animations on top of an inconsistent data layer just makes the inconsistencies more visible, not less.

---

## 2. Findings by Category

### 2.1 Theming & Design System

| Issue | Evidence | Impact |
|---|---|---|
| Conflicting brand color sources | `theme/theme.ts` → primary `#1e3a8a` (navy). `constants/designTokens.ts` → primary `#6648dc` (purple), **used by zero files** (dead code). `constants/directorTheme.ts` hardcodes its own `#6648dc` independently of both. | Inconsistent brand color across roles; a designer asked to "change the primary color" would have to find and edit 5 files and still might miss one. |
| 5 parallel theme wrapper files | `colors.ts`, `theme.ts`, `principalTheme.ts`, `directorTheme.ts` all just re-export the same `Theme.colors` under different key names (`t1/t2/t3` vs `text/textSec/textMuted` vs `text2/text3`). | No single source of truth; onboarding a new dev or an AI tool to "use the design system" is ambiguous by construction. |
| Hardcoded colors bypassing tokens | e.g. `AppButton.tsx` ghost variant hardcodes `rgba(102,72,220,0.08)` (the *purple* token) while the rest of the button uses `Theme.colors.primary` (navy). Dashboard gradients hardcode `['#1E3A8A', '#3B82F6']` instead of referencing `Theme.colors.gradientStart/gradientEnd`. | Visual drift over time; future theme changes (e.g. dark mode) can't be done centrally. |
| No spacing/typography scale enforcement | `Theme.typography` and `Theme.spacing` exist and are good, but most screens use raw `fontSize: 16`, `marginTop: 12` instead of referencing the scale. | Inconsistent rhythm between screens designed at different times. |

### 2.2 Component Architecture & Duplication

| Issue | Evidence | Impact |
|---|---|---|
| 6 duplicated TabBar components | `PrincipalTabBar.tsx`, `TeacherTabBar.tsx`, `DirectorTabBar.tsx`, `AdminTabBar.tsx`, `AccountantTabBar.tsx`, `CustomTabBar.tsx` — diffed two of them after normalizing role names: ~90% identical code, differing only in icon imports, route names, and one hardcoded active-color (`#2563EB` vs `#3498db`). Combined: 1,700+ lines that should be ~250. | Any tab-bar bug (e.g. an animation glitch, a safe-area issue) must be fixed in 6 places; it usually only gets fixed in 1. |
| Real bug: duplicate object key | `SchoolUnifiedLayout.tsx` lines 82 and 97 both define `director: { ... }` in the same `MENU_CONFIG` object. JavaScript silently keeps only the second; the first Director menu (Dashboard/Branches/Add Branch) is dead code that can never run. | Confusing to maintain, and a sign no linter (`no-dupe-keys`) is enforced in CI. |
| God-component screens | `StudentManagementScreen.tsx` — 3,030 lines. `AttendanceScreen.tsx` (principal) — 2,688 lines. `TeacherManagementScreen.tsx` — 2,379 lines. `CalendarManagement.tsx` — 1,618 lines. Several more 1,200+ line screens. | Single files mixing API calls, form state, list rendering, modals, and styles. High risk of merge conflicts, very hard to test, and risky to touch for "just" a UI/animation pass — any visual change requires reading thousands of lines of unrelated logic first. |
| Two icon libraries in play | `lucide-react-native` in 79 files; `react-native-vector-icons` (Feather / MaterialIcons / MaterialCommunityIcons) in 9 files. | Subtle visual inconsistency (different stroke widths/weights) and an extra dependency to bundle. |
| Dead/stub files | `types/auth.types.ts`, `types/navigation.types.ts`, `constants/config.ts`, `constants/routes.ts`, `utils/validators.ts`, `hooks/useAuth.ts` — all **0 bytes**. | Scaffolding that was planned but abandoned; misleading for anyone (human or AI) exploring the codebase expecting these to contain logic. |

### 2.3 Local Storage & Data Layer

| Issue | Evidence | Impact |
|---|---|---|
| No data-access abstraction | 76 files call `AsyncStorage.getItem/setItem` directly (screens, services, components, contexts all do it independently). | Impossible to globally migrate storage engines, add encryption, add analytics on read/write, or mock storage in tests without touching 76 files. |
| Inconsistent key naming (camelCase vs snake_case, duplicated semantics) | Same logical values stored under multiple competing keys: `branchId` / `branch_id` / `branchCode` / `branch_code`; `role` / `userRole`; `schoolCode` / `school_code` / `schoolId` / `school_id`; `employeeId` / `employee_id`. `authSession.ts`'s own `SESSION_KEYS` list contains **both** spellings of several fields and `setSessionData` dual-writes both on every login. | Real risk of desync (a future change that writes only one spelling silently breaks reads elsewhere). TypeScript's `any` usage (824 instances) means none of this is caught at compile time. |
| Auth tokens & PII in plain AsyncStorage | `multiAccount.ts`, `authSession.ts`, and others store `token`, `email`, `user` JSON blobs via `AsyncStorage.setItem` with no encryption layer (`react-native-keychain` / `expo-secure-store` usage: **0 files**). | AsyncStorage is unencrypted on-disk storage (especially exposed on rooted/jailbroken devices). For an app handling student records and payment flows, this is a real security/compliance gap. |
| No typed schema for stored data | `safeJsonParse` exists as a defensive helper but storage reads/writes are not centrally typed; most call sites use `any`. | Silent data corruption (e.g., a renamed field) fails at runtime deep in a screen instead of at the storage boundary. |

### 2.4 Responsive Design & Mobile Layout

| Issue | Evidence | Impact |
|---|---|---|
| Static dimension reads instead of the reactive hook | 29 files call `Dimensions.get('window')` at module scope (captured once, at import time). Only 5 files use `useWindowDimensions()` (the React hook that re-renders on rotation/split-screen/fold). | Layouts computed from `SCREEN_WIDTH`/`SCREEN_HEIGHT` constants will not update on device rotation, Android multi-window/split-screen, or foldable unfold — a real "broken on some devices" risk. |
| 318 hardcoded pixel values | Widths/heights set as raw numbers rather than percentage, flex, or scaled-by-breakpoint values. | Brittle across the wide range of Android screen sizes (small phones to large tablets) this kind of school-admin app is typically installed on. |
| Near-zero tablet handling | Only 4 hits across the whole codebase for "tablet" logic. | Principals/Directors/Accountants doing data entry are realistically likely to use tablets; current layouts are phone-first with no breakpoint adaptation (e.g., dashboards that could use 2-column grids on tablet still stack single-column). |
| Mixed `SafeAreaView` sources | 5 files use RN-core `SafeAreaView`, 78 correctly use `react-native-safe-area-context`. | RN-core's `SafeAreaView` only works on iOS and behaves differently from the context-based version — mixing them risks double-padding or missing-padding bugs depending on screen. |
| Keyboard handling gap | 39 screens contain `TextInput`; only 3 of those wrap with `KeyboardAvoidingView`. | On most forms (login, OTP, registration, payment entry, marks entry, leave requests) the keyboard can cover the active input on smaller devices — a frequently-cited "this app feels unfinished" complaint in app reviews. |

### 2.5 Performance

| Issue | Evidence | Impact |
|---|---|---|
| Lists rendered via `ScrollView` + `.map()` instead of virtualization | 81 screens use `ScrollView`; only 4 use `FlatList`. 64 screens render a `.map()` of data directly inside a `ScrollView`. | For screens like student lists, attendance reports, marks entry, payroll — every row mounts at once with no windowing. On a school with hundreds of students this will visibly lag and spike memory. |
| Eager-loaded navigator | `AppNavigator.tsx` statically imports all 78 screens for all 9 roles up front (no `React.lazy` / code-splitting by role). | A teacher's app bundle initializes admin, director, accountant, and principal screens it will never render — slower cold start (Time-To-Interactive) than necessary. |
| Reanimated imported but not actually used for native-thread work | `TeacherDashboardScreen.tsx` imports `useSharedValue` from Reanimated, but the scroll handler is a plain JS `onScroll` callback that mutates `scrollY.value` manually instead of using `useAnimatedScrollHandler`. | The JS thread still does the work on every scroll frame; the supposed Reanimated benefit (off-JS-thread, never blocked by JS) isn't actually realized. |
| No data caching layer | No React Query / SWR / RTK Query anywhere; every screen manages its own `loading`/`error`/`refetch` state and re-fetches on every focus. | Repeated network calls for data that hasn't changed (e.g., re-opening the same dashboard tab refetches everything every time), and a lot of repetitive boilerplate per screen. |

### 2.6 Animation (the part you specifically asked about)

| Issue | Evidence | Impact |
|---|---|---|
| 224 call sites of the legacy `Animated` API, 2 files lightly touch Reanimated 3 | `AttendXIntro.tsx` (31 uses), `DirectorDashboardScreen.tsx` (29), `LoadingScreen.tsx` (18), plus every TabBar, `LoginScreen`, `AppInput`, `AccountSwitcher`, etc. | The legacy API is verbose (each animated value needs manual `useRef(new Animated.Value())`, manual `Animated.parallel/sequence` composition) and, critically, **cannot respond to gestures** without the JS thread getting involved — there's no swipe-to-dismiss, no drag-to-reorder, no gesture-driven bottom sheet anywhere in the app, which is now a baseline expectation in modern mobile apps. |
| No haptic feedback anywhere | `react-native-haptic-feedback` / `expo-haptics` / `Vibration`: **0 usages**. | Buttons, success/error states, and pull-to-refresh feel flat compared to native iOS/Android system apps and most competitor apps. |
| No skeleton/shimmer loading states | `Skeleton`/`shimmer`: **0 usages**; only `ActivityIndicator` spinners (65 files). | Spinners read as "old-2015-app" compared to skeleton placeholders, which are the current standard for perceived performance. |
| No custom screen-transition animations | `AppNavigator.tsx` has 7 `screenOptions` blocks but none configure `cardStyleInterpolator`, custom `animation`, or shared-element-style transitions. | Every screen-to-screen transition uses the platform default; there's no branded motion identity (a deliberate "house style" of how screens enter/exit) anywhere in the app. |
| Press feedback is opacity-only | `AppButton.tsx` and most touchables rely solely on `activeOpacity={0.82}` with no scale-down, no spring-back, no haptic. | Feels static; modern apps almost universally pair a slight scale + spring + haptic tick on primary actions. |

### 2.7 Accessibility & Inclusivity

| Issue | Evidence | Impact |
|---|---|---|
| Accessibility props almost entirely absent | Only 10 of 131 files use `accessibilityLabel`/`accessibilityRole`/`accessibilityHint`, against 1,845 `TouchableOpacity` instances. | Screen reader users (VoiceOver/TalkBack) cannot meaningfully use this app — most interactive elements announce nothing or announce raw icon component names. |
| No font-scaling respect | `allowFontScaling`: 0 usages (meaning RN's default of `true` is implicitly relied on, but no screens are tested/laid out to tolerate larger system font sizes). | Users who increase system text size for visibility likely see truncated/overlapping text since layouts use fixed heights with hardcoded `fontSize`. |
| `hitSlop` rarely used | Only 6 files. | Small icon-only touch targets (notification bell, back arrows) likely fall under the 44×44pt (iOS) / 48×48dp (Android) minimum recommended touch target in places. |

### 2.8 Code Health / "Production-Grade" Signals

| Issue | Evidence | Impact |
|---|---|---|
| No error boundaries | 0 usages of `ErrorBoundary` / `componentDidCatch` anywhere. | An unexpected runtime error in any single screen can crash/white-screen the entire app instead of being contained and shown as a friendly "Something went wrong" state. |
| Heavy reliance on `any` | 824 instances across the codebase. | This is precisely why bugs like the duplicate `director` key and the key-naming chaos in storage exist undetected — TypeScript's safety net is switched off in most of the places that need it most. |
| Stray `console.log`/`console.warn` | 139 instances. | Noise in production logs; potential minor information leakage (tokens, user data) into device logs if any of these log sensitive variables. |
| No dark mode | `useColorScheme`/`darkMode`: 0 usages. | Increasingly expected baseline feature; also the absence makes a future dark-mode pass harder since colors aren't tokenized for theme-switching today. |

---

## 3. Why "fix the UI/animation" alone won't be enough

If you only ask for prettier screens and smoother animations on top of the current foundation, you'll get a more polished-looking version of the same fragile structure: still 6 duplicated tab bars (each needing the new animation pasted in 6 times), still inconsistent theme colors (so the "polish" pass will visually clash across roles), still no virtualization (so the new animations will visibly stutter on long lists), and still no error boundaries (so a new bug in the redesigned dashboard can still crash the whole app). That's why the master prompt below is structured in phases — design system and architecture first, then performance, then the animation/motion layer on top of a foundation that can actually support it well.

---

## 4. Recommended Tech Additions

| Need | Current | Recommended |
|---|---|---|
| Animation | Legacy `Animated` API (224 sites) | **`react-native-reanimated` v3** (UI-thread animations, worklets, `withTiming`/`withSpring`/`withSequence`/`withDelay`, `useAnimatedScrollHandler`, layout animations via `Layout`/`entering`/`exiting`) |
| Gestures | None | **`react-native-gesture-handler`** (paired with Reanimated for swipe-to-dismiss, draggable bottom sheets, pull interactions) |
| Bottom sheets / modals | Custom `BottomSheetModal.tsx` | **`@gorhom/bottom-sheet`** (built on Reanimated + Gesture Handler; battle-tested, animated, accessible) |
| Lists | `ScrollView` + `.map()` (64 screens) | **`FlatList`/`FlashList` (`@shopify/flash-list`)** for all data-driven lists |
| Data fetching/caching | Manual `useState`/`useEffect` per screen | **`@tanstack/react-query`** for caching, retries, background refresh, request de-duplication |
| Secure storage | Plain AsyncStorage for tokens | **`react-native-keychain`** (or `expo-secure-store` if on Expo) for tokens/credentials; AsyncStorage retained only for non-sensitive UI state |
| Haptics | None | **`react-native-haptic-feedback`** (or `expo-haptics`) |
| Skeleton loaders | None | **`react-native-reanimated`-based shimmer** (custom, ~40 lines) or `react-content-loader` |
| Forms | Manual `useState` per field | **`react-hook-form`** + a schema validator (`zod`) for consistent, type-safe validation across all 39+ form screens |
| Icons | Mixed `lucide-react-native` + `react-native-vector-icons` | Standardize on **`lucide-react-native`** only; remove the other |

---

## 5. MASTER PROMPT — Paste this into Antigravity

Everything below this line is the single master prompt. It's written to be self-contained: it includes the context Antigravity needs (since it won't have this conversation's analysis otherwise), a phased plan, explicit do/don't constraints, and acceptance criteria per phase so the AI can validate its own work before moving on.

````
══════════════════════════════════════════════════════════════════
MASTER PROMPT: AttendX — Production-Grade UI, Animation & Architecture Overhaul
══════════════════════════════════════════════════════════════════

CONTEXT
You are working on "AttendX," a React Native (CLI) school-management app with 9 user
roles (Admin, Director, Principal, Accountant, Teacher, Student, Visitor, plus public
registration screens and auth). It currently has 78 screens, uses React Navigation
(native-stack + bottom-tabs), react-native-safe-area-context, lucide-react-native icons,
react-native-linear-gradient, react-native-svg, and AsyncStorage. Animation today is done
almost entirely with React Native's legacy `Animated` API (~224 call sites) with only 2
files lightly touching Reanimated 3.

IMPORTANT CORRECTION: Do NOT install or use Framer Motion. Framer Motion is a web-only
(DOM) animation library and cannot run in a React Native app. The correct native
equivalent — which gives equivalent or better capability (UI-thread animation, gesture-
driven interactions, spring physics, layout animations) — is:
  - react-native-reanimated (v3)
  - react-native-gesture-handler
Use these for all animation/gesture work in this project.

GOAL
Bring this codebase to production-grade quality across architecture, data/storage,
security, performance, accessibility, and visual/animation polish — without a full
rewrite. Work in the phases below, in order, because later phases depend on the
foundation built in earlier ones. Do not skip ahead to animation polish before the
design-system and architecture fixes are in place, or the new animations will just be
layered on top of the same inconsistencies.

──────────────────────────────────────────────────────────────────
PHASE 0 — Audit & Safety Net (do this first, before changing any code)
──────────────────────────────────────────────────────────────────
1. Set up ESLint with `no-dupe-keys`, `react-hooks/exhaustive-deps`, and
   `@typescript-eslint/no-explicit-any` (as a warning, not error, initially — there are
   currently ~824 uses of `any` and we'll reduce them incrementally, not all at once).
2. Add a single root-level `<ErrorBoundary>` component wrapping the navigation tree, plus
   per-tab error boundaries so a crash in one role's screen doesn't white-screen the
   entire app. Show a friendly "Something went wrong" screen with a retry action.
3. Grep the codebase for `console.log`/`console.warn` and either remove them or replace
   with a tiny logger utility that's a no-op in production builds (`__DEV__` gated).
4. Find and fix the duplicate `director:` key bug in
   `src/components/layout/SchoolUnifiedLayout.tsx` (around line 82 and line 97 — two
   `director` keys exist in the same object literal; the first is silently discarded by
   JS). Merge them into one correct Director menu config and verify against the Director
   navigation stack that no menu items are missing.

Acceptance criteria for Phase 0: lint runs clean (or with known/accepted warnings only),
app no longer crashes the whole tree on a thrown error in any single screen, and the
Director menu in SchoolUnifiedLayout reflects the intended single correct config.

──────────────────────────────────────────────────────────────────
PHASE 1 — Unify the Design System (single source of truth)
──────────────────────────────────────────────────────────────────
Problem: there are currently 5 overlapping theme files (`constants/colors.ts`,
`constants/theme.ts`, `constants/principalTheme.ts`, `constants/directorTheme.ts`,
`constants/designTokens.ts`) plus `theme/theme.ts` as the underlying source — with
CONFLICTING brand colors (navy #1e3a8a in theme.ts vs purple #6648dc in designTokens.ts
and directorTheme.ts, the latter completely unused).

1. Decide ONE canonical brand color direction (ask me which — navy or purple — if it's
   not obvious from existing screenshots/brand guidelines) and consolidate into a single
   `src/theme/tokens.ts` containing: color palette (with light variants prepared for a
   future dark mode, structured as `{ light: {...}, dark: {...} }` even if dark isn't
   implemented yet), spacing scale, radius scale, typography scale, shadow/elevation
   presets, and per-role ACCENT colors only (e.g., Director's sidebar/active-tab accent
   can still differ per role, but it must be a deliberate accent token, not a competing
   "primary").
2. Delete `constants/colors.ts`, `constants/theme.ts`, `constants/principalTheme.ts`,
   `constants/directorTheme.ts`, `constants/designTokens.ts` and update every import
   across the codebase to use the new single `src/theme/tokens.ts`. Use search-and-replace
   carefully — check each file compiles after the change.
3. Remove all hardcoded hex colors found inline in component styles (e.g.,
   `['#1E3A8A', '#3B82F6']` gradients, `'#2563EB'` active tab colors, `rgba(102,72,220,...)`
   ghost button backgrounds) and replace with references to the new token file.
4. Standardize on `lucide-react-native` for all icons; remove the
   `react-native-vector-icons` imports (Feather, MaterialIcons, MaterialCommunityIcons —
   currently 9 files) and replace with lucide equivalents.
5. Delete the empty stub files that contain zero logic: `types/auth.types.ts`,
   `types/navigation.types.ts`, `constants/config.ts`, `constants/routes.ts`,
   `utils/validators.ts`, `hooks/useAuth.ts` — OR implement them properly if they're
   referenced anywhere (check imports first; if unreferenced, delete).

Acceptance criteria: grep for hex color literals (`#[0-9a-fA-F]{3,6}`) outside the token
file returns near-zero results in component style objects; only one theme file remains;
app visually renders identically (or better) across all 9 roles with one consistent
brand color family.

──────────────────────────────────────────────────────────────────
PHASE 2 — Collapse Duplicated Components
──────────────────────────────────────────────────────────────────
Problem: 6 separate TabBar components (`PrincipalTabBar.tsx`, `TeacherTabBar.tsx`,
`DirectorTabBar.tsx`, `AdminTabBar.tsx`, `AccountantTabBar.tsx`, `CustomTabBar.tsx`) are
~90% duplicate code (~1,700 lines combined), differing only in icon set, route names, and
accent color.

1. Build ONE configurable `<RoleTabBar config={...} />` component that accepts a config
   object: `{ tabs: [{ name, label, icon, routeIndex, isCenter? }], accentColor,
   centerButtonAction? }`.
2. Create a single `tabBarConfigs.ts` file exporting the per-role tab configs (the data
   that currently differs between the 6 files).
3. Replace all 6 usages in `AppNavigator.tsx` with the single component + appropriate
   config. Verify each role's tab bar still shows the correct tabs/icons/labels/center
   action after the refactor.
4. Apply the same "find duplication, extract config" treatment to any other near-
   duplicate role-specific components you find during this pass (check
   `*PageHeader.tsx` files in `components/layout/` for the same pattern).

Acceptance criteria: tab bar code drops from ~1,700 lines to roughly 250–350 lines
(one component + config), and manually verify (or write a quick navigation smoke test)
that all 6 roles still show their correct tabs.

──────────────────────────────────────────────────────────────────
PHASE 3 — Centralize Storage & Fix Security Gaps
──────────────────────────────────────────────────────────────────
Problem: 76 files call AsyncStorage directly with inconsistent, duplicated key names
(`branchId` vs `branch_id`, `role` vs `userRole`, `schoolCode` vs `school_code` vs
`schoolId`). Auth tokens are stored in plain (unencrypted) AsyncStorage.

1. Install `react-native-keychain` (or `expo-secure-store` if this project uses Expo —
   check first). Move ONLY sensitive data here: auth token, refresh token if any, and
   saved-account credentials used for multi-account switching. Everything else
   (preferences, cached non-sensitive profile fields) stays in AsyncStorage.
2. Create a single `src/storage/StorageKeys.ts` file as an enum/const object listing
   every key in ONE canonical casing (recommend camelCase to match JS/TS conventions:
   `branchId`, `schoolCode`, `userRole`, etc.). No duplicate-meaning keys.
3. Create `src/storage/storage.ts` — a typed wrapper exposing typed getters/setters per
   logical entity (e.g., `getSession(): Promise<Session | null>`,
   `setSession(data: Session): Promise<void>`, `getSavedAccounts()`, `saveAccount()`)
   instead of raw `AsyncStorage.getItem('some_string')` calls scattered everywhere.
4. Migrate all 76 direct-AsyncStorage call sites to use the new typed wrapper. Do this
   file-by-file and verify each screen/service still works after migration — this is the
   highest-risk phase, take it incrementally (e.g., migrate `services/` first, then
   `context/`, then `screens/` role by role) and test login/logout/account-switching
   thoroughly after each batch, since that flow touches the most storage keys.
5. Write a one-time migration function that runs on app start: read any OLD-format keys
   still present from a previous app version, copy their values into the new canonical
   keys, then delete the old keys. This avoids logging out existing installed users.

Acceptance criteria: zero direct `AsyncStorage.getItem/setItem` calls outside
`src/storage/storage.ts`; auth tokens verified to be in Keychain/SecureStore, not
AsyncStorage; login → use app → force-quit → reopen → still logged in, tested for at
least 3 different roles; multi-account switching still works correctly end to end.

──────────────────────────────────────────────────────────────────
PHASE 4 — Responsive Layout & Mobile Correctness
──────────────────────────────────────────────────────────────────
1. Replace every module-level `const { width } = Dimensions.get('window')` pattern
   (29 files) with the `useWindowDimensions()` hook called inside the component, so
   layouts react correctly to rotation, Android split-screen, and foldables.
2. Audit the 318 hardcoded pixel width/height values found across styles; convert layout-
   critical ones (card widths, grid columns, modal widths) to percentage-based or
   `flex`-based sizing, or to values derived from `useWindowDimensions()` with explicit
   breakpoints (e.g., `width > 768` → tablet 2-column layout) rather than fixed numbers.
3. Add a simple `useBreakpoint()` hook (`phone` / `tablet` based on shortest-side width)
   and apply it to at least the Principal, Director, and Accountant dashboards first,
   since those roles are most likely to be used on tablets for data entry — give them
   2-column or 3-column grid layouts on tablet width instead of the current single-column
   stack.
4. Standardize on `react-native-safe-area-context`'s `useSafeAreaInsets`/`SafeAreaView`
   everywhere; replace the 5 files still using RN-core's `SafeAreaView` (iOS-only,
   inconsistent with the context-based version).
5. Add `KeyboardAvoidingView` (with appropriate `behavior` per platform: `padding` on
   iOS, `height` on Android, or use `react-native-keyboard-controller` for a more
   reliable cross-platform solution) to every screen containing form inputs that
   currently lacks it — there are 36 such screens. Prioritize: Login, Register, Forgot/
   Reset Password, OTP verification, Payment Entry, Marks Entry, Leave Request forms
   first, since these are the highest-traffic forms.

Acceptance criteria: rotate device on at least 3 dashboard screens — layout reflows
correctly with no clipped/overlapping content; test on a tablet-size simulator/emulator —
Principal/Director/Accountant dashboards use multi-column layout; every screen with a
text input scrolls/shifts to keep the focused input visible above the keyboard.

──────────────────────────────────────────────────────────────────
PHASE 5 — Performance
──────────────────────────────────────────────────────────────────
1. Replace `ScrollView` + `.map()` list rendering (64 screens identified) with
   `FlatList` (or `@shopify/flash-list` for the longest lists — student rosters,
   attendance history, payroll records) including `keyExtractor`, `getItemLayout` where
   row height is fixed, and `removeClippedSubviews`. Prioritize by list length: student
   lists, attendance reports, payroll/salary lists first.
2. Introduce `@tanstack/react-query` for all data fetching. Wrap the existing service
   functions (`teacherService.ts`, `studentService.ts`, `principalService.ts`, etc.) with
   `useQuery`/`useMutation` hooks so screens get automatic caching, de-duplication,
   background refresh on focus, and consistent loading/error states — replacing the
   current pattern of manual `useState`-based loading/error handling repeated in nearly
   every screen.
3. Convert `AppNavigator.tsx`'s eager imports to lazy-loaded, role-scoped navigators
   using `React.lazy` + `Suspense` (or React Navigation's native support for deferred
   screen registration) so a Teacher's session doesn't initialize Admin/Director/
   Accountant/Principal screen modules it will never use.
4. Audit and fix the Reanimated usage in `TeacherDashboardScreen.tsx` (and anywhere else
   `useSharedValue` is imported but driven by a plain JS event handler instead of
   `useAnimatedScrollHandler`) so scroll-linked animations actually run off the JS thread
   as intended.

Acceptance criteria: scrolling a 200+ row student list stays smooth (no visible frame
drops) using React DevTools Profiler or a simple FPS overlay; cold start time measured
before/after lazy-loading shows improvement; network tab shows no duplicate redundant
requests when navigating back and forth between already-visited tabs within the cache
window.

──────────────────────────────────────────────────────────────────
PHASE 6 — Accessibility
──────────────────────────────────────────────────────────────────
1. Add `accessibilityRole="button"` and a meaningful `accessibilityLabel` to every
   icon-only touchable (notification bell, back arrows, menu icons, FABs) — there are
   1,845 `TouchableOpacity` instances and currently only 10 files have any accessibility
   props at all. Prioritize primary navigation elements (tab bar, headers) first, then
   form screens, then everything else.
2. Ensure every `TextInput` has an associated accessible label (via `accessibilityLabel`
   or a visible `<Text>` label correctly associated).
3. Add `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` (or larger as needed) to any
   icon-only touch targets smaller than 44×44pt.
4. Verify text-heavy screens don't break with iOS/Android system font scaling turned up
   (test at the largest accessibility text size) — fix any fixed-height containers that
   would clip scaled text.

Acceptance criteria: run a screen reader (VoiceOver on iOS / TalkBack on Android) through
the core flows (login, mark attendance, view dashboard) and confirm every interactive
element is announced meaningfully; test with largest system font size and confirm no
critical text is clipped or overlapping on at least the 5 most-used screens.

──────────────────────────────────────────────────────────────────
PHASE 7 — Animation & Motion System (Reanimated 3, NOT Framer Motion)
──────────────────────────────────────────────────────────────────
This is the phase to focus on the actual "make it feel premium" request — but it depends
on Phases 1–3 being done, because a shared motion system needs a shared design token file
(durations, easings) and shouldn't be re-pasted into 6 duplicate tab bars.

1. Install `react-native-reanimated` v3 and `react-native-gesture-handler`, follow their
   official setup (babel plugin, app entry wrapping). Remove the legacy `Animated` API
   usage (224 call sites) incrementally, screen by screen — don't do a risky global
   find-replace; convert and test one screen/component at a time.
2. Create `src/theme/motion.ts` — a single source of truth for animation values:
     - durations: `fast: 150, base: 250, slow: 400` (ms)
     - easings: standard `Easing.out(Easing.cubic)` style curves for enter/exit
     - spring presets: `{ damping, stiffness, mass }` tuned for "snappy" vs "gentle"
   This is the animation equivalent of the design tokens from Phase 1 — every animated
   component should reference these, not invent its own duration/easing inline.
3. Rebuild the splash/intro animation (`AttendXIntro.tsx`) using Reanimated's
   `withDelay`/`withSequence`/`withTiming` instead of manually chaining
   `Animated.parallel`/`setTimeout` — same visual result, ~half the code, and properly
   cancellable if the component unmounts early.
4. Add a consistent press-feedback treatment to the shared `AppButton`, `AppCard`,
   and any other tappable primitive: scale down to ~0.96 with a spring on press-in,
   spring back on press-out, paired with a light haptic tick (via
   `react-native-haptic-feedback`) on primary actions (submit, confirm, save) and a
   slightly different haptic for destructive actions (delete, logout).
5. Add shared layout/list animations using Reanimated's `Layout` transitions and
   `entering`/`exiting` props: cards in dashboards fade+slide in on mount (staggered by
   index for grids), list items animate out when deleted/removed (e.g., approving/
   rejecting a leave request, removing a student from a pending list) instead of
   snapping away instantly.
6. Implement a real skeleton/shimmer loading state (a small reusable
   `<SkeletonBlock />`/`<SkeletonCard />` component, animated via Reanimated's looping
   `withRepeat(withTiming(...))` for the shimmer sweep) and replace bare
   `ActivityIndicator` spinners on the dashboard and list screens (the most-viewed
   screens) first.
7. Add custom screen-transition animation via React Navigation's
   `cardStyleInterpolator` (native-stack) — pick ONE consistent house style (e.g., a
   subtle fade+slight-scale, or slide-with-fade) and apply it as the default
   `screenOptions` at the navigator level rather than leaving every transition on the
   platform default. Keep platform-native back-gesture behavior intact.
8. Convert the most valuable bottom sheet/modal interactions (`BottomSheetModal.tsx`,
   `CustomPickerModal.tsx`, `AccountSwitcher.tsx`) to use `@gorhom/bottom-sheet`
   (built on Reanimated + Gesture Handler) so they get proper drag-to-dismiss, snap
   points, and backdrop fade — replacing whatever manual `Modal` + `Animated` logic
   they currently use.
9. Add a subtle pull-to-refresh custom indicator (replacing the default
   `RefreshControl` tint-only spinner) on at least the 3 most-used dashboards
   (Teacher, Principal, Student), using Reanimated to drive a branded refresh
   animation tied to pull distance via `useAnimatedScrollHandler`.

Acceptance criteria: legacy `Animated` API usage reduced to near-zero (only keep it where
genuinely simpler, e.g., a one-off non-interactive fade, and document why); every
animation references `src/theme/motion.ts` values rather than inline magic numbers;
haptics fire on at least primary button presses across the 5 most-used screens; skeleton
loaders replace spinners on dashboard + list screens; screen transitions have one
consistent custom style instead of platform default; test on a mid-range Android device
(not just a simulator) to confirm animations stay smooth — Reanimated's UI-thread
execution should keep 60fps even under JS-thread load (e.g., during a network request).

──────────────────────────────────────────────────────────────────
PHASE 8 — Polish Pass / Final QA
──────────────────────────────────────────────────────────────────
1. Re-run the Phase 0 lint/error-boundary checks across the whole app after all other
   phases.
2. Manually walk every one of the 9 roles' primary flows end-to-end (login → dashboard →
   2-3 core actions → logout) and note any visual inconsistency remaining (mismatched
   spacing, leftover hardcoded colors, missing loading states).
3. Confirm dark-mode readiness: even if dark mode isn't fully shipped this round, verify
   the Phase 1 token structure (`{ light: {...}, dark: {...} }`) is in place so a future
   dark-mode toggle is a config change, not a redesign.
4. Produce a short changelog summarizing what changed per phase, including any follow-up
   technical debt intentionally deferred (e.g., "god component" screens like
   StudentManagementScreen.tsx at 3,030 lines were not split in this pass — flag for a
   dedicated refactor sprint).

──────────────────────────────────────────────────────────────────
GLOBAL CONSTRAINTS (apply throughout all phases)
──────────────────────────────────────────────────────────────────
- Never use Framer Motion or any web-only library — this is React Native, not a web app.
- Work incrementally and verify after each meaningful change; do not attempt to do a
  single giant find-and-replace across the whole codebase for theme/storage/animation
  changes — migrate in batches (by role or by file group) and confirm each batch works
  before moving to the next, since this codebase has several multi-thousand-line files
  where mistakes are easy to introduce and hard to spot.
- Preserve all existing business logic and API contracts exactly — this pass is about
  architecture, performance, storage, accessibility, and visual/motion polish, NOT about
  changing what features do or how data is fetched/validated server-side.
- When in doubt about which brand color (navy vs purple) or which specific visual
  direction to take, stop and ask rather than guessing, since this affects every screen.
- Flag (but do not attempt to fix in this pass unless asked) the largest "god component"
  screens — StudentManagementScreen.tsx (3,030 lines), AttendanceScreen.tsx/principal
  (2,688 lines), TeacherManagementScreen.tsx (2,379 lines) — as needing a dedicated
  component-decomposition refactor before they can safely receive heavy animation work,
  since editing animation logic inside a 3,000-line file is high-risk.

══════════════════════════════════════════════════════════════════
END OF MASTER PROMPT
══════════════════════════════════════════════════════════════════
````

---

## 6. Suggested Execution Order (if you want to run this in stages with Antigravity)

1. **Phases 0–1** first (safety net + design system) — low risk, high payoff, makes everything after it easier to verify visually.
2. **Phase 3** (storage/security) next, in isolation, with careful testing of login/logout/account-switching — this is the riskiest phase and should not be mixed with visual changes in the same session, so you can clearly tell if a bug came from storage migration or from UI changes.
3. **Phases 2, 4, 5** (component dedup, responsive, performance) together — they touch overlapping files (tab bars, dashboards) so doing them in one pass per screen avoids re-touching the same files twice.
4. **Phase 6** (accessibility) can run in parallel with Phase 7, screen by screen, since adding `accessibilityLabel` props rarely conflicts with animation changes.
5. **Phase 7** (animation/motion) last, once the foundation is stable — this is intentionally the most "visible" phase, saved for when the underlying screens are already consistent and performant, so the new motion design actually reads as polished rather than papering over inconsistency.
6. **Phase 8** as a final QA pass before considering it production-ready.

If you'd rather move faster and accept more risk, you can ask Antigravity to run Phases 1 and 7 together first (design tokens + animation) to get a visible "before/after" quickly for stakeholders, then circle back for Phases 3–6 — just be explicit with it that this is a deliberately reordered, higher-risk sequence so it doesn't silently skip the storage/performance work afterward.