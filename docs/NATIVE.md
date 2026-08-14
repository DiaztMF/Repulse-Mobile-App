# Native build — what `android/` needs that Capacitor does not generate

`android/` is in `.gitignore`, so everything below is lost whenever the
folder is deleted or the project is cloned fresh. Reapply it after any
`npx cap add android`, or the foreground service fails **silently** —
the JavaScript call resolves, no service starts, and the overnight run
records nothing.

---

## 0. The monitoring plugin lives outside `android/`

`plugins/repulse-monitor/` holds the service, the notification channels,
and the lock-screen alert. It is a local Capacitor plugin, referenced from
`package.json` as `file:plugins/repulse-monitor`, and its own manifest is
merged into the app's at build time.

That location is the whole point: it is **committed**, so nothing in this
section has to be reapplied by hand after a fresh clone. Only the two
items below still do, because they belong to the generated project itself.

The M0 harness (`src/lib/m0.ts`) still uses the older foreground-service
plugin and its `dataSync` declaration in §1. The new service declares
`connectedDevice` instead — Android 15 caps `dataSync` at six hours in any
24, and holding a link to the band is what this one actually does.

---

## 1. `android/app/src/main/AndroidManifest.xml`

Inside `<application>`, after the `<provider>` block:

```xml
<service
    android:name="io.capawesome.capacitorjs.plugins.foregroundservice.AndroidForegroundService"
    android:foregroundServiceType="dataSync"
    android:exported="false" />
```

At the bottom, beside the existing `INTERNET` permission:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
```

`POST_NOTIFICATIONS` arrives from the plugin's own manifest and does not
need repeating.

**Why the type is `dataSync`.** `targetSdkVersion` is 35, and from
Android 14 a foreground service without a declared type refuses to start.
`dataSync` describes what the M0 harness does — it uploads a tick on a
timer. It is **not** the type the shipped app should use: once BLE lands
that becomes `connectedDevice`, which also has no daily budget.

**Android 15 caps `dataSync` at six hours in any 24.** An eight-hour A1
run will therefore be cut short by the OS rather than by the WebView
dying. Read a stop at roughly six hours as the cap; read anything earlier
as the answer M0 is asking for.

## 2. `android/gradle.properties`

```properties
org.gradle.java.home=C:/Users/…/Android Studio/jbr
```

Only needed where the system JDK is newer than Gradle supports. On this
machine the system JDK is 24 and Gradle 8.11.1 rejects it with
`Unsupported class file major version 68`; the JDK bundled with Android
Studio is 21, which works. Forward slashes — a properties file treats
backslashes as escapes.

Android Studio writes `local.properties` with `sdk.dir` by itself the
first time the project is opened, so that one does not need doing by hand.

---

## Running the M0 check

```bash
npm run build
npx cap sync android
npx cap open android
```

Then in Android Studio: wait for the Gradle sync, plug the phone in, Run.
Building from the command line works too but resolves the whole toolchain
from scratch, which is several minutes per attempt.

On the phone:

1. Sign in, then open the drawer → **Test panel**
2. **Background continuity** → *Start overnight check*
3. Accept the notification prompt, then the battery-optimisation prompt —
   Doze is what is being measured, so the exemption has to be granted or
   the run only measures Doze
4. Lock the phone and leave it alone
5. In the morning: *Read last night's result*

**A1 passes** on eight hours with no gap over 60 seconds. The panel names
every gap with its time, because "it mostly worked" is not an answer to a
question that decides the architecture (`PRD.md` §3.5, §14 M0).

**M0 has been run and it failed.** Three nights, best result 7 ticks of
511, and ticks only ever arrived while the screen was on. The harness
stays for regression checks; the conclusion is in `MVP_PLAN.md` §1.

---

## Checking the lock-screen alert

This is the piece M0 forced, and the only part of it that can be proved
without firmware.

1. Test panel → **Lock-screen alert** → *Raise alert in 10 seconds*
2. Lock the phone and put it down
3. The screen must wake **by itself** and show ALERT over the lock screen

Grant the notification prompt first. On Android 14+ the OS may also ask
for full-screen intent permission separately — if the screen stays dark
but a banner appears on unlock, that permission is what is missing:
Settings → Apps → RePulse → *Alarms & reminders* / *Full-screen intents*.

A phone that only shows the banner is a phone that would not wake anyone.
