# @sidleo3/skill-filesystem-plus

按 preset 选择性接管 DSH 的技能发现。以可配置的四层扫描（cwd / 项目 / 上级遍历 / 全局）+ 可编辑的上级目录名替代内置 `dsh-skill-filesystem` 的固定发现逻辑 —— 但**只在用户显式勾选的 preset 中生效**。

> 本项目由 `@sidleo3/skill-scan` 更名而来；GitHub 仓库 `sidleo/skill-scan` 已改名为 `sidleo/skill-filesystem-plus`。旧配置（`~/.dsh/dsh-skill-scan.json`）会自动迁移。

## 核心设计

- **安装零改动**：插件安装后不做任何事，不复制、不修改任何 preset，内置 `skill-filesystem` 照常工作
- **用户决定生效范围**：在 Web GUI（Settings → Plugins → 技能扫描）里勾选要接管的 preset（多选）
- **完全替代**：勾选某个 preset 后，该 preset 配置中内置 `skill-filesystem` 行被 `disabled`，由本插件的 `/preset` provider 行接管；未勾选的 preset 完全保持内置行为
- **取消即恢复**：取消勾选从备份恢复原始配置，`skill-filesystem` 恢复工作
- **配置卡片跨 DSH 升级稳定**：Host 注册 `skill-filesystem-plus` settings namespace，新版 Settings 的「可配置插件」页只渲染 Host 提供 namespace 的卡片——这是 DSH 升级后卡片消失的根因，注册后卡片始终可见

## Features

- **Four scanning layers**: cwd (highest) → project/parents (mutually exclusive) → global (lowest)
- **scanParents mode**: Walk every ancestor from cwd upward — no depth limit
- **Editable parent dirs**: 默认 `.dsh`、`.agents`；增删改 + 拖拽排序（靠前优先）
- **Web GUI card**: Settings → Plugins → 技能扫描 — preset 多选 + 四层扫描配置 + 根目录预览
- **Live invalidation**: 模型 `write`/`edit` 触及 `<…>/skills/` 路径时立即失效目录

## Installation

```bash
# From npm (推荐)
dsh plugin --profile web add @sidleo3/skill-filesystem-plus

# From local checkout (迭代开发)
dsh plugin --profile web add link:/path/to/skill-filesystem-plus
```

安装后重启 DSH。**无需任何额外操作**——插件不会改动任何 preset，内置 skill-filesystem 继续工作。

## 使用：在 GUI 中按 preset 启用

1. 打开 Settings → Plugins → **技能扫描**
2. 在「生效的预设」列表里勾选要接管的 preset（多选，仅列出含 `skill-filesystem` 行的预设）
3. 勾选后立即生效于**之后新建**的会话：该 preset 的 `skill-filesystem` 行被禁用，插入 `@sidleo3/skill-filesystem-plus/preset` provider 行（位于 `~/.dsh/.agent-presets/<id>/agent.cordis.yml`）
4. 新会话选择该 preset 时，使用本插件的四层扫描发现技能
5. 取消勾选 = 从 `.skill-filesystem-plus-backup/` 恢复原始配置，`skill-filesystem` 恢复工作（新建会话生效）

> 已运行中的会话不受勾选/取消影响（preset 组合在会话创建时固定）；改动对**之后新建**的会话生效。

## Configuration

```typescript
interface SkillScanConfig {
  scanCwd: boolean           // default: true
  scanProject: boolean       // default: true (mutually exclusive with scanParents)
  scanParents: boolean       // default: false (mutually exclusive with scanProject)
  scanGlobal: boolean        // default: true
  parentDirs: { name: string }[]  // default: [{name:'.dsh'},{name:'.agents'}]
}
```

配置持久化在 `~/.dsh/dsh-skill-filesystem-plus.json`（旧名 `dsh-skill-scan.json` 自动迁移）。

## How it works

1. **Install = no-op**：host 入口只注册 settings namespace + GUI RPC，不碰任何 preset
2. **User picks presets**：GUI 调 `/api/skill-filesystem-plus/presets/apply`，host 用 `ctx.agentPresets` 读取该 preset 配置 → 备份 → 禁用 `skill-filesystem` 行 → 插入 `/preset` provider 行
3. **Discovery**：副本 preset 中 `/preset` 行的 provider 在**该预设层**注册 provider（`skills.registerProvider` 是 scope-aware），按四层扫描发现技能，完全替代内置发现
4. **Removal**：GUI 调 `/api/skill-filesystem-plus/presets/remove`，从 `.skill-filesystem-plus-backup/` 恢复原始配置
5. **Config live-reload**：provider 每次 `list` 都通过 `ctx.fs` 重读磁盘配置，GUI 保存后下一次目录刷新即生效

## Why replace matters

DSH 按 **layer（层）优先于 rank** 解析同名技能。内置 `skill-filesystem` 若仍挂载在预设层，同名师技能它永远赢；要按 rank 覆盖必须把该 preset 的 `skill-filesystem` 行禁用、改由本插件 provider 提供。

## Development

```bash
pnpm install
pnpm build        # tsdown → lib/index.js + lib/preset.js + lib/client.js
pnpm typecheck    # tsc --noEmit
```

## Notes

- 升级 DSH 后，若内置 preset 被覆盖为原版，已改的 preset 配置可能被重置；在 GUI 里取消再勾选即可基于新版重建（备份机制保证可恢复）
- 本机 profile web 通过 `link:` 指向本仓库，改代码 → `pnpm build` → 重启 DSH Web GUI 生效
- `skill-scan-blueprint/` 保留更名前的动态插件形态作参考（不参与构建）

## License

MIT
