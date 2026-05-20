# Smack Design System

> **Smack** is a mobile social events app (React Native / Expo, **Android first**, iOS soon). Friend groups, live status, real coordination.
> The brand pulls from jellyfish — bioluminescent, pulsing, alive at night.

---

## 1. Product context

**Smack** lets a small friend circle ("a smack" — the collective noun for jellyfish) coordinate plans without the friction of group chat. Users:

- Join one or several **friend groups** (a "smack")
- See an **event feed** of what's happening today — both planned events and spontaneous live ones
- Post a **live smack** ("I'm at The Crown, who's about?") or a **proper event** ("BBQ Saturday 4pm")
- Update a **live attendance status** as the night unfolds — `On the way` → `Live now` → `Heading home`
- Two one-tap broadcasts: **🙋 Free Tonight** and **🏠 Home Safe**
- React with emoji to events; RSVP keen / maybe / can't

The product is mobile-first, **Android-primary** (iOS is the secondary target — same codebase via Expo, but Android is where the friends actually live). There is no website beyond a landing page (out of scope here).

### Brand story

The name "Smack" is the collective noun for jellyfish. The founder's friend group — **the Jellies** — builds LED jellyfish sculptures from umbrellas and takes them to festivals. The app carries that energy: something lighting up in the dark.

### Tone

> *Calm confidence with an undercurrent of something glowing in the dark.*

Not loud, not gamified, not techy. The product knows the user has a life and just helps them coordinate it. Short, casual, British.

---

## 2. Sources

This design system was built from:

- **GitHub:** [`Radewest/smack`](https://github.com/Radewest/smack) (`master` branch). React Native / Expo app, single-source for screen, color, and copy conventions. Worth exploring further for richer recreations — particularly `src/screens/` and `src/components/`.

The only visual assets in the repo were Expo placeholder icons (an unconfigured grid + concentric circles). All brand iconography in this system was authored fresh from the brief — flagged as a **substitution** below.

---

## 3. Index

```
README.md                    ← you are here
SKILL.md                     ← Agent Skill entry point
colors_and_type.css          ← CSS variables — colors, type, spacing, radii, motion
assets/                      ← logos, app icon, marks
  smack-mark.svg             — jellyfish, primary brand mark
  smack-wordmark.svg         — "smack" wordmark, Geist Black
  smack-mark-lockup.svg      — horizontal mark + wordmark
  smack-app-icon.svg         — app icon (1024×1024 source)
preview/                     ← design system cards (rendered in the DS tab)
ui_kits/
  smack-mobile/              ← React + JSX recreation of the app
    index.html               — clickable prototype (Home → Event Detail → Profile)
    README.md
    components/
```

---

## 4. CONTENT FUNDAMENTALS

How Smack writes.

### Voice in one sentence

Talking to a mate in the group chat. Lowercase energy, full punctuation. Short. British casual. Never marketing-speak, never gamified, never breathless.

### Pronouns

- **You** (the user, addressed directly): *"You're keen"*, *"Where are you?"*, *"Are you keen?"*
- **Your group / your friends**: *"Let your group know you're about"*, *"Your friends have been notified."*
- **We / Smack-the-brand** rarely appears. The product doesn't talk about itself.

### Casing

- **Screen titles & wordmark:** "Smack" — initial cap when in body copy; lowercase wordmark in the logo.
- **Section labels:** `UPPERCASE`, tracked `+0.5px`, weight `600`, in muted grey (`--c-fg-3`). e.g. `YOUR GROUPS`, `QUICK ACTIONS`, `TODAY`.
- **Buttons & in-product copy:** Title Case for primary CTAs (*Create a Group*, *Sign Out*), sentence case for secondary (*Already have an account? Log in*).
- **Status labels:** sentence case with a trailing single emoji — *"On the way 🚶"*, *"Live now 🟢"*, *"Heading home 🌙"*.

### Examples (lifted from the codebase)

| Surface | Copy |
|---|---|
| Login tagline | *Your friend group, notified.* |
| Empty event feed | *Nothing on today.* / *Tap + to create a smack.* |
| Empty groups | *No groups yet* / *Create a group for your crew, or join one with an invite code.* |
| RSVP options | *I'm keen 🙋* / *Maybe 🤔* / *Can't make it 🙅* |
| Attendance | *On the way 🚶* / *I'm here 🟢* / *Heading home 🌙* |
| Quick action title | *Free Tonight* — *Let your group know you're about* |
| Quick action title | *Home Safe* — *Let your friends know you're home* |
| Sub-action confirm | *🏠 Home Safe!* — *Your friends have been notified.* |
| Create event placeholder (live) | *I'm at… (e.g. The Crown, Shoreditch)* |
| Create event placeholder (proper) | *What's the smack?* |

### Emoji

Emoji are **part of the brand**, not decoration. Use them only where they carry meaning:

- 🟢 🚶 🌙 — live attendance state (always paired with the label)
- 🙋 🤔 🙅 — RSVP
- 🏠 — Home Safe
- ⚡ — live event indicator (event type, not status)
- 📅 — proper / scheduled event (event type)
- 📍 🕐 — location / time in event metadata
- 🔥 ❤️ 😂 🙌 🍻 — reactions (user-chosen, not system)

**Do not** use random emoji in body copy, headings, or as bullet markers. Restraint is the rule.

### Punctuation & length

- **Em dash sparingly** — for an aside. (See above; this is the brand using it.)
- **Ellipses** for in-progress placeholders only ("I'm at…").
- **No exclamation marks** except in success toasts ("Saved!", "🏠 Home Safe!").
- **Headlines max ~6 words.** *"Your friend group, notified."* — that's the template.
- **Body lines wrap short.** This feed is read one-handed in the pub.

### What Smack never says

- "Discover events near you"
- "Connect with your community"
- "Engage your friends"
- "Powered by …"
- "AI-curated"
- Anything ending in 🎉

---

## 5. VISUAL FOUNDATIONS

> The system answers one question: **what does something glowing in the dark look like, when it's a friend?**

### Palette

Five voices: **Ocean** (background), **Ink** (surfaces), **Foreground** (text), **Glow** (brand accents), and **Status** (semantic). See `colors_and_type.css` for variables and `preview/color-*.html` cards.

- **Ocean / page**: `#04060c` (abyss) → `#080b14` (deep) — a near-black with a violet undertone. No pure-black surfaces anywhere.
- **Ink / cards**: `#0d1220` → `#1c2440` in three steps. Cards sit one or two steps above the page.
- **Foreground**: a soft cool white (`#f3f5ff`), down to faint dusk (`#4a5278`). No pure white.
- **Glow** — the bioluminescent palette:
  - **Cyan `#2ee6d6`** — primary brand. CTAs, FAB, focus, the "live" pulse.
  - **Amber `#ffb547`** — secondary. Warm festival light. "On the way", maybe-RSVPs.
  - **Violet `#a06bff`** — tertiary. Dusk, accents, occasional highlights.
  - **Pink `#ff5eb8`** — rare. Special moments.
- **Status (logic preserved from codebase, refined):**
  - 🟢 **Live now / I'm here** → `#3ff09a` (was `#30d158` — pushed brighter, more bioluminescent)
  - 🚶 **On the way** → `#ffb547` (was `#ff9f0a` — warmer, sodium-streetlight)
  - 🌙 **Heading home** → `#8a92b8` (was `#636366` — cool dusk-grey)

Red (`#ff3b30`) is **deprecated** as a brand accent — the codebase uses it for FAB / save / cancel, but it clashes with the bioluminescent palette. Replaced by cyan throughout. Reserve red for destructive actions only (`--c-danger`).

### Typography

- **Family:** **Geist** (Vercel) — clean, modern, neutral sans-serif. Full 100–900 weight range. Loaded via Google Fonts.
- **Display / wordmark / screen H1:** `900` weight, `-1px` tracking. Tight, bold, confident.
- **Body:** `400`–`500`, `16px`, no surprises.
- **Section labels:** `UPPERCASE`, `12px`, weight `600`, tracking `+0.5px`. The system's quiet structural rhythm.
- **Mono (Geist Mono):** rare — invite codes, debug, maybe a timestamp.

⚠️ **Font substitution flag:** the codebase uses the React Native default system font (San Francisco on iOS, Roboto on Android). For HTML mockups, **Geist** is the chosen stand-in because (a) it matches the brief ("clean, modern, sans-serif, nothing playful or rounded"), and (b) it has the full weight range needed for the `900`/`400`/`600` rhythm the app already uses. If the brand wants to lock to a specific custom face, request a TTF and we'll swap.

### Spacing

A 4pt grid. Common values: `4, 8, 10, 12, 14, 16, 20, 24, 32`. Cards pad at `16`. Screens pad at `20` horizontal.

### Backgrounds

- **Page:** flat near-black (`--c-deep-solid`). **No gradients.** No images. No mesh. The dark is the canvas.
- **Optional ambient:** a single faint radial — *like a streetlight at the edge of frame* — is permitted on hero moments (login, splash). Centered at the bottom or one edge. Max 20% opacity. Use the **glow filter** technique, not a baked image.
- **Imagery vibe (when used at all):** cool, warm-pop, low-key. Think *photographed at night, lit by phone screens and festival LEDs.* Never sunny. Never studio. Never AI-cartoon.

### Cards

- **Background:** `--c-ink` (`#0d1220`) or `--c-ink-2` for raised cards.
- **Border:** `1px solid --c-shore` (`#2a3354`). Always there. Borders, not shadows, do the separation work.
- **Radius:** `14px` for event cards, `16px` for group cards, `12px` for inputs/buttons, `8px` for chips.
- **Padding:** `16px`. Tighter on chips/badges.
- **No drop-shadows** on cards. Glow is reserved for actionable elements.

### Borders

- Hairline `1px` only. Two weights:
  - **`--c-shore` (`#2a3354`)** — default, faint
  - **`--c-shore-2` (`#3a4570`)** — emphasized on selected/active state
- A border that changes colour to the matching **status** colour is the system's way of marking *selection* (see attendance buttons, RSVP rows). The fill behind it picks up a 10% tint of that same status colour. Never solid-fill — always tint.

### Shadows / Glow

- **`--sh-card`** — almost imperceptible. A 1px inner highlight + a soft 4-direction dark drop.
- **`--sh-fab`** — coloured. The FAB bleeds its own colour onto the surface like a phosphorescent puddle. Use when an element is **lit** (FAB, live-now indicator).
- **`--sh-glow-live` / `-cyan` / `-amber`** — for active live-state dots and pulse animations.

### Animation

- **Default:** `220ms cubic-bezier(0.25, 0.1, 0.25, 1)` — the soft default.
- **Arrivals (cards entering):** `400ms cubic-bezier(0.16, 1, 0.3, 1)` — slow-out arrival.
- **Live pulse:** `1800ms ease-in-out infinite` — the live-now dot breathes. Scale 1 → 1.18, opacity 1 → 0.6. Apply via `.smack-pulse-dot`.
- **No bounces.** No spring overshoots. Smack is calm.

### Interaction states

- **Hover** (cursor platforms): brighten the background by one step (`--c-ink-2` → `--c-ink-3`). No colour shift.
- **Press / active**: `opacity: 0.75` and a `scale(0.98)`. Borrow native iOS `TouchableOpacity` behaviour — the codebase uses `activeOpacity={0.75}` consistently. Mirror that in HTML.
- **Selected** (a chosen RSVP, an active attend state): border picks up the **status colour**, background picks up its 10% tint. The label text colour shifts to that status colour too. Three-channel selection.
- **Focus** (keyboard): a `2px` cyan ring at `-2px` offset.
- **Disabled**: `opacity: 0.5`.

### Transparency & Blur

- Used sparingly. **Modals** (CreateEvent, EmojiPicker) sit over a `--c-abyss` `60%` overlay. Lightly blur the layer behind (`backdrop-filter: blur(20px)`) only on the EmojiPicker sheet.
- Status-tint backgrounds use 10% alpha of the status colour. That's it.

### Layout rules

- **Fixed bottom tab bar**, 80px tall, lives on every Tab screen.
- **Fixed FAB**, 54px, bottom-right, 24px inset. Cyan, with its own glow shadow.
- **Header bar** on stack screens, 56px effective, hairline border below.
- **Safe area** respected always (iOS notch + Android system bars).

### Corner radii summary

| Token | px | Used for |
|---|---|---|
| `--r-xs` | 6 | badges (`📅 Today`, `⚡ Live`) |
| `--r-sm` | 8 | small buttons, status chips |
| `--r-md` | 10 | event-type selector, status options |
| `--r-lg` | 12 | inputs, primary buttons |
| `--r-xl` | 14 | event cards, archive swipe action |
| `--r-2xl` | 16 | group cards |
| `--r-full` | 999 | avatars, reaction pills, FAB |

---

## 6. ICONOGRAPHY

### What the app uses

The Expo app uses **`@expo/vector-icons` → `Ionicons`** exclusively. Ionicons are simple line/filled icons with consistent stroke weight (~1.5px equivalent at 24px). The codebase uses them for:

- Tab bar (`home`, `calendar`, `person`)
- Navigation chrome (`chevron-back`, `chevron-forward`, `close`)
- Metadata (`location`, `time`, `person`, `people`)
- Actions (`archive`)

### What this design system uses

For HTML mockups, we **substitute with [Lucide](https://lucide.dev/)** via CDN — it's the closest open-source match to Ionicons (matched stroke weight, same flat outline language, comparable icon coverage). Load via:

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>
```

Icon name mapping (Ionicons → Lucide):

| Ionicons (RN) | Lucide (web) |
|---|---|
| `home` | `home` |
| `calendar` | `calendar-days` |
| `person` | `user` |
| `people` | `users` |
| `chevron-back` | `chevron-left` |
| `chevron-forward` | `chevron-right` |
| `location` | `map-pin` |
| `time` | `clock` |
| `archive` | `archive` |
| `add` / `+` | `plus` |

⚠️ **Icon substitution flag:** Lucide ≠ Ionicons exactly — line weights are very close but a few glyphs differ in detail (e.g. Lucide `map-pin` is a hollow droplet, Ionicons `location` is filled). For production mockups, prefer importing the actual Ionicons SVGs from `@expo/vector-icons` — they ship as a sprite font and individual SVGs available [in the Ionicons repo](https://github.com/ionic-team/ionicons).

### Brand iconography (logo)

- **`assets/smack-mark.svg`** — a bioluminescent particle. Bright nucleus, single halo ring, two drifting trails. **Fully abstract** — reads as "something glowing in the dark" without depicting an animal. The mark is **always cyan** (`#2ee6d6`) on a dark surface.
- **`assets/smack-wordmark.svg`** — "smack" wordmark, Geist `900`, `-2.5px` tracking. Soft glow filter.
- **`assets/smack-mark-lockup.svg`** — horizontal lockup. Use on store badges, splash screens.
- **`assets/smack-app-icon.svg`** — the app icon source (1024×1024). Renders the mark centered on a deep-ocean radial.

⚠️ **Brand iconography flag:** the repo had only Expo's default placeholder icons (a grid with concentric circles). The jellyfish mark in this system was **authored fresh from the brief**. If the founders / Jellies have a real mark in progress (the umbrella + LED sculptures suggest there might be one), please share — we'll swap and re-export the lockup.

### Emoji

Emoji **are an icon system** in Smack, used semantically (see CONTENT § Emoji). The system emoji set is fixed and shouldn't expand without intent — adding random emoji to an interface is the fastest way to break the tone.

### No PNG / raster icons

Don't ship any. Vector everywhere.

---

## 7. UI Kits

See `ui_kits/smack-mobile/` for a clickable React + JSX recreation of the core screens (Groups list, Event Detail, Calendar, Profile, Login). The kit imports `colors_and_type.css` and uses the components and patterns documented above.

---

## 8. Caveats — read this

1. **All brand iconography is freshly authored.** The repo only had Expo placeholders. If the Jellies have a real mark, please swap in.
2. **The font (Geist) is a substitution** — the RN app uses system fonts. Confirm with founders before locking.
3. **Lucide is substituting for Ionicons** in HTML mockups. Pixel-equivalence is ~90%.
4. **No marketing site / web product exists**, so this kit is mobile-only. If a landing page is in scope, ask for direction on whether it inherits this aesthetic verbatim or diverges (it should probably inherit).
5. **The current codebase red (`#ff3b30`)** is intentionally replaced by cyan-as-primary in this system. The brief explicitly calls for the bioluminescent palette over the existing red, but if the founders prefer to keep red as a brand accent (e.g. for a fire/festival reading), say so and we'll fork a variant.
