/**
 * skill-filesystem-plus configuration — @sidleo3/skill-filesystem-plus
 *
 * Skill discovery layers and parent-directory vocabulary shared by the host
 * entry (GUI RPC + settings namespace), the per-preset provider row
 * (src/preset.ts), and the preset manager (src/wizard.ts).
 *
 * @module @sidleo3/skill-filesystem-plus/config
 */

import { dirname, join } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

/** One parent directory name under which "<base>/<name>/skills" is scanned. */
export interface ParentDir {
  /** Directory name (e.g. ".dsh"). */
  readonly name: string
}

/** User-facing skill discovery configuration. */
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
      return !(pd.name.includes('/') || pd.name.includes('\\'))
    })
  return {
    scanCwd: src.scanCwd !== false,
    scanProject,
    scanParents,
    scanGlobal: src.scanGlobal !== false,
    parentDirs,
  }
}

/** Current config-file name stored under the DSH home. */
export const CONFIG_FILE = 'dsh-skill-filesystem-plus.json'

/** Legacy config-file name from the pre-rename `@sidleo3/skill-scan` package. */
export const LEGACY_CONFIG_FILE = 'dsh-skill-scan.json'

/** Absolute path of the persisted config file, or undefined when no home is reachable. */
export function configFilePath(): string | undefined {
  try {
    const home = process.env.DSH_HOME?.trim() || process.env.HOME
    if (!home) return undefined
    return join(home, '.dsh', CONFIG_FILE)
  } catch {
    return undefined
  }
}

/**
 * Load persisted config from disk; falls back to `fallback` when absent or
 * invalid. Reads the current file first; if absent, falls back to the legacy
 * `dsh-skill-scan.json` (from the renamed `@sidleo3/skill-scan` package) and
 * migrates it to the new name so the user's existing scan layers and parent
 * dirs (e.g. `.pi`) survive the rename.
 */
export function loadConfig(fallback: SkillScanConfig = DEFAULT_CONFIG): SkillScanConfig {
  const file = configFilePath()
  if (file === undefined) return fallback
  try {
    const raw = readFileSync(file, 'utf8')
    return normalizeConfig(JSON.parse(raw))
  } catch {
    // Absent or invalid current file: try legacy name and migrate.
  }
  try {
    const home = process.env.DSH_HOME?.trim() || process.env.HOME
    if (!home) return fallback
    const legacy = join(home, '.dsh', LEGACY_CONFIG_FILE)
    const raw = readFileSync(legacy, 'utf8')
    const config = normalizeConfig(JSON.parse(raw))
    try {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(config, null, 2) + '\n', { encoding: 'utf8' })
    } catch {
      // migration write is best-effort
    }
    return config
  } catch {
    return fallback
  }
}

/** Persist config to disk; failures are intentionally non-fatal (in-memory still applies). */
export function persistConfig(config: SkillScanConfig): void {
  const file = configFilePath()
  if (file === undefined) return
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(config, null, 2) + '\n', { encoding: 'utf8' })
  } catch {
    // persistence is best-effort — the running process keeps the live config
  }
}