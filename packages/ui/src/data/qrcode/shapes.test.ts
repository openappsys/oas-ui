import { describe, it, expect } from 'vitest'
import { encodeQR, matrixToPath } from './qr.js'
import { centeredBox, dataPath, dataUses, finderPath, isFinderModule, linearGradientDef, moduleDef } from './shapes.js'

/** 构造 size×size 矩阵（dark 由回调决定） */
function matrix(size: number, dark: (x: number, y: number) => boolean): Uint8Array {
  const m = new Uint8Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (dark(x, y)) m[y * size + x] = 1
  }
  return m
}

const count = (s: string, re: RegExp): number => (s.match(re) ?? []).length

describe('shapes：定位图形识别', () => {
  it('三个 7×7 区域命中，其余不命中（右下角无定位图形）', () => {
    const size = 21
    expect(isFinderModule(size, 0, 0)).toBe(true)
    expect(isFinderModule(size, 6, 6)).toBe(true)
    expect(isFinderModule(size, 7, 7)).toBe(false)
    expect(isFinderModule(size, size - 7, 0)).toBe(true)
    expect(isFinderModule(size, size - 7, 6)).toBe(true)
    expect(isFinderModule(size, 0, size - 7)).toBe(true)
    expect(isFinderModule(size, 6, size - 7)).toBe(true)
    expect(isFinderModule(size, size - 7, size - 7)).toBe(false)
  })
})

describe('shapes：数据区', () => {
  it('square：排除定位区后按行合并，路径只含 M/h/v/z（无弧线）', () => {
    const size = 21
    const d = dataPath(
      matrix(size, () => true),
      size,
      4,
    )
    expect(d).not.toMatch(/[aAcCsSqQtT]/)
    // 首行：x0-6 是左上定位区、x14-20 是右上定位区 → 只剩 x7..13（+offset 4 → 从 11 起 7 宽）
    expect(d).toContain('M11 4h7v1h-7z')
  })

  it('square：skip 盒覆盖的模块被挖空（覆盖格数减少）', () => {
    const size = 21
    // 合并路径是按行 run 拼接的，挖空会把 run 切断 → 字符串反而更长，故按「覆盖格数」判定
    const covered = (d: string): number => {
      let n = 0
      for (const m of d.matchAll(/M(\d+) \d+h(\d+)v1h-/g)) n += Number(m[2])
      return n
    }
    const full = dataPath(
      matrix(size, () => true),
      size,
      0,
    )
    const skipped = dataPath(
      matrix(size, () => true),
      size,
      0,
      centeredBox(size, 5, 1),
    )
    expect(covered(skipped)).toBeLessThan(covered(full))
    expect(covered(full) - covered(skipped)).toBe(7 * 7) // 盒 7×7（side 5 + pad 1 × 2）
  })

  it('rounded/dots：dataUses 逐模块 <use>，数量 = 暗模块 − 定位区 − skip', () => {
    const size = 21
    const all = matrix(size, () => true)
    const uses = dataUses(all, size, 4, 'oas-qr-mod')
    expect(count(uses, /<use /g)).toBe(size * size - 3 * 49)
    const skipped = dataUses(all, size, 4, 'oas-qr-mod', centeredBox(size, 5, 1))
    expect(count(skipped, /<use /g)).toBeLessThan(count(uses, /<use /g))
  })
})

describe('shapes：模块原型与定位图形', () => {
  it('moduleDef：square 无原型；rounded 圆角方块；dots 圆点（留间隙）', () => {
    expect(moduleDef('square')).toBe('')
    expect(moduleDef('rounded')).toContain('<rect id="oas-qr-mod"')
    expect(moduleDef('rounded')).toContain('rx=')
    expect(moduleDef('dots')).toContain('<circle id="oas-qr-mod"')
    expect(moduleDef('dots')).toContain('r="0.45"')
  })

  it('finderPath：三处 = 9 个子路径；square 无弧线、rounded 带弧线', () => {
    const square = finderPath(21, 0, 'square')
    expect(count(square, /M/g)).toBe(9)
    expect(square).not.toMatch(/[aA]/)
    expect(square).toContain('M0 0')
    expect(square).toContain('M14 0')
    expect(square).toContain('M0 14')

    const rounded = finderPath(21, 0, 'rounded')
    expect(count(rounded, /M/g)).toBe(9)
    expect(rounded).toMatch(/a1\.6 /)
  })

  it('路径数据合法：roundRect 插值完整（无变量名字面量、无括号），只含命令/数字/负号/点/空格', () => {
    // 曾现缺陷：模板串漏 `${}` → 路径里出现字面量 "v-(h - 2 * rr)"，浏览器解析到非法 token 后
    // 丢弃后续子路径 → 右上/左下定位图形整块消失（真事故，视觉核验才发现）
    for (const shape of ['square', 'rounded'] as const) {
      for (const d of [
        finderPath(21, 4, shape),
        dataPath(
          matrix(21, () => true),
          21,
          4,
        ),
      ]) {
        // 剥离合法字符后必须为空——残留的 ( 、* 或 r 等即插值缺失/非法 token
        expect(d.replace(/[Mhvaz\d.\- ]/g, ''), `${shape}：路径只应含命令/数字/负号/点/空格`).toBe('')
      }
    }
  })
})

describe('shapes：渐变 defs', () => {
  it('linearGradientDef：停靠色均匀分布；角度遵循 CSS 约定', () => {
    const g0 = linearGradientDef(['#000', '#fff'], 0)
    expect(g0).toContain('<linearGradient id="oas-qr-grad"')
    expect(g0).toContain('offset="0.0000" stop-color="#000"')
    expect(g0).toContain('offset="1.0000" stop-color="#fff"')
    // 0deg = 自下而上：起点 y=1 → 终点 y=0
    expect(g0).toContain('y1="1.0000"')
    expect(g0).toContain('y2="0.0000"')

    const g90 = linearGradientDef(['#000', '#fff'], 90)
    expect(g90).toContain('x1="0.0000"')
    expect(g90).toContain('x2="1.0000"')
  })

  it('三停靠色：offset 0 / 0.5 / 1', () => {
    expect(linearGradientDef(['#a', '#b', '#c'], 45)).toContain('offset="0.5000"')
  })

  it('颜色值含引号时被转义（防注入）', () => {
    const g = linearGradientDef(['" onload="x', '#fff'], 0)
    expect(g).toContain('&quot;')
    expect(g).not.toMatch(/stop-color="[^"]*" onload=/)
  })
})

describe('shapes：默认配置与旧渲染逐模块等价（可扫性不退化）', () => {
  /**
   * 区域级覆盖判定：把轴对齐子路径解析成矩形（dataPath 是 h{len}v1 行 run，
   * finderPath 是 h{w}v{h} 矩形轮廓），按模块中心做 evenodd 奇偶判定。
   * 仅适用于 square 模式（rounded 含弧线段，不参与本等价性证明）。
   */
  const covered = (d: string, size: number, offset: number): Set<string> => {
    const rects = [...d.matchAll(/M(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)h(-?\d+(?:\.\d+)?)v(-?\d+(?:\.\d+)?)/g)].map(
      (m) => [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] as const,
    )
    const out = new Set<string>()
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = x + offset + 0.5
        const cy = y + offset + 0.5
        let parity = 0
        for (const [rx, ry, rw, rh] of rects) {
          if (cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh) parity ^= 1
        }
        if (parity) out.add(`${x},${y}`)
      }
    }
    return out
  }

  it('dataPath + finderPath(square) 覆盖集合 === matrixToPath（含定位图形，无重叠/无遗漏）', () => {
    const qr = encodeQR('https://oas-ui.dev', 'm')
    const margin = 4
    const legacy = covered(matrixToPath(qr.modules, qr.size, margin), qr.size, margin)
    const next = covered(dataPath(qr.modules, qr.size, margin), qr.size, margin)
    for (const c of covered(finderPath(qr.size, margin, 'square'), qr.size, margin)) next.add(c)
    expect([...next].sort()).toEqual([...legacy].sort())
  })
})
