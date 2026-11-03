# ScriptureScribe — AI Helper Handbook

You are an AI assistant working on an Obsidian plugin. The project owner is a
Bible student, **not a programmer** — she cannot debug your mistakes. This
document is law. Read it fully before touching anything.

## What this project is

An Obsidian plugin (TypeScript, bundled with esbuild) that detects scripture
references in notes, shows hover tooltips with original-language interlinear
data, and provides a reading panel with multi-mode search (Strong's numbers,
Greek/Hebrew words, English, phrase, boolean, morphology, semantic vectors).

- Project root: `C:\+Projects\Scripture-scribe`
- Source code: `src/*.ts` (the git repository is the whole project folder, `C:\+Projects\Scripture-scribe`; GitHub: JoyRaptor/ScriptureScribe)
- Build output: `main.js` at project root
- Installed copy the owner actually runs:
  `C:\ObsidianBrain\.obsidian\plugins\scripture-scribe\`
- Large JSON data files at project root and in the plugin folder are the
  Bible databases. **Never edit, reformat, or "optimize" a data file.**

## The iron rules

1. **One task per session.** Do only the task file you were given. If you
   notice other problems, write them down at the end of your reply — do NOT
   fix them.
2. **Only touch files listed in your task's "Files you may edit".**
3. **No reformatting, no renaming, no drive-by improvements, no new
   dependencies, no version bumps.** Match the existing code style exactly.
4. **Never delete or rewrite a file wholesale** unless the task says so.
   Make minimal, surgical edits.
5. If anything is ambiguous, or a verification step fails twice, **STOP** and
   report what happened instead of improvising. A truthful "I could not
   finish" is a success; a silent hack is a failure.

## Verification — run after EVERY change, all three must pass

```
cd C:\+Projects\Scripture-scribe
npx tsc -noEmit -skipLibCheck          # 1. type check (must print nothing)
node esbuild.config.mjs production     # 2. build (must end "Done in …ms")
npm run golden                          # 3. behavior check (must print PASS)
```

The golden test runs the plugin's real search code against the real data and
compares results to a stored baseline (`scripts/goldens.json`). If your task
was not supposed to change search results and it FAILS, **revert your change**
(`git checkout -- src/<file>`). If your task legitimately changes results,
the task file will say so — then run `npm run golden:update` and commit
`scripts/goldens.json` alongside your change. Never run `golden:update` to
make a failure go away without understanding why it failed.

## Committing and deploying

After the three checks pass:

```
cd C:\+Projects\Scripture-scribe
git add -A
git commit -m "T<number>: <one-line summary>"
```

Then deploy so the owner can test in Obsidian:

```
copy C:\+Projects\Scripture-scribe\main.js C:\ObsidianBrain\.obsidian\plugins\scripture-scribe\main.js
```

Tell the owner: "Restart Obsidian (or toggle the ScriptureScribe plugin off
and on) to load the new build."

## Rollback (if the owner reports breakage)

```
cd C:\+Projects\Scripture-scribe
git log --oneline          # find the commit before the bad one
git checkout <good-hash> -- .
```
Then rebuild and redeploy as above. A known-good build also exists at
`C:\ObsidianBrain\.obsidian\plugins\scripture-scribe\main.js.pre-fable.bak`.

## Task list (do in order unless told otherwise)

| # | File | What | Status (2026-07-05) |
|---|------|------|---------------------|
| T1 | tasks/T1-cleanup.md | Delete dead files, folder hygiene | ✅ DONE (Fable 5) |
| T2 | tasks/T2-versification-out-of-bundle.md | Load mapping at runtime | ✅ DONE (DeepSeek, verified by Fable) |
| T3 | tasks/T3-token-cache.md | Token corpus for phrase/boolean speed | ✅ DONE (DeepSeek, verified by Fable) |
| T4 | tasks/T4-css-migration.md | Move inline styles to styles.css | 🔄 IN PROGRESS — settingsTab.ts done; next session: tooltip.ts (session order #2) |
| T5 | tasks/T5-panel-split-prep.md | Split readingPanel.ts along mapped seams | ⬜ hard — strong model only |
| T6 | tasks/T6-product-roadmap.md | NOT a task — reserved for a frontier model | read-only |

Progress log:
- 2026-07-05: search overhaul + T1–T3 + T4(settingsTab) complete. Bundle
  2.92MB → 1.33MB. Plugin folder 281MB → 206MB. All golden checks passing.
  DeepSeek's T2 had one latent bug (crash-on-missing-mapping-file) — fixed
  in commit 421437f. Lesson: after a small-model session, a stronger model
  should skim the diffs (`git show <hash>`) even when checks pass.

## Notes for the owner (Mary)

To run a task with any AI that can read/write files, paste this:

> Read `C:\+Projects\Scripture-scribe\tasks\AI-HANDOFF-README.md` and follow
> it exactly. Your assigned task is `tasks\T<number>-<name>.md`. Do nothing
> outside that task. Show me the output of the three verification commands
> before you commit.

If the AI can't run commands, don't use it for code tasks. If a session goes
sideways, close it, roll back per the Rollback section, and try again fresh —
never let a model "dig itself out."
