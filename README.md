# @sidleo3/skill-filesystem-plus

[English](README.md) | [中文](README.zh-CN.md)

A configurable skill discovery provider for [DeepSeek Harness](https://github.com/DeepSeekAI/deepseek-harness) (DSH). It replaces the fixed discovery of the built-in \`dsh-skill-filesystem\` with **editable scan layers and parent directories** — but only in presets you explicitly enable in the GUI.

> Renamed from \`@sidleo3/skill-scan\`; the GitHub repository \`sidleo/skill-scan\` is now \`sidleo/skill-filesystem-plus\`. Your old config (\`~/.dsh/dsh-skill-scan.json\`) is migrated automatically.

## Core design

- **Install = no-op**: installing the plugin changes nothing — no preset is copied or modified, and the built-in \`skill-filesystem\` keeps working
- **You decide the scope**: enable takeover per preset in the Web GUI (Settings → Plugins → 技能扫描)
- **Full replacement**: for an enabled preset, its \`skill-filesystem\` row is \`disabled\` and a \`/preset\` provider row takes over; unselected presets keep built-in behavior untouched
- **Removal restores**: unchecking restores the original preset from a backup, and \`skill-filesystem\` resumes
- **Card survives DSH upgrades**: the host registers the \`skill-filesystem-plus\` settings namespace — the modern Settings "configurable plugins" page renders only cards whose namespace the host serves, which is the root cause of cards disappearing after DSH upgrades

## Features

- **Four scanning layers**: cwd (highest) → project/parents (mutually exclusive) → global (lowest)
- **scanParents mode**: walk every ancestor from cwd upward — no depth limit
- **Editable parent dirs**: default \`.dsh\`, \`.agents\`; add/remove/rename freely, drag to reorder (top = highest priority)
- **Web GUI card**: Settings → Plugins → 技能扫描 — per-preset takeover + four-layer scan config + root preview
- **Live invalidation**: a model \`write\`/\`edit\` touching a \`<…>/skills/\` path invalidates the catalog immediately

## Installation

\`\`\`bash
# From npm (recommended)
dsh plugin --profile web add @sidleo3/skill-filesystem-plus

# From a local checkout (development)
dsh plugin --profile web add link:/path/to/skill-filesystem-plus
\`\`\`

Restart DSH after installing. **No further action needed** — the plugin touches no preset and the built-in skill-filesystem keeps working.

## Usage: enable per preset in the GUI

1. Open Settings → Plugins → **技能扫描**
2. Check the presets to take over (multi-select; only presets carrying a \`skill-filesystem\` row are listed)
3. Takes effect on **newly created sessions**: the preset's \`skill-filesystem\` row is disabled and a \`@sidleo3/skill-filesystem-plus/preset\` provider row is inserted (at \`~/.dsh/.agent-presets/<id>/agent.cordis.yml\`)
4. Sessions on that preset use this plugin's four-layer discovery
5. Unchecking restores the original config from \`.skill-filesystem-plus-backup/\` and \`skill-filesystem\` resumes (for new sessions)

> Running sessions are unaffected (preset composition is fixed at session creation); changes apply to sessions created afterwards.

## Configuration

\`\`\`typescript
interface SkillScanConfig {
  scanCwd: boolean           // default: true
  scanProject: boolean       // default: true (mutually exclusive with scanParents)
  scanParents: boolean       // default: false (mutually exclusive with scanProject)
  scanGlobal: boolean        // default: true
  parentDirs: { name: string }[]  // default: [{name:'.dsh'},{name:'.agents'}]
}
\`\`\`

Persisted at \`~/.dsh/dsh-skill-filesystem-plus.json\` (legacy \`dsh-skill-scan.json\` migrates automatically).

## How it works

1. **Install = no-op**: the host entry only registers the settings namespace + GUI RPC, and never touches a preset
2. **User picks presets**: the GUI calls \`/api/skill-filesystem-plus/presets/apply\`; the host reads the preset via \`ctx.agentPresets\` → backs it up → disables the \`skill-filesystem\` row → inserts the \`/preset\` provider row
3. **Discovery**: the \`/preset\` row's provider registers into that preset's layer of the skills registry (\`skills.registerProvider\` is scope-aware) and runs four-layer discovery, fully replacing built-in discovery
4. **Removal**: the GUI calls \`/api/skill-filesystem-plus/presets/remove\`, restoring the original config from \`.skill-filesystem-plus-backup/\`
5. **Config live-reload**: the provider re-reads the disk config through \`ctx.fs\` on every \`list\`, so a GUI save takes effect on the next catalog refresh

## Why "replace" matters

DSH resolves same-named skills by **layer before rank**. As long as the built-in \`skill-filesystem\` stays mounted in the preset layer, it wins every duplicate name regardless of your rank — so to make "duplicates resolved by your priority" actually work, that preset's \`skill-filesystem\` row must be disabled and the provider supplied by this plugin.

## Development

\`\`\`bash
pnpm install
pnpm build        # tsdown → lib/index.js + lib/preset.js + lib/client.js
pnpm typecheck    # tsc --noEmit
\`\`\`

## Notes

- After a DSH upgrade overwrites a built-in preset, already-taken-over presets may be reset; uncheck and re-check in the GUI to rebuild from the new version (the backup mechanism keeps removal safe)
- \`skill-scan-blueprint/\` keeps the pre-rename dynamic-plugin form for reference (not part of the build)

## License

MIT
