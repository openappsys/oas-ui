import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASTour, type TourStep } from './index.js'

const STEPS = JSON.stringify([
  { selector: '#step1', title: '第一步', description: '这里是第一步' },
  { selector: '#step2', title: '第二步', description: '这里是第二步' },
])

/** 构造 DOMRect mock（happy-dom 不做布局，getBoundingClientRect 恒为 0） */
function rect(x: number, y: number, w: number, h: number): DOMRect {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({}),
  } as DOMRect
}

function setTargetRect(id: string, r: DOMRect): void {
  const el = document.getElementById(id)
  if (el) Object.defineProperty(el, 'getBoundingClientRect', { value: () => r, configurable: true })
}

function mount(attrs: Record<string, string> = {}, steps = STEPS): OASTour {
  document.body.innerHTML = `<div id="step1" style="height:40px;width:120px"></div><div id="step2" style="height:40px;width:120px"></div>`
  setTargetRect('step1', rect(100, 100, 120, 40))
  setTargetRect('step2', rect(100, 300, 120, 40))
  const el = new OASTour()
  el.setAttribute('steps', steps)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function popup(el: OASTour): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.popup')!
}
function maskSegs(el: OASTour): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.mask-seg')]
}
function targetOf(el: OASTour): HTMLElement {
  return document.getElementById('step1')!
}

async function tick(): Promise<void> {
  await new Promise((r) => requestAnimationFrame(() => r(null)))
}

/** update() 为 protected，测试经类型桥触发增量同步 */
function forceUpdate(el: OASTour): void {
  ;(el as unknown as { update(): void }).update()
}

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('A 定位与滚动', () => {
  it('默认 placement=bottom：弹层在目标下方，data-placement 同步', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    expect(p.style.top).toBe('148px')
    expect(p.style.left).toBe('60px')
    expect(p.getAttribute('data-placement')).toBe('bottom')
  })

  it('placement=right：弹层在目标右侧并垂直居中', async () => {
    const el = mount({ placement: 'right' })
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    expect(p.style.top).toBe('80px')
    expect(p.style.left).toBe('228px')
    expect(p.getAttribute('data-placement')).toBe('right')
  })

  it('目标贴视口底边：bottom 溢出自动翻转 top', async () => {
    window.innerHeight = 600
    window.innerWidth = 800
    const el = mount()
    setTargetRect('step1', rect(100, 540, 120, 60))
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    expect(p.getAttribute('data-placement')).toBe('top')
    expect(p.style.top).toBe('452px')
  })

  it('空 steps 安全：open 时不抛错、弹层隐藏', async () => {
    const el = mount({}, '[]')
    el.setAttribute('open', '')
    await tick()
    expect(() => forceUpdate(el)).not.toThrow()
  })

  it('open 时目标 scrollIntoView 被调用（可配 options）', async () => {
    const el = mount({ 'scroll-into-view-options': '{"behavior":"smooth","block":"center"}' })
    const t = targetOf(el)
    const spy = vi.fn()
    ;(t as unknown as { scrollIntoView: unknown }).scrollIntoView = spy
    el.setAttribute('open', '')
    await tick()
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls[0]![0]).toEqual({ behavior: 'smooth', block: 'center' })
  })

  it('scroll-padding 设置目标 scrollMargin（px）', async () => {
    const el = mount({ 'scroll-padding': '24' })
    el.setAttribute('open', '')
    await tick()
    expect(targetOf(el).style.scrollMargin).toContain('24px')
  })

  it('滚动后重定位：目标 rect 变化 + window scroll → 弹层位置更新', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await tick()
    setTargetRect('step1', rect(100, 200, 120, 40))
    window.dispatchEvent(new Event('scroll'))
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    expect(p.style.top).toBe('248px')
  })

  it('arrow 默认显示，arrow="false" 隐藏，data-placement 随翻转同步', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await tick()
    const arrow = el.shadowRoot!.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.hidden).toBe(false)
    expect(popup(el).getAttribute('data-placement')).toBe('bottom')
    el.setAttribute('arrow', 'false')
    expect(arrow.hidden).toBe(true)
  })

  it('auto-reposition="false"：不翻转、不夹取（保持声明 placement 与原始坐标）', async () => {
    window.innerHeight = 600
    window.innerWidth = 800
    const el = mount({ 'auto-reposition': 'false' })
    setTargetRect('step1', rect(100, 540, 120, 60))
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    // 底部空间不足也不翻转到 top
    expect(p.getAttribute('data-placement')).toBe('bottom')
    // 不做视口避让：top = 540+60+8 = 608 > 600
    expect(p.style.top).toBe('608px')
  })

  it('-start/-end 对齐：箭头内联偏移指向目标中心投影（不再固定 16px）', async () => {
    const el = mount({ placement: 'bottom-start' })
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    const arrow = el.shadowRoot!.querySelector<HTMLElement>('[data-popper-arrow]')!
    // bottom-start：popup 左缘 = 目标左缘（100），目标中心 X=160 → 箭头 left = 160-100-4 = 56
    expect(arrow.style.left).toBe('56px')
  })

  it('arrow-point-at-center：弹层被视口夹取偏移后箭头仍指向目标中心', async () => {
    const el = mount({ 'arrow-point-at-center': 'true' })
    setTargetRect('step1', rect(10, 100, 120, 40))
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    const arrow = el.shadowRoot!.querySelector<HTMLElement>('[data-popper-arrow]')!
    // bottom 中心对齐 + 目标贴左缘：popup left 被夹取到 4，目标中心 X=70 → 箭头 left = 70-4-4 = 62
    expect(arrow.style.left).toBe('62px')
  })

  it('无 arrow-point-at-center：center 对齐箭头保持 CSS 居中（不写内联偏移）', async () => {
    const el = mount()
    setTargetRect('step1', rect(10, 100, 120, 40))
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    const arrow = el.shadowRoot!.querySelector<HTMLElement>('[data-popper-arrow]')!
    expect(arrow.style.left).toBe('')
  })
})

describe('A 遮罩与形态', () => {
  it('mask 默认模态：4 条遮罩段渲染并覆盖', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await tick()
    expect(maskSegs(el).length).toBe(4)
    for (const s of maskSegs(el)) expect(s.style.display).not.toBe('none')
  })

  it('mask="false" 非模态：遮罩段隐藏', async () => {
    const el = mount({ mask: 'false' })
    el.setAttribute('open', '')
    await tick()
    for (const s of maskSegs(el)) expect(s.style.display).toBe('none')
  })

  it('mask 颜色可配：mask=\'{"color":"#112233"}\' → 遮罩段背景色', async () => {
    const el = mount({ mask: '{"color":"#112233"}' })
    el.setAttribute('open', '')
    await tick()
    for (const s of maskSegs(el)) expect(s.style.background).toBe('#112233')
  })

  it('type=primary：弹层 data-type 同步（CSS 类选择器钩子）', async () => {
    const el = mount({ type: 'primary' })
    el.setAttribute('open', '')
    await tick()
    expect(popup(el).getAttribute('data-type')).toBe('primary')
  })

  it('gap 数字 → 高亮内边距（padding）', async () => {
    const el = mount({ gap: '8' })
    el.setAttribute('open', '')
    await tick()
    const h = el.shadowRoot!.querySelector<HTMLElement>('.highlight')!
    expect(h.style.top).toBe('92px') // 100 - 8
    expect(h.style.left).toBe('92px')
    expect(h.style.width).toBe('136px') // 120 + 16
    expect(h.style.height).toBe('56px') // 40 + 16
  })

  it('gap 对象 {padding,radius} → 高亮内边距 + 圆角', async () => {
    const el = mount({ gap: '{"padding":10,"radius":16}' })
    el.setAttribute('open', '')
    await tick()
    const h = el.shadowRoot!.querySelector<HTMLElement>('.highlight')!
    expect(h.style.top).toBe('90px')
    expect(h.style.borderRadius).toBe('16px')
  })

  it('gap offset 双轴：{"offset":[10,20]} 水平/垂直独立外扩', async () => {
    const el = mount({ gap: '{"offset":[10,20]}' })
    el.setAttribute('open', '')
    await tick()
    const h = el.shadowRoot!.querySelector<HTMLElement>('.highlight')!
    expect(h.style.top).toBe('76px') // 100 - 4(padding) - 20(垂直)
    expect(h.style.left).toBe('86px') // 100 - 4 - 10(水平)
    expect(h.style.width).toBe('148px') // 120 + (4+10)*2
    expect(h.style.height).toBe('88px') // 40 + (4+20)*2
  })

  it('gap offset 数字：{"offset":6} 四周统一外扩', async () => {
    const el = mount({ gap: '{"offset":6}' })
    el.setAttribute('open', '')
    await tick()
    const h = el.shadowRoot!.querySelector<HTMLElement>('.highlight')!
    expect(h.style.top).toBe('90px') // 100 - 4 - 6
    expect(h.style.left).toBe('90px')
  })

  it('step 级 gap offset（property 通道对象）', async () => {
    const el = mount()
    el.steps = [
      { target: document.getElementById('step1')!, title: 's1', gap: { offset: [5, 10] } },
    ]
    el.setAttribute('open', '')
    await tick()
    const h = el.shadowRoot!.querySelector<HTMLElement>('.highlight')!
    expect(h.style.top).toBe('86px') // 100 - 4 - 10
    expect(h.style.left).toBe('91px') // 100 - 4 - 5
  })

  it('mask="false" 非模态：aria-modal 降级为 false（读屏不误判模态）', async () => {
    const el = mount({ mask: 'false' })
    el.setAttribute('open', '')
    await tick()
    expect(popup(el).getAttribute('aria-modal')).toBe('false')
  })

  it('mask 默认模态：aria-modal="true"', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await tick()
    expect(popup(el).getAttribute('aria-modal')).toBe('true')
  })

  it('遮罩点击行为：mask-click-behavior=close → 点遮罩派发 oas-cancel 并关闭', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let cancelled = 0
    el.addEventListener('oas-cancel', () => cancelled++)
    ;(maskSegs(el)[0] as HTMLElement).click()
    expect(cancelled).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('遮罩点击行为：mask-click-behavior=next → 点遮罩推进步骤', async () => {
    const el = mount({ 'mask-click-behavior': 'next' })
    el.setAttribute('open', '')
    let detail: unknown
    el.addEventListener('oas-step', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(maskSegs(el)[0] as HTMLElement).click()
    expect(detail).toMatchObject({ index: 1 })
    expect(el.getAttribute('current')).toBe('1')
  })

  it('遮罩点击行为：mask-click-behavior=none → 点遮罩无响应', async () => {
    const el = mount({ 'mask-click-behavior': 'none' })
    el.setAttribute('open', '')
    let cancelled = 0
    el.addEventListener('oas-cancel', () => cancelled++)
    ;(maskSegs(el)[0] as HTMLElement).click()
    expect(cancelled).toBe(0)
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('高亮区可交互：target-area-clickable → 拦截层隐藏（点击穿透目标）', async () => {
    const el = mount({ 'target-area-clickable': 'true' })
    el.setAttribute('open', '')
    await tick()
    const inter = el.shadowRoot!.querySelector<HTMLElement>('.hl-interceptor')!
    expect(inter.style.display).toBe('none')
  })

  it('disabled-interaction：拦截层显示（禁止高亮区交互）', async () => {
    const el = mount({ 'disabled-interaction': 'true' })
    el.setAttribute('open', '')
    await tick()
    const inter = el.shadowRoot!.querySelector<HTMLElement>('.hl-interceptor')!
    expect(inter.style.display).not.toBe('none')
  })
})

describe('A 导航与按钮', () => {
  it('键盘 →/← 推进步骤并派发 oas-step，首步 ← 不越界', async () => {
    const el = mount()
    el.setAttribute('open', '')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(el.shadowRoot!.textContent).toContain('第一步')
    let detail: unknown
    el.addEventListener('oas-step', (e: Event) => (detail = (e as CustomEvent).detail))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(el.getAttribute('current')).toBe('1')
    expect(detail).toMatchObject({ index: 1 })
  })

  it('keyboard="false" 时方向键不响应', async () => {
    const el = mount({ keyboard: 'false' })
    el.setAttribute('open', '')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(el.getAttribute('current')).toBeNull()
    expect(el.shadowRoot!.textContent).toContain('第一步')
  })

  it('close-on-press-escape="false" 时 Esc 不关闭', async () => {
    const el = mount({ 'close-on-press-escape': 'false' })
    el.setAttribute('open', '')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('show-close 默认显示关闭按钮，点击派发 oas-close 并关闭', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let closed = 0
    el.addEventListener('oas-close', () => closed++)
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(closed).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('show-close="false" 隐藏关闭按钮', async () => {
    const el = mount({ 'show-close': 'false' })
    el.setAttribute('open', '')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.style.display).toBe('none')
  })

  it('close-icon 自定义关闭按钮内容（HTML）', async () => {
    const el = mount({ 'close-icon': '<b>X</b>' })
    el.setAttribute('open', '')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.innerHTML).toContain(
      '<b>X</b>',
    )
  })

  it('hide-prev / hide-skip / hide-next / hide-counter 控制显隐', async () => {
    const el = mount({
      'hide-prev': 'true',
      'hide-skip': 'true',
      'hide-next': 'true',
      'hide-counter': 'true',
    })
    el.setAttribute('open', '')
    await tick()
    const shadow = el.shadowRoot!
    expect(shadow.querySelector<HTMLElement>('[part="prev"]')!.style.display).toBe('none')
    expect(shadow.querySelector<HTMLElement>('[part="skip"]')!.style.display).toBe('none')
    expect(shadow.querySelector<HTMLElement>('[part="next"]')!.style.display).toBe('none')
    expect(shadow.querySelector<HTMLElement>('[part="step-count"]')!.style.display).toBe('none')
  })

  it('按钮 props 透传：next-button-props JSON → 按钮属性生效', async () => {
    const el = mount({ 'next-button-props': '{"data-x":"1","disabled":""}' })
    el.setAttribute('open', '')
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="next"]')!
    expect(btn.getAttribute('data-x')).toBe('1')
  })

  it('skip 按钮派发 oas-skip + oas-cancel + oas-destroy', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let skipped = 0
    let cancelled = 0
    let destroyed = 0
    el.addEventListener('oas-skip', () => skipped++)
    el.addEventListener('oas-cancel', () => cancelled++)
    el.addEventListener('oas-destroy', () => destroyed++)
    el.shadowRoot!.querySelector<HTMLElement>('[part="skip"]')!.click()
    expect(skipped).toBe(1)
    expect(cancelled).toBe(1)
    expect(destroyed).toBe(1)
  })

  it('断开→重连后 Esc / 方向键仍生效（keydown 幂等重挂）', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await tick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(el.getAttribute('current')).toBe('1')
    // 断开：cleanup 移除 document keydown
    el.remove()
    // 重连：update 路径幂等重挂 keydown
    document.body.appendChild(el)
    let cancelled = 0
    el.addEventListener('oas-cancel', () => cancelled++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancelled).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('slot="actions"：有内容时隐藏内置 prev/skip/next 按钮', () => {
    const el = mount()
    const custom = document.createElement('div')
    custom.setAttribute('slot', 'actions')
    const b = document.createElement('button')
    b.textContent = '自定义下一步'
    custom.appendChild(b)
    el.appendChild(custom)
    el.setAttribute('open', '')
    const shadow = el.shadowRoot!
    expect(shadow.querySelector<HTMLElement>('[part="prev"]')!.style.display).toBe('none')
    expect(shadow.querySelector<HTMLElement>('[part="skip"]')!.style.display).toBe('none')
    expect(shadow.querySelector<HTMLElement>('[part="next"]')!.style.display).toBe('none')
    const slotEl = shadow.querySelector<HTMLSlotElement>('slot[name="actions"]')!
    expect(slotEl.assignedNodes().length).toBe(1)
  })
})

describe('B 步骤配置与内容', () => {
  it('step 级 placement 覆盖全局', async () => {
    const steps = JSON.stringify([
      { selector: '#step1', title: 's1', placement: 'right' },
      { selector: '#step2', title: 's2' },
    ])
    const el = mount({ placement: 'bottom' }, steps)
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    p.getBoundingClientRect = () => rect(0, 0, 200, 80)
    forceUpdate(el)
    expect(p.getAttribute('data-placement')).toBe('right')
  })

  it('step 级 mask=false 覆盖全局 mask', async () => {
    const steps = JSON.stringify([{ selector: '#step1', title: 's1', mask: false }])
    const el = mount({}, steps)
    el.setAttribute('open', '')
    await tick()
    for (const s of maskSegs(el)) expect(s.style.display).toBe('none')
  })

  it('step 级 type=primary 覆盖全局', async () => {
    const steps = JSON.stringify([{ selector: '#step1', title: 's1', type: 'primary' }])
    const el = mount({}, steps)
    el.setAttribute('open', '')
    await tick()
    expect(popup(el).getAttribute('data-type')).toBe('primary')
  })

  it('cover 图片：step.cover → img 显示且 src 正确', async () => {
    const steps = JSON.stringify([
      { selector: '#step1', title: 's1', cover: 'https://example.com/a.png' },
    ])
    const el = mount({}, steps)
    el.setAttribute('open', '')
    const img = el.shadowRoot!.querySelector<HTMLImageElement>('.cover-img')!
    expect(img.hidden).toBe(false)
    expect(img.getAttribute('src')).toBe('https://example.com/a.png')
  })

  it('target 元素形态：steps property 传 HTMLElement', async () => {
    const el = mount()
    el.steps = [{ target: document.getElementById('step2')!, title: '元素目标' }]
    el.setAttribute('open', '')
    expect(el.shadowRoot!.textContent).toContain('元素目标')
  })

  it('target 函数形态：steps property 传 () => HTMLElement', async () => {
    const el = mount()
    el.steps = [{ target: () => document.getElementById('step2'), title: '函数目标' }]
    el.setAttribute('open', '')
    expect(el.shadowRoot!.textContent).toContain('函数目标')
  })

  it('waitForElement：目标缺失时等待出现后再高亮', async () => {
    vi.useFakeTimers()
    try {
      const steps = JSON.stringify([{ selector: '#late', title: '延迟目标', waitForElement: 200 }])
      const el = mount({}, steps)
      el.setAttribute('open', '')
      const h = el.shadowRoot!.querySelector<HTMLElement>('.highlight')!
      expect(h.style.display).toBe('none')
      const late = document.createElement('div')
      late.id = 'late'
      document.body.appendChild(late)
      Object.defineProperty(late, 'getBoundingClientRect', { value: () => rect(50, 50, 60, 30) })
      vi.advanceTimersByTime(250)
      await Promise.resolve()
      expect(h.style.display).not.toBe('none')
      late.remove()
    } finally {
      vi.useRealTimers()
    }
  })

  it('skipMissingElement：等待超时后跳过该步骤', async () => {
    vi.useFakeTimers()
    try {
      const steps = JSON.stringify([
        { selector: '#ghost', title: '缺失目标', waitForElement: 100, skipMissingElement: true },
        { selector: '#step2', title: '第二步' },
      ])
      const el = mount({}, steps)
      el.setAttribute('open', '')
      vi.advanceTimersByTime(150)
      await Promise.resolve()
      expect(el.getAttribute('current')).toBe('1')
      expect(el.shadowRoot!.textContent).toContain('第二步')
    } finally {
      vi.useRealTimers()
    }
  })

  it('mode=dialog：无目标弹层居中（style top/left 50% 语义）', async () => {
    const steps = JSON.stringify([{ title: '对话框步骤', description: '居中' }])
    const el = mount({}, steps)
    el.setAttribute('open', '')
    await tick()
    const p = popup(el)
    expect(p.style.top).toBe('50%')
    expect(p.style.left).toBe('50%')
  })

  it('step 级 mode=dialog 覆盖全局 popup', async () => {
    const steps = JSON.stringify([{ selector: '#step1', title: 's1', mode: 'dialog' }])
    const el = mount({}, steps)
    el.setAttribute('open', '')
    await tick()
    expect(popup(el).style.top).toBe('50%')
  })

  it('progress-text 模板：{{current}}/{{total}} 替换', async () => {
    const el = mount({ 'progress-text': '{{current}}/{{total}} 步' })
    el.setAttribute('open', '')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="step-count"]')!.textContent).toContain(
      '1/2',
    )
  })

  it('show-progress：进度条宽度随步骤推进（内联宽度百分比）', async () => {
    const el = mount({ 'show-progress': 'true' })
    el.setAttribute('open', '')
    const bar = el.shadowRoot!.querySelector<HTMLElement>('[part="progress"]')!
    expect(bar.style.width).toBe('50%')
    el.setAttribute('current', '1')
    expect(bar.style.width).toBe('100%')
  })

  it('advance-on-click：点击拦截层推进下一步', async () => {
    const el = mount({ 'advance-on-click': 'true' })
    el.setAttribute('open', '')
    await tick()
    const inter = el.shadowRoot!.querySelector<HTMLElement>('.hl-interceptor')!
    inter.click()
    expect(el.getAttribute('current')).toBe('1')
  })

  it('advance-on-click：步骤间 target 不同 → 旧 target 无残留 click 监听', async () => {
    const el = mount({ 'advance-on-click': 'true', 'target-area-clickable': 'true' })
    el.setAttribute('open', '')
    await tick()
    const t1 = document.getElementById('step1')!
    const t2 = document.getElementById('step2')!
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    // 点击 step1 目标 → 推进到第 2 步（目标切换为 step2）
    t1.click()
    expect(el.getAttribute('current')).toBe('1')
    // 旧目标 step1 上的监听必须已移除：再点它不应推进/关闭
    t1.click()
    expect(el.getAttribute('current')).toBe('1')
    expect(el.hasAttribute('open')).toBe(true)
    expect(finished).toBe(0)
    // 新目标 step2 监听仍在：点它完成引导
    t2.click()
    expect(finished).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })
})

describe('B 指示器与生命周期', () => {
  it('show-bullets：圆点渲染，点击圆点跳步并派发 oas-step', async () => {
    const el = mount({ 'show-bullets': 'true' })
    el.setAttribute('open', '')
    const bullets = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('[part="bullet"]')
    expect(bullets.length).toBe(2)
    let detail: unknown
    el.addEventListener('oas-step', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(bullets[1] as HTMLButtonElement).click()
    expect(detail).toMatchObject({ index: 1 })
    expect(el.getAttribute('current')).toBe('1')
  })

  it('indicators=number：步骤序号显示', async () => {
    const el = mount({ indicators: 'number' })
    el.setAttribute('open', '')
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="step-count"]')!.textContent).toContain(
      '1',
    )
  })

  it('slot="indicators"：有内容时隐藏内置圆点/数字指示器', () => {
    const el = mount({ 'show-bullets': 'true' })
    const custom = document.createElement('span')
    custom.setAttribute('slot', 'indicators')
    custom.textContent = '2 / 2'
    el.appendChild(custom)
    el.setAttribute('open', '')
    const shadow = el.shadowRoot!
    expect(shadow.querySelector<HTMLElement>('[part="step-count"]')!.style.display).toBe('none')
    expect(shadow.querySelector<HTMLElement>('[part="bullets"]')!.style.display).toBe('none')
    const slotEl = shadow.querySelector<HTMLSlotElement>('slot[name="indicators"]')!
    expect(slotEl.assignedNodes().length).toBe(1)
  })

  it('slot="indicators" 无内容：内置指示器照常显示', () => {
    const el = mount({ 'show-bullets': 'true' })
    el.setAttribute('open', '')
    const bullets = el.shadowRoot!.querySelector<HTMLElement>('[part="bullets"]')!
    expect(bullets.style.display).not.toBe('none')
  })

  it('生命周期：oas-highlight-start / oas-highlight-end / oas-destroy', async () => {
    const el = mount()
    const fired: string[] = []
    el.addEventListener('oas-highlight-start', () => fired.push('start'))
    el.addEventListener('oas-highlight-end', () => fired.push('end'))
    el.addEventListener('oas-destroy', () => fired.push('destroy'))
    el.setAttribute('open', '')
    await tick()
    expect(fired).toContain('start')
    expect(fired).toContain('end')
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(fired).toContain('destroy')
  })

  it('lock-scroll：引导期间锁 body 滚动，关闭恢复', async () => {
    const el = mount({ 'lock-scroll': 'true' })
    el.setAttribute('open', '')
    expect(document.body.style.overflow).toBe('hidden')
    el.removeAttribute('open')
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('open 受控移除（外部 removeAttribute）也派发 oas-destroy', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let destroyed = 0
    el.addEventListener('oas-destroy', () => destroyed++)
    el.removeAttribute('open')
    expect(destroyed).toBe(1)
  })
})

describe('hints / 记忆 / 多页 / 打字机 / 挂载', () => {
  it('hints 信标渲染并定位到目标中心', async () => {
    const hints = JSON.stringify([
      { id: 'h1', selector: '#step1', title: '提示一', description: '这里有个功能' },
    ])
    const el = mount({ hints })
    await tick()
    const beacons = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.beacon')
    expect(beacons.length).toBe(1)
    expect(beacons[0]!.style.left).toBe('160px') // 100 + 60 中心
    expect(beacons[0]!.style.top).toBe('120px') // 100 + 20 中心
  })

  it('点击信标弹气泡，点「知道了」关闭', async () => {
    const hints = JSON.stringify([
      { id: 'h1', selector: '#step1', title: '提示一', description: '这里有个功能' },
    ])
    const el = mount({ hints })
    await tick()
    el.shadowRoot!.querySelector<HTMLButtonElement>('.beacon')!.click()
    const bubble = el.shadowRoot!.querySelector<HTMLElement>('.hint-popup')!
    expect(bubble.hidden).toBe(false)
    expect(bubble.textContent).toContain('这里有个功能')
    bubble.querySelector<HTMLElement>('[part="hint-dismiss"]')!.click()
    expect(bubble.hidden).toBe(true)
  })

  it('hint dismissable：点知道了后 localStorage 记忆，信标消失', async () => {
    const hints = JSON.stringify([
      { id: 'h1', selector: '#step1', title: '提示一', dismissable: true },
    ])
    const el = mount({ hints })
    await tick()
    el.shadowRoot!.querySelector<HTMLButtonElement>('.beacon')!.click()
    el.shadowRoot!.querySelector<HTMLElement>('[part="hint-dismiss"]')!.click()
    expect(localStorage.getItem('oas-tour-hint-h1')).toBe('1')
    forceUpdate(el)
    expect(el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.beacon').length).toBe(0)
  })

  it('dont-show-again：勾选关闭后 localStorage 记忆，再次 open 被拦截并派发 oas-dismiss', async () => {
    const el = mount({ 'dont-show-again': 'true', 'storage-key': 'oas-tour-test' })
    el.setAttribute('open', '')
    const cb = el.shadowRoot!.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    cb.checked = true
    cb.dispatchEvent(new Event('change'))
    let dismissed = 0
    el.addEventListener('oas-dismiss', () => dismissed++)
    el.shadowRoot!.querySelector<HTMLElement>('[part="close"]')!.click()
    expect(localStorage.getItem('oas-tour-test')).toBe('1')
    el.setAttribute('open', '')
    expect(el.hasAttribute('open')).toBe(false)
    expect(dismissed).toBe(1)
  })

  it('persist：引导状态写入 localStorage，重新连接恢复 open/current', async () => {
    const el = mount({ persist: 'true', 'storage-key': 'oas-tour-state-test' })
    el.setAttribute('open', '')
    el.setAttribute('current', '1')
    el.remove()
    const el2 = mount({ persist: 'true', 'storage-key': 'oas-tour-state-test' })
    el2.setAttribute('persist', 'true')
    await tick()
    expect(el2.hasAttribute('open')).toBe(true)
    expect(el2.getAttribute('current')).toBe('1')
  })

  it('typewriter：描述逐字显示，最终完整', async () => {
    vi.useFakeTimers()
    try {
      const el = mount({ typewriter: 'true', 'typewriter-speed': '10' })
      el.setAttribute('open', '')
      const desc = el.shadowRoot!.querySelector<HTMLElement>('[part="desc"]')!
      expect(desc.textContent!.length).toBeLessThan('这里是第一步'.length)
      vi.advanceTimersByTime(500)
      await Promise.resolve()
      expect(desc.textContent).toBe('这里是第一步')
    } finally {
      vi.useRealTimers()
    }
  })

  it('append-to="body"：overlay 移入 body（portal 容器），组件 shadow 内不再持有', async () => {
    const el = mount({ 'append-to': 'body' })
    el.setAttribute('open', '')
    await tick()
    const portalHost = document.querySelector<HTMLElement>('[data-oas-tour-portal]')!
    expect(portalHost).not.toBeNull()
    expect(document.body.contains(portalHost)).toBe(true)
    const overlay = portalHost.shadowRoot!.querySelector<HTMLElement>('.overlay')!
    expect(overlay.getRootNode()).not.toBe(el.shadowRoot)
    expect(el.shadowRoot!.querySelector('.overlay')).toBeNull()
  })

  it('append-to + slot="cover"：cover 内容桥接到 portal host light DOM，关闭移回宿主', async () => {
    const el = mount({ 'append-to': 'body' })
    const cover = document.createElement('div')
    cover.setAttribute('slot', 'cover')
    cover.textContent = '封面富内容'
    el.appendChild(cover)
    el.setAttribute('open', '')
    await tick()
    const portalHost = document.querySelector<HTMLElement>('[data-oas-tour-portal]')!
    expect(portalHost).not.toBeNull()
    // 宿主 light DOM 不再持有 cover 节点（已桥接到 portal host）
    expect(el.querySelector('[slot="cover"]')).toBeNull()
    const bridged = portalHost.querySelector<HTMLElement>('[slot="cover"]')
    expect(bridged).not.toBeNull()
    expect(bridged!.textContent).toBe('封面富内容')
    // popup 内 <slot name="cover"> 能跨 host 分配到桥接节点（不断供）
    const slotEl = portalHost.shadowRoot!.querySelector<HTMLSlotElement>(
      '.popup slot[name="cover"]',
    )!
    expect(slotEl.assignedNodes().some((n) => n.textContent === '封面富内容')).toBe(true)
    // 关闭：portal 拆除，节点移回宿主，无孤儿
    el.removeAttribute('open')
    expect(document.querySelector('[data-oas-tour-portal]')).toBeNull()
    expect(el.querySelector('[slot="cover"]')?.textContent).toBe('封面富内容')
  })

  it('z-index 属性 → overlay 内联 zIndex', async () => {
    const el = mount({ 'z-index': '9999' })
    el.setAttribute('open', '')
    const overlay = el.shadowRoot!.querySelector<HTMLElement>('.overlay')!
    expect(overlay.style.zIndex).toBe('9999')
  })
})

describe('既有行为回归', () => {
  it('open 时显示引导气泡与遮罩', async () => {
    const el = mount()
    el.setAttribute('open', '')
    await Promise.resolve()
    expect(el.shadowRoot!.querySelector('[part="mask-top"]')).not.toBeNull()
    expect(el.shadowRoot!.textContent).toContain('第一步')
  })

  it('下一步切换步骤并派发 oas-step', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let detail: unknown
    el.addEventListener('oas-step', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(detail).toMatchObject({ index: 1 })
    expect(el.shadowRoot!.textContent).toContain('第二步')
  })

  it('最后一步完成派发 oas-finish 并关闭', async () => {
    const el = mount()
    el.setAttribute('open', '')
    el.setAttribute('current', '1')
    let finished = 0
    el.addEventListener('oas-finish', () => finished++)
    ;(el.shadowRoot!.querySelector('[part="next"]') as HTMLElement).click()
    expect(finished).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('Esc 派发 oas-cancel', async () => {
    const el = mount()
    el.setAttribute('open', '')
    let cancelled = 0
    el.addEventListener('oas-cancel', () => cancelled++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(cancelled).toBe(1)
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('target 缺失时弹层居中（非 dialog 隐式 fallback）', async () => {
    const steps = JSON.stringify([{ selector: '#nope', title: '找不到目标' }])
    const el = mount({}, steps)
    el.setAttribute('open', '')
    await tick()
    expect(popup(el).style.top).toBe('50%')
  })
})

// ===== SSR 快照结构：新增部件必须在模板中保持（水合 probe 依赖） =====
describe('SSR 模板结构', () => {
  it('模板包含遮罩/高亮/弹层/箭头/进度/关闭/圆点容器与命名插槽', () => {
    const el = new OASTour()
    el.setAttribute('steps', STEPS)
    document.body.appendChild(el)
    const shadow = el.shadowRoot!
    expect(shadow.querySelector('.overlay')).not.toBeNull()
    expect(shadow.querySelector('.highlight')).not.toBeNull()
    expect(shadow.querySelector('.popup')).not.toBeNull()
    expect(shadow.querySelector('[data-popper-arrow]')).not.toBeNull()
    expect(shadow.querySelector('.progress')).not.toBeNull()
    expect(shadow.querySelector('.close')).not.toBeNull()
    expect(shadow.querySelector('.hints')).not.toBeNull()
    expect(shadow.querySelector('.hint-popup')).not.toBeNull()
    expect(shadow.querySelector('slot[name="cover"]')).not.toBeNull()
    expect(shadow.querySelector('slot[name="indicators"]')).not.toBeNull()
    expect(shadow.querySelector('slot[name="actions"]')).not.toBeNull()
  })
})
