import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// 守卫：皮肤预设的暗色变体必须同时覆盖 data-theme='dark'（库内规范）与 html.dark（宿主 class 式暗色，
// 如 docs 站）——曾因只写 data-theme 选择器，导致宿主暗色下皮肤被默认主色回填而失效（视觉复核实抓）。
const css = readFileSync(join(process.cwd(), 'packages/theme/skins.css'), 'utf8')

const SKINS = ['violet', 'emerald', 'rose', 'amber', 'graphite', 'teal'] as const

describe('theme/skins.css 皮肤预设静态守卫', () => {
  it('6 套皮肤：亮态块 + 暗态块都在，且暗态同时覆盖 data-theme 与 html.dark 两种机制', () => {
    for (const s of SKINS) {
      expect(css, `${s} 亮态块`).toContain(`[data-skin='${s}']`)
      expect(css, `${s} 暗态需覆盖 data-theme='dark'`).toContain(`[data-theme='dark'][data-skin='${s}']`)
      expect(css, `${s} 暗态需覆盖 data-theme='high-contrast'`).toContain(
        `[data-theme='high-contrast'][data-skin='${s}']`,
      )
      expect(css, `${s} 暗态需覆盖 html.dark（class 式暗色）`).toContain(`html.dark[data-skin='${s}']`)
    }
  })

  it('亮态与暗态主色值均为合法 hex 且互不相同（暗态提亮）', () => {
    const hexes = css.match(/#[0-9a-fA-F]{6}/g) ?? []
    // 每皮肤 2 个 hex（亮/暗），共 12
    expect(hexes.length).toBe(12)
    for (let i = 0; i < SKINS.length; i++) {
      const l = hexes[i * 2]!
      const d = hexes[i * 2 + 1]!
      expect(d.toLowerCase(), `${SKINS[i]} 暗态应异于亮态`).not.toBe(l.toLowerCase())
    }
  })
})
