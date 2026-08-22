# @sidleo3/skill-filesystem-plus

为 [DeepSeek Harness](https://github.com/DeepSeekAI/deepseek-harness)（DSH）提供的**可配置技能发现提供方**，按 preset 选择性接管内置 `dsh-skill-filesystem` 的固定发现逻辑——四层扫描 + 可编辑的上级目录名，**只在用户显式勾选的 preset 中生效**。

> 本项目由 `@sidleo3/skill-scan` 更名而来；GitHub 仓库已改名为 `sidleo/skill-filesystem-plus`。旧配置（`~/.dsh/dsh-skill-scan.json`）会自动迁移。

## 核心设计

- **安装零改动**：插件安装后不做任何事，不复制、不修改任何 preset，内置 `skill-filesystem` 照常工作
- **用户决定生效范围**：在 Web GUI（Settings → Plugins → 技能扫描）里勾选要接管的 preset（多选）
- **完全替代**：勾选某个 preset 后，该 preset 配置中内置 `skill-filesystem` 行被 `disabled`，由本插件的 `/preset` provider 行接管；未勾选的 preset 完全保持内置行为
- **取消即恢复**：取消勾选从备份恢复原始配置，`skill-filesystem` 恢复工作
- **配置卡片跨 DSH 升级稳定**：Host 注册 `skill-filesystem-plus` settings namespace，新版 Settings 的「可配置插件」页只渲染 Host 提供 namespace 的卡片——这是 DSH 升级后卡片消失的根因，注册后卡片始终可见

## 功能

| 层级 | 优先级 | 扫描路径 |
|---|---|---|
| **cwd**（会话工作目录） | 最高 | `<cwd>/<上级目录>/skills` |
| **项目目录**（最近含 `.git` 的祖先） | 中 — 与「上级遍历」互斥 | `<项目根>/<上级目录>/skills` |
| **上级遍历**（从 cwd 向上逐级） | 中 — 与「项目目录」互斥 | 每个祖先的 `<上级目录>/skills` |
| **全局**（用户主目录 `~`） | 最低 | `~/<上级目录>/skills` |

- **可编辑上级目录** — 默认 `.dsh`、`.agents`；可增删改，并**拖动排序调整优先级**（越靠上越优先）。
- **互斥二选一** — 项目目录扫描与上级遍历只能开一个（UI 与宿主双重校验）。
- **技能格式** — 目录包（`<名称>/SKILL.md`）与平铺 Markdown 文件（`<名称>.md`）；解析 frontmatter 的 `name`、`description`、`whenToUse`、`disable-model-invocation`、`user-invocable`。
- **重名裁决** — 不同名技能全部加载；同名的只保留优先级最高（rank 最小）者。
- **即时失效** — 模型 `write`/`edit` 命中 `<…>/skills/` 路径时立即刷新技能目录。
- **可折叠插件卡片** — 设置 → 插件 → 插件配置，与内置卡片视觉一致（同一套 `--dsw-alias-*` token 与箭头图标）。

## 安装

### 从 npm 在线安装

```bash
dsh plugin --profile <profile> add @sidleo3/skill-filesystem-plus
```

`dsh plugin` 会把参数转发给 profile 目录里的 `pnpm`，并自动激活声明了 `dsh.bundle` 的包。装完重启 DSH 即可。

### 从本地 checkout 以 link 方式安装

```bash
git clone https://github.com/sidleo/skill-filesystem-plus.git
dsh plugin --profile <profile> add link:<仓库路径>
```

> 以 git 仓库方式安装（`pnpm add github:user/repo`）时，需在 profile 的 `pnpm-workspace.yaml` 里的 `allowBuilds` 中加入对应的包（pnpm 10+）。

## 使用：在 GUI 中按 preset 启用

1. 打开 Settings → Plugins → **技能扫描**
2. 在「生效的预设」列表里勾选要接管的 preset（多选，仅列出含 `skill-filesystem` 行的预设）
3. 勾选后立即生效于**之后新建**的会话：该 preset 的 `skill-filesystem` 行被禁用，插入 `@sidleo3/skill-filesystem-plus/preset` provider 行（位于 `~/.dsh/.agent-presets/<id>/agent.cordis.yml`）
4. 新会话选择该 preset 时，使用本插件的四层扫描发现技能
5. 取消勾选 = 从 `.skill-filesystem-plus-backup/` 恢复原始配置，`skill-filesystem` 恢复工作（新建会话生效）

> 已运行中的会话不受勾选/取消影响（preset 组合在会话创建时固定）；改动对**之后新建**的会话生效。

## 配置

所有设置都在插件卡片里（**设置 → 插件 → 插件配置 → 技能扫描**）：

- 四个层级开关。
- 上级目录列表：拖动排序优先级、逐行删除。
- 当前会话 cwd 的扫描根实时预览。
- 调试面板：列出实际发现到的技能。
- 保存即写回并刷新技能目录。

配置持久化在 `~/.dsh/dsh-skill-filesystem-plus.json`（旧名 `dsh-skill-scan.json` 自动迁移）。

## 工作原理

1. **Install = no-op**：host 入口只注册 settings namespace + GUI RPC，不碰任何 preset
2. **User picks presets**：GUI 调 `/api/skill-filesystem-plus/presets/apply`，host 用 `ctx.agentPresets` 读取该 preset 配置 → 备份 → 禁用 `skill-filesystem` 行 → 插入 `/preset` provider 行
3. **Discovery**：副本 preset 中 `/preset` 行的 provider 在**该预设层**注册 provider（`skills.registerProvider` 是 scope-aware），按四层扫描发现技能，完全替代内置发现
4. **Removal**：GUI 调 `/api/skill-filesystem-plus/presets/remove`，从 `.skill-filesystem-plus-backup/` 恢复原始配置
5. **Config live-reload**：provider 每次 `list` 都通过 `ctx.fs` 重读磁盘配置，GUI 保存后下一次目录刷新即生效

## 为什么需要「替换」

DSH 对同名技能先按**层**再按 **rank** 裁决。只要内置 `skill-filesystem` 仍挂在预设层，同名的就会被它赢走，与你配置的 rank 无关——所以要让「重名按优先级」真正生效，必须把该 preset 的 `skill-filesystem` 行禁用、改由本插件 provider 提供。

## 开源说明

本仓库是**正式包形态**，代码先在 DSH 动态插件（`skf-1`）中实测通过后迁入。`src/` 是正式包源码；`skill-scan-blueprint/` 保留更名前的动态插件形态作参考（不参与构建）。

自行发布：

```bash
pnpm install
pnpm build      # tsdown → lib/index.js + lib/preset.js + lib/client.js
npm publish
```

> 宿主端依赖 DSH 私有包（`@deepseek-ai/dsh-skill`、`@deepseek-ai/dsh-agent-presets` 等）。请在能解析到这些包（npm 上以 `-rc` 发布）的环境中构建；本包将其声明为 `peerDependencies` / `devDependencies`。

## License

MIT
