---
name: smack-design
description: Use this skill to generate well-branded interfaces and assets for Smack, the bioluminescent friend-group events app. Covers colors, typography, fonts, iconography, brand voice, and UI kit components for prototypes, mocks, slides, or production-ready React Native code.
user-invocable: true
---

# Smack — Design Skill

Smack is a mobile social events app, **Android-first** (React Native / Expo). The brand pulls from jellyfish: bioluminescent, pulsing, alive at night. Friend groups, live status, calm confidence with an undercurrent of something glowing in the dark.

## How to work in this skill

1. **Start with `README.md`** in this folder. It is the canonical brand reference — palette, type, tone, copy patterns, layout rules, motion, and a list of caveats. Read it before designing anything.
2. **Import `colors_and_type.css`** in any HTML artifact. It defines CSS variables for the full palette (`--c-glow-cyan`, `--c-status-live`, `--c-ink`, etc.), the type scale, spacing, radii, shadows, and motion. Use the variables — never hardcode colours.
3. **Browse `preview/`** to see how each token cluster looks when rendered (color cards, type specimens, status pills, the event card, the tab bar, etc.).
4. **Reuse `ui_kits/smack-mobile/`** when building screens. It contains JSX components for the live screens (Home, Event Detail, Calendar, Profile, Login) and is the source of truth for layout details — header bars, FAB, tab bar, status logic.
5. **Use the brand mark from `assets/`** — `smack-mark.svg` (jellyfish), `smack-wordmark.svg`, `smack-mark-lockup.svg`. Don't recolour or redraw.

## When the user asks for a mock or prototype

Copy the relevant assets and stylesheets out of this folder into your working artifact. Build static HTML that imports `colors_and_type.css`. For interactive prototypes, lift JSX components from `ui_kits/smack-mobile/`.

## When the user asks for production guidance

Read `README.md` end-to-end. The system documents the bioluminescent palette, status logic (`live` / `on_the_way` / `heading_home`), and the chosen replacement of the current red accent (`#ff3b30`) with cyan (`#2ee6d6`). Flag the change to the user before applying it to a live codebase.

## If invoked without context

Ask:
1. What are they making — a screen / a prototype / a slide / production code?
2. Which surface — mobile app, marketing page, internal mock?
3. Do they want to honour the current codebase exactly, or apply the design-system refinements (the cyan palette, refined statuses)?

Then act as an expert designer who outputs HTML artifacts or production React Native code, depending on the need.

## What this skill explicitly substitutes

- **Font**: Geist (Google Fonts) stands in for the RN system font. Confirm before locking.
- **Icons**: Lucide (CDN) stands in for `Ionicons` in HTML mockups. ~90% pixel-equivalent.
- **Brand mark**: jellyfish SVG authored fresh — the repo only had Expo placeholders.

See "Caveats" in `README.md` for the full list.
