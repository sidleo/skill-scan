# skill-scan 项目规范

> DeepSeek Harness（DSH）可配置技能发现插件：替代内置 `dsh-skill-filesystem`，四层扫描 + 可编辑上级目录 + 优先级拖拽，全部在 Web GUI 插件卡片里配置。
>
> 本文件是本仓库的唯一指令来源，CLAUDE.md / CODEBUDDY.md 为指向它的软链接。本仓库位于用户项目根（`/Users/zhang3/yh_zhang3/`）AGENTS.md 作用域内；与此处冲突时，**本仓库 AGENTS.md 优先**。

## 项目是什么

- **包名**：`@sidleo3/skill-scan`（v0.1.0，尚未发布 npm）
- **仓库**：GitHub `sidleo/skill-scan`（分支 `main`）
- **作用**：以可配置方式发现 `<根>/<上级目录>/skills` 下的技能。四个层级开关（cwd 最高 / 项目或上级遍历（互斥）/ 全局最低） + 用户可编辑上级目录名列表（拖拽排序，靠前优先）。
- **为什么需要 replace**：DSH 同名技能按 *layer*（层）优先于 *rank* 解析。内置 `skill-filesystem` 若仍挂载在预设层，同名师技能它永远赢——要按 rank 覆盖必须 replace（见 `src/wizard.ts`）。

## 目录结构

| 路径 | 说明 |
|---|---|
| `src/index.ts` | **Host 入口**：`inject=['skills','webServer']`；注册 provider、webServer 路由、fs/observed 失效、配置持久化 |
| `src/client/index.ts` | **Client 入口**：`inject=['slots']`；Settings → Plugins → Plugin configuration 卡片（React + `--dsw-alias-*` tokens，chevon 同产品） |
| `src/wizard.ts` | replace/coexist 安装向导（host-only，尚未被卡片 UI 调用） |
| `tsdown.config.ts` | 双输出：Host ESM → `lib/index.js`；Client CJS（ModuleLoader 契约）→ `lib/client.js` |
| `cordis.patch.yml` | `- insert: {id: skill-scan, name:'@sidleo3/skill-scan'}` |
| `skill-scan-blueprint/` | 早期动态插件形态参考副本（不参与构建，非当前代码） |
| `package.json` | `dsh.bundle.patch` + `dsh.client` 声明；peer deps 指向 `@deepseek-ai/*` rc 版 |

## 常用命令（务必用 pnpm）

```bash
pnpm build        # tsdown → lib/index.js + lib/client.js（lib/ 不入库）
pnpm typecheck    # tsc --noEmit（当前有既有告警，见下方「已知事项」）
```

## 本地安装 / 生效流程（核心循环）

本机 profile `web` 通过 `link:` 指向本目录，**代码改动 → 重建 → 重启 DSH Web GUI** 生效：

1. 改 `src/` 下代码
2. `pnpm build`（lib 更新，link 自动反映）
3. **用户重启 DSH Web GUI 进程**（插件是 profile bundle，只有重启才重新合成加载）
4. 验证：Settings → Plugins → 插件配置 →「技能扫描」卡片；或检查技能目录是否出现（如 `scan-demo`）

接线命令（若 profile 丢了插件声明）：

```bash
dsh plugin --profile web add link:/Users/zhang3/yh_zhang3/Project/dsh插件/skill-scan
```

这会把 `@sidleo3/skill-scan` 写进 `~/.dsh/profiles/web/package.json` 的 `dependencies` + `dsh.profile.bundles`。**两个都要在**，否则插件不会合成加载。

## 架构要点（改代码前先读）

### Host（src/index.ts）

- `apply(ctx, config)`：`let cfg = loadConfig(normalizeConfig(config))` —— **磁盘配置优先**于传入 config。
- **配置持久化**：`~/.dsh/dsh-skill-scan.json`（`loadConfig` 读 / `persistConfig` 写，node:fs 直写，best-effort 不抛错）。POST 保存后立即落盘。
- webServer 路由（**路径必须唯一**，不能重复注册同一 path）：
  - `GET/POST /api/skill-scan/config`（POST：normalize → persist → invalidate）
  - `GET /api/skill-scan/roots`（当前 session cwd 的扫描根预览）
  - `GET /api/skill-scan/discover`（调试：根 + 实际发现列表）
- `fs` 是 `ctx.get('fs')` 可选服务；`dshHomePath` 是 ctx 提供的函数（`dshHomePath('x')` = `~/.dsh/x`）。
- `ctx.on('fs/observed', ...)` 只在 actor 为 write/edit 时 `control.invalidate()`。

### Client（src/client/index.ts）

- DSH client 契约：CJS bundle 经 `window.__ModuleLoader__.load({id, factory})` 注册（tsdown banner/intro/footer 处理），`require("react")` 走模块表，不用 import。
- 通过 `ctx.get('slots')` + `slots.inject('settings.plugin.item', ...)` 注册卡片；卡片数据来自 `fetch('/api/skill-scan/*')`（RPC，不走 slots props）。
- 卡片 `config === null` 时只渲染 header（无展开）——若配置项消失，先查 host 是否加载 / config fetch 是否失败。

### 类型

`ScanContext` 是最小接口（`get(): unknown`），`skills.registerProvider` 等调用点类型不全——**tsdown 构建不受影响**。改这些位置时保持现状即可，不要为类型告警做大规模改造。

## npm 发布

```bash
npm publish    # prepack 自动 pnpm build
npm view @sidleo3/skill-scan   # 验证
```

发布要求：
- npm 登录身份 `sidleo3`（scope 匹配用户名）
- ~/.npmrc 需配置 auth token（Granular Access Token，**Bypass 2FA 必须开启**）
- 包名 `@sidleo3/skill-scan`，在线安装：`dsh plugin --profile <p> add @sidleo3/skill-scan`