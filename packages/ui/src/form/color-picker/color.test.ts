import { describe, expect, it } from 'vitest'
import {
  parseColor,
  formatColor,
  formatSwatch,
  rgbToHsv,
  hsvToRgb,
  type RGBA,
} from './color.js'

function eq(rgba: RGBA, target: RGBA, alphaEps = 1e-9): boolean {
  return (
    Math.abs(rgba.r - target.r) <= alphaEps &&
    Math.abs(rgba.g - target.g) <= alphaEps &&
    Math.abs(rgba.b - target.b) <= alphaEps &&
    Math.abs(rgba.a - target.a) <= 1e-6
  )
}

describe('parseColor：宽容解析（hex / CSS 颜色名 / rgb() / hsl()）', () => {
  it('hex 6 位与 3 位（含 # 前缀与大小写）', () => {
    expect(eq(parseColor('#0b6cff')!, { r: 11, g: 108, b: 255, a: 1 })).toBe(true)
    expect(eq(parseColor('0b6cff')!, { r: 11, g: 108, b: 255, a: 1 })).toBe(true)
    expect(eq(parseColor('#ABC')!, { r: 170, g: 187, b: 204, a: 1 })).toBe(true)
    expect(eq(parseColor('  #Ff0000  ')!, { r: 255, g: 0, b: 0, a: 1 })).toBe(true)
  })

  it('hex 8 位 / 4 位携带 alpha（aa 映射 0-1）', () => {
    const c8 = parseColor('#0b6cff80')!
    expect(c8.r).toBe(11)
    expect(c8.g).toBe(108)
    expect(c8.b).toBe(255)
    expect(c8.a).toBeCloseTo(128 / 255, 5)
    const c4 = parseColor('#f008')!
    expect(c4.a).toBeCloseTo(0x88 / 255, 5)
  })

  it('CSS 颜色名（含大小写不敏感与灰色别名）', () => {
    expect(eq(parseColor('red')!, { r: 255, g: 0, b: 0, a: 1 })).toBe(true)
    expect(eq(parseColor('REBECCAPURPLE')!, { r: 102, g: 51, b: 153, a: 1 })).toBe(true)
    expect(eq(parseColor('Grey')!, parseColor('gray')!)).toBe(true)
    expect(eq(parseColor('lightgoldenrodyellow')!, { r: 250, g: 250, b: 210, a: 1 })).toBe(true)
    expect(eq(parseColor('transparent')!, { r: 0, g: 0, b: 0, a: 0 })).toBe(true)
  })

  it('rgb()/rgba()：逗号、空格现代语法、百分比通道与百分比 alpha', () => {
    expect(eq(parseColor('rgb(255,0,0)')!, { r: 255, g: 0, b: 0, a: 1 })).toBe(true)
    expect(eq(parseColor('rgb( 255 , 0 , 0 )')!, { r: 255, g: 0, b: 0, a: 1 })).toBe(true)
    expect(eq(parseColor('rgb(255 0 0)')!, { r: 255, g: 0, b: 0, a: 1 })).toBe(true)
    expect(eq(parseColor('rgb(100%, 0%, 0%)')!, { r: 255, g: 0, b: 0, a: 1 })).toBe(true)
    expect(eq(parseColor('rgba(255, 0, 0, 0.5)')!, { r: 255, g: 0, b: 0, a: 0.5 })).toBe(true)
    expect(eq(parseColor('rgba(255 0 0 / 50%)')!, { r: 255, g: 0, b: 0, a: 0.5 })).toBe(true)
    expect(eq(parseColor('rgba(255,0,0,50%)')!, { r: 255, g: 0, b: 0, a: 0.5 })).toBe(true)
  })

  it('hsl()/hsla()：角度 + 百分比，现代斜杠 alpha', () => {
    expect(eq(parseColor('hsl(120, 100%, 50%)')!, { r: 0, g: 255, b: 0, a: 1 })).toBe(true)
    expect(eq(parseColor('hsl(0, 100%, 50%)')!, { r: 255, g: 0, b: 0, a: 1 })).toBe(true)
    expect(eq(parseColor('hsl(240 100% 50%)')!, { r: 0, g: 0, b: 255, a: 1 })).toBe(true)
    expect(eq(parseColor('hsla(120, 100%, 50%, 0.25)')!, { r: 0, g: 255, b: 0, a: 0.25 })).toBe(true)
    expect(eq(parseColor('hsla(120 100% 50% / 25%)')!, { r: 0, g: 255, b: 0, a: 0.25 })).toBe(true)
  })

  it('hsl 负角度与超 360 归一化', () => {
    // -120 归一化到 240 → 蓝
    expect(eq(parseColor('hsl(-120, 100%, 50%)')!, { r: 0, g: 0, b: 255, a: 1 })).toBe(true)
    // 480 = 120 → 绿
    expect(eq(parseColor('hsl(480, 100%, 50%)')!, { r: 0, g: 255, b: 0, a: 1 })).toBe(true)
  })

  it('非法输入返回 null（不抛错）', () => {
    expect(parseColor('')).toBeNull()
    expect(parseColor('  ')).toBeNull()
    expect(parseColor('#12')).toBeNull()
    expect(parseColor('#gggggg')).toBeNull()
    expect(parseColor('redxx')).toBeNull()
    expect(parseColor('rgb(1, 2)')).toBeNull()
    expect(parseColor('rgb(a, 0, 0)')).toBeNull()
    expect(parseColor('hsl(120, 100%)')).toBeNull()
    expect(parseColor('not-a-color')).toBeNull()
    expect(parseColor('currentcolor')).toBeNull()
    expect(parseColor('none')).toBeNull()
  })
})

describe('formatColor：按 format/uppercase/alpha 输出', () => {
  const blue = { r: 11, g: 108, b: 255, a: 1 }
  const semi = { r: 11, g: 108, b: 255, a: 0.5019607843137255 }

  it('hex 默认小写 6 位；uppercase 大写', () => {
    expect(formatColor(blue)).toBe('#0b6cff')
    expect(formatColor(blue, { uppercase: true })).toBe('#0B6CFF')
  })

  it('alpha 开启：半透明 → 8 位 hex；不透明 → 仍带 ff 尾（通道恒定）', () => {
    expect(formatColor(semi, { alpha: true })).toBe('#0b6cff80')
    expect(formatColor(blue, { alpha: true })).toBe('#0b6cffff')
  })

  it('rgb 输出：rgb(r, g, b)；alpha 开启 → rgba(..., a)', () => {
    expect(formatColor(blue, { format: 'rgb' })).toBe('rgb(11, 108, 255)')
    expect(formatColor(semi, { format: 'rgb', alpha: true })).toBe('rgba(11, 108, 255, 0.502)')
    expect(formatColor(blue, { format: 'rgb', alpha: true })).toBe('rgba(11, 108, 255, 1)')
    expect(formatColor(blue, { format: 'rgb', uppercase: true })).toBe('rgb(11, 108, 255)')
  })

  it('通道越界钳制与取整', () => {
    expect(formatColor({ r: 300, g: -1, b: 0, a: 1 })).toBe('#ff0000')
    expect(formatColor({ r: 10.4, g: 10.6, b: 0, a: 1 })).toBe('#0a0b00')
  })

  it('formatSwatch 输出全精度 rgba（面板/触发器内联样式用）', () => {
    expect(formatSwatch(blue)).toBe('rgba(11, 108, 255, 1)')
    expect(formatSwatch(semi)).toBe('rgba(11, 108, 255, 0.501961)')
  })

  it('round-trip：formatColor 输出可被 parseColor 还原', () => {
    const inputs: RGBA[] = [
      { r: 11, g: 108, b: 255, a: 1 },
      { r: 255, g: 0, b: 0, a: 0.5019607843137255 },
      { r: 0, g: 0, b: 0, a: 0 },
    ]
    for (const i of inputs) {
      const hex = formatColor(i, { alpha: true })
      const back = parseColor(hex)!
      expect(back.r).toBe(i.r)
      expect(back.g).toBe(i.g)
      expect(back.b).toBe(i.b)
      expect(back.a).toBeCloseTo(i.a, 2)
      const rgb = formatColor(i, { format: 'rgb', alpha: true })
      const back2 = parseColor(rgb)!
      expect(back2.r).toBe(i.r)
      expect(back2.g).toBe(i.g)
      expect(back2.b).toBe(i.b)
      expect(back2.a).toBeCloseTo(i.a, 2)
    }
  })
})

describe('HSV ↔ RGB（面板 HS 通道同款换算）', () => {
  it('纯红', () => {
    const [h, s, v] = rgbToHsv(255, 0, 0)
    expect(h).toBeCloseTo(0, 5)
    expect(s).toBeCloseTo(1, 5)
    expect(v).toBeCloseTo(1, 5)
    const back = hsvToRgb(h, s, v)
    expect(back.r).toBeCloseTo(255, 0)
    expect(back.g).toBeCloseTo(0, 0)
    expect(back.b).toBeCloseTo(0, 0)
  })

  it('灰色（s=0 时 h 无意义，不炸）', () => {
    const [h, s, v] = rgbToHsv(128, 128, 128)
    expect(s).toBe(0)
    expect(v).toBeCloseTo(128 / 255, 5)
    const back = hsvToRgb(h, s, v)
    expect(back.r).toBeCloseTo(128, 0)
    expect(back.g).toBeCloseTo(128, 0)
    expect(back.b).toBeCloseTo(128, 0)
  })

  it('0b6cff 主品牌色往返', () => {
    const [h, s, v] = rgbToHsv(11, 108, 255)
    const back = hsvToRgb(h, s, v)
    expect(Math.round(back.r)).toBe(11)
    expect(Math.round(back.g)).toBe(108)
    expect(Math.round(back.b)).toBe(255)
  })
})
