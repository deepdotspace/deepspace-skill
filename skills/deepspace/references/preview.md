# Claude Preview Tool — launch.json & the worktree trap

Load this reference when using the Claude desktop preview tool (`preview_start` / `preview_*`) with a DeepSpace app — especially when the preview shows stale code, your edits never appear in the served page, or you are working inside a `.claude/worktrees/<name>` git worktree. Skip it if you're driving the dev server yourself with `npx deepspace dev` and a browser.

## How the preview tool finds a DeepSpace app

The preview tool starts dev servers from configs in `.claude/launch.json`. Both the scaffolder and `npx deepspace dev` seed an app-local one automatically:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "<app>", "runtimeExecutable": "npx",
      "runtimeArgs": ["deepspace", "dev", "--port", "5173"], "port": 5173 }
  ]
}
```

So in the normal case — a session opened on the app's own directory — `preview_start` just works. No setup needed.

launch.json is machine-specific (worktree entries carry absolute paths) and self-healed by `dev`, so it must not be committed. Current scaffolds gitignore `.claude/launch.json` and `.claude/worktrees`; if an older app tracks them, add those two lines to `.gitignore` and `git rm --cached .claude/launch.json`.

## The worktree trap

The preview tool runs inside the Claude desktop app and locks its base directory to the session's **primary** working directory (the main repo). It reads only the **main repo's** `.claude/launch.json` — a worktree's own launch.json is never read (upstream bug: anthropics/claude-code#56688).

Consequence: while editing in `.claude/worktrees/<name>`, `preview_start` launches the dev server in the **main repo** and serves its stale code. Every edit you make in the worktree is invisible in the preview, no matter what you change. This looks exactly like "the preview tool is broken" or "my change didn't work" — it's neither; the wrong checkout is being served.

## Diagnose: is the preview serving the code you're editing?

1. `preview_list` shows each server's `cwd`. If it isn't the worktree, the wrong codebase is being served. (Caveat: with the `cwd` fix below active, the *displayed* cwd may still show the main repo — that's cosmetic; trust check 2.)
2. Ground truth: add a distinctive string to a source file you're editing, then
   `curl -s localhost:<port>/src/pages/<file> | grep -c <that-string>` — `0` means the server is building from a different checkout.

## Fix

**Current SDK (automatic):** run `npx deepspace dev` once from inside the worktree. It detects the `.claude/worktrees/<name>` layout and upserts a `wt-<name>` entry into the **main repo's** launch.json, pinned to the worktree via `cwd` on a stable per-worktree port (5180–5199, bumped past ports other entries already claim; an explicit `--port` is used verbatim). The dev run itself binds that same port, and `--prod`/`--env` flags are preserved in the entry. It prints the entry name:

```
Claude worktree detected — preview tool: use preview_start with name "wt-<name>" (port 51xx)
```

Then call `preview_start` with `name: "wt-<name>"`. Stale `wt-*` entries whose worktree was deleted are pruned automatically on later `dev` runs. You can stop the CLI once the config is written — the preview tool starts its own server from the entry. `deepspace test` and `deepspace kill` resolve the same worktree port automatically, so tests target the worktree's server (not the main repo's) and kill stops the right one; `$DEEPSPACE_PORT` is ignored inside worktrees (a notice is printed) — pass `--port` to override.

**Older SDKs (manual):** add the entry to the main repo's `.claude/launch.json` yourself, on a port that doesn't collide with a main-repo server:

```json
{ "name": "wt-<name>", "runtimeExecutable": "npx",
  "runtimeArgs": ["deepspace", "dev", "--port", "5186"], "port": 5186,
  "cwd": "<main-repo>/.claude/worktrees/<name>" }
```

**Alternative:** open the worktree as its own session (`cd <worktree> && claude`) so the worktree *is* the primary working directory and its own launch.json is read.

**Apps scaffolded before the automatic fix** track `.claude/launch.json` in git, and `wt-*` entries carry machine-specific absolute paths that shouldn't be committed. Untrack it once: `git rm --cached .claude/launch.json`, then add `.claude/launch.json` and `.claude/worktrees` to `.gitignore` (`dev` regenerates launch.json per machine).

Verify with the curl check above; the browser stays bound to the worktree port across `location.reload()`.
