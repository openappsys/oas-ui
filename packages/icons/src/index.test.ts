import { describe, it, expect } from 'vitest'
import {
  iconRegistry,
  iconNames,
  checkPath,
  closePath,
  arrowUpPath,
  arrowDownPath,
  arrowLeftPath,
  arrowRightPath,
  languagePath,
  translatePath,
} from './index.js'

describe('@oas-ui/icons', () => {
  it('registry 与 iconNames 一致', () => {
    expect(Object.keys(iconRegistry)).toEqual([...iconNames])
    expect(iconNames.length).toBeGreaterThanOrEqual(20)
  })

  it('每个图标内容为可用的 SVG 片段（含 path 或 circle/rect）', () => {
    for (const name of iconNames) {
      const content = iconRegistry[name]
      expect(content).toMatch(/<(path|circle|rect|line)/)
      expect(content).toContain('currentColor')
    }
  })

  it('按名独立模块可静态导入（tree-shakable 路径）', () => {
    expect(checkPath).toContain('M3.5 8.5')
    expect(closePath).toContain('M4 4 L12 12')
  })

  it('name 属性语义与 registry key 对应（kebab-case）', () => {
    expect(iconRegistry['chevron-down']).toBeTruthy()
    expect(iconRegistry['arrow-right']).toBeTruthy()
  })
})

describe('方向类图标几何语义（SVG y 轴向下）', () => {
  // 常量为完整 <path d="..."/> 片段：先取 d 属性，末段为箭头折线，三点依次为 左翼/顶点/右翼
  const parseArrowHead = (pathEl: string) => {
    const d = /d="([^"]+)"/.exec(pathEl)?.[1] ?? ''
    const subpaths = d.split('M').filter(Boolean)
    const head = (subpaths[subpaths.length - 1] ?? '').trim()
    const nums = (head.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    if (nums.length !== 6) throw new Error(`无法解析箭头折线: ${d}`)
    const [x0, y0, x1, y1, x2, y2] = nums as [number, number, number, number, number, number]
    return [
      { x: x0, y: y0 },
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ] as const
  }

  it('arrow-up 箭头尖朝上（顶点 y 小于两翼）', () => {
    const [l, apex, r] = parseArrowHead(arrowUpPath)
    expect(apex.y).toBeLessThan(l.y)
    expect(apex.y).toBeLessThan(r.y)
  })

  it('arrow-down 箭头尖朝下（顶点 y 大于两翼）', () => {
    const [l, apex, r] = parseArrowHead(arrowDownPath)
    expect(apex.y).toBeGreaterThan(l.y)
    expect(apex.y).toBeGreaterThan(r.y)
  })

  it('arrow-left 箭头尖朝左（顶点 x 小于两翼）', () => {
    const [t, apex, b] = parseArrowHead(arrowLeftPath)
    expect(apex.x).toBeLessThan(t.x)
    expect(apex.x).toBeLessThan(b.x)
  })

  it('arrow-right 箭头尖朝右（顶点 x 大于两翼）', () => {
    const [t, apex, b] = parseArrowHead(arrowRightPath)
    expect(apex.x).toBeGreaterThan(t.x)
    expect(apex.x).toBeGreaterThan(b.x)
  })

  it('language（globe）：圆 + 纬线 + 经线纺锤（国际化/地区切换）', () => {
    expect(languagePath).toMatch(/circle[^>]*r="6\.5"/)
    expect(languagePath).toContain('M1.5 8 H14.5')
    expect(iconRegistry['language']).toBe(languagePath)
  })

  it('translate（文A）：「文」（点+横+撇捺）+ 拉丁 A（翻译动作）', () => {
    expect(translatePath).toContain('M4.75 3.6 L3.1 8.4')
    expect(translatePath).toMatch(/L11\.2 7\.5 L13\.6 14\.5/)
    expect(iconRegistry['translate']).toBe(translatePath)
  })
})
