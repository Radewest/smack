# Smack — Mobile UI Kit

A clickable React + JSX recreation of the Smack mobile app, mounted inside an iOS device frame. Use this as the visual + interaction source of truth when building new screens, prototypes, or mocks.

## Run

Open `index.html`. Everything loads inline (React via UNPKG, Babel in-browser).

## What's in it

```
index.html                   ← mount + iOS frame
ios-frame.jsx                ← starter device bezel (provided by tooling)
icons.jsx                    ← Lucide-style stroke icon set used by the kit
mock-data.jsx                ← seeded groups, events, profile

components.jsx               ← primitives: StatusPill, TypeBadge, Avatar, Button,
                                Input, SectionLabel, ReactionBar, FAB, TabBar,
                                Header, ScreenTitle
event-card.jsx               ← EventCard (the star) + GroupCard

screen-login.jsx             ← Login (email + password, ambient glow)
screen-groups.jsx            ← Groups list (the home tab)
screen-group-detail.jsx      ← Events feed for one group
screen-event-detail.jsx      ← Event detail (RSVP, attendance, attendees, reactions)
screen-create-event.jsx      ← Modal — create a proper event or go live
screen-calendar.jsx          ← Calendar tab (month grid + day events)
screen-profile.jsx           ← Profile tab (avatar, form, quick actions)

app.jsx                      ← App shell, router (tab + stack), state mutations
```

## Flow you can walk

1. App boots authenticated, on the **Home** tab.
2. Tap **The Jellies** → group detail with two live/proper events on today.
3. Tap **The Crown, Shoreditch** → event detail with pulsing live dot, attendance list, owner status controls.
4. Back → tap **Saturday BBQ** → proper event with full RSVP + attendance controls.
5. Tap **+** FAB → Create-event modal (toggle 📅 Event vs ⚡ Live).
6. Bottom tabs: **Calendar** (month grid), **Profile** (form + Free Tonight / Home Safe quick actions).
7. Sign out from Profile → Login screen (then log back in).

## What's faithful to the codebase

- Screen structure and copy taken from `Radewest/smack` source (`HomeScreen.js`, `EventDetailScreen.js`, `GroupsScreen.js`, `LoginScreen.js`, etc.).
- Status logic preserved exactly: `live` → `heading_home` → `ended`; per-user attendance `on_the_way` / `here` / `heading_home`.
- The `Free Tonight` and `Home Safe` quick actions on Profile.
- Three-channel selection state (text colour + tint background + matched border) on RSVP / attendance buttons.
- Reaction pills, with my-reaction in amber.

## What this kit changes (intentional design-system refinement)

The repo's red accent (`#ff3b30`) is replaced by **cyan `#2ee6d6`** throughout — FAB, focus, primary CTAs, calendar selection. This is the bioluminescent palette specified in the brief. If the founders want to keep red, swap `--c-glow-cyan` for the red and the kit picks it up.

## What's stubbed

- No real auth — Log In just flips a flag.
- Calendar event mapping is hand-wired (3 dots on May 23 / 24 / 27); the codebase fetches and marks dynamically.
- No swipe-to-archive on ended events (would need `react-native-gesture-handler` equivalent).
- Avatar is initials with a gradient; image upload is not wired.
- Push notifications, Supabase realtime, group-members management — not in scope.

## How to lift components for new designs

The components in `components.jsx` and `event-card.jsx` are intentionally cosmetic — no Supabase, no native modules. Copy what you need; pass mock data; restyle via the variables in `colors_and_type.css` at the project root.
