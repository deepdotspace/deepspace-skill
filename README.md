# DeepSpace Skill

A Claude Code / Claude Agent SDK skill that teaches your agent how to build real-time collaborative apps with the DeepSpace SDK.

The agent automatically uses this knowledge when working in a DeepSpace project or when the user mentions DeepSpace, app.space, real-time sync, multiplayer state, presence, whiteboards, or collaborative text editing.

## Install

### Via [skills.sh](https://skills.sh) (works today)

```sh
npx skills@latest add deepdotspace/deepspace-skill
```

When prompted, **select Claude Code** in the agent list — otherwise the skill installs to `~/.agents/skills/` instead of `~/.claude/skills/` and Claude Code won't see it.

### Via the Anthropic plugin catalog (pending approval)

Once the plugin is approved for the official catalog:

```sh
/plugin install deepspace
```

### From a local checkout (for editing or contributing)

Symlink your local clone into Claude Code's skills directory — restart the session afterward to pick it up:

```sh
git clone https://github.com/deepdotspace/deepspace-skill.git
ln -s "$PWD/deepspace-skill/skills/deepspace" ~/.claude/skills/deepspace   # user-level
# or, scoped to one project:
ln -s "$PWD/deepspace-skill/skills/deepspace" /path/to/project/.claude/skills/deepspace
```

Symlinks always reflect the current contents of the source directory — no need to re-link after editing files. Re-link only if you move, rename, or delete the source.

## Links

- [DeepSpace SDK source](https://github.com/donalddellapietra/deepspace-sdk)
- [npm: deepspace](https://www.npmjs.com/package/deepspace)
- [npm: create-deepspace](https://www.npmjs.com/package/create-deepspace)

## Repo notes

- The published skill lives entirely under `skills/deepspace/`. Everything else (`evals/`, `yuke-findings*.md`) is for skill maintainers, not bundled with the plugin.
- `yuke-findings*.md` are outdated field reports from earlier iteration cycles, kept for historical context only.
- `evals/` runs the trigger-rate evaluation harness — see `evals/README.md`.

## License

MIT — see [LICENSE](./LICENSE).
