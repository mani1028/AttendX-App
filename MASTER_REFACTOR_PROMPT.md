You are refactoring a React Native school-management app (87 screens, role-based: principal, teacher, student, accountant, director, admin, visitor). The brand primary color is navy `#1e3a8a`. A complete design token system already exists in `src/theme/tokens.ts` and `src/theme/motion.ts` — the problem is that almost no screens use it. Your job is enforcement and consolidation, not redesign. Work through the steps below in order. After each numbered step, run the verification grep listed under it before moving to the next step.

---

STEP 1 — Consolidate headers into one component

Delete:
- src/components/layout/AccountantPageHeader.tsx
- src/components/common/Header.tsx (and screens/common/Header.tsx if it's a separate file)

Modify src/components/layout/StandardPageHeader.tsx to absorb both deleted components' use cases:
- Add optional props: greeting?: string, greetingSubtext?: string, showCalendar?: boolean, onCalendarPress?: () => void
- When `greeting` is provided, render it in a second row below the nav row, matching the old AccountantPageHeader pattern (large white greeting text + smaller subtext)
- When `showCalendar` is true, render a calendar icon button on the right side instead of the default rightIcon slot
- Force these values always, removing any override capability that caused drift:
  - paddingBottom: HEADER_CONSTANTS.PADDING_BOTTOM (30)
  - borderBottomLeftRadius / borderBottomRightRadius: HEADER_CONSTANTS.BORDER_RADIUS (30)
  - backgroundColor defaults to Theme.colors.primary, only overridable for legitimate per-role accent needs
  - back button icon: ChevronLeft, size=22, strokeWidth=2, color="#fff" (replace any ArrowLeft usage anywhere in the app)

Then update every screen currently using AccountantPageHeader or common/Header to import and use StandardPageHeader instead, mapping their existing props (title, greeting text, onBackPress, etc.) onto the new prop interface.

Finally, find every screen with an inline hand-rolled header (a LinearGradient wrapping a back button + title, NOT using any shared header component) and replace it with StandardPageHeader. These are the screens with "borderBottomLeftRadius" values that are NOT "HEADER_CONSTANTS.BORDER_RADIUS" — search for all of these:
grep -rn "borderBottomLeftRadius:\s*[0-9]" src/screens

Verify: `grep -rln "AccountantPageHeader\|ArrowLeft" src/screens src/components` should return zero files after this step.

---

STEP 2 — Consolidate tab bars into RoleTabBar

There are 6 independent tab bar implementations: CustomTabBar.tsx, AccountantTabBar.tsx, TeacherTabBar.tsx, AdminTabBar.tsx, DirectorTabBar.tsx, PrincipalTabBar.tsx — all in src/components/layout/. None of them use the existing generic src/components/layout/RoleTabBar.tsx, which already accepts `tabs`, `accentColor`, and `centerButtonAction` props and reads tab configs from src/components/layout/tabBarConfigs.ts.

First fix RoleTabBar.tsx itself:
- Replace hardcoded '#94A3B8' with Theme.colors.textMuted
- Replace hardcoded '#FFFFFF' tab bar background with Theme.colors.card
- Replace hardcoded '#E2E8F0' border with Theme.colors.border
- Add a press animation to the center button:
  ```
  const pressAnim = useRef(new Animated.Value(1)).current;
  // onPressIn: Animated.spring(pressAnim, { toValue: 0.92, ...motion.springs.snappy, useNativeDriver: true }).start()
  // onPressOut: Animated.spring(pressAnim, { toValue: 1, ...motion.springs.bouncy, useNativeDriver: true }).start()
  // wrap the center button View in <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
  ```
- Add shadow to the center button: shadowColor: Theme.colors.primary, shadowOffset: {width:0, height:6}, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10
- Add a white ring: borderWidth: 3, borderColor: '#ffffff'

Then, for each of the 6 role-specific tab bar files: extract that role's tab config (icon, label, route name, isCenter flag) into tabBarConfigs.ts if not already present there, delete the role-specific tab bar file, and update AppNavigator.tsx to render `<RoleTabBar tabs={roleTabConfig} accentColor={roleAccentColor} ... />` for that role's tab navigator instead of the deleted component.

Verify: `find src/components/layout -iname "*tabbar*"` should return only RoleTabBar.tsx and tabBarConfigs.ts after this step.

---

STEP 3 — Fix the splash/loading screen brand colors

In src/screens/common/LoadingScreen.tsx:
- Change blobTL backgroundColor from rgba(102,72,220,0.07) to rgba(30,58,138,0.08)
- Change blobBR backgroundColor from rgba(56,189,248,0.05) to rgba(59,130,246,0.06)
- Change spinner borderTopColor to reference Theme.colors.primary explicitly (it's already wired but confirm it resolves to navy, not a stale value)

Verify: `grep -n "102,72,220" src/screens/common/LoadingScreen.tsx` should return nothing.

---

STEP 4 — Standardize StatusBar

In AppNavigator.tsx (or the root navigation entry point), set one global StatusBar: barStyle="light-content", backgroundColor="transparent", translucent={true}.

Remove individual `<StatusBar .../>` declarations from every child screen EXCEPT:
- LoginScreen.tsx — keep barStyle="dark-content" (white background screen)
- LoadingScreen.tsx — keep barStyle="dark-content" (white background screen)

Verify: `grep -rln "StatusBar barStyle" src/screens` should return only LoginScreen.tsx and LoadingScreen.tsx.

---

STEP 5 — Replace hardcoded colors with design tokens

Theme.colors in src/theme/tokens.ts already defines every color needed. Do a systematic find/replace across all files in src/screens and src/components:

White variants → Theme.colors.card (for surfaces) or '#ffffff' only if it's a literal white-on-white case that doesn't map to a token:
  '#fff', '#FFF', '#ffffff', '#FFFFFF' → Theme.colors.card

Navy primary variants → Theme.colors.primary:
  '#1e3a8a', '#1E3A8A'

Slate gray text variants → Theme.colors.textSec:
  '#64748B', '#64748b', '#475569'

Dark text variants → Theme.colors.text:
  '#0f172a', '#0F172A', '#0d1b2a'

Border variants → Theme.colors.border:
  '#e2e8f0', '#E2E8F0', '#e4e9f2'

Status colors → their token equivalents:
  '#059669', '#10b981' → Theme.colors.success
  '#dc2626', '#ef4444' → Theme.colors.error
  '#3b82f6' → Theme.colors.blue or Theme.colors.primaryLight depending on context

Background variants → Theme.colors.background:
  '#f1f5f9', '#F1F5F9', '#f8fafc', '#F8FAFC'

For any hex value not covered above, check it against the full palette in tokens.ts before deciding — do not invent new colors, find the closest existing token. If a screen is using a role-specific accent (accentPrincipal, accentTeacher, accentStudent, accentAccountant, accentDirector), preserve that — those are intentional, not drift.

Make sure every file you edit imports Theme: `import { Theme } from '../../theme/tokens';` (adjust relative path per file location).

Verify: count unique hex values remaining —
`grep -rhoE "#[0-9A-Fa-f]{3,8}" src/screens --include="*.tsx" | sort -u | wc -l`
should drop from 231 to under 30 (remaining ones should only be the role accent colors and true one-off cases like a specific chart color).

---

STEP 6 — Replace raw spacing with Theme.spacing tokens

Theme.spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 }. Across all screens, replace padding/margin numeric literals with the nearest token:

4 → Theme.spacing.xs
8 → Theme.spacing.sm
16 → Theme.spacing.md
24 → Theme.spacing.lg
32 → Theme.spacing.xl
48 → Theme.spacing.xxl

For values that don't land exactly on a token (e.g. 12, 20, 28, 40), round to the nearest token UNLESS the value is load-bearing for a specific visual alignment (e.g. matching an icon size) — in those cases leave a comment explaining why it's a custom value rather than forcing a bad fit.

Verify: `grep -rl "Theme.spacing\." src/screens | wc -l` should go from 0 to a large majority of the 87 screens.

---

STEP 7 — Replace raw fontSize with Theme.typography tokens

Theme.typography in tokens.ts defines h1 (28/800), h2 (22/700), h3 (18/700), h4 (16/600), body (14/400), bodyMd (15/400), caption (12/500), label (11/700/uppercase).

Replace inline fontSize+fontWeight pairs with spread syntax:
  { fontSize: 28, fontWeight: '800' } → { ...Theme.typography.h1 }
  { fontSize: 22, fontWeight: '700' } → { ...Theme.typography.h2 }
  { fontSize: 18, fontWeight: '700' } → { ...Theme.typography.h3 }
  { fontSize: 16, fontWeight: '600' } → { ...Theme.typography.h4 }
  { fontSize: 14 } body text → { ...Theme.typography.body }
  { fontSize: 12 } captions/labels → { ...Theme.typography.caption }

Preserve any additional style properties (color, marginBottom, etc.) alongside the spread — don't drop them.

Verify: `grep -rhoE "fontSize:\s*[0-9]+" src/screens --include="*.tsx" | sed -E 's/fontSize:\s*//' | sort -un | wc -l` should drop from 23 toward single digits (remaining values should only be true one-offs like a giant hero number on a stat card).

---

STEP 8 — Wire up the animation system

In src/theme/motion.ts, add this export:
```typescript
import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function useScreenEntrance() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: motion.durations.base, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...motion.springs.snappy, useNativeDriver: true }),
    ]).start();
  }, []);
  return { fadeAnim, slideAnim };
}
```

Find every screen with a hand-rolled Animated.timing/Animated.spring entrance effect (search: `grep -rln "Animated.Value(0)" src/screens`) and replace the local fadeAnim/slideAnim setup with `const { fadeAnim, slideAnim } = useScreenEntrance();` from motion.ts, removing the now-redundant useRef/useEffect block.

Verify: `grep -rn "tension: 20\|friction: 7" src/screens` should return nothing (these were LoginScreen's old hardcoded spring values).

---

STEP 9 — Roll out SkeletonLoader and build EmptyState

SkeletonLoader.tsx exists at src/components/common/SkeletonLoader.tsx but is used in zero screens. Find every screen using a bare `ActivityIndicator` for a full-screen or full-list loading state (not a small inline button spinner) and replace it with SkeletonLoader, matching its shape to the content being loaded (card skeleton for dashboards, row skeleton for lists).

Build a new component src/components/common/EmptyState.tsx:
```typescript
// Props: icon (lucide-react-native component), title: string, subtitle?: string, actionLabel?: string, onAction?: () => void
// Centered layout, Theme.colors.textMuted icon, Theme.typography.h4 title, Theme.typography.body subtitle,
// optional AppButton if actionLabel+onAction provided
```

Roll EmptyState into every list/data screen currently missing empty-state handling (the screens NOT matching: `grep -rln "No data\|No records\|EmptyState" src/screens`).

Verify: `grep -rl "SkeletonLoader" src/screens | wc -l` should go from 0 to a meaningful number (target: every screen that currently uses ActivityIndicator for a full-page load).

---

STEP 10 — Consolidate input components

Two competing input components exist: src/components/common/AppInput.tsx and src/components/CustomInput.tsx. Audit both for feature parity (label, error state, icon support, secure text entry). Keep AppInput as the canonical one (it's in the common/ folder alongside other shared primitives). Migrate every screen importing CustomInput to import AppInput instead, mapping props as needed. Delete CustomInput.tsx once no imports remain.

Verify: `grep -rl "CustomInput" src/screens src/components` should return zero files.

---

STEP 11 — Clean up duplicate shadow system

Delete src/utils/shadowStyles.ts. Replace every inline shadow definition (shadowColor/shadowOffset/shadowOpacity/shadowRadius/elevation written out manually) with a spread of Theme.shadow.sm, Theme.shadow.md, or Theme.shadow.lg from tokens.ts, matching the closest existing visual weight. Cards generally want shadow.md, subtle dividers want shadow.sm, modals/sheets want shadow.lg.

Verify: `find src/utils -iname "*shadow*"` should return nothing.

---

STEP 12 — Public registration screens need the brand header

In src/screens/public/TeacherRegisterPublicScreen.tsx, StudentRegisterPublicScreen.tsx, and PrincipalRegistrationPublicScreen.tsx — add StandardPageHeader at the top of each with an appropriate title and onBackPress={() => navigation.goBack()}. Ensure the root View's backgroundColor is Theme.colors.background. These are first-touch screens for new users and currently have no shared header at all.

---

STEP 13 — Final verification sweep

Run this combined check and confirm every line returns zero or near-zero results:
```bash
grep -rln "AccountantPageHeader\|ArrowLeft" src/screens src/components
find src/components/layout -iname "*tabbar*" | grep -v "RoleTabBar\|tabBarConfigs"
grep -n "102,72,220" src/screens/common/LoadingScreen.tsx
grep -rln "StatusBar barStyle" src/screens | grep -v "LoginScreen\|LoadingScreen"
grep -rhoE "#[0-9A-Fa-f]{3,8}" src/screens --include="*.tsx" | sort -u | wc -l
grep -rl "Theme.spacing\." src/screens | wc -l
grep -rhoE "fontSize:\s*[0-9]+" src/screens --include="*.tsx" | sed -E 's/fontSize:\s*//' | sort -un | wc -l
grep -rn "tension: 20\|friction: 7" src/screens
grep -rl "SkeletonLoader" src/screens | wc -l
grep -rl "CustomInput" src/screens src/components
find src/utils -iname "*shadow*"
```

Do NOT attempt large file decomposition (DirectorDashboardScreen.tsx, StudentManagementScreen.tsx, and the other screens over 1,500 lines) in this same pass — that is a separate, higher-risk refactor that should happen after this visual consistency pass is merged and verified working, to avoid compounding risk in one giant changeset.
