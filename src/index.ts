/**
 * skill-scan Host entry — @sidleo/skill-scan
 *
 * A configurable skill discovery provider for DeepSeek Harness. Replaces the
 * fixed discovery of `dsh-skill-filesystem` with four toggleable layers and a
 * user-editable set of "parent dir" names under which `<root>/<name>/skills`
 * is scanned. Provides a browser-facing JSON RPC surface (config get/set,
 * root preview, discovery debug).
 *
 * @module @sidleo/skill-scan
 */

import { dirname, join } from 'node:path'
import { parseDocument } from 'yaml'
import type { SkillProvider, SkillProviderControl } from '@deepseek-ai/dsh-skill'

/** Minimal host-context shape this plugin reads (fs, skills, dshHomePath, on). */
export interface ScanContext {
  get(name: string): unknown
  on(name: string, listener: (...args: unknown[]) => void): void
}

export interface ParentDir {
  /** Directory name (e.g. ".dsh") under which "<base>/<name>/skills" is scanned. */
  readonly name: string
}

export interface SkillScanConfig {
  /** Scan the session working directory (highest priority). */
  readonly scanCwd: boolean
  /** Scan the nearest `.git`-bearing ancestor (medium, exclusive with scanParents). */
  readonly scanProject: boolean
  /** Walk every ancestor from cwd upward (medium, exclusive with scanProject). */
  readonly scanParents: boolean
  /** Scan the user home (lowest priority). */
  readonly scanGlobal: boolean
  /** Parent dirs; skills live at "<base>/<name>/skills". Index = priority (0 first). */
  readonly parentDirs: readonly ParentDir[]
}

export const DEFAULT_CONFIG: SkillScanConfig = {
  scanCwd: true,
  scanProject: true,
  scanParents: false,
  scanGlobal: true,
  parentDirs: [{ name: '.dsh' }, { name: '.agents' }],
}

/** Normalize + validate a config patch; throws on mutual-exclusivity violation. */
export function normalizeConfig(input: unknown): SkillScanConfig {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const scanProject = src.scanProject === true
  const scanParents = src.scanParents === true
  if (scanProject && scanParents) throw new Error('scanProject 与 scanParents 互斥，只能开启一项')
  const rawDirs = Array.isArray(src.parentDirs) ? src.parentDirs : DEFAULT_CONFIG.parentDirs
  const parentDirs = rawDirs
    .map((pd): ParentDir | null => {
      if (typeof pd === 'string' && pd.trim().length > 0) return { name: pd.trim() }
      const rec = pd as { name?: unknown }
      if (rec && typeof rec.name === 'string' && rec.name.trim().length > 0) return { name: rec.name.trim() }
      return null
    })
    .filter((pd): pd is ParentDir => {
      if (pd === null) return false
      return !(pd.name.includes('/') || pd.name.includes('\\') || pd.name === '.' || pd.name === '..')
    })
  return {
    scanCwd: src.scanCwd !== false,
    scanProject,
    scanParents,
    scanGlobal: src.scanGlobal !== false,
    parentDirs,
  }
}

export const name = 'skill-scan'
export const inject = ['skills']

interface SkillRoot { root: string; rank: number; source: string }
interface ParsedSkill { name: string; description: string; whenToUse?: string; modelInvocable: boolean; userInvocable: boolean; content: string }

export function apply(ctx: ScanContext, config: SkillScanConfig = DEFAULT_CONFIG): void {
  const skills = ctx.get('skills')
  const fs = ctx.get('fs')
  if (skills === undefined) return

  let cfg = normalizeConfig(config)
  let control: SkillProviderControl | undefined
  let lastCwd: string | undefined

  async function pathExists(full: string): Promise<boolean> {
    if (fs === undefined) return false
    try { return (await fs.stat(await fs.resolve(full))) !== undefined } catch { return false }
  }
  async function projectRootOf(cwd: string): Promise<string> {
    let current = cwd
    for (let i = 0; i < 32; i++) {
      if (await pathExists(join(current, '.git'))) return current
      const parent = dirname(current)
      if (parent === current) return cwd
      current = parent
    }
    return cwd
  }
  async function resolveHome(): Promise<string | undefined> {
    try {
      const hp = ctx.get('dshHomePath')
      if (typeof hp === 'function') return dirname(String(hp()))
    } catch { return undefined }
    return undefined
  }

  async function computeRoots(cwd: string | undefined): Promise<SkillRoot[]> {
    const roots: SkillRoot[] = []
    const seen = new Set<string>()
    const pushRoot = (base: string, rankBase: number, source: string): void => {
      if (!base) return
      for (let pi = 0; pi < cfg.parentDirs.length; pi++) {
        const name = cfg.parentDirs[pi].name
        if (name.includes('/') || name.includes('\\') || name === '.' || name === '..') continue
        const root = join(base, name, 'skills')
        if (seen.has(root)) continue
        seen.add(root)
        roots.push({ root, rank: rankBase + pi, source })
      }
    }
    if (cfg.scanCwd && cwd) pushRoot(cwd, 100, 'cwd')
    if (cwd) {
      if (cfg.scanProject) {
        pushRoot(await projectRootOf(cwd), 300, 'project')
      } else if (cfg.scanParents) {
        let base = dirname(cwd)
        for (let depth = 0; base && base.length > 1 && depth < 24; depth++) {
          pushRoot(base, 300 + depth * 10, 'parents')
          const parent = dirname(base)
          if (parent === base) break
          base = parent
        }
      }
    }
    if (cfg.scanGlobal) {
      const home = await resolveHome()
      if (home) pushRoot(home, 500, 'global')
    }
    roots.sort((a, b) => a.rank - b.rank)
    return roots
  }

  function frontmatterBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      switch (value.toLowerCase()) {
        case 'true': case 'yes': case 'on': case '1': return true
        case 'false': case 'no': case 'off': case '0': return false
      }
    }
    return undefined
  }
  async function decodeSkill(path: string | undefined): Promise<ParsedSkill | undefined> {
    if (fs === undefined || path === undefined) return undefined
    let raw: string
    try { raw = await fs.readText(await fs.resolve(path)) } catch { return undefined }
    let doc: ReturnType<typeof parseDocument>
    try { doc = parseDocument(raw) } catch { return undefined }
    const data = (() => { try { return (doc.toJSON() ?? {}) as Record<string, unknown> } catch { return {} as Record<string, unknown> } })()
    const n = data.name
    const desc = data.description
    const whenToUse = data.whenToUse
    if (typeof n !== 'string' || typeof desc !== 'string' || n.length === 0 || desc.length === 0) return undefined
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n)) return undefined
    const body = raw.split('---', 3).slice(2).join('---').replace(/^\n+/, '')
    return {
      name: n,
      description: desc,
      ...(typeof whenToUse === 'string' && whenToUse.length > 0 ? { whenToUse } : {}),
      modelInvocable: frontmatterBoolean(data['disable-model-invocation']) !== true,
      userInvocable: frontmatterBoolean(data['user-invocable']) !== false,
      content: body,
    }
  }
  async function listRoot(rootPath: string): Promise<ParsedSkill[]> {
    const out: ParsedSkill[] = []
    if (fs === undefined) return out
    let target
    try { target = await fs.resolve(rootPath) } catch { return out }
    if ((await fs.stat(target)) === undefined) return out
    let entries
    try { entries = await fs.listDir(target) } catch { return out }
    for (const entry of entries) {
      if (entry.type === 'directory') {
        const s = await decodeSkill(join(entry.target.displayPath, 'SKILL.md'))
        if (s) out.push(s)
      } else if (entry.type === 'file' && entry.name.endsWith('.md')) {
        const s = await decodeSkill(entry.target.displayPath)
        if (s) out.push(s)
      }
    }
    return out
  }

  const providerName = 'skill-scan'
  const provider: SkillProvider = {
    name: providerName,
    async list(options) {
      const cwd = typeof options.cwd === 'string' && options.cwd.length > 0 ? options.cwd : undefined
      if (cwd) lastCwd = cwd
      if (options.signal?.aborted) return []
      const roots = await computeRoots(cwd)
      const candidates = []
      for (const r of roots) {
        if (options.signal?.aborted) return candidates
        for (const skill of await listRoot(r.root)) {
          candidates.push({
            name: skill.name,
            description: skill.description,
            ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
            invocation: { modelInvocable: skill.modelInvocable, userInvocable: skill.userInvocable },
            provider: providerName,
            source: r.source,
            rank: r.rank,
            locator: { root: r.root },
            resourceBase: { kind: 'directory', path: r.root },
            path: r.root,
          })
        }
      }
      return candidates
    },
    async get(candidate) {
      const loc = candidate.locator as { root?: string }
      if (!loc || !loc.root) return undefined
      const skill = await decodeSkill(join(loc.root, 'SKILL.md'))
      if (!skill) return undefined
      return {
        name: skill.name,
        description: skill.description,
        ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
        invocation: { modelInvocable: skill.modelInvocable, userInvocable: skill.userInvocable },
        source: candidate.source,
        provider: providerName,
        resourceBase: { kind: 'directory', path: loc.root },
        path: loc.root,
        content: skill.content,
      }
    },
  }

  const unregister = skills.registerProvider((c) => { control = c; return provider })

  ctx.on('fs/observed', (_target, _obs, actor) => {
    const actorName = actor && typeof actor === 'object' && 'name' in actor ? (actor as { name?: unknown }).name as string | undefined : undefined
    if (actorName !== 'write' && actorName !== 'edit') return
    control?.invalidate()
  })

  const rpc = ctx.get('harness') as { handle?: (m: string, h: (a: unknown) => unknown) => unknown } | undefined
  if (rpc?.handle) {
    rpc.handle('skill-scan/get-config', () => JSON.parse(JSON.stringify(cfg)))
    rpc.handle('skill-scan/set-config', (args) => { cfg = normalizeConfig(args); control?.invalidate(); return JSON.parse(JSON.stringify(cfg)) })
    rpc.handle('skill-scan/roots', async () => { const roots = await computeRoots(lastCwd); return { cwd: lastCwd, roots } })
    rpc.handle('skill-scan/discover', async () => {
      const roots = await computeRoots(lastCwd)
      const all = []
      for (const r of roots) for (const s of await listRoot(r.root)) all.push({ name: s.name, source: r.source, rank: r.rank })
      return { cwd: lastCwd, roots, skills: all }
    })
  }

  void unregister
}
