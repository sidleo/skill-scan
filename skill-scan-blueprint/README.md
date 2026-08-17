# skill-scan blueprint

Reference copy of the logic that was first verified live in a DSH dynamic plugin
(`skf-1`, packages `pkg-1` … `pkg-10`) before being made into the formal package
in the parent `../src/`.

| File | What it is |
|---|---|
| `src/index.ts` | Host entry — provider + config normalization + RPC surface (formal-package home) |
| `src/client/index.ts` | Browser half — collapsible plugin card matching product `PluginCard` |
| `src/wizard.ts` | Install wizard — replace / coexist via `ctx.agentPresets` |

The parent package's `src/` is the canonical build source; this folder is kept
as a snapshot/reference. See the package `README.md` / `README.zh-CN.md` for
usage and the dynamic→formal migration notes.
