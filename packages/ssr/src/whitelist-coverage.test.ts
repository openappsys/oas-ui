// 覆盖守卫：ui 组件 ↔ SSR WHITELIST / 有意不 SSR 清单。
// 数据来源：docs/api-manifest/（每个组件一个 JSON 文件，由 `pnpm api:scan` 生成并入库）。
// 目的：ui 组件必须二选一——进 WHITELIST，或登记到 NOT_SSR——防止漏登记静默失效。
import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WHITELIST } from './index.js'
import { NOT_SSR, NOT_SSR_TAGS } from './not-ssr.js'

const MANIFEST_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../docs/api-manifest')

function manifestTags(): string[] {
  return readdirSync(MANIFEST_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => f.replace(/\.json$/, ''))
}

describe('ssr WHITELIST ↔ ui 组件对账', () => {
  const tags = manifestTags()
  const wl = new Set<string>(WHITELIST)
  const ns = NOT_SSR_TAGS

  it('每个 WHITELIST tag 必须对应真实组件 manifest', () => {
    const known = new Set(tags)
    const missing = [...wl].filter((t) => !known.has(t))
    expect(missing, 'WHITELIST 中有无对应组件 tag（typo / 已删除）').toEqual([])
  })

  it('每个 ui 组件要么进 WHITELIST，要么进 NOT_SSR', () => {
    const unexpected = tags.filter((t) => !wl.has(t) && !ns.has(t))
    expect(unexpected, '组件既未进白名单、也未登记 NOT_SSR；必须二选一').toEqual([])
  })

  it('WHITELIST 与 NOT_SSR 不得重叠', () => {
    const overlap = [...wl].filter((t) => ns.has(t))
    expect(overlap, '同一 tag 不能同时出现在两个清单').toEqual([])
  })

  it('NOT_SSR 每个 tag 必须对应真实组件 manifest（防止删除/typo 后静默留下）', () => {
    const known = new Set(tags)
    const missing = [...ns].filter((t) => !known.has(t))
    expect(missing, 'NOT_SSR 中有无对应组件 tag（typo / 已删除）').toEqual([])
  })

  it('两个清单各自不得重复', () => {
    expect(new Set(WHITELIST).size, 'WHITELIST 有重复 tag').toBe(WHITELIST.length)
    expect(new Set(NOT_SSR.map((entry) => entry.tag)).size, 'NOT_SSR 有重复 tag').toBe(NOT_SSR.length)
  })
})
