# StudyForge (Phase 2) — app id `com.godzillamode.studyforge`
Offline-first study planner for Android (Capacitor 6 + React + Dexie + Kotlin AlarmPlugin).

## Get the APK (Windows + GitHub Desktop, no local Gradle)
1. Unzip over your existing folder (e.g. `C:\Projects\studyforge`), replacing files.
2. GitHub Desktop → review changes → Commit → **Push origin**.
3. github.com → repo → **Actions** → latest "Build debug APK" (~6–9 min) → Artifacts → `studyforge-debug-apk`.
4. Unzip, copy `app-debug.apk` to the phone, install (allow unknown apps). **Uninstall the Phase 1 build first** (app id changed).
If the run is red, copy the failing step's log and paste it to me.

## How native code gets in
CI runs `npx cap add android`, then `node scripts/patch-android.mjs`, which copies `android-overlay/` (Kotlin sources, manifest, 3 sounds)
into `android/` and enables Kotlin in Gradle. Edit native code only inside `android-overlay/`.

## Alarm design
`setAlarmClock` (exact, Doze-proof) → `AlarmReceiver` → `AlarmService` (foreground, mediaPlayback type, ALARM stream, 20 s volume ramp, vibration,
full-screen notification) → `AlarmActivity` (over lock screen) → web route `/alarm/:blockId`. Alarms live in native SharedPreferences, so
`BootReceiver` reschedules without JS. JS calls `rescheduleAll()` on open and after every schedule edit.

## Commands (Node 20): `npm install` · `npm test` · `npm run dev` · `npm run build`
