/**
 * skill-scan install wizard — @sidleo/skill-scan
 *
 * First-run choice: REPLACE `dsh-skill-filesystem` or COEXIST.
 *
 *  - replace: `ctx.agentPresets.copy(current, 'skill-scan')`, then edit the
 *    copy's `agent.cordis.yml` so the `skill-filesystem` row is `disabled: true`.
 *    The original preset is untouched and the copy is removable.
 *  - coexist: nothing changes.
 *
 * These run only in the formal host, which holds full `ctx` (`ctx.agentPresets`,
 * `node:fs`, `yaml`). The dynamic-plugin sandbox withholds `agentPresets`, so
 * the wizard is host-only.
 *
 * @module @sidleo/skill-scan/wizard
 */

import { readFile, writeFile } from 'node:fs/promises'
import { parseDocument } from 'yaml'
import type { Context } from 'cortex/cordis'

interface WizardStatus {
  available: boolean
  current?: string
  hasFilesystem?: boolean
  copied?: boolean
  mode?: 'replace' | 'coexist'
}

/** Query first-run state for the replacing preset. */
export async function wizardStatus(ctx: Context): Promise<WizardStatus> {
  const ap = ctx.get('agentPresets')
  if (ap === undefined) return { available: false }
  const current = await ap.resolve().catch(() => undefined)
  let hasFilesystem = false
  try {
    const text = await ap.read(current.id)
    hasFilesystem = /skill-filesystem|dsh-skill-filesystem/.test(text)
  } catch { /* keep false */ }
  const copy = await ap.resolve('skill-scan').catch(() => undefined)
  return {
    available: true,
    current: current?.id,
    hasFilesystem,
    copied: copy !== undefined,
    mode: copy !== undefined ? 'replace' : 'coexist',
  }
}

/** Generate the replacing preset (copy + disable skill-filesystem inside). */
export async function wizardReplace(ctx: Context): Promise<{ ok: boolean; presetId?: string; message?: string; error?: string }> {
  const ap = ctx.get('agentPresets')
  if (ap === undefined) return { ok: false, error: 'agentPresets 服务不可用' }
  const current = await ap.resolve()
  const text = await ap.read(current.id)
  if (!/skill-filesystem|dsh-skill-filesystem/.test(text)) {
    return { ok: false, error: `当前预设 ${current.id} 不含 skill-filesystem，无需替换` }
  }
  const copiedId = 'skill-scan'
  try { await ap.copy(current.id, copiedId) } catch { /* id occupied → reuse */ }
  const copy = await ap.resolve(copiedId)
  const copyText = await readFile(copy.path, 'utf8')
  const doc = parseDocument(copyText)
  const seq = doc.get('entries', true)
  if (seq !== undefined && Array.isArray(seq)) {
    for (const row of seq) {
      if (row && typeof row === 'object' && 'id' in row && (row as { id?: unknown }).id === 'skill-filesystem') {
        ;(row as Record<string, unknown>).disabled = true
      }
    }
  }
  await writeFile(copy.path, doc.toString(), 'utf8')
  return {
    ok: true,
    presetId: copiedId,
    message: `已生成替换预设 "${copiedId}"（skill-filesystem 已禁用）。新建会话时选择该预设即生效，原始预设 ${current.id} 保持不动。`,
  }
}

/** Remove the replacing preset, back to coexist / original. */
export async function wizardRestore(ctx: Context): Promise<{ ok: boolean; message?: string; error?: string }> {
  const ap = ctx.get('agentPresets')
  if (ap === undefined) return { ok: false, error: 'agentPresets 服务不可用' }
  await ap.remove('skill-scan').catch(() => {})
  return { ok: true, message: '已删除替换预设 skill-scan，恢复为原始预设/共存模式。' }
}
