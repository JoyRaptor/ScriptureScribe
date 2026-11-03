# T1 — Dead file cleanup and hygiene

Goal: reclaim ~130MB+ of dead weight. **This task deletes files — follow the
whitelists EXACTLY. If a listed file doesn't exist, skip it silently. Never
delete anything not listed.**

Golden tests: must still PASS unchanged (this task touches no source code).

## Step 1 — delete dead files in the installed plugin folder

In `C:\ObsidianBrain\.obsidian\plugins\scripture-scribe\` delete ONLY:

- `strongs-lxx.xjson`         (34MB, abandoned experiment)
- `strongs-lxx-full.json`     (32MB, superseded by strongs-lxx.json)
- `mainCopy`                  (1.3MB, stale build copy)

Do NOT delete `main.js.pre-fable.bak` yet — the owner deletes that herself
once she's confirmed the current build works for a week.

## Step 2 — move backups out of the plugins directory

In `C:\ObsidianBrain\.obsidian\plugins\` there are backup archives that sync
tools will upload repeatedly. CREATE folder `C:\+Projects\Scripture-scribe\old-backups\`
and MOVE (not delete) these files into it:

- `Scripture-Scribe.zip`
- `scripture-scribe-backup.rar`
- `scripture-scribe-backup2.rar`
- `scripture-scribe-backup3-origional theme.rar`

## Step 3 — move clutter out of src/ (it pollutes the git repo)

MOVE from `C:\+Projects\Scripture-scribe\src\` into `old-backups\`:

- `backup.rar`
- `backup good.rar`
- `retaded gemini color backup.rar`

Then commit the removal: `cd src && git add -A && git commit -m "T1: move backup archives out of src"`

## Step 4 — node_modules: LEAVE IT ALONE

(Resolved 2026-07-05.) The large `sharp` package inside node_modules is a
real dependency of `@xenova/transformers`, not a stray install. It is
dev-machine disk space only and never ships in main.js. Do NOT attempt to
remove or override it — the permanent fix is roadmap item 6 in
`T6-product-roadmap.md`.

## Step 5 — verify

Run all three verification commands from the handbook. Build and golden must
pass (a fresh `npm install` must not change behavior). Report the new size of
`node_modules` and of the plugin folder.

## Files you may edit

None. This task only deletes/moves the exact files listed and reinstalls
dependencies.
