# skill-scan

为 [DeepSeek Harness](https://github.com/DeepSeekAI/deepseek-harness)（DSH）提供的**可配置技能发现提供方**，用于替代固定策略的 `dsh-skill-filesystem`。

`skill-scan` 不写死扫描根，而是让你**开关四个扫描层级**，并自由编辑「skills 的上级目录名」（在这些目录的 `<根>/<名称>/skills` 下扫描技能），每层可设优先级。首次打开时提供安装向导：**替换**（停用内置提供方）或**共存**。

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
dsh plugin --profile <profile> add @sidleo/skill-scan
```

`dsh plugin` 会把参数转发给 profile 目录里的 `pnpm`，并自动激活声明了 `dsh.bundle` 的包。装完刷新 Web GUI 即可。

### 从本地 checkout 以 link 方式安装

```bash
git clone https://github.com/sidleo/skill-scan.git
dsh plugin --profile <profile> add link:<仓库路径>
```

> 以 git 仓库方式安装（`pnpm add github:user/repo`）时，需在 profile 的 `pnpm-workspace.yaml` 里的 `allowBuilds` 中加入对应的包（pnpm 10+）。

## 首装向导：替换 vs 共存

首次打开插件卡片时二选一：

- **替换** — 把当前预设复制为名为 `skill-scan` 的用户预设，并在副本里把 `skill-filesystem` 那一行设为 `disabled: true`。原预设不动；新建会话选择 `skill-scan` 预设即可，同名技能按你配置的优先级裁决。完全可逆（「恢复」会删掉该副本）。
- **共存** — 不动预设；`skill-scan` 只追加额外的扫描根。

> **为什么推荐替换**：DSH 对同名技能先按**层**再按 **rank** 裁决。只要内置 `skill-filesystem` 仍挂在预设层，同名的就会被它赢走，与你配置的 rank 无关——所以要让「重名按优先级」真正生效，必须**替换**。

## 配置

所有设置都在插件卡片里（**设置 → 插件 → 插件配置 → 技能扫描**）：

- 四个层级开关。
- 上级目录列表：拖动排序优先级、逐行删除。
- 当前会话 cwd 的扫描根实时预览。
- 调试面板：列出实际发现到的技能。
- 保存即写回并刷新技能目录。

## 开源说明

本仓库是**正式包形态**，代码先在 DSH 动态插件（`skf-1`）中实测通过后迁入。`src/` 是正式包源码；`skill-scan-blueprint/` 保留最初的动态插件形态，作参考（host / client / wizard）。

自行发布：

```bash
pnpm install
pnpm build      # tsdown → lib/index.js + lib/client.js
npm publish
```

> 宿主端依赖 DSH 私有包（`@deepseek-ai/dsh-skill`、`@deepseek-ai/dsh-agent-presets` 等）。请在能解析到这些包（npm 上以 `-rc` 发布）的环境中构建；本包将其声明为 `peerDependencies` / `devDependencies`。

## License

MIT
