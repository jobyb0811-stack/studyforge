# StudyForge — complete step-by-step guide (Windows + GitHub Desktop)

App id: `com.godzillamode.studyforge`. You never need Android Studio, Gradle or a terminal.
GitHub's free servers build the APK for you each time you push.

## PART A — One-time setup (about 15 minutes)

### A1. Create a free GitHub account
1. Open https://github.com in your browser → click **Sign up** (top-right). Enter email, password, username → verify email.

### A2. Install GitHub Desktop
1. Go to https://desktop.github.com → click the purple **Download for Windows** button → run the installer.
2. When it opens, click **Sign in to GitHub.com** → your browser opens → click **Authorize desktop** → back in the app click **Finish**.

### A3. Put the project in a folder
1. Download `studyforge-final.zip` from this chat.
2. Right-click the zip → **Extract All…** → choose `C:\Projects` → **Extract**.
3. You now have `C:\Projects\studyforge` containing `package.json`, `src`, `android-overlay`, `.github`, etc.
   Check: the file `package.json` must be directly inside `studyforge`, not inside another folder.
   (Hidden folder `.github` is required. In File Explorer: **View → Show → Hidden items** to see it.)

### A4. Create the repository in GitHub Desktop
1. In GitHub Desktop: menu **File → Add local repository…**
2. Click **Choose…** → select `C:\Projects\studyforge` → **Select Folder**.
3. A red warning says it is not a Git repository → click the blue link **create a repository** → in the form leave the name `studyforge`, leave everything else, click **Create repository**.
4. Click the blue button **Publish repository** (top bar).
5. In the popup: tick **Keep this code private** (recommended) → click **Publish repository**.
   Private repos still get free build minutes.

### A5. First commit and push
1. Left panel **Changes** tab should list many files (100+). If it shows 0, see Troubleshooting.
2. Bottom-left: in the box **Summary (required)** type `first build`.
3. Click the blue **Commit to main** button.
4. Top bar, click **Push origin** (if you see **Publish repository** instead, click that first).

## PART B — Get the APK

1. Open your repo on github.com: GitHub Desktop → menu **Repository → View on GitHub**.
2. Click the **Actions** tab (top row, next to Pull requests).
3. If GitHub shows a green button **I understand my workflows, go ahead and enable them**, click it.
4. Click the newest run named **first build** → job **apk**. Yellow dot = building (6–10 min). Green tick = success.
5. Green? Scroll to the bottom of the run page → **Artifacts** → click **studyforge-debug-apk** (downloads a zip).
6. Right-click the downloaded zip → **Extract All…** → you get `app-debug.apk`.
7. Red ✗? See Troubleshooting. Copy the log of the failed step and paste it to me.

## PART C — Install on your phone
1. Send `app-debug.apk` to the phone (USB cable → copy to Downloads, or upload to Google Drive / WhatsApp "Saved messages" and download on phone).
2. On the phone open **Files** (or Downloads) → tap `app-debug.apk`.
3. If asked, tap **Settings** → switch on **Allow from this source** → press Back → tap **Install**.
4. If Play Protect shows "Blocked / Unrecognised app" → tap **More details → Install anyway**.
5. Tap **Open**.

## PART D — First run in the app (this is what each screen asks)
1. **Step 1 of 4 — exam**: type the exam name, optionally pick the date → **Continue**.
2. **Step 2 — syllabus**: tap **Paste & import syllabus**. Choose a subject (or **+ New subject…** and type a name). Paste syllabus text → **Parse & preview**. Fix any line marked ⚠, use ⇡ (merge into previous chapter), ✂ (split here), → (move topic), ✕ (delete). Tap **Save N topics**. (**Skip for now** is fine.)
3. **Step 3 — daily study time**: hours per day and usual start time → **Continue**.
4. **Step 4 — alarms**: tap **Fix** on every red row and allow each (Notifications → Allow; Exact alarms → switch on; Full-screen alerts → switch on; Battery exemption → Allow). Return to the app; rows turn green ✓. Then tap **Finish**.
5. **Test the alarm** (do this before trusting it): Settings tab → scroll to Alarm Health → **Test alarm in 1 minute** → press the power button to lock the phone. In ~60 s the screen should light up with the alarm. Open the app again: the log says "✓ fired". If it says "did not fire", follow the suggested cause and the **Phone-maker autostart guide** just below it (Xiaomi/Realme/Oppo/Vivo/Samsung/OnePlus).

## PART E — Daily use
- **Plan tab**: set **Exam** date; tick topics (chapter box ticks all its topics) → bottom card: **One day** (set start time + minutes per block → **Add to …**) or **Date range** → **Distribute for me** (or **Manual**, then drag the pill onto a day or tap a day). Quick actions at top: *Plan all unplanned until exam*, *I'm off today*, *Missed → today/tomorrow*.
- **Today tab**: the big card is the current block. Swipe right = **Done** (then pick status + confidence), swipe left = Skip (reason needed) or Snooze. **Focus** opens the Pomodoro timer. Tap any timeline row to edit or delete it.
- **When an alarm rings**: slide to start (opens Focus), Snooze 5/10/15 (max 3), or Skip with a reason. Back button = snooze.
- **Syllabus tab**: tap a topic for status, confidence, ★ important, checklist and notes; ✎ edits chapters/subjects (↑/↓ reorders chapters); 🔍 / search box searches everything; **Weak topics** lists low-confidence and noted topics.
- **Stats tab**: weekly hours, topics, streak history, progress.
- **Settings tab**: theme, accent, font, 12/24h, week start, default block length, calm-reminder lead time, quiet hours, daily alarms, backups.
- Every delete/skip shows an **Undo** bar for 5 seconds at the bottom.

## PART F — Updating the app later
1. Replace files in `C:\Projects\studyforge` with the new zip's contents (Extract All → Replace).
2. GitHub Desktop → **Changes** tab → Summary `update` → **Commit to main** → **Push origin**.
3. Wait for the green run → download the new APK → install over the old one (your data is kept; this works because every build uses the same signing key).
4. Before any uninstall: Settings → **Export backup (JSON)** → file lands in `Downloads/StudyForge`.

## Troubleshooting
- **GitHub Desktop shows 0 changes**: you chose the wrong folder (one level too high/low). Repository → Remove, then add the folder that directly contains `package.json`.
- **No Actions tab run appears**: confirm the commit contains `.github/workflows/android.yml` (hidden folder; enable hidden items). Then **Actions → Build debug APK → Run workflow**.
- **Red ✗ run**: click it → click the failed step (red) → copy the last ~40 lines → paste to me. The "Unit tests" step is allowed to fail; the APK still builds.
- **"App not installed"**: an older APK with a different signature is installed. Export a backup, uninstall the old app, install the new one, import the backup.
- **Alarm didn't ring when locked**: Settings → Alarm Health must be 4/4 green, plus the phone-maker guide, plus Do-Not-Disturb off or alarms allowed.
- **Blank white screen on the alarm**: tell me; I'll switch the alarm route to a query-string URL.

## For developers
`npm install`, `npm test`, `npm run typecheck`, `npm run dev`, `npm run build`. Native code lives only in `android-overlay/`; CI runs `npx cap add android` then `node scripts/patch-android.mjs`.
