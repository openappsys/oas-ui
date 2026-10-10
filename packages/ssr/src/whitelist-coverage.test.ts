// 对账守卫：ui 组件 ↔ SSR WHITELIST。
// 数据源：docs/api-manifest/（每组件一档，文件名即 tag，由 `pnpm api:scan` 生成并入库）。
// 目的：ui 新增组件若既不在 WHITELIST、又不在下方「有意不 SSR」清单里 → 红灯，强制决策
// （加白名单，或按原因登记排除）。历史曾漏登记 scheduler/gantt/barcode（见 packages/ssr/src/index.ts 注释）。
import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WHITELIST } from './index.js'

const MANIFEST_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../docs/api-manifest')

// 有意不纳入白名单的 tag（按原因分组；SSR 覆盖推进时应把对应项从这里移出并加进 WHITELIST）：
// - 子件：由父组件承载渲染，renderer 忽略嵌套的非白名单 tag（无需单独登记）
// - 命令式：无初始 DOM，客户端专属（PRD 定论）
// - 未立项：浮层/移动端批次的 SSR 尚未做（见 demands.md）
const NOT_SSR: ReadonlySet<string> = new Set<string>([
  // 子件（父组件 slot 承载）
  'oas-anchor-item',
  'oas-anchor-target',
  'oas-bottom-navigation-item',
  'oas-breadcrumb-item',
  'oas-breadcrumb-separator',
  'oas-button-group-separator',
  'oas-command-item',
  'oas-context-menu-divider',
  'oas-context-menu-group',
  'oas-context-menu-item',
  'oas-dropdown-divider',
  'oas-dropdown-group',
  'oas-dropdown-item',
  'oas-menu-divider',
  'oas-menu-group',
  'oas-menu-item',
  'oas-menubar-divider',
  'oas-menubar-group',
  'oas-menubar-item',
  'oas-navigation-menu-group',
  'oas-navigation-menu-item',
  'oas-option',
  'oas-sidebar-divider',
  'oas-sidebar-item',
  'oas-swatch-group',
  'oas-table-column',
  'oas-toggle-item',
  'oas-toolbar-input',
  'oas-toolbar-separator',
  'oas-toolbar-toggle-item',
  'oas-toolbar-toggle',
  // 命令式（无初始 DOM）
  'oas-message',
  'oas-notification',
  'oas-toast',
  'oas-snackbar',
  'oas-loading-bar',
  // 未立项 SSR（浮层/移动端批次）
  'oas-bottom-sheet',
  'oas-image-group',
  'oas-index-bar',
  'oas-notice-bar',
  'oas-picker',
  'oas-pull-refresh',
  'oas-swipe-cell',
  'oas-swatch',
  'oas-theme-editor',
])

function manifestTags(): string[] {
  return readdirSync(MANIFEST_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => f.replace(/\.json$/, ''))
}

describe('ssr WHITELIST ↔ ui 组件对账', () => {
  const tags = manifestTags()
  const wl = new Set<string>(WHITELIST)

  it('每个 WHITELIST tag 都对应真实组件（有 manifest）', () => {
    const known = new Set(tags)
    const missing = [...wl].filter((t) => !known.has(t))
    expect(missing, 'WHITELIST 含无对应组件的 tag（typo / 已删除）').toEqual([])
  })

  it('每个 ui 组件要么在 WHITELIST、要么在已登记的「有意不 SSR」清单', () => {
    const unexpected = tags.filter((t) => !wl.has(t) && !NOT_SSR.has(t))
    expect(unexpected, '新增组件未决策 SSR 归属（应加 WHITELIST 或登记到 NOT_SSR）').toEqual([])
  })
})
