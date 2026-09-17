# RePulse-Mobile-App

A native-wrapped companion mobile application for the RePulse biometric sleep and cardiac monitoring system, designed for low-light clinical and home environments.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7-lightblue?logo=capacitor)](https://capacitorjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-teal?logo=tailwindcss)](https://tailwindcss.com/)

## Installation

Clone the repository and install dependencies using npm:

```bash
git clone https://github.com/DiaztMF/Repulse-Mobile-App.git
cd Repulse-Mobile-App
npm install
```

Ensure the Android SDK and platform tools are configured if building native APK binaries.

## Quick Start

1. Copy `.env.example` to `.env.local` with Firebase and hardware service IDs:

```bash
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_BLE_DEVICE_NAME="RePulse-Band"
```

2. Run the local development server:

```bash
npm run dev
```

3. Sync web assets and launch the native Android studio debugger:

```bash
npm run build
npx cap sync android
npx cap open android
```

## What is RePulse-Mobile-App?

`RePulse-Mobile-App` is the Android application companion to the RePulse wearable sleep and heart monitoring system developed for Indonesia Inventors Day 2026. Wrapped via Capacitor 7, it connects over low-latency Bluetooth Low Energy (BLE) to ingest wrist-worn PPG telemetry, evaluate nocturnal cardiac stability, and display actionable sleep architecture stages.

## Why RePulse-Mobile-App?

Standard mobile medical dashboards are cluttered, emit harsh blue light, and demand persistent cloud internet connections. `RePulse-Mobile-App` is engineered with an ultra-low-luminance OLED night mode, strict offline telemetry buffering, and instant audible escalation notifications when cardiac irregularities occur.

## API / Routes

### Client Navigation Routes
- `/`: Dashboard overview displaying current sleep score and readiness metrics.
- `/session`: Active night session monitor with dim HUD display and silence guards.
- `/history`: Historical nocturnal analytics, HRV trends, and sleep stage breakdowns.
- `/devices`: BLE device scanner, connection manager, and peripheral diagnostic probes.

### BLE GATT Integration
- Subscribes to Heart Rate Measurement (`0x2A37`) and custom sleep packet streams.
- Manages dual-tier alarm escalation protocols over GATT control points.

## Examples

Initiating an active nocturnal monitoring session:

```typescript
import { startSleepTrackingSession } from '@/lib/monitoring';

export async function handleStartSession(deviceId: string) {
  try {
    const session = await startSleepTrackingSession(deviceId, {
      recordRawPPG: false,
      alertThresholdBpm: 45,
      onAnomalyDetected: (anomaly) => {
        console.warn('Cardiac anomaly detected:', anomaly);
      },
    });
    return session.sessionId;
  } catch (error) {
    console.error('Failed to initiate sleep session', error);
  }
}
```

## Architecture & Development Guides

- Frontend Core: React 19, TypeScript, and Vite 8 for fast build loops.
- Native Bridge: Capacitor 7 with `@capacitor-community/bluetooth-le`.
- Dark Bedroom UX: Strict luminance design tokens declared via Tailwind CSS v4 `@theme`.
- Typography & Performance: Self-hosted variable typography ensuring deterministic offline typography.

## License

All rights reserved. Proprietary project developed for Indonesia Inventors Day 2026.