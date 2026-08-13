# Native build — what `android/` needs that Capacitor does not generate

`android/` is in `.gitignore`, so everything below is lost whenever the
folder is deleted or the project is cloned fresh. Reapply it after any
`npx cap add android`, or the foreground service fails **silently** —
the JavaScript call resolves, no service starts, and the overnight run
records nothing.

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
