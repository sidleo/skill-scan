# skill-filesystem-plus 项目规范

> DeepSeek Harness（DSH）可配置技能发现插件（原 skill-scan）：替代内置 `dsh-skill-filesystem`，四层扫描 + 可编辑上级目录 + 优先级拖拽，全部在 Web GUI 插件卡片里配置。
>
> 本文件是本仓库的唯一指令来源，CLAUDE.md / CODEBUDDY.md 为指向它的软链接。本仓库位于用户项目根（`/Users/zhang3/yh_zhang3/`）AGENTS.md 作用域内；与此处冲突时，**本仓库 AGENTS.md 优先**。

## 项目是什么

- **包名**：`@sidleo3/skill-filesystem-plus`（v0.2.0，尚未发布 npm）
- **仓库**：GitHub `sidleo/skill-filesystem-plus`（分支 `main`）
- **作用**：按 preset 选择性接管 DSH 技能发现。四个层级开关（cwd 最高 / 项目或上级遍历（互斥）/ 全局最低） + 用户可编辑上级目录名列表（拖拽排序，靠前优先），**只在用户勾选的 preset 中生效**（参考 `agent-instructions-plus` 架构）。
- **为什么需要 replace**：DSH 同名技能按 *layer*（层）优先于 *rank* 解析。内置 `skill-filesystem` 若仍挂载在预设层，同名师技能它永远赢——要按 rank 覆盖必须把该 preset 的 `skill-filesystem` 行禁用、改由本插件 `/preset` 行提供（见 `src/wizard.ts`）。

## 目录结构

| 路径 | 说明 |
|---|---|
| `src/index.ts` | **Host 入口**：`inject=['webServer']`；注册 `skill-filesystem-plus` settings namespace（保证卡片跨升级可见）、webServer RPC（config/presets/roots/discover）、preset 接管管理；**不注册全局 provider** |
| `src/preset.ts` | **预设层行**（`@sidleo3/skill-filesystem-plus/preset`）：`inject=['skills']`；在该预设层注册 skill-filesystem-plus provider（`skills.registerProvider` scope-aware），每次 `list` 经 `ctx.fs` 重读磁盘配置 |
| `src/provider.ts` | 共享 provider 构造：`makeSkillProvider` / `computeRoots` / `listRoot` / `decodeSkill`（host 预览与 preset 行共用） |
| `src/config.ts` | 配置类型 + `normalizeConfig` + `loadConfig`/`persistConfig`（`~/.dsh/dsh-skill-filesystem-plus.json`） |
| `src/client/index.ts` | **Client 入口**：`inject=['slots']`；Settings → Plugins → Plugin configuration 卡片：preset 多选接管 + 四层开关 + 上级目录编辑 + 根预览 |
| `src/wizard.ts` | preset 接管管理：`applyPreset`/`removePreset`/`listPresets`/`readTakeoverState`（备份到 `.skill-filesystem-plus-backup/`，host-only） |
| `tsdown.config.ts` | 三输出：Host ESM → `lib/index.js`；Preset ESM → `lib/preset.js`；Client CJS（ModuleLoader 契约）→ `lib/client.js` |
| `cordis.patch.yml` | `- insert: {id: skill-filesystem-plus, name:'@sidleo3/skill-filesystem-plus'}` |
| `skill-scan-blueprint/` | 早期动态插件形态参考副本（不参与构建，非当前代码） |
| `package.json` | `dsh.bundle.patch` + `dsh.client` 声明；peer deps 指向 `@deepseek-ai/*` rc 版 |

## 常用命令（务必用 pnpm）

```bash
pnpm build        # tsdown → lib/index.js + lib/preset.js + lib/client.js（lib/ 不入库）
pnpm typecheck    # tsc --noEmit
```

## 本地安装 / 生效流程（核心循环）

本机 profile `web` 通过 `link:` 指向本目录，**代码改动 → 重建 → 重启 DSH Web GUI** 生效：

1. 改 `src/` 下代码
2. `pnpm build`（lib 更新，link 自动反映）
3. **用户重启 DSH Web GUI 进程**（插件是 profile bundle，只有重启才重新合成加载）
4. 验证：Settings → Plugins → 插件配置 →「技能扫描」卡片；或检查技能目录是否出现（如 `scan-demo`）

接线命令（若 profile 丢了插件声明）：

```bash
dsh plugin --profile web add link:/Users/zhang3/yh_zhang3/Project/dsh插件/skill-filesystem-plus
```

这会把 `@sidleo3/skill-filesystem-plus` 写进 `~/.dsh/profiles/web/package.json` 的 `dependencies` + `dsh.profile.bundles`。**两个都要在**，否则插件不会合成加载。

## 架构要点（改代码前先读）

### Host（src/index.ts）

- `apply(ctx, config)`：`let cfg = loadConfig(normalizeConfig(config))` —— **磁盘配置优先**于传入 config。
- **settings namespace**：`ctx.inject(['settings'], ...)` 注册 `skill-filesystem-plus` namespace（`z.object` 描述四层开关 + parentDirs）。新版 Settings「可配置插件」页只渲染 **Host 提供 namespace** 的卡片——不注册则 DSH 升级后卡片消失。
- **配置持久化**：`~/.dsh/dsh-skill-filesystem-plus.json`（`loadConfig` 读 / `persistConfig` 写，node:fs 直写，best-effort 不抛错）。POST 保存后立即落盘。
- webServer 路由（**路径必须唯一**，不能重复注册同一 path）：
  - `GET/POST /api/skill-filesystem-plus/config`（POST：normalize → persist）
  - `GET /api/skill-filesystem-plus/roots`（当前 session cwd 的扫描根预览）
  - `GET /api/skill-filesystem-plus/discover`（调试：根 + 实际发现列表）
  - `GET /api/skill-filesystem-plus/presets`（roster + 接管状态）
  - `POST /api/skill-filesystem-plus/presets/apply` / `POST /api/skill-filesystem-plus/presets/remove`
- **不注册全局 provider**：provider 只在被接管的预设层注册（`src/preset.ts`）。
- `fs` 是 `ctx.get('fs')` 可选服务；`dshHomePath` 是 ctx 提供的函数。

### Preset 行（src/preset.ts）

- 被 wizard 插入到用户勾选的预设配置里（紧跟在被禁用的 `skill-filesystem` 行后）。
- `inject=['skills']`；`skills.registerProvider` 注册到**该预设层**（scope-aware）。
- 每次 `list` 前经 `ctx.fs` 重读 `~/.dsh/dsh-skill-filesystem-plus.json`（preset 行环境限制 node:fs 同步读），GUI 保存后下一次目录刷新即生效。
- `ctx.on('fs/observed', ...)` 只在 actor 为 write/edit 时 `control.invalidate()`。

### Client（src/client/index.ts）

- DSH client 契约：CJS bundle 经 `window.__ModuleLoader__.load({id, factory})` 注册（tsdown banner/intro/footer 处理），`require("react")` 走模块表，不用 import。
- 通过 `ctx.get('slots')` + `slots.inject('settings.plugin.item', ...)` 注册卡片；卡片数据来自 `fetch('/api/skill-filesystem-plus/*')`（RPC，不走 slots props）。
- 卡片 `config === null` 时只渲染 header（无展开）——若配置项消失，先查 host 是否加载 / config fetch 是否失败。

### 类型

`ScanContext` 是最小接口（`get(): unknown`）。`session/event` 与 `fs/observed` 事件键由 dsh-session / dsh-fs augment，本包类型层不依赖它们，监听处用 `as unknown as { on(...) }` cast。client 首行 `// @ts-nocheck`（DSH client 工厂是纯 JS）。

### 踩坑记录（改 provider 前必读）

- **`locator` 必须携带技能文件路径，不能只存 skills 根**：`list` 返回的每个 candidate 的 `locator` 要存 `{ root, path }`（`path` 是技能文件绝对路径，目录型为 `<root>/<name>/SKILL.md`，扁平型为 `<root>/<name>.md`）。`get` 用 `loc.path` 加载正文。若只存 `root`，`get` 会读 `root/SKILL.md`（不存在）返回 undefined → 用户 `/skill-name` 显式调用时 `skills.get` 拿不到定义，不注入 `skill-invocation`（表现：assistant 说"I don't see it in the available skills list"）。`resourceBase` 目录型指向技能目录（`dirname(path)`），扁平型指向 skills 根。
- **`disable-model-invocation: true` 的技能不出现在模型目录**：tool-skill 的 catalog 注入 `filter(isModelInvocable)`，此类技能只通过用户 `/name` 命令调用（走 `skill-invocation` 注入）。skill.list（`/` 命令面板）仍会列出（filter userInvocable）。这是设计，不是 bug。
- **`resolveDshHome` 与 `resolveUserHome` 语义不同**：读配置（`~/.dsh/dsh-skill-filesystem-plus.json`）用 `resolveDshHome`（`dshHomePath()` 本身）；global 扫描层 base（`~/<parentDir>/skills`）用 `resolveUserHome`（`dirname(dshHomePath())`）。混用会导致读不到配置（fallback 默认 parentDirs 无 .pi）或 global 根错误。

## npm 发布

```bash
npm publish    # prepack 自动 pnpm build
npm view @sidleo3/skill-filesystem-plus   # 验证
```

发布要求：
- npm 登录身份 `sidleo3`（scope 匹配用户名）
- ~/.npmrc 需配置 auth token（Granular Access Token，**Bypass 2FA 必须开启**）
- 包名 `@sidleo3/skill-filesystem-plus`，在线安装：`dsh plugin --profile <p> add @sidleo3/skill-filesystem-plus`