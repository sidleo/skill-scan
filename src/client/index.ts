/**
 * skill-scan Client — @sidleo3/skill-scan
 *
 * DSH client-plugin contract: the bundle is a CommonJS factory registered via
 * `window.__ModuleLoader__.load({ id, factory })`, exporting `apply`/`inject`.
 * `React` resolves through the loader module table via `require("react")`, and
 * services are consumed through `ctx.get`. RPC to the host goes over
 * `fetch('/api/skill-scan/*')`.
 *
 * This half drives the Settings → Plugins → Plugin configuration card.
 *
 * @module @sidleo3/skill-scan/client
 */

import React from 'react'

export const inject = ['slots']

export function apply(ctx) {
  const slots = ctx.get('slots')
  if (slots === undefined) return
  const h = React.createElement

  // Minimal local injectable stylesheet (no CSS-module pipeline dependency).
  const CSS = `
    .skillScanCard { list-style:none; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-alias-bg-layer-3); transition:border-color .16s,background .16s; margin:0 }
    .skillScanCard:hover { border-color:var(--dsw-alias-label-dimmed) }
    .skillScanCardOpen { background:var(--dsw-alias-bg-layer-2); border-color:var(--dsw-alias-label-dimmed) }
    .skillScanHeader { width:100%; appearance:none; border:0; background:none; font:inherit; color:inherit; text-align:left; cursor:pointer; display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:12px }
    .skillScanHeader:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:-2px }
    .skillScanHeadText { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px }
    .skillScanName { font-size:15px; font-weight:600; line-height:1.4; color:var(--dsw-alias-label-primary) }
    .skillScanDesc { font-size:13px; line-height:1.5; color:var(--dsw-alias-label-tertiary) }
    .skillScanChevron { flex:none; color:var(--dsw-alias-label-tertiary); transition:transform .16s; display:inline-flex }
    .skillScanChevronOpen { transform:rotate(180deg) }
    .skillScanBody { border-top:1px solid var(--dsw-alias-border-l2); margin:0 16px; padding-top:10px; padding-bottom:8px }
    .skillScanFooter { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding:12px 0 4px; border-top:1px solid var(--dsw-alias-border-l2) }
    .skillScanSave { appearance:none; border:1px solid transparent; border-radius:8px; padding:5px 14px; font:inherit; font-size:13px; line-height:1.5; cursor:pointer; background:var(--dsw-alias-label-primary); color:var(--dsw-alias-bg-layer-3) }
    .skillScanSave:disabled { opacity:.4; cursor:default }
    .skillScanSectionTitle { font-size:13px; font-weight:600; line-height:1.4; color:var(--dsw-alias-label-primary); margin:0 0 8px }
    .skillScanToggleRow { display:flex; align-items:flex-start; gap:8px; padding:7px 0; border-bottom:1px solid var(--dsw-alias-border-l2) }
    .skillScanToggleBody { flex:1 }
    .skillScanToggleLabel { font-size:13px; font-weight:500; line-height:1.5; color:var(--dsw-alias-label-primary) }
    .skillScanHint { font-size:12px; line-height:1.5; color:var(--dsw-alias-label-tertiary); margin-top:2px }
    .skillScanWarn { font-size:12px; color:var(--dsw-alias-label-error); margin-top:6px }
    .skillScanCheckbox { margin-top:3px; accent-color:var(--dsw-alias-brand-primary) }
    .skillScanPdRow { display:flex; align-items:center; gap:8px; margin:6px 0; padding:6px 8px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-layer-2); cursor:grab }
    .skillScanDragHandle { color:var(--dsw-alias-label-tertiary); font-size:14px; cursor:grab; user-select:none; flex:none }
    .skillScanRankOrder { color:var(--dsw-alias-label-tertiary); font-size:11px; flex:none; min-width:22px; text-align:right }
    .skillScanNameInput { flex:1; min-width:0; padding:5px 8px; border-radius:8px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-3); color:var(--dsw-alias-label-primary); font:inherit; font-size:13px }
    .skillScanMiniBtn { appearance:none; border:0; background:none; cursor:pointer; color:var(--dsw-alias-label-tertiary); font-size:13px; padding:2px 4px; flex:none }
    .skillScanMiniBtn:hover { color:var(--dsw-alias-label-primary) }
    .skillScanAddBtn { margin-top:6px; appearance:none; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; padding:5px 12px; background:none; color:var(--dsw-alias-label-secondary); font:inherit; font-size:12.5px; cursor:pointer }
    .skillScanAddBtn:hover { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-label-dimmed) }
    .skillScanPreviewBox { background:var(--dsw-alias-bg-layer-2); border-radius:8px; padding:8px; margin-bottom:6px; max-height:180px; overflow-y:auto }
    .skillScanPreviewRow { display:flex; align-items:center; gap:8px; padding:3px 0; font-size:12.5px }
    .skillScanRankBadge { background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-secondary); border-radius:4px; padding:1px 6px; font-size:11px; white-space:nowrap; flex:none }
    .skillScanSrcBadge { background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-tertiary); border-radius:4px; padding:1px 6px; font-size:11px; white-space:nowrap; flex:none }
    .skillScanCode { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; word-break:break-all }
    .skillScanOk { font-size:12.5px; color:var(--dsw-alias-label-primary) }
    .skillScanError { font-size:12.5px; color:var(--dsw-alias-label-error); margin-top:8px }
    .skillScanSection { margin-bottom:14px }
  `
  // Inject the stylesheet once per page (idempotent).
  if (typeof document !== 'undefined' && document.getElementById('skill-scan-css') === null) {
    const tag = document.createElement('style')
    tag.id = 'skill-scan-css'
    tag.dataset.plugin = '@sidleo3/skill-scan'
    tag.textContent = CSS
    document.head.appendChild(tag)
  }

  // Product-identical IconChevronDownOutline14 SVG path.
  const CHV = 'M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z'
  function Chevron(className) {
    return h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', className },
      h('path', { d: CHV, fill: 'currentColor' }))
  }

  function SkillScanCard() {
    const [open, setOpen] = React.useState(false)
    const [config, setConfig] = React.useState(null)
    const [preview, setPreview] = React.useState(null)
    const [error, setError] = React.useState('')
    const [saved, setSaved] = React.useState(false)

    React.useEffect(function () {
      let alive = true
      fetch('/api/skill-scan/config').then(function (r) { return r.json() })
        .then(function (cfg) { if (alive) setConfig(cfg) }).catch(function () {})
      fetch('/api/skill-scan/roots').then(function (r) { return r.json() })
        .then(function (res) { if (alive) setPreview(res) }).catch(function () {})
      return function () { alive = false }
    }, [])

    function save(next) {
      setError('')
      setConfig(next)
      setSaved(false)
      fetch('/api/skill-scan/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      }).then(function (r) { return r.json() })
        .then(function (result) {
          if (result && result.ok) {
            setConfig(result.config)
            setSaved(true)
            // Refresh the scan-root preview after config applied.
            return fetch('/api/skill-scan/roots').then(function (r) { return r.json() })
          }
          throw new Error((result && result.error) || 'save failed')
        })
        .then(function (res) { if (res) setPreview(res) })
        .catch(function (err) { setError(String(err && err.message ? err.message : err)) })
    }

    if (config === null) {
      return h('li', { className: 'skillScanCard' },
        h('div', { className: 'skillScanHeader' },
          h('span', { className: 'skillScanHeadText' },
            h('span', { className: 'skillScanName' }, '技能扫描'),
            h('span', { className: 'skillScanDesc' }, '可配置技能发现：cwd/项目/上级遍历/全局 + 自定义上级目录，替代 dsh-skill-filesystem')),
          Chevron('skillScanChevron')))
    }

    function ToggleRow(label, hint, checked, onToggle) {
      return h('div', { className: 'skillScanToggleRow', key: label },
        h('input', { type: 'checkbox', className: 'skillScanCheckbox', checked: checked, onChange: function (e) { onToggle(e.target.checked) } }),
        h('div', { className: 'skillScanToggleBody' },
          h('div', { className: 'skillScanToggleLabel' }, label),
          h('div', { className: 'skillScanHint' }, hint)))
    }
    function updateName(index, name) {
      const next = config.parentDirs.map(function (pd, i) { return i === index ? { name: name } : pd })
      save(Object.assign({}, config, { parentDirs: next }))
    }
    function removeDir(index) {
      const next = config.parentDirs.filter(function (_, i) { return i !== index })
      save(Object.assign({}, config, { parentDirs: next }))
    }
    function addDir() {
      setError('')
      setSaved(false)
      setConfig(Object.assign({}, config, { parentDirs: config.parentDirs.concat([{ name: '' }]) }))
    }
    function setToggle(key, value) {
      if (key === 'scanProject' && value && config.scanParents) return save(Object.assign({}, config, { scanProject: true, scanParents: false }))
      if (key === 'scanParents' && value && config.scanProject) return save(Object.assign({}, config, { scanParents: true, scanProject: false }))
      save(Object.assign({}, config, { [key]: value }))
    }

    const levelCount = [config.scanCwd, config.scanProject || config.scanParents, config.scanGlobal].filter(Boolean).length
    const mutualHint = config.scanProject && config.scanParents
      ? h('div', { className: 'skillScanWarn' }, '⚠ 扫描项目目录与遍历上级目录互斥，只能开一项')
      : null
    const rows = [
      ToggleRow('扫描 cwd 目录（会话工作目录）', '最高优先级 · <cwd>/<上级目录>/skills', config.scanCwd, function (v) { setToggle('scanCwd', v) }),
      ToggleRow('扫描项目目录', '中等优先级 · 最近含 .git 的祖先目录（项目根）', config.scanProject, function (v) { setToggle('scanProject', v) }),
      ToggleRow('遍历所有上级目录', '中等优先级 · 从工作目录向上逐级扫描', config.scanParents, function (v) { setToggle('scanParents', v) }),
      mutualHint,
      ToggleRow('扫描全局目录', '最低优先级 · 主目录 ~ 下', config.scanGlobal, function (v) { setToggle('scanGlobal', v) }),
    ]
    const parentRows = (config.parentDirs || []).map(function (pd, i) {
      return h('div', { key: i, className: 'skillScanPdRow' },
        h('span', { className: 'skillScanDragHandle' }, '⋮⋮'),
        h('input', { className: 'skillScanNameInput', value: pd.name, placeholder: '如 .claude', onChange: function (e) { updateName(i, e.target.value) } }),
        h('span', { className: 'skillScanRankOrder' }, '#' + (i + 1)),
        h('button', { type: 'button', className: 'skillScanMiniBtn', title: '删除', onClick: function () { removeDir(i) } }, '✕'))
    })
    const previewRows = preview && preview.roots && preview.roots.length > 0
      ? preview.roots.map(function (r, i) {
          return h('div', { key: i, className: 'skillScanPreviewRow' },
            h('span', { className: 'skillScanRankBadge' }, 'rank ' + r.rank),
            h('span', { className: 'skillScanSrcBadge' }, r.source),
            h('span', { className: 'skillScanCode', style: { flex: 1 } }, r.root))
        })
      : h('div', { className: 'skillScanHint' }, '暂无根目录')

    return h('li', { className: 'skillScanCard' + (open ? ' skillScanCardOpen' : '') },
      h('button', { type: 'button', className: 'skillScanHeader', 'aria-expanded': open ? 'true' : 'false', onClick: function () { setOpen(!open) } },
        h('span', { className: 'skillScanHeadText' },
          h('span', { className: 'skillScanName' }, '技能扫描'),
          h('span', { className: 'skillScanDesc' }, '可配置技能发现：cwd/项目/上级遍历/全局 + 自定义上级目录，替代 dsh-skill-filesystem')),
        Chevron('skillScanChevron' + (open ? ' skillScanChevronOpen' : ''))),
      open ? h('div', { className: 'skillScanBody' },
        h('div', { className: 'skillScanSection' },
          h('div', { className: 'skillScanSectionTitle' }, '扫描层级（开关，优先级从高到低）'),
          rows,
          saved ? h('div', { className: 'skillScanOk' }, '✓ 已读取配置（编辑持久化在宿主后续版本支持）') : null),
        h('div', { className: 'skillScanSection' },
          h('div', { className: 'skillScanSectionTitle' }, 'skills 的上级目录名（可增删改）'),
          h('div', { className: 'skillScanHint' }, '默认 .dsh、.agents。添加一行即扫 <根>/<名称>/skills。'),
          parentRows,
          h('button', { type: 'button', className: 'skillScanAddBtn', onClick: addDir }, '+ 添加上级目录')),
        h('div', { className: 'skillScanSection' },
          h('div', { className: 'skillScanSectionTitle' }, '扫描根预览（当前会话 cwd）'),
          h('div', { className: 'skillScanPreviewBox' }, previewRows)),
        error ? h('div', { className: 'skillScanError' }, '✕ ' + error) : null) : null)
  }

  slots.inject('settings.plugin.item', function () {
    return slots.register(
      { name: 'settings.plugin.item', id: 'skill-scan', key: 'skill-scan', order: 30, label: '技能扫描' },
      function () { return h(SkillScanCard) })
  })
}
