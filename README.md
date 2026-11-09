# DeepSpace Skill

Portable agent skill for building apps with the [DeepSpace SDK](https://github.com/deepdotspace/deepspace), including Codex and Claude Code.

## Install

In Claude Code:

```text
/plugin marketplace add deepdotspace/deepspace-skill
/plugin install deepspace@deepspace
```

In Codex, Cursor and other agents:

```bash
npx -y skills@latest add deepdotspace/deepspace-skill -y
```

DeepSpace builds and deploys from a terminal, so the skill needs an agent that
can run shell commands. Where it can't, as in claude.ai chat, the skill helps
plan the app and hands the plan off to a coding agent.

## What it does

Bootstraps your agent for DeepSpace work: the operating sequence (authenticate,
scaffold, inspect catalogs, extend, test, deploy), the rules that prevent
expensive mistakes, and — most importantly — how to consult the documentation
at [docs.deep.space](https://docs.deep.space), which is the opinionated
authority for both facts and approach. The docs are agent-readable by design:
an MCP server (`https://docs.deep.space/mcp`), an
[`llms.txt`](https://docs.deep.space/llms.txt) index, and every page as raw
Markdown (append `.md`).

The skill deliberately carries no topic references of its own — guidance lives
in the documentation so there is exactly one place for it to be right.

## Links

- [Documentation](https://docs.deep.space)
- [DeepSpace SDK](https://github.com/deepdotspace/deepspace)
- [npm: deepspace](https://www.npmjs.com/package/deepspace)
