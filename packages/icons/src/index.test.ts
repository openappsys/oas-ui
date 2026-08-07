import { describe, it, expect } from 'vitest'
import { iconRegistry, iconNames, checkPath, closePath } from './index.js'

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
