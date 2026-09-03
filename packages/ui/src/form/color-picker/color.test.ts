import { describe, expect, it } from 'vitest'
import {
  parseColor,
  formatColor,
  formatSwatch,
  rgbToHsv,
  hsvToRgb,
  xyToSv,
  hueFromY,
  parseGradient,
  formatGradient,
  gradientAt,
  insertStop,
  removeStopAt,
  moveStop,
  formatPosPct,
  type RGBA,
  type GradientStop,
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

describe('xyToSv / hueFromY：2D 色域指针坐标 → HSV 分量（二期 2D 面板）', () => {
  it('x→饱和度、y 反转→亮度：左上白、右下黑映射', () => {
    // 指针在 2D 区几何坐标按 (0..1) 归一化；x 左→右 = 饱和度升，y 上→下 = 亮度降
    expect(xyToSv(0, 0)).toEqual([0, 1]) // 左上：s=0 v=1 → 白
    expect(xyToSv(1, 0)).toEqual([1, 1]) // 右上：纯色相
    expect(xyToSv(0, 1)).toEqual([0, 0]) // 左下：黑
    expect(xyToSv(1, 1)).toEqual([1, 0]) // 右下：黑
  })

  it('中点与越界钳制', () => {
    const [s, v] = xyToSv(0.5, 0.5)
    expect(s).toBeCloseTo(0.5, 5)
    expect(v).toBeCloseTo(0.5, 5)
    // 越界拖拽（指针滑出面板）钳到边界
    expect(xyToSv(-0.2, 0.3)).toEqual([0, 0.7])
    expect(xyToSv(1.5, 2)).toEqual([1, 0])
  })

  it('hueFromY：竖条 y 归一化 → 0..360 色相（上 360 下 0 或自定义方向）', () => {
    // hue 竖条：底端 0（红）→ 顶端 360
    expect(hueFromY(1)).toBeCloseTo(0, 5)
    expect(hueFromY(0)).toBeCloseTo(360, 5)
    expect(hueFromY(0.5)).toBeCloseTo(180, 5)
    expect(hueFromY(1.3)).toBeCloseTo(0, 5)
    expect(hueFromY(-0.3)).toBeCloseTo(360, 5)
  })
})

describe('gradient：linear-gradient 串解析 / 输出（二期渐变模式）', () => {
  it('解析 90deg 双 stop 带百分比位置', () => {
    const stops = parseGradient('linear-gradient(90deg, #ff0000 0%, #00ff00 100%)')
    expect(stops).toHaveLength(2)
    expect(stops![0]!.pos).toBe(0)
    expect(formatColor(stops![0]!.color)).toBe('#ff0000')
    expect(stops![1]!.pos).toBe(1)
    expect(formatColor(stops![1]!.color)).toBe('#00ff00')
  })

  it('缺省位置：平均分布（0%→50%→100%）', () => {
    const stops = parseGradient('linear-gradient(#0b6cff, #16a34a, #dc2626)')
    expect(stops!.map((s) => s.pos)).toEqual([0, 0.5, 1])
  })

  it('部分缺省位置：在两端已知位置之间均分', () => {
    const stops = parseGradient('linear-gradient(90deg, #000 0%, #fff, #888 100%)')
    expect(stops).toHaveLength(3)
    expect(stops![1]!.pos).toBeCloseTo(0.5, 5)
  })

  it('颜色分量宽容解析：rgba / hsl 均可作 stop', () => {
    const stops = parseGradient('linear-gradient(90deg, rgba(255,0,0,0.5) 0%, hsl(240 100% 50%) 100%)')
    expect(stops).toHaveLength(2)
    expect(stops![0]!.color.a).toBeCloseTo(0.5, 5)
    expect(formatColor(stops![1]!.color)).toBe('#0000ff')
  })

  it('格式宽容：单空格双 stop、不带 deg 的方向词', () => {
    const a = parseGradient('linear-gradient(#ff0000 0% 100%)')
    expect(a).toHaveLength(1)
    const b = parseGradient('linear-gradient(to right, #f00, #00f)')
    expect(b!.map((s) => s.pos)).toEqual([0, 1])
  })

  it('非法输入返回 null', () => {
    expect(parseGradient('')).toBeNull()
    expect(parseGradient('#0b6cff')).toBeNull() // 纯颜色不是渐变
    expect(parseGradient('radial-gradient(#f00, #00f)')).toBeNull() // 只支持线性
    expect(parseGradient('linear-gradient()')).toBeNull()
    expect(parseGradient('linear-gradient(90deg, nope 0%)')).toBeNull()
  })

  it('formatGradient 输出 90deg 规范串（可回读）', () => {
    const stops: GradientStop[] = [
      { pos: 0, color: { r: 255, g: 0, b: 0, a: 1 } },
      { pos: 0.5, color: { r: 0, g: 255, b: 0, a: 1 } },
      { pos: 1, color: { r: 0, g: 0, b: 255, a: 1 } },
    ]
    const out = formatGradient(stops)
    expect(out).toBe('linear-gradient(90deg, #ff0000 0%, #00ff00 50%, #0000ff 100%)')
    const back = parseGradient(out)!
    expect(back.map((s) => s.pos)).toEqual([0, 0.5, 1])
    expect(back.map((s) => formatColor(s.color))).toEqual(['#ff0000', '#00ff00', '#0000ff'])
  })

  it('formatGradient 尊重输出格式（rgb / alpha 通道）', () => {
    const stops: GradientStop[] = [
      { pos: 0, color: { r: 255, g: 0, b: 0, a: 0.5 } },
      { pos: 1, color: { r: 0, g: 0, b: 255, a: 1 } },
    ]
    expect(formatGradient(stops, { format: 'rgb', alpha: true })).toBe(
      'linear-gradient(90deg, rgba(255, 0, 0, 0.5) 0%, rgba(0, 0, 255, 1) 100%)',
    )
    expect(formatGradient(stops, { alpha: true })).toBe(
      'linear-gradient(90deg, #ff000080 0%, #0000ffff 100%)',
    )
  })

  it('gradientAt：线性插值取色', () => {
    const stops: GradientStop[] = [
      { pos: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
      { pos: 1, color: { r: 255, g: 255, b: 255, a: 1 } },
    ]
    const mid = gradientAt(stops, 0.5)
    expect(mid.r).toBeCloseTo(127.5, 1)
    expect(mid.g).toBeCloseTo(127.5, 1)
    const at0 = gradientAt(stops, 0)
    expect(at0.r).toBe(0)
    const over = gradientAt(stops, 2)
    expect(over.r).toBe(255)
  })

  it('insertStop / removeStopAt / moveStop：stop 增删与位置夹取', () => {
    const base: GradientStop[] = [
      { pos: 0, color: { r: 255, g: 0, b: 0, a: 1 } },
      { pos: 1, color: { r: 0, g: 0, b: 255, a: 1 } },
    ]
    const three = insertStop(base, 0.5, { r: 0, g: 255, b: 0, a: 1 })
    expect(three.map((s) => s.pos)).toEqual([0, 0.5, 1])
    const removed = removeStopAt(three, 1)
    expect(removed.map((s) => s.pos)).toEqual([0, 1])
    // 越界移动夹到邻居之间（不越过左右邻居，保持有序）
    const moved = moveStop(three, 1, 0.8)
    expect(moved[1]!.pos).toBeCloseTo(0.8, 5)
    // 末端 stop 可到端点（0/1）
    const clamped = moveStop(base, 1, 1.5)
    expect(clamped[1]!.pos).toBe(1)
    expect(clamped.map((s) => s.pos)).toEqual([0, 1])
    // 中间 stop 越过左邻居 → 夹在左邻居位置（可成 CSS 硬停靠）
    const leftClamped = moveStop(three, 1, -0.4)
    expect(leftClamped.map((s) => s.pos)).toEqual([0, 0, 1])
    expect(leftClamped[1]!.color.g).toBe(255)
  })

  it('formatPosPct：0..1 → 百分比（去尾零）', () => {
    expect(formatPosPct(0)).toBe('0%')
    expect(formatPosPct(0.5)).toBe('50%')
    expect(formatPosPct(0.333333)).toBe('33.33%')
    expect(formatPosPct(1)).toBe('100%')
  })
})
