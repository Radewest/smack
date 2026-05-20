// ─────────────────────────────────────────────────────────────
// Smack — Theme tokens
// Source of truth for colors, type, spacing, radii, motion.
// Mirrors design-system/colors_and_type.css but in JS form so
// React Native StyleSheets can consume it directly.
//
// Drop this at src/theme.js, then:
//   import { theme } from './theme';
//   const styles = StyleSheet.create({
//     card: { backgroundColor: theme.color.ink, borderRadius: theme.radius.xl },
//   });
// ─────────────────────────────────────────────────────────────

export const color = {
  // Ocean — backgrounds & surfaces
  abyss:        '#04060c',
  deep:         '#080b14',  // page background
  ink:          '#0d1220',  // card base
  ink2:         '#141a2c',  // raised card
  ink3:         '#1c2440',  // hover / pressed
  shore:        '#2a3354',  // border subtle
  shore2:       '#3a4570',  // border emphasized

  // Foreground — text hierarchy
  fg:           '#f3f5ff',  // primary, soft cool white
  fg2:          '#b8bedb',  // secondary
  fg3:          '#7a82a5',  // tertiary, meta
  fg4:          '#4a5278',  // faint, disabled

  // Glow — bioluminescent brand accents
  glowCyan:     '#2ee6d6',  // primary brand
  glowCyan2:    '#5af2e6',  // hover / brighter
  glowAmber:    '#ffb547',  // secondary, warm
  glowViolet:   '#a06bff',  // tertiary, dusk
  glowPink:     '#ff5eb8',  // rare, special moments

  // Status — semantic (logic preserved from current codebase)
  statusLive:        '#3ff09a',  // 🟢 live now / I'm here
  statusLiveBg:      '#0e2a1d',
  statusLiveBorder:  '#1f5a3b',
  statusOtw:         '#ffb547',  // 🚶 on the way
  statusOtwBg:       '#2a1f0a',
  statusOtwBorder:   '#5a4019',
  statusHome:        '#8a92b8',  // 🌙 heading home
  statusHomeBg:      '#181d2e',
  statusHomeBorder:  '#2f3550',
  statusEnded:       '#4a5278',

  danger:       '#ff5e62',
  dangerBg:     '#2a1014',
};

// Convenience: full status records ─────────────────────────────
// Use these when applying the three-channel selection pattern
// (text + tint background + matched border).
export const status = {
  live:         { color: color.statusLive, bg: color.statusLiveBg, border: color.statusLiveBorder,  label: 'Live now 🟢',     pulse: true  },
  on_the_way:   { color: color.statusOtw,  bg: color.statusOtwBg,  border: color.statusOtwBorder,   label: 'On the way 🚶',   pulse: false },
  here:         { color: color.statusLive, bg: color.statusLiveBg, border: color.statusLiveBorder,  label: "I'm here 🟢",      pulse: true  },
  heading_home: { color: color.statusHome, bg: color.statusHomeBg, border: color.statusHomeBorder,  label: 'Heading home 🌙', pulse: false },
  ended:        { color: color.statusEnded, bg: color.ink,         border: color.shore,             label: 'Ended',            pulse: false },
};

// Type ─────────────────────────────────────────────────────────
// Family: Geist (Vercel). Load via Google Fonts on web; for RN,
// download Geist-{Regular,Medium,SemiBold,Bold,Black}.ttf into
// assets/fonts/ and register via expo-font.
export const font = {
  sans: 'Geist',
  mono: 'Geist Mono',
};

export const fontSize = {
  display: 48,  // wordmark, login
  h1:      28,  // screen heading
  h2:      22,  // event-detail title
  h3:      17,  // group name in header
  body:    16,  // default
  card:    16,
  meta:    13,  // location, time
  label:   12,  // SECTION LABELS
  micro:   11,  // badges, footnotes
};

export const fontWeight = {
  light:   '300',
  regular: '400',
  medium:  '500',
  semi:    '600',
  bold:    '700',
  heavy:   '800',
  black:   '900',
};

export const lineHeight = {
  tight:   1.0,
  snug:    1.2,
  normal:  1.4,
  relaxed: 1.55,
};

export const letterSpacing = {
  tight:  -1,
  snug:   -0.4,
  normal: 0,
  wide:   0.5,
};

// Spacing — 4pt grid ───────────────────────────────────────────
export const space = {
  0:  0,
  1:  4,
  2:  8,
  3:  10,
  4:  12,
  5:  14,
  6:  16,   // card padding default
  7:  20,   // screen horizontal padding
  8:  24,
  10: 32,
  12: 48,
};

// Radii ────────────────────────────────────────────────────────
export const radius = {
  xs:   6,    // badges
  sm:   8,    // chips, small buttons
  md:   10,   // type pickers
  lg:   12,   // inputs, primary buttons
  xl:   14,   // event cards
  xxl:  16,   // group cards
  full: 999,  // avatars, FAB, pills
};

// Shadow / glow ────────────────────────────────────────────────
// RN doesn't support multi-shadow natively; use these on iOS via
// shadowColor/shadowOffset/shadowOpacity/shadowRadius, and on
// Android via elevation. The glow shadows only fire on iOS.
export const shadow = {
  card: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 18, elevation: 2,
  },
  modal: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 40, elevation: 16,
  },
  fab: {
    shadowColor: color.glowCyan, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  glowLive: {
    shadowColor: color.statusLive, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 8, elevation: 0,
  },
};

// Motion ───────────────────────────────────────────────────────
// Use with Animated.timing / Reanimated easings. The pulse value
// is used by the live-now dot — see App.js usage.
export const motion = {
  duration: { fast: 120, base: 220, slow: 400, pulse: 1800 },
  // Bezier control points — pass to Easing.bezier(...)
  ease: {
    soft:  [0.25, 0.1, 0.25, 1],
    out:   [0.16, 1, 0.3, 1],
    pulse: [0.4, 0, 0.6, 1],
  },
};

// Single bundled export ────────────────────────────────────────
export const theme = {
  color, status, font, fontSize, fontWeight, lineHeight, letterSpacing,
  space, radius, shadow, motion,
};

export default theme;
