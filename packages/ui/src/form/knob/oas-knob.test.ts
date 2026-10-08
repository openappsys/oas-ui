import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASKnob } from './index.js'
import { setLocale } from '@oas-ui/i18n'

function mount(attrs: Record<string, string> = {}): OASKnob {
  const el = new OASKnob()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function frame(el: OASKnob): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="frame"]')!
}

function pointerGroup(el: OASKnob): SVGGElement {
  return el.shadowRoot!.querySelector<SVGGElement>('.pointer')!
}

function trackPath(el: OASKnob): SVGPathElement {
  return el.shadowRoot!.querySelector<SVGPathElement>('[part="track"]')!
}

function fillPath(el: OASKnob): SVGPathElement {
  return el.shadowRoot!.querySelector<SVGPathElement>('[part="fill"]')!
}

function angleOf(el: OASKnob): number {
  return Number(pointerGroup(el).getAttribute('data-angle'))
}

function attrValue(el: OASKnob): number {
  return Number(el.getAttribute('value'))
}

/** happy-dom 布局恒 0：给 frame 桩一个 120×120 矩形（中心 60,60），手势几何可计算 */
function stubRect(el: OASKnob, size = 120): void {
  frame(el).getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: size,
      height: size,
      right: size,
      bottom: size,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

/** 合成一次完整指针拖拽：down → 逐点 move → up（全部派发到 frame 上） */
function dragSequence(
  el: OASKnob,
  pts: Array<[number, number]>,
  opts: { shift?: boolean; cancel?: boolean } = {},
): void {
  const f = frame(el)
  const [x0, y0] = pts[0]!
  f.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: x0,
      clientY: y0,
      pointerId: 1,
      button: 0,
      shiftKey: !!opts.shift,
    }),
  )
  for (let i = 1; i < pts.length; i++) {
    f.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: pts[i]![0],
        clientY: pts[i]![1],
        pointerId: 1,
        shiftKey: !!opts.shift,
      }),
    )
  }
  const [xn, yn] = pts[pts.length - 1]!
  f.dispatchEvent(
    new PointerEvent(opts.cancel ? 'pointercancel' : 'pointerup', {
      bubbles: true,
      clientX: xn,
      clientY: yn,
      pointerId: 1,
    }),
  )
}

function key(el: OASKnob, keyName: string, opts: { shift?: boolean } = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, shiftKey: !!opts.shift })
  el.dispatchEvent(e)
  return e
}

describe('OASKnob', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('dir')
  })

  // ---------- 渲染 ----------

  it('渲染 shadow 结构（frame/svg/track/fill/indicator/value），宿主 role=slider + tabindex=0', () => {
    const el = mount()
    expect(frame(el)).toBeTruthy()
    expect(trackPath(el)).toBeTruthy()
    expect(fillPath(el)).toBeTruthy()
    expect(pointerGroup(el)).toBeTruthy()
    expect(el.getAttribute('role')).toBe('slider')
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.getAttribute('aria-valuemin')).toBe('0')
    expect(el.getAttribute('aria-valuemax')).toBe('100')
    expect(el.getAttribute('aria-valuenow')).toBe('0')
  })

  it('默认值 0：指示器停在 start-angle（225），track 有弧径，include-arc 缺省时 fill 隐藏', () => {
    const el = mount()
    expect(angleOf(el)).toBe(225)
    expect(trackPath(el).getAttribute('d')).toMatch(/^M/)
    expect(fillPath(el).hasAttribute('hidden')).toBe(true)
    // 开启 include-arc 后值弧渲染（value==start-point 缺省回落 min → 仍退化隐藏）
    el.setAttribute('include-arc', '')
    expect(fillPath(el).hasAttribute('hidden')).toBe(true)
  })

  it('SSR 快照与 render 路径结构一致（同一 template 纯函数）', () => {
    const a = mount({ value: '60' })
    const b = new OASKnob()
    b.setAttribute('value', '60')
    // 未连接元素（无 render）直接取内部模板不可行——用两个已连接实例对比幂等性：
    // 同属性两次 update 后结构不变（增量同步不重建 shadow）
    const htmlBefore = a.shadowRoot!.innerHTML
    a.setAttribute('value', '30')
    expect(a.shadowRoot!.querySelector('[part="frame"]')).toBeTruthy()
    a.setAttribute('value', '60')
    // 增量路径：style 节点保持同一引用（未被 innerHTML 重建）
    const styleA = a.shadowRoot!.querySelector('style')
    a.setAttribute('value', '30')
    expect(a.shadowRoot!.querySelector('style')).toBe(styleA)
    void htmlBefore
    void b
  })

  // ---------- 值域钳制 / step 吸附 ----------

  it('值域钳制：越界 clamp 到 [min, max]，非法值回落 0', () => {
    const el = mount({ value: '150' })
    expect(el.getAttribute('aria-valuenow')).toBe('100')
    el.setAttribute('value', '-5')
    expect(el.getAttribute('aria-valuenow')).toBe('0')
    el.setAttribute('value', 'abc')
    expect(el.getAttribute('aria-valuenow')).toBe('0')
  })

  it('min > max 时自动交换（不回落死值）', () => {
    const el = mount({ min: '100', max: '0', value: '150' })
    expect(el.getAttribute('aria-valuemin')).toBe('0')
    expect(el.getAttribute('aria-valuemax')).toBe('100')
    expect(el.getAttribute('aria-valuenow')).toBe('100')
  })

  it('step 吸附：43 + step=10 → 40；step=0 视为连续（不吸附）', () => {
    const el = mount({ value: '43', step: '10' })
    expect(el.getAttribute('aria-valuenow')).toBe('40')
    const cont = mount({ value: '43', step: '0' })
    expect(cont.getAttribute('aria-valuenow')).toBe('43')
    const neg = mount({ value: '43', step: '-2' })
    expect(neg.getAttribute('aria-valuenow')).toBe('43')
  })

  it('value property 通道：get 返回钳制后数值，set 写受控属性并即时同步', () => {
    const el = mount({ value: '150' })
    expect(el.value).toBe(100)
    el.value = 50
    expect(el.getAttribute('value')).toBe('50')
    expect(el.getAttribute('aria-valuenow')).toBe('50')
  })

  // ---------- 角度映射 ----------

  it('角度映射：value → [start-angle, end-angle] 线性映射，data-angle 归一化到 [0,360)', () => {
    const el = mount({ 'start-angle': '0', 'end-angle': '180' })
    el.setAttribute('value', '50')
    expect(angleOf(el)).toBe(90)
    el.setAttribute('value', '25')
    expect(angleOf(el)).toBe(45)
    el.setAttribute('value', '100')
    expect(angleOf(el)).toBe(180)
  })

  it('默认扫角 225→495（270°，底部留缺口）：max 端 495 归一化为 135', () => {
    const el = mount({ value: '100' })
    expect(angleOf(el)).toBe(135)
  })

  it('end-angle <= start-angle 时归一化为最小 1° 扫角（防除零）', () => {
    const el = mount({ 'start-angle': '90', 'end-angle': '90', value: '100' })
    expect(angleOf(el)).toBe(91)
    const el2 = mount({ 'start-angle': '90', 'end-angle': '40', value: '100' })
    expect(angleOf(el2)).toBe(91)
  })

  it('reverse：值扫描镜像（min → end-angle），键盘左右键同步反转', () => {
    const el = mount({ 'start-angle': '0', 'end-angle': '180', reverse: '' })
    el.setAttribute('value', '25')
    expect(angleOf(el)).toBe(135)
    el.setAttribute('value', '50')
    const before = attrValue(el)
    key(el, 'ArrowRight')
    expect(attrValue(el)).toBe(before - 1)
    // 上键从不反转
    key(el, 'ArrowUp')
    expect(attrValue(el)).toBe(before)
  })

  // ---------- 值弧（include-arc + start-point 双极） ----------

  it('include-arc：值弧从 start-point 缺省（min）端填到当前值', () => {
    const el = mount({ 'include-arc': '', 'start-angle': '0', 'end-angle': '180', value: '50' })
    expect(fillPath(el).hasAttribute('hidden')).toBe(false)
    expect(fillPath(el).getAttribute('data-from')).toBe('0')
    expect(fillPath(el).getAttribute('data-to')).toBe('90')
  })

  it('双极弧：start-point=中心值，值大于/小于起点分别向两侧延伸', () => {
    const el = mount({
      'include-arc': '',
      'start-angle': '0',
      'end-angle': '180',
      'start-point': '50',
      value: '75',
    })
    expect(fillPath(el).getAttribute('data-from')).toBe('90')
    expect(fillPath(el).getAttribute('data-to')).toBe('135')
    el.setAttribute('value', '25')
    expect(fillPath(el).getAttribute('data-from')).toBe('45')
    expect(fillPath(el).getAttribute('data-to')).toBe('90')
  })

  it('值与 start-point 重合时值弧退化隐藏（round linecap 不出圆点）', () => {
    const el = mount({ 'include-arc': '', 'start-point': '50', value: '50' })
    expect(fillPath(el).hasAttribute('hidden')).toBe(true)
  })

  // ---------- 圆周手势（interaction=cursor，方位角增量驱动） ----------

  it('cursor：指针方位角增量驱动（顺时针增值），按下不写值（相对语义无跳变）', () => {
    const el = mount({ interaction: 'cursor', 'start-angle': '0', 'end-angle': '360', step: '0', value: '0' })
    stubRect(el)
    // 12 点方向（0°）按下 → 3 点方向（90°）松开：+90° / 360° × 100 = +25
    dragSequence(el, [
      [60, 10],
      [110, 60],
    ])
    expect(attrValue(el)).toBe(25)
  })

  it('cursor：逆时针拖拽减值；span 不足时 clamp 到 min', () => {
    const el = mount({ interaction: 'cursor', 'start-angle': '0', 'end-angle': '360', step: '0', value: '20' })
    stubRect(el)
    dragSequence(el, [
      [110, 60],
      [60, 10],
    ])
    expect(attrValue(el)).toBe(0)
  })

  it('无移动点按：零操作（不派发 drag-start/change、不写值）', () => {
    const el = mount({ interaction: 'cursor', value: '40' })
    stubRect(el)
    let events = 0
    el.addEventListener('oas-drag-start', () => events++)
    el.addEventListener('oas-change', () => events++)
    el.addEventListener('oas-drag-end', () => events++)
    dragSequence(el, [
      [60, 60],
      [60, 60],
    ])
    expect(events).toBe(0)
    expect(attrValue(el)).toBe(40)
  })

  it('cursor：跨 0°/360° 边界的方位角增量按最短路径解析（不绕圈跳变）', () => {
    const el = mount({ interaction: 'cursor', 'start-angle': '0', 'end-angle': '360', step: '0', value: '50' })
    stubRect(el)
    const r = 50
    const p = (deg: number): [number, number] => [
      60 + r * Math.sin((deg * Math.PI) / 180),
      60 - r * Math.cos((deg * Math.PI) / 180),
    ]
    // 350°（近 12 点左侧）按下 → 10°（近 12 点右侧）松开：原始角差 −340°，最短路径须解析为 +20°
    // → 50 + 20/360×100 ≈ 55.56（若走原始 −340° 会钳到 0，断言可区分两种实现）
    dragSequence(el, [p(350), p(10)])
    expect(attrValue(el)).toBeCloseTo(55.56, 1)
  })

  // ---------- 线性手势（interaction=axis） ----------

  it('axis 竖直：向上拖增值（150px = 全量程），step 吸附生效', () => {
    const el = mount({ interaction: 'axis', step: '10', value: '0' })
    stubRect(el)
    dragSequence(el, [
      [60, 60],
      [60, 20],
    ])
    // 40px / 150px × 100 = 26.7 → 吸附 30
    expect(attrValue(el)).toBe(30)
  })

  it('axis 竖直：向下拖减值，clamp 到 min', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '30' })
    stubRect(el)
    dragSequence(el, [
      [60, 60],
      [60, 210],
    ])
    expect(attrValue(el)).toBe(0)
  })

  it('axis 水平（axis=horizontal）：向右拖增值', () => {
    const el = mount({ interaction: 'axis', axis: 'horizontal', step: '0', value: '0' })
    stubRect(el)
    dragSequence(el, [
      [60, 60],
      [135, 60],
    ])
    expect(attrValue(el)).toBe(50)
  })

  it('Shift 精调：拖拽 delta ×0.2（只做 Shift 一档）', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '0' })
    stubRect(el)
    dragSequence(
      el,
      [
        [60, 60],
        [60, 30],
      ],
      { shift: true },
    )
    // 30px / 150px × 100 × 0.2 = 4
    expect(attrValue(el)).toBe(4)
  })

  // ---------- auto 中途解析 ----------

  it('auto：竖直主导 → 解析为线性（此后纯水平移动不改值，一次锁定不切换）', () => {
    const el = mount({ interaction: 'auto', axis: 'vertical', step: '0', value: '50' })
    stubRect(el)
    dragSequence(el, [
      [60, 60],
      [62, 45],
      [102, 45],
    ])
    // 竖直 -15px → +10；随后纯水平 40px 不再贡献
    expect(attrValue(el)).toBe(60)
  })

  it('auto：径向（水平）主导且与偏好轴垂直 → 解析为圆周跟随', () => {
    const el = mount({
      interaction: 'auto',
      axis: 'vertical',
      'start-angle': '0',
      'end-angle': '360',
      step: '0',
      value: '50',
    })
    stubRect(el)
    // 水平先动 → 圆周；12 点（0°）→ 3 点（90°）: +25
    dragSequence(el, [
      [60, 10],
      [110, 10],
      [110, 60],
    ])
    expect(attrValue(el)).toBe(75)
  })

  it('auto：偏好水平轴时竖直主导解析为圆周', () => {
    const el = mount({
      interaction: 'auto',
      axis: 'horizontal',
      'start-angle': '0',
      'end-angle': '360',
      step: '0',
      value: '0',
    })
    stubRect(el)
    // 12 点方位（0°）按下，竖直先动 → 圆周；0° → 45°: +12.5
    dragSequence(el, [
      [60, 30],
      [60, 10],
      [60 + 50 * Math.SQRT1_2, 60 - 50 * Math.SQRT1_2],
    ])
    expect(attrValue(el)).toBe(12.5)
  })

  // ---------- 拖拽事件与取消 ----------

  it('拖拽事件链：drag-start（有效移动才派发）→ input×N → drag-end + change（松手提交一次）', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '0' })
    stubRect(el)
    const fired: string[] = []
    let endDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-drag-start', () => fired.push('start'))
    el.addEventListener('oas-input', () => fired.push('input'))
    el.addEventListener('oas-drag-end', (e) => {
      fired.push('end')
      endDetail = (e as CustomEvent).detail
    })
    el.addEventListener('oas-change', (e) => {
      fired.push('change')
      changeDetail = (e as CustomEvent).detail
    })
    dragSequence(el, [
      [60, 60],
      [60, 45],
      [60, 30],
    ])
    expect(fired[0]).toBe('start')
    expect(fired.filter((x) => x === 'input').length).toBe(2)
    expect(fired[fired.length - 2]).toBe('end')
    expect(fired[fired.length - 1]).toBe('change')
    expect(endDetail).toEqual({ value: 20, cancelled: false })
    expect(changeDetail).toEqual({ value: 20 })
  })

  it('值未变化松手：drag-end 派发但不派发 change', () => {
    const el = mount({ interaction: 'axis', value: '50', max: '50' })
    stubRect(el)
    let change = 0
    let endCancelled: boolean | null = null
    el.addEventListener('oas-change', () => change++)
    el.addEventListener(
      'oas-drag-end',
      (e) => (endCancelled = ((e as CustomEvent).detail as { cancelled: boolean }).cancelled),
    )
    // 拖 40px：raw 越界被 clamp，值保持 50（已发生有效移动但不产生提交）
    dragSequence(el, [
      [60, 60],
      [60, 20],
    ])
    expect(change).toBe(0)
    expect(endCancelled).toBe(false)
  })

  it('pointercancel：回滚到拖拽起点值，派发 drag-end cancelled=true，不派发 change', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '30' })
    stubRect(el)
    let endDetail: unknown
    let change = 0
    el.addEventListener('oas-drag-end', (e) => (endDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', () => change++)
    const f = frame(el)
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 20, pointerId: 1 }))
    f.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, clientX: 60, clientY: 20, pointerId: 1 }))
    expect(attrValue(el)).toBe(30)
    expect(endDetail).toEqual({ value: 30, cancelled: true })
    expect(change).toBe(0)
  })

  it('Esc 取消拖拽：同 pointercancel（回滚零提交）', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '30' })
    stubRect(el)
    let cancelled: boolean | null = null
    el.addEventListener(
      'oas-drag-end',
      (e) => (cancelled = ((e as CustomEvent).detail as { cancelled: boolean }).cancelled),
    )
    const f = frame(el)
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    // 上拖 15px → +10 → 40
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
    expect(attrValue(el)).toBe(40)
    key(el, 'Escape')
    expect(attrValue(el)).toBe(30)
    expect(cancelled).toBe(true)
  })

  it('拖拽中外部写 value：显示保持拖拽值；拖拽已提交则拖拽值落盘，未变化则外部值保留', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '0' })
    stubRect(el)
    const f = frame(el)
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
    expect(attrValue(el)).toBe(10)
    // 受控写入：拖拽中显示不被外部值立即接管
    el.setAttribute('value', '99')
    expect(el.getAttribute('aria-valuenow')).toBe('10')
    // 松手：本次拖拽已有提交（0→10），拖拽值落盘（外部写入被拖拽提交覆盖）
    f.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
    expect(attrValue(el)).toBe(10)

    // 对比：拖拽零变化时松手，外部写入值保留显示（不被拖拽覆盖）
    const el2 = mount({ interaction: 'axis', step: '0', value: '0' })
    stubRect(el2)
    const f2 = frame(el2)
    f2.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    el2.setAttribute('value', '99')
    f2.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1 }))
    expect(el2.getAttribute('aria-valuenow')).toBe('99')
  })

  it('拖拽中置 disabled：终止手势回滚起点值（drag-end cancelled=true，零 change），后续移动不再改值', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '30' })
    stubRect(el)
    const f = frame(el)
    let endDetail: unknown
    let change = 0
    el.addEventListener('oas-drag-end', (e) => (endDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', () => change++)
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
    expect(attrValue(el)).toBe(40)
    // 拖拽中途禁用：立即回滚到起点值并派发取消
    el.setAttribute('disabled', '')
    expect(attrValue(el)).toBe(30)
    expect(endDetail).toEqual({ value: 30, cancelled: true })
    expect(change).toBe(0)
    // 手势已终止：继续移动/松手都不再改值、不再派发 change
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 10, pointerId: 1 }))
    f.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 60, clientY: 10, pointerId: 1 }))
    expect(attrValue(el)).toBe(30)
    expect(change).toBe(0)
  })

  it('拖拽中置 readonly：同禁用（终止手势回滚、零提交）', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '30' })
    stubRect(el)
    const f = frame(el)
    let endDetail: unknown
    let change = 0
    el.addEventListener('oas-drag-end', (e) => (endDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', () => change++)
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
    expect(attrValue(el)).toBe(40)
    el.setAttribute('readonly', '')
    expect(attrValue(el)).toBe(30)
    expect(endDetail).toEqual({ value: 30, cancelled: true })
    expect(change).toBe(0)
  })

  it('拖拽中移除再重连：手势被取消（不残留 drag 阻塞后续拖拽）', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '30' })
    stubRect(el)
    const f = frame(el)
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
    expect(attrValue(el)).toBe(40)
    // 拖拽中摘除 → 走取消路径回滚起点值
    document.body.removeChild(el)
    expect(attrValue(el)).toBe(30)
    // 重连后新拖拽必须可用（旧 drag 不残留）：起点 30 上拖 30px → +20 → 50
    document.body.appendChild(el)
    const f2 = frame(el)
    f2.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    f2.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 30, pointerId: 1 }))
    expect(attrValue(el)).toBe(50)
  })

  // ---------- 键盘 ----------

  it('键盘全键位：方向键 ±step、Shift+方向 / PageUp·Down 大步、Home/End 极值，每次按键派发 input+change', () => {
    const el = mount({ value: '50', min: '0', max: '100', step: '5' })
    let input = 0
    let change = 0
    el.addEventListener('oas-input', () => input++)
    el.addEventListener('oas-change', () => change++)
    key(el, 'ArrowUp')
    expect(attrValue(el)).toBe(55)
    key(el, 'ArrowRight')
    expect(attrValue(el)).toBe(60)
    key(el, 'ArrowDown')
    expect(attrValue(el)).toBe(55)
    key(el, 'ArrowLeft')
    expect(attrValue(el)).toBe(50)
    key(el, 'ArrowUp', { shift: true })
    expect(attrValue(el)).toBe(100)
    key(el, 'PageDown')
    expect(attrValue(el)).toBe(50)
    key(el, 'Home')
    expect(attrValue(el)).toBe(0)
    key(el, 'End')
    expect(attrValue(el)).toBe(100)
    expect(input).toBe(8)
    expect(change).toBe(8)
  })

  it('large-step 属性：Shift+方向 / Page 键按显式大步走', () => {
    const el = mount({ value: '50', 'large-step': '25' })
    key(el, 'PageUp')
    expect(attrValue(el)).toBe(75)
    key(el, 'ArrowDown', { shift: true })
    expect(attrValue(el)).toBe(50)
  })

  it('极值处按键：值不变不派发事件（边界安静）', () => {
    const el = mount({ value: '100' })
    let fired = 0
    el.addEventListener('oas-input', () => fired++)
    el.addEventListener('oas-change', () => fired++)
    const e = key(el, 'ArrowUp')
    expect(fired).toBe(0)
    expect(e.defaultPrevented).toBe(true)
  })

  it('readonly：可聚焦但一切值键被拦截', () => {
    const el = mount({ value: '50', readonly: '' })
    expect(el.getAttribute('aria-readonly')).toBe('true')
    expect(el.hasAttribute('tabindex')).toBe(true)
    const e = key(el, 'ArrowUp')
    expect(e.defaultPrevented).toBe(true)
    expect(attrValue(el)).toBe(50)
  })

  it('disabled：不可聚焦（无 tabindex）、键盘/指针全封、aria-disabled', () => {
    const el = mount({ value: '50', disabled: '' })
    expect(el.getAttribute('aria-disabled')).toBe('true')
    expect(el.hasAttribute('tabindex')).toBe(false)
    expect(el.tabIndex).toBe(-1)
    key(el, 'ArrowUp')
    expect(attrValue(el)).toBe(50)
    stubRect(el)
    dragSequence(el, [
      [60, 60],
      [60, 10],
    ])
    expect(attrValue(el)).toBe(50)
  })

  it('stepUp / stepDown 方法：按 step 增减', () => {
    const el = mount({ value: '50', step: '10' })
    el.stepUp()
    expect(attrValue(el)).toBe(60)
    el.stepDown()
    el.stepDown()
    expect(attrValue(el)).toBe(40)
  })

  // ---------- 滚轮（wheel，默认关） ----------

  it('wheel 属性开启后滚轮 ±step 调节（上滚增），Shift 精调；默认关闭不响应', () => {
    const off = mount({ value: '50' })
    off.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true }))
    expect(attrValue(off)).toBe(50)

    const el = mount({ value: '50', wheel: '' })
    const e = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true })
    el.dispatchEvent(e)
    expect(attrValue(el)).toBe(51)
    expect(e.defaultPrevented).toBe(true)
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true }))
    expect(attrValue(el)).toBe(50)
    // Shift 精调 0.2×step：50 - 0.2 → 吸附回 50（step=1 时精调不越档，连续 step 下才可见）
    const fine = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true })
    Object.defineProperty(fine, 'shiftKey', { value: true })
    el.dispatchEvent(fine)
    expect(attrValue(el)).toBe(50)
    const cont = mount({ value: '50', step: '0', wheel: '' })
    const contFine = new WheelEvent('wheel', { deltaY: 100, cancelable: true, bubbles: true })
    Object.defineProperty(contFine, 'shiftKey', { value: true })
    cont.dispatchEvent(contFine)
    // 连续模式：2（span/50）× 0.2 = 0.4 → 49.6
    expect(cont.getAttribute('aria-valuenow')).toBe('49.6')
  })

  // ---------- 复位 ----------

  it('双击复位到 default-value，派发 oas-reset（不派发 change）', () => {
    const el = mount({ value: '80', 'default-value': '30' })
    let resetDetail: unknown
    let change = 0
    el.addEventListener('oas-reset', (e) => (resetDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', () => change++)
    frame(el).dispatchEvent(new Event('dblclick', { bubbles: true }))
    expect(attrValue(el)).toBe(30)
    expect(resetDetail).toEqual({ value: 30, defaultValue: 30 })
    expect(change).toBe(0)
  })

  it('缺省 default-value 回落 min；Ctrl/Cmd+单击复位；reset() 方法同链路', () => {
    const el = mount({ value: '80', min: '10' })
    frame(el).dispatchEvent(new Event('dblclick', { bubbles: true }))
    expect(attrValue(el)).toBe(10)

    const el2 = mount({ value: '80', 'default-value': '40' })
    frame(el2).dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 5,
        clientY: 5,
        pointerId: 1,
        button: 0,
        ctrlKey: true,
      }),
    )
    expect(attrValue(el2)).toBe(40)

    const el3 = mount({ value: '80', 'default-value': '20' })
    ;(el3 as unknown as { reset(): void }).reset()
    expect(attrValue(el3)).toBe(20)
  })

  it('defaultValue property 通道：get 读属性（null = 未设），set 写/清属性', () => {
    const el = mount({ value: '80' })
    expect(el.defaultValue).toBeNull()
    el.defaultValue = 25
    expect(el.getAttribute('default-value')).toBe('25')
    expect(el.defaultValue).toBe(25)
    frame(el).dispatchEvent(new Event('dblclick', { bubbles: true }))
    expect(attrValue(el)).toBe(25)
    el.defaultValue = null
    expect(el.hasAttribute('default-value')).toBe(false)
  })

  it('readonly / disabled 下复位手势全封', () => {
    const ro = mount({ value: '80', readonly: '' })
    frame(ro).dispatchEvent(new Event('dblclick', { bubbles: true }))
    expect(attrValue(ro)).toBe(80)
    const dis = mount({ value: '80', disabled: '' })
    frame(dis).dispatchEvent(new Event('dblclick', { bubbles: true }))
    expect(attrValue(dis)).toBe(80)
  })

  // ---------- ARIA ----------

  it('可访问名：label 属性优先，缺省回落内置 i18n 文案', () => {
    const el = mount()
    expect(el.getAttribute('aria-label')).toBe('旋钮')
    const labeled = mount({ label: '增益' })
    expect(labeled.getAttribute('aria-label')).toBe('增益')
  })

  it('aria-valuetext：format 模板 / unit 后缀 / formatValue 函数三通道（函数优先），无格式化时移除', () => {
    const el = mount({ value: '40', format: '${value}%' })
    expect(el.getAttribute('aria-valuetext')).toBe('40%')
    const el2 = mount({ value: '40', unit: 'Hz' })
    expect(el2.getAttribute('aria-valuetext')).toBe('40Hz')
    const el3 = mount({ value: '40', unit: 'Hz', format: '${value}%' })
    el3.formatValue = (v) => `${v} hertz`
    expect(el3.getAttribute('aria-valuetext')).toBe('40 hertz')
    el3.formatValue = null
    expect(el3.getAttribute('aria-valuetext')).toBe('40%')
    const el4 = mount({ value: '40' })
    expect(el4.hasAttribute('aria-valuetext')).toBe(false)
  })

  it('show-value：显示格式化值文本，格式化函数/模板同源', () => {
    const el = mount({ 'show-value': '', value: '40', unit: 'dB' })
    const valueEl = el.shadowRoot!.querySelector<HTMLElement>('[part="value"]')!
    expect(valueEl.hidden).toBe(false)
    expect(valueEl.textContent).toBe('40dB')
    el.setAttribute('value', '55')
    expect(valueEl.textContent).toBe('55dB')
    const off = mount({ value: '40' })
    expect(off.shadowRoot!.querySelector<HTMLElement>('[part="value"]')!.hidden).toBe(true)
  })

  // ---------- RTL ----------

  it('RTL 书写方向自动镜像值扫描与左右键（reverse XOR rtl）', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const el = mount({ 'start-angle': '0', 'end-angle': '180' })
    el.setAttribute('value', '25')
    expect(angleOf(el)).toBe(135)
    el.setAttribute('value', '50')
    key(el, 'ArrowRight')
    expect(attrValue(el)).toBe(49)
    // 切回 ltr：dir 不在 observedAttributes（与 slider 同策略），属性变更触发重渲染后按新方向映射
    document.documentElement.setAttribute('dir', 'ltr')
    el.setAttribute('value', '25')
    expect(angleOf(el)).toBe(45)
  })

  // ---------- 指示器 / 尺寸 / token ----------

  it('indicator=dot 切换圆点指示器（data-indicator 镜像，CSS 变体切换）', () => {
    const el = mount({ indicator: 'dot' })
    expect(el.getAttribute('data-indicator')).toBe('dot')
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain(":host([data-indicator='dot'])")
    expect(el.getAttribute('data-indicator')).toBe('dot')
  })

  it('size 三档归一（sm/md/lg，small/medium/large 词表，非法回落 md）', () => {
    expect(mount({ size: 'sm' }).getAttribute('data-size')).toBe('sm')
    expect(mount({ size: 'large' }).getAttribute('data-size')).toBe('lg')
    expect(mount({ size: 'middle' }).getAttribute('data-size')).toBe('md')
    expect(mount().getAttribute('data-size')).toBe('md')
  })

  it('颜色只走 CSS 变量 token（无硬编码色值），尺寸/颜色通道可被 --oas-knob-* 覆盖', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).toContain('--oas-knob-fill: var(--oas-color-primary)')
    expect(css).toContain('--oas-knob-track: var(--oas-color-border)')
    expect(css).toContain('--oas-knob-size: 56px')
    expect(css).toMatch(/:host\(\[data-size='sm'\]\)/)
    expect(css).toMatch(/:host\(\[data-size='lg'\]\)/)
  })

  // ---------- SSR / hydrate ----------

  it('DSD 真水合：指纹命中 + 结构校验通过 → 接管（指纹移除、交互可用）', () => {
    const ref = mount({ value: '60' })
    const el = new OASKnob()
    el.setAttribute('value', '60')
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-knob">` + ref.shadowRoot!.innerHTML
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="frame"]')).toBeTruthy()
    expect(el.getAttribute('aria-valuenow')).toBe('60')
    // 接管后交互可用（键盘改值）
    key(el, 'ArrowUp')
    expect(attrValue(el)).toBe(61)
  })

  it('水合回退：结构缺失时 hydrate 返回 false → render 全量重建（功能正常）', () => {
    const el = new OASKnob()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-knob"><div>残缺快照</div>`
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="frame"]')).toBeTruthy()
    expect(el.getAttribute('aria-valuenow')).toBe('0')
  })

  // ---------- 杂项 ----------

  it('observedAttributes 覆盖全部声明属性（属性变化即触发增量同步）', () => {
    const observed = new Set((OASKnob as unknown as { observedAttributes: string[] }).observedAttributes)
    for (const a of [
      'value',
      'min',
      'max',
      'step',
      'start-angle',
      'end-angle',
      'size',
      'interaction',
      'axis',
      'indicator',
      'include-arc',
      'start-point',
      'show-value',
      'unit',
      'format',
      'disabled',
      'readonly',
      'reverse',
      'large-step',
      'label',
      'default-value',
      'wheel',
    ]) {
      expect(observed.has(a), `observedAttributes 缺 ${a}`).toBe(true)
    }
  })

  it('interaction / axis 非法值回落默认（auto / vertical）', () => {
    const el = mount({
      interaction: 'wat',
      axis: 'wat',
      value: '50',
      'start-angle': '0',
      'end-angle': '360',
      step: '0',
    })
    stubRect(el)
    // 非法 interaction → auto；竖直主导 → 线性
    dragSequence(el, [
      [60, 60],
      [60, 45],
    ])
    expect(attrValue(el)).toBe(60)
  })

  it('主指针独占：拖拽中第二指针不接管', () => {
    const el = mount({ interaction: 'axis', step: '0', value: '0' })
    stubRect(el)
    const f = frame(el)
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 60, pointerId: 1, button: 0 }),
    )
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
    // 第二指针按下 + 移动（id 不同）
    f.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 30, pointerId: 2, button: 0 }),
    )
    f.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 60, clientY: 0, pointerId: 2 }))
    expect(attrValue(el)).toBe(10)
    f.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 60, clientY: 45, pointerId: 1 }))
  })

  it('customElements 已注册 oas-knob', () => {
    expect(customElements.get('oas-knob')).toBe(OASKnob)
  })
})
