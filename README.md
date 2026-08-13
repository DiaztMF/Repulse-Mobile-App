# RePulse — Mobile App

Android app for the RePulse sleep and heart monitoring system. Built as a web app wrapped by Capacitor into a single APK, designed to be read in a dark bedroom.

## Tech Stack

- **React 19** + **TypeScript** — UI
- **Vite 8** — build tool
- **Tailwind CSS 4** — styling, with design tokens declared in `@theme`
- **React Router 7** — navigation
- **Capacitor 7** — native Android wrapper
- **Firebase 12** — auth, Firestore, Realtime Database
- **lucide-react** — icons
- **class-variance-authority** — component variants

## Features

- Three-tab shell with a floating pill nav that disappears during an active sleep session
- Design tokens as the single source of truth — no hardcoded colors in components
- Custom drawn `REPULSE` wordmark with a self-drawing splash animation
- Two levels of darkness: day screens and night-session screens
- Regulated copy kept as constants so wording cannot drift
- English throughout — UI, routes, and code
- Self-hosted variable font, so the app renders correctly offline

## Environment Variables

Copy `.env.example` to `.env.local` and fill from Firebase console →
Project settings → Your apps → Web app. **With none of these set the app
runs on synthetic data**, which is a supported state: the whole flow is
walkable without a project.

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_FB_API_KEY` | Firebase web API key | `AIzaSy...` | No |
| `VITE_FB_AUTH_DOMAIN` | Auth domain | `repulse.firebaseapp.com` | No |
| `VITE_FB_PROJECT_ID` | Project id | `repulse-prod` | No |
| `VITE_FB_STORAGE_BUCKET` | Storage bucket | `repulse-prod.appspot.com` | No |
| `VITE_FB_SENDER_ID` | Messaging sender id | `481029384756` | No |
| `VITE_FB_APP_ID` | Web app id | `1:4810:web:9f2c` | No |
| `VITE_FB_DATABASE_URL` | Realtime Database, live node only | `https://repulse-prod.firebaseio.com` | No |

Deploy the rules with `firebase deploy --only firestore:rules,database`.

## Prerequisites

- **Node.js 22** or newer
- **npm 10** or newer
- **Android Studio** + JDK 17 — only needed to build the APK, not for UI work

## Installation

```bash
cd repulse-mobile-app
npm install
npm run dev
```

The dev server binds to the local network, so you can open it directly on a phone to check the real rendering.

## Usage

```bash
npm run dev       # dev server on :5173
npm run build     # type-check, then production build into dist/
npm run preview   # preview the production build
npm run lint      # oxlint
npm run check:data  # dataset invariants
npm run check:gate  # calibration fit-gate rule
```

Building the APK:

```bash
npm run build
npx cap add android      # once
npx cap sync android
npx cap open android     # continue in Android Studio
```

Visit `/kitchen-sink` to see every token and primitive on one page, including a viewport readout that turns rust if anything overflows horizontally.

## Project Structure

```
src/
├── styles/
│   └── tokens.css        # single source of truth for every visual value
├── lib/
│   ├── metrics.ts        # per-metric colors, three-band scoring
│   ├── copy.ts           # regulated strings, locked metric names
│   └── cn.ts             # className merger
├── components/
│   ├── brand/            # Wordmark — drawn SVG logotype
│   ├── ui/               # Button, Card, Field, StepBar, ValueArc
│   └── shell/            # Header, TabBar, AppShell
├── data/
│   ├── mock.ts           # 14 deterministic synthetic nights
│   └── mock.check.ts     # invariants — npm run check:data
├── screens/
│   ├── onboarding/       # O1-O10 plus pairing trouble
│   ├── home/             # home and the active night session
│   ├── vitals/           # one template, five metrics
│   ├── health/           # history, night detail, trends, insights
│   ├── settings/         # settings, devices, test panel, export, ECG
│   ├── emergency/        # alert, SOS, family viewer
│   └── KitchenSink.tsx   # token check page, drop before shipping
├── state/
│   └── session.ts        # session state; owns night mode
├── routes.tsx            # all routes, tagged with screen codes
└── index.css             # font, reset, .num and .label utilities
```

## Conventions the code enforces

Four rules are deliberately hard to break. If one feels like it is in the way, that is the point.

**No hex values in components.** Every visual value comes from `tokens.css` or `metrics.ts`. If a value is not there yet, the decision has not been made yet.

**Regulated copy is a constant.** The strings in `copy.ts` are never retyped in a component — retyping is how regulated wording drifts unnoticed. The words *apnea*, *diagnosis*, and *disorder* must not appear on any screen.

**Buttons are outlined, not filled.** `Button` has no filled-accent variant; only `sos` and `inverse` are filled.

**One color per metric.** Import from `METRIC_COLOR`. A color is never chosen because a card needs variety.

## Status

All 34 screens are built and reachable. Every screen reads from the
synthetic dataset in `src/data/mock.ts`, so the whole app is walkable
end to end without hardware.

Firebase is wired: email and Google auth, Firestore reads through a
single store, seed and reset from the test panel, and security rules for
both databases.

Still to come: the BLE transport and the Capacitor plugins behind the
foreground service. Integration points are marked `TODO` where they
belong.

## License

Proprietary. Developed for Indonesia Inventors Day 2026.
