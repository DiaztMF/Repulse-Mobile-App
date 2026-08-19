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

### `connectedDevice` is a claim Android verifies

Declaring `foregroundServiceType="connectedDevice"` is not enough. From
Android 14 the OS refuses to start the service unless the app **holds** one
of the device-connection permissions as well:

```
SecurityException: Starting FGS with type connectedDevice … requires
  all of [FOREGROUND_SERVICE_CONNECTED_DEVICE]
  any of [BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT, BLUETOOTH_SCAN, …]
```

`BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` are runtime permissions on Android
12+, so declaring them is only half of it — the plugin requests Nearby
devices before it starts the service, and resolves `{ started: false }` if
the person declines.

**The failure kills the process.** `startForegroundService()` returns
cleanly; the exception lands later, on the system's main thread, inside
`startForeground()`. No JavaScript `.catch()` can see it. `MonitorService`
now wraps the promotion and stops itself instead of crashing — a refused
service is a bad night, but a crash at 3am is a worse one.

### Every action promotes the service

`startForegroundService()` grants five seconds to reach `startForeground()`
*whatever the intent action was*. An earlier version promoted only on
`START`, so raising an alert began a service that never became foreground
and the OS killed the app seconds after the screen lit up — a test that
looked like it passed.

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

## Google sign-in needs `google-services.json`

`signInWithPopup` cannot work inside the WebView. It calls `window.open`,
Android hands that to Chrome, and the popup flow then waits for the opened
window to `postMessage` its result back to the window that opened it — which
a Chrome tab in another app cannot do. The account is chosen, Google reports
success, and the person is left standing in a browser. Nothing throws.

So the chooser is native (`@capacitor-firebase/authentication`) and only the
chooser: `skipNativeAuth: true` in `capacitor.config.ts` means the plugin
hands back a Google ID token and stops, and the JS SDK still owns the
session — which is where every Firestore read in this app already looks.

Capacitor's own template already carries the Gradle half: the
`com.google.gms:google-services` classpath is in `android/build.gradle`, and
`android/app/build.gradle` applies the plugin if and only if it finds the
JSON. **Nothing in Gradle needs editing.** What is needed is the file:

1. Firebase Console → Project settings → **Add app → Android**, package name
   `id.repulse.app`
2. Paste the debug SHA-1. Get it with `cd android && gradlew signingReport` —
   read the `SHA1:` line under `Variant: debug`. Without it Google returns
   `10:` (`DEVELOPER_ERROR`) and nothing else
3. Download `google-services.json` into **`android/app/`**
4. Authentication → Sign-in method → enable **Google**

It must be the **same project the web config points at** — `VITE_FB_PROJECT_ID`
in `.env.local`. An Android app added to a different project issues its token
for that project, and the JS SDK, initialised against this one, refuses it.
Everything about the setup looks correct right up to the refusal.

The console's own step 3 ("Add Firebase SDK") is already done here and should
be skipped. Capacitor's template ships the `com.google.gms:google-services`
classpath in `android/build.gradle` and applies the plugin in
`android/app/build.gradle` if and only if the JSON is present. The console
shows Kotlin DSL; this project is Groovy with `buildscript` syntax, which is
the case its own banner offers a link for. Nothing there needs changing.

### `rgcfaIncludeGoogle = true`

In `android/variables.gradle`. The plugin defaults it to **false**, and with
it false the Google Sign-In libraries are `compileOnly`: the APK compiles,
installs, and throws `NoClassDefFoundError` the moment anyone taps the button.
A build that passes and a feature that cannot run.

**`android/` is gitignored, so neither that line nor the JSON survives a
clone**, and neither survives `cap add android`. They are the second and third
things on this page that have to be put back by hand on a fresh machine, and
the symptom is the same every time: it builds, it installs, and it fails at
the one moment that matters.

The debug and release certificates are different. A release build needs its
own SHA-1 added to the same console page, or sign-in works right up until the
APK that goes to the judges.

## Compiling the Kotlin without Android Studio

```bash
npm run check:native
```

`cd android && gradlew assembleDebug`. It builds the whole debug APK, so it
catches Kotlin that does not compile *and* a manifest that does not merge —
the two failures that used to reach the phone before anyone noticed. Around
40 seconds warm, several minutes on the first run.

Deliberately **not** part of `npm run check`: that suite is the fast one,
and a Gradle build in it would slow down every edit to a stylesheet.

`android/gradle.properties` needs `org.gradle.java.home` pointing at Android
Studio's bundled JDK — see §2. Without it Gradle rejects the system JDK and
this command fails before compiling anything.

The one thing it cannot answer is whether the service survives a night, the
screen wakes, or the share sheet appears. Those need the phone.

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

## Oppo, and why O4 cannot take you there

ColorOS 15 keeps its startup manager at
`com.oplus.battery/com.oplus.startupapp.view.StartupAppListActivity`, and
guards it with `oplus.permission.OPLUS_COMPONENT_SAFE` — a signature
permission. Launching it by explicit component and by its own advertised
implicit action both end the same way:

```
SecurityException: Permission Denial: starting ...StartupAppListActivity
  requires oplus.permission.OPLUS_COMPONENT_SAFE
```

No third-party app can hold it, so no amount of finding the right activity
name opens that screen. `resolveActivity` is no help either: package
visibility on Android 11+ hides `com.oplus.battery` from us unless it is
named in `<queries>`, so a phone that has the screen still answers no.

What can be reached is the app's own settings page, and from there the
setting that actually matters on this OS:

**Info aplikasi → Penggunaan baterai → Izinkan aktivitas latar belakang**

It starts on **Mode pintar (Disarankan)**, which optimises background
activity "when power consumption is high" — a night of Bluetooth and a
foreground service is exactly that. The default is the failure.

So O4 decides whether to appear from `Build.MANUFACTURER`, which is a fact
about how the phone treats background apps, and finds out where it can land
by trying. Its instructions change to match wherever that turned out to be.
Verified on an Oppo CPH2819, ColorOS 15.0.2, Android 15. Every other vendor
in that table is still best-known wording, not something anyone has watched
work.

## The radio

`src/ble/live.ts` is the real transport. It is deliberately thin, because
everything it does is untestable without hardware: finding devices, staying
attached, and putting bytes in the right order. What the bytes *mean* lives
in `codec.ts`, checked against the contract's own worked examples by
`npm run check:codec`, which needs no device at all.

The split is the plan for integration day. When something disagrees with
the firmware, a failing assertion names the characteristic and the field;
what is left in `live.ts` is small enough to read in one sitting.

Scanning filters on service UUID and never on name — §2 says a device whose
advertisement omits the UUID is one this app will never find, and that is
the contract the firmware is held to. The band's advertisement is read on
every sighting, connected or not, because §2.1's whole purpose is to keep
reporting the escalation stage after the connection has failed.

`ACCESS_FINE_LOCATION` is capped at `maxSdkVersion="30"` in the plugin
manifest. The BLE plugin declares it unbounded for the old scanning path;
from Android 12 we hold `BLUETOOTH_SCAN` with `neverForLocation` instead,
and an app asking for both is contradicting itself in the permission list
of a product that watches people sleep.

The transport is installed by `connect()` on the pairing screens, and after
the first success the phone reconnects on its own at every launch — a band
that has to be re-paired each evening is a band nobody wears by the third
night. `play()` in the test panel swaps a mock back in, which is what turns
the SAMPLE DATA badge on: `synthetic` is `transport instanceof
MockTransport`, so the badge cannot disagree with what is actually feeding
the screens.
