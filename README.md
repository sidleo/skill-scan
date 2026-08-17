# skill-scan

A **configurable skill discovery provider** for [DeepSeek Harness](https://github.com/DeepSeekAI/deepseek-harness) (DSH), designed as a drop-in replacement for the fixed `dsh-skill-filesystem` discovery strategy.

Instead of a hardcoded list of roots, `skill-scan` lets you toggle four scan layers and freely edit the "parent directories" under which `<root>/<name>/skills` is scanned, each with its own priority. An install wizard offers **replace** (disables the built-in provider) or **coexist** on first run.

## Features

| Layer | Priority | Where it scans |
|---|---|---|
| **cwd** (session working directory) | Highest | `<cwd>/<parent-dir>/skills` |
| **project** (nearest `.git` ancestor) | Medium — exclusive with ancestors | `<project>/<parent-dir>/skills` |
| **ancestors** (walk up from cwd) | Medium — exclusive with project | each ancestor's `<parent-dir>/skills` |
| **global** (user home `~`) | Lowest | `~/<parent-dir>/skills` |

- **Editable parent dirs** — default `.dsh`, `.agents`; add/remove/rename freely, and **drag to reorder** priority (top = highest).
- **Mutual exclusivity** — project scanning and ancestor walking can only have one enabled (validated in both UI and host).
- **Skill format** — directory bundles (`<name>/SKILL.md`) and flat Markdown files (`<name>.md`); frontmatter parses `name`, `description`, `whenToUse`, `disable-model-invocation`, `user-invocable`.
- **Duplicate resolution** — distinct names load from every layer; a same-named skill keeps only the highest-priority (smallest rank) one.
- **Live invalidation** — model `write`/`edit` touching a `<…>/skills/` path invalidates the catalog immediately.
- **Collapsible plugin card** — Settings → Plugins → Plugin configuration, visually identical to the built-in cards (same `--dsw-alias-*` tokens and chevron).

## Install

### From npm (online)

```bash
dsh plugin --profile <profile> add @sidleo/skill-scan
```

`dsh plugin` forwards its arguments to `pnpm` inside the profile and activates any package declaring `dsh.bundle`. After install, refresh the web GUI.

### From a checkout (local link)

```bash
git clone https://github.com/sidleo/skill-scan.git
dsh plugin --profile <profile> add link:<repo-path>
```

> Git-hosted installs (`pnpm add github:user/repo`) require adding the package under `allowBuilds` in the profile's `pnpm-workspace.yaml` (pnpm 10+).

## First-run wizard: replace vs coexist

When you open the plugin card for the first time, choose:

- **Replace** — copies your current preset to a user preset named `skill-scan` and disables the `skill-filesystem` row inside the copy. The original preset stays untouched; new sessions that pick the `skill-scan` preset use your priority configuration for duplicate names. Fully reversible (a "restore" action deletes the copy).
- **Coexist** — leaves the preset alone; `skill-scan` only appends extra scan roots.

> **Why replace matters:** DSH resolves same-named skills by *layer* before *rank*. If the built-in `skill-filesystem` stays mounted in the preset layer, it wins any duplicate name regardless of your rank — so for priority-over-duplicates behavior you must **replace**.

## Configuration

All settings live in the plugin card (**Settings → Plugins → Plugin configuration → 技能扫描**):

- Four layer toggles.
- Parent dirs list with drag-to-reorder priority and per-row remove.
- Live root preview for the current session cwd.
- Debug panel that lists what discovery actually finds.
- Save writes back and refreshes the catalog.

## Open-source status

This repository is the **formal-package home** of logic first verified live in a DSH dynamic plugin (`skf-1`). The `src/` directory is the canonical package; `skill-scan-blueprint/` keeps the original, dynamic-plugin-form sources as a reference (host / client / wizard).

To publish yourself:

```bash
pnpm install
pnpm build      # tsdown → lib/index.js + lib/client.js
npm publish
```

> The host half depends on DSH-private packages (`@deepseek-ai/dsh-skill`, `@deepseek-ai/dsh-agent-presets`, …). Build from an environment where those resolve (they are published as `-rc` on npm); this package declares them as `peerDependencies`/`devDependencies`.

## License

MIT
