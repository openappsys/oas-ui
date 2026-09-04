import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASColorPicker } from './index.js'

/** 与实现同步的默认值（值属性缺失时内部色板的起始色） */
const DEFAULT_VALUE = '#0066ff'

function mount(attrs: Record<string, string> = {}): OASColorPicker {
  const el = new OASColorPicker()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASColorPicker): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function panelEl(el: OASColorPicker): HTMLElement {
  return el.shadowRoot!.querySelector('[part="panel"]')!
}

function textEl(el: OASColorPicker): HTMLElement {
  return el.shadowRoot!.querySelector('.hex-text')!
}

function isOpen(el: OASColorPicker): boolean {
  return el.hasAttribute('open')
}

function open(el: OASColorPicker): void {
  trigger(el).click()
}

function setRect(el: Element, rect: Partial<DOMRect>): void {
  ;(el as unknown as { getBoundingClientRect(): DOMRect }).getBoundingClientRect = () =>
    ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, ...rect }) as DOMRect
}

let savedVw = 0
let savedVh = 0
let savedEye: unknown

describe('OASColorPicker 一期增强', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    savedVw = window.innerWidth
    savedVh = window.innerHeight
    savedEye = (window as unknown as Record<string, unknown>).EyeDropper
  })

  afterEach(() => {
    document.body.innerHTML = ''
    window.innerWidth = savedVw
    window.innerHeight = savedVh
    const w = window as unknown as Record<string, unknown>
    if (savedEye === undefined) delete w.EyeDropper
    else w.EyeDropper = savedEye
  })

  // ---------- 基础渲染 ----------

  it('渲染 trigger：aria-label、value 驱动文本与色块', () => {
    const el = mount({ value: '#ff0000' })
    expect(trigger(el).getAttribute('aria-label')).toBe('颜色选择器')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(textEl(el).textContent).toBe('#ff0000')
    const sw = el.shadowRoot!.querySelector<HTMLElement>('.swatch')!
    expect(sw.style.backgroundColor).toBe('rgba(255, 0, 0, 1)')
  })

  it('空值渲染「未选择」占位（.placeholder 标记），色块隐藏', () => {
    const el = mount()
    expect(textEl(el).classList.contains('placeholder')).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLElement>('.swatch')!.hasAttribute('hidden')).toBe(true)
  })

  // ---------- A2 解析宽容 + 格式化 ----------

  it('value 宽容解析：CSS 颜色名 / rgb() / hsl() 归一化显示为 hex', () => {
    const red = mount({ value: 'red' })
    expect(textEl(red).textContent).toBe('#ff0000')
    red.remove()
    const rgb = mount({ value: 'rgb(0, 255, 0)' })
    expect(textEl(rgb).textContent).toBe('#00ff00')
    rgb.remove()
    const hsl = mount({ value: 'hsl(240, 100%, 50%)' })
    expect(textEl(hsl).textContent).toBe('#0000ff')
  })

  it('非法 value 不崩、不改属性、显示回落默认值', () => {
    const el = mount({ value: 'not-a-color' })
    expect(el.getAttribute('value')).toBe('not-a-color')
    expect(textEl(el).textContent).toBe(DEFAULT_VALUE)
  })

  it('color-format=rgb：文本与提交走 rgb()', () => {
    const el = mount({ value: '#ff0000', 'color-format': 'rgb' })
    expect(textEl(el).textContent).toBe('rgb(255, 0, 0)')
    open(el)
    const preset = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.preset')
    preset[1]!.click()
    expect(el.getAttribute('value')).toBe('rgb(22, 163, 74)')
  })

  it('uppercase：hex 输出大写（rgb 格式不受影响）', () => {
    const el = mount({ value: '#0b6cff', uppercase: '' })
    expect(textEl(el).textContent).toBe('#0B6CFF')
    el.setAttribute('color-format', 'rgb')
    expect(textEl(el).textContent).toBe('rgb(11, 108, 255)')
  })

  // ---------- A8 open 受控 ----------

  it('初始无事件；setAttribute open 打开并派发 oas-open-change{open:true}', () => {
    const el = mount()
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e) => {
      events.push((e as CustomEvent).detail.open)
    })
    expect(isOpen(el)).toBe(false)
    el.setAttribute('open', '')
    expect(isOpen(el)).toBe(true)
    expect(panelEl(el).classList.contains('open')).toBe(true)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(events).toEqual([true])
  })

  it('removeAttribute open 关闭并派发 oas-open-change{open:false}', () => {
    const el = mount({ open: '' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e) => {
      events.push((e as CustomEvent).detail.open)
    })
    el.removeAttribute('open')
    expect(panelEl(el).classList.contains('open')).toBe(false)
    expect(events).toEqual([false])
  })

  it('初始 open 不派发 oas-open-change（仅变化时）', () => {
    const el = mount({ open: '' })
    let fired = 0
    el.addEventListener('oas-open-change', () => fired++)
    expect(panelEl(el).classList.contains('open')).toBe(true)
    expect(fired).toBe(0)
  })

  it('点击 trigger 纯开关（P-A：无 ↑/↓ 调亮度）：二次点击关闭', () => {
    const el = mount({ value: '#808080' })
    const events: boolean[] = []
    el.addEventListener('oas-open-change', (e) => {
      events.push((e as CustomEvent).detail.open)
    })
    trigger(el).click()
    expect(isOpen(el)).toBe(true)
    trigger(el).click()
    expect(isOpen(el)).toBe(false)
    expect(events).toEqual([true, false])
  })

  it('Esc 与外部点击关闭（派发 open-change）', () => {
    const el = mount()
    const closes: number[] = []
    el.addEventListener('oas-open-change', (e) => {
      if (!(e as CustomEvent).detail.open) closes.push(1)
    })
    open(el)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(isOpen(el)).toBe(false)
    open(el)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(isOpen(el)).toBe(false)
    expect(closes.length).toBe(2)
  })

  it('面板内点击不触发外部点击关闭', () => {
    const el = mount()
    open(el)
    const preset = el.shadowRoot!.querySelector<HTMLButtonElement>('.preset')!
    preset.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(isOpen(el)).toBe(true)
  })

  // ---------- 预设（A12 label / 行列 / 任意格式串） ----------

  it('preset 字符串元素可含任意 CSS 格式；点击提交归一化 + oas-change', () => {
    const el = mount({ preset: '["red","hsl(120,100%,50%)"]' })
    let detail: unknown
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    open(el)
    const presets = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.preset')
    expect(presets.length).toBe(2)
    presets[1]!.click()
    expect(el.getAttribute('value')).toBe('#00ff00')
    expect(detail).toEqual({ value: '#00ff00' })
  })

  it('preset 元素支持 {color,label}：label 作可访问名；点击颜色生效', () => {
    const el = mount({ preset: '[{"color":"#dc2626","label":"品牌红"}]' })
    open(el)
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.preset')!
    expect(btn.getAttribute('aria-label')).toBe('品牌红')
    expect(btn.style.backgroundColor).toBe('rgba(220, 38, 38, 1)')
    btn.click()
    expect(el.getAttribute('value')).toBe('#dc2626')
  })

  it('preset-columns / preset-rows 可配行列（超出截断）', () => {
    const list = '["#111111","#222222","#333333","#444444","#555555","#666666","#777777","#888888","#999999"]'
    const el = mount({ preset: list, 'preset-columns': '3', 'preset-rows': '2' })
    open(el)
    const box = el.shadowRoot!.querySelector<HTMLElement>('.presets')!
    expect(box.style.getPropertyValue('--preset-cols')).toBe('3')
    expect(el.shadowRoot!.querySelectorAll('.preset').length).toBe(6)
  })

  it('重复点击同一预设不重复派发 oas-change', () => {
    const el = mount({ value: '#16a34a', preset: '["#16a34a"]' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    open(el)
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.preset')!
    btn.click()
    btn.click()
    expect(fired).toBe(0)
  })

  // ---------- 通道滑杆 / RGB 数字 ----------

  it('RGB 数字输入改变颜色', () => {
    const el = mount({ value: '#000000' })
    open(el)
    const r = el.shadowRoot!.querySelector<HTMLInputElement>('.r')!
    r.value = '255'
    r.dispatchEvent(new Event('input', { bubbles: true }))
    expect(textEl(el).textContent).toBe('#ff0000')
  })

  it('面板 hex 文本输入：聚焦全选、合法回车提交、非法红框不生效', () => {
    const el = mount({ value: '#0b6cff' })
    open(el)
    const input = el.shadowRoot!.querySelector<HTMLInputElement>('[part="hex-input"]')!
    expect(input.value).toBe('#0b6cff')
    input.focus()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(7)
    // 非法值：Enter 不提交 + invalid 态
    input.value = 'xyz'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('#0b6cff')
    expect(input.classList.contains('invalid')).toBe(true)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    // 合法值：回车提交并清除 invalid
    input.value = '#ff0000'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('#ff0000')
    expect(input.classList.contains('invalid')).toBe(false)
  })

  // ---------- A1 alpha 通道 ----------

  it('show-alpha 默认关：alpha 行隐藏；开启后 alpha 滑杆可调 → 8 位 hex', () => {
    const closed = mount({ value: '#0b6cff' })
    open(closed)
    const row = closed.shadowRoot!.querySelector<HTMLElement>('.alpha-row')!
    expect(row.hasAttribute('hidden')).toBe(true)
    closed.remove()

    const el = mount({ value: '#0b6cff', 'show-alpha': '' })
    expect(textEl(el).textContent).toBe('#0b6cffff')
    open(el)
    const alphaRow = el.shadowRoot!.querySelector<HTMLElement>('.alpha-row')!
    expect(alphaRow.hasAttribute('hidden')).toBe(false)
    const alpha = el.shadowRoot!.querySelector<HTMLInputElement>('.alpha')!
    expect(alpha.value).toBe('100')
    alpha.value = '50'
    alpha.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('#0b6cff80')
  })

  it('alpha 半透明时色块显示棋盘格（.alpha-checker）', () => {
    const el = mount({ value: '#0b6cff80', 'show-alpha': '' })
    const sw = el.shadowRoot!.querySelector<HTMLElement>('.swatch')!
    expect(sw.classList.contains('alpha-checker')).toBe(true)
    expect(sw.style.backgroundColor).toBe('rgba(11, 108, 255, 0.501961)')
  })

  it('color-format=rgb + show-alpha：rgba 输出', () => {
    const el = mount({ value: '#0b6cff', 'show-alpha': '', 'color-format': 'rgb' })
    expect(textEl(el).textContent).toBe('rgba(11, 108, 255, 1)')
    open(el)
    const alpha = el.shadowRoot!.querySelector<HTMLInputElement>('.alpha')!
    alpha.value = '25'
    alpha.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('rgba(11, 108, 255, 0.25)')
  })

  it('disabled-alpha：通道展示但滑杆禁用', () => {
    const el = mount({ value: '#0b6cff80', 'show-alpha': '', 'disabled-alpha': '' })
    open(el)
    const alpha = el.shadowRoot!.querySelector<HTMLInputElement>('.alpha')!
    expect(alpha.disabled).toBe(true)
    expect(textEl(el).textContent).toBe('#0b6cff80')
  })

  // ---------- A3 空值 + clearable ----------

  it('clearable 无值时不显示 clear 按钮（hidden）', () => {
    const el = mount({ clearable: '' })
    open(el)
    const clear = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!
    expect(clear.hasAttribute('hidden')).toBe(true)
  })

  it('clearable 点击清空：oas-clear（detail 含旧值）+ oas-change("") + 占位态', () => {
    const el = mount({ value: '#0b6cff', clearable: '' })
    open(el)
    const clears: unknown[] = []
    const changes: unknown[] = []
    el.addEventListener('oas-clear', (e) => clears.push((e as CustomEvent).detail))
    el.addEventListener('oas-change', (e) => changes.push((e as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(el.hasAttribute('value')).toBe(false)
    expect(clears).toEqual([{ value: '#0b6cff' }])
    expect(changes).toEqual([{ value: '' }])
    expect(textEl(el).classList.contains('placeholder')).toBe(true)
  })

  it('value-on-clear 配置清除后的回填值', () => {
    const el = mount({ value: '#ff0000', clearable: '', 'value-on-clear': '#000000' })
    open(el)
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(el.getAttribute('value')).toBe('#000000')
  })

  // ---------- A7 trigger 插槽 + show-text ----------

  it('show-text=false：隐藏色值文本（默认仍显示）', () => {
    const shown = mount({ value: '#ff0000' })
    expect(textEl(shown).hasAttribute('hidden')).toBe(false)
    shown.remove()
    const el = mount({ value: '#ff0000', 'show-text': 'false' })
    expect(textEl(el).hasAttribute('hidden')).toBe(true)
  })

  it('自定义 trigger 插槽：内容接入 trigger 内，仍可点击开关', () => {
    // 插槽内容须在 shadow（slot）建立前挂到 light DOM，upgrade 后自动分配
    const el = new OASColorPicker()
    el.setAttribute('value', '#ff0000')
    const custom = document.createElement('span')
    custom.slot = 'trigger'
    custom.className = 'my-trigger'
    custom.textContent = '主题色'
    el.appendChild(custom)
    document.body.appendChild(el)
    const slot = el.shadowRoot!.querySelector('slot[name="trigger"]')!
    expect((slot as HTMLSlotElement).assignedNodes()).toContain(custom)
    // 自定内容渲染在 trigger 按钮内：真实浏览器点击命中 slotted 节点也会沿 slot 冒泡到按钮
    // （happy-dom 不实现 slot 内容冒泡，此处用按钮点击断言功能；浏览器穿透由 e2e/复核覆盖）
    trigger(el).click()
    expect(isOpen(el)).toBe(true)
  })

  // ---------- disabled / readonly ----------

  it('disabled：不可展开', () => {
    const el = mount({ disabled: '', value: '#0b6cff' })
    open(el)
    expect(isOpen(el)).toBe(false)
    expect(trigger(el).disabled).toBe(true)
  })

  it('readonly：不可展开、不派发 open-change', () => {
    const el = mount({ readonly: '', value: '#0b6cff' })
    let fired = 0
    el.addEventListener('oas-open-change', () => fired++)
    trigger(el).click()
    expect(isOpen(el)).toBe(false)
    expect(fired).toBe(0)
  })

  // ---------- size ----------

  it('size=large/small 三档属性存活（视觉由 CSS 承接）', () => {
    const lg = mount({ value: '#0b6cff', size: 'large' })
    expect(lg.getAttribute('size')).toBe('large')
    lg.remove()
    const sm = mount({ value: '#0b6cff', size: 'small' })
    expect(sm.getAttribute('size')).toBe('small')
  })

  // ---------- P-A 移除反模式 ----------

  it('P-A：↑/↓ 不再调亮度，不产生值变化', () => {
    const el = mount({ value: '#808080' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    trigger(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(el.getAttribute('value')).toBe('#808080')
    expect(fired).toBe(0)
    expect(isOpen(el)).toBe(false)
  })

  // ---------- B4 吸管 ----------

  it('不支持 EyeDropper 时吸管按钮隐藏', () => {
    const el = mount({ value: '#0b6cff' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="eyedropper"]')!
    expect(btn.hasAttribute('hidden')).toBe(true)
  })

  it('支持 EyeDropper 时点击取色回填 value + oas-change', async () => {
    let openCalls = 0
    const fake = class {
      async open(): Promise<{ sRGBHex: string }> {
        openCalls++
        return { sRGBHex: '#dc2626' }
      }
    }
    ;(window as unknown as Record<string, unknown>).EyeDropper = fake
    const el = mount({ value: '#0b6cff' })
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="eyedropper"]')!
    expect(btn.hasAttribute('hidden')).toBe(false)
    let detail: unknown
    el.addEventListener('oas-change', (e) => (detail = (e as CustomEvent).detail))
    btn.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(openCalls).toBe(1)
    expect(el.getAttribute('value')).toBe('#dc2626')
    expect(detail).toEqual({ value: '#dc2626' })
  })

  it('吸管取消（reject）不改变值、不报错', async () => {
    const fake = class {
      async open(): Promise<never> {
        throw new DOMException('canceled', 'AbortError')
      }
    }
    ;(window as unknown as Record<string, unknown>).EyeDropper = fake
    const el = mount({ value: '#0b6cff' })
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="eyedropper"]')!.click()
    await Promise.resolve()
    await Promise.resolve()
    expect(el.getAttribute('value')).toBe('#0b6cff')
    expect(fired).toBe(0)
  })

  // ---------- FD1/FD2/FD3 placement + 防溢出翻转（computePosition 锚定） ----------

  it('FD1 非法 placement 回落 bottom 并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ placement: 'under' })
    open(el)
    expect(panelEl(el).getAttribute('data-placement')).toBe('bottom')
    el.setAttribute('placement', 'over')
    expect(panelEl(el).getAttribute('data-placement')).toBe('bottom')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('FD3 默认 bottom 无碰撞：面板贴触发器下方 4px 居中，视觉与现状一致', () => {
    const el = mount()
    setRect(trigger(el), { top: 100, left: 200, right: 280, bottom: 132, width: 80, height: 32 })
    setRect(panelEl(el), { width: 220, height: 320 })
    open(el)
    const p = panelEl(el)
    expect(p.getAttribute('data-placement')).toBe('bottom')
    expect(p.style.top).toBe('136px')
    expect(p.style.left).toBe('130px')
  })

  it('FD2 右缘溢出：面板被夹取在视口内（不撑横向滚动条/不被裁切）', () => {
    window.innerWidth = 320
    const el = mount()
    setRect(trigger(el), { top: 100, left: 200, right: 280, bottom: 132, width: 80, height: 32 })
    setRect(panelEl(el), { width: 220, height: 320 })
    open(el)
    const p = panelEl(el)
    const left = parseFloat(p.style.left)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(left + 220).toBeLessThanOrEqual(320)
  })

  it('FD2 底缘不足：沿主轴翻转到 top', () => {
    window.innerHeight = 700
    const el = mount()
    setRect(trigger(el), { top: 380, left: 200, right: 280, bottom: 412, width: 80, height: 32 })
    setRect(panelEl(el), { width: 220, height: 320 })
    open(el)
    expect(panelEl(el).getAttribute('data-placement')).toBe('top')
    expect(panelEl(el).style.top).toBe('56px')
  })

  it('FD2 左上角：placement=top 视口顶不足 → 翻转到 bottom', () => {
    const el = mount({ placement: 'top' })
    setRect(trigger(el), { top: 8, left: 40, right: 120, bottom: 40, width: 80, height: 32 })
    setRect(panelEl(el), { width: 220, height: 320 })
    open(el)
    expect(panelEl(el).getAttribute('data-placement')).toBe('bottom')
    expect(panelEl(el).style.top).toBe('44px')
  })

  it('FD2 左缘不足：placement=left → 翻转到 right', () => {
    const el = mount({ placement: 'left' })
    setRect(trigger(el), { top: 100, left: 10, right: 90, bottom: 132, width: 80, height: 32 })
    setRect(panelEl(el), { width: 220, height: 320 })
    open(el)
    expect(panelEl(el).getAttribute('data-placement')).toBe('right')
  })

  it('placement=bottom-end 空间足够时按声明对齐（右缘对齐触发器右缘）', () => {
    const el = mount({ placement: 'bottom-end' })
    setRect(trigger(el), { top: 100, left: 200, right: 280, bottom: 132, width: 80, height: 32 })
    setRect(panelEl(el), { width: 220, height: 320 })
    open(el)
    const p = panelEl(el)
    expect(p.getAttribute('data-placement')).toBe('bottom-end')
    expect(p.style.left).toBe('60px')
  })

  it('FD2 宽面板交叉轴右溢出：bottom-start → bottom-end 翻转对齐', () => {
    window.innerWidth = 380
    const el = mount({ placement: 'bottom-start' })
    setRect(trigger(el), { top: 100, left: 200, right: 280, bottom: 132, width: 80, height: 32 })
    setRect(panelEl(el), { width: 200, height: 320 })
    open(el)
    expect(panelEl(el).getAttribute('data-placement')).toBe('bottom-end')
  })

  it('FD1b 12 向合法 placement 全接受：视口充足时 data-placement 原样保留、不告警', () => {
    window.innerWidth = 2000
    window.innerHeight = 2000
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const placements: Array<[string, string]> = [
      ['top', 'top'],
      ['top-start', 'top-start'],
      ['top-end', 'top-end'],
      ['bottom', 'bottom'],
      ['bottom-start', 'bottom-start'],
      ['bottom-end', 'bottom-end'],
      ['left', 'left'],
      ['left-start', 'left-start'],
      ['left-end', 'left-end'],
      ['right', 'right'],
      ['right-start', 'right-start'],
      ['right-end', 'right-end'],
    ]
    for (const [declared, expected] of placements) {
      const el = mount({ placement: declared })
      setRect(trigger(el), { top: 500, left: 500, right: 600, bottom: 532, width: 100, height: 32 })
      setRect(panelEl(el), { width: 220, height: 320 })
      open(el)
      expect(panelEl(el).getAttribute('data-placement'), `placement=${declared}`).toBe(expected)
      el.remove()
    }
    expect(warn, '12 向合法值不应触发回落告警').not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('OASColorPicker 二期 2D 色域 / 渐变 / inline', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function gradStopsOf(el: OASColorPicker): HTMLElement[] {
    return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.grad-stop')]
  }

  // ---------- P-C 2D 面板重构 ----------

  it('渲染 2D 色域 + hue 竖条（不再渲染 H/S/V 三滑轨）', () => {
    const el = mount({ value: '#ff0000' })
    expect(el.shadowRoot!.querySelector('.sv2d')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('.hue')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('input.hue')).toBeNull()
    expect(el.shadowRoot!.querySelector('input.sat')).toBeNull()
    expect(el.shadowRoot!.querySelector('input.val')).toBeNull()
    el.remove()
  })

  it('hue 竖条 pointerdown 定位：y 归一 → 色相（#ff0000 h=0）', () => {
    const el = mount({ value: '#ff0000' })
    open(el)
    const hue = el.shadowRoot!.querySelector<HTMLElement>('.hue')!
    setRect(hue, { left: 0, top: 0, width: 16, height: 360 })
    // 中点 y=180 → (1-0.5)*360=180 → cyan
    hue.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 8, clientY: 180 }))
    expect(el.getAttribute('value')).toBe('#00ffff')
  })

  it('2D 色域 pointerdown：x→saturation，y 反转→value（#ff0000 拖动到左上白）', () => {
    const el = mount({ value: '#ff0000' }) // h0 s1 v1
    open(el)
    const sv = el.shadowRoot!.querySelector<HTMLElement>('.sv2d')!
    setRect(sv, { left: 0, top: 0, width: 100, height: 100 })
    // x=0,y=0 → s0 v1 → 白
    sv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }))
    expect(el.getAttribute('value')).toBe('#ffffff')
    // 右下 → s1 v0 → 黑
    sv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }))
    expect(el.getAttribute('value')).toBe('#000000')
  })

  it('2D 色域方向键：ArrowRight +s / ArrowUp +v / Home 归零 s', () => {
    const el = mount({ value: '#804040' }) // h0 s0.5 v0.5
    open(el)
    const sv = el.shadowRoot!.querySelector<HTMLElement>('.sv2d')!
    const key = (k: string) => sv.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    const before = el.getAttribute('value')!
    key('ArrowRight')
    const afterRight = el.getAttribute('value')!
    expect(afterRight).not.toBe(before)
    key('ArrowUp')
    // v 升一档
    expect(el.getAttribute('value')).not.toBe(afterRight)
    key('Home')
    // Home → s=0，v 不变 → r=g=b
    const home = el.getAttribute('value')!
    expect(home).toMatch(/^#([0-9a-f]{2})\1\1$/i)
  })

  // ---------- P-E 渐变模式 ----------

  it('mode=gradient：面板出现渐变编辑条，value 解析为 stops', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)' })
    open(el)
    const grad = el.shadowRoot!.querySelector<HTMLElement>('.grad')!
    expect(grad.hasAttribute('hidden')).toBe(false)
    const stops = gradStopsOf(el)
    expect(stops.length).toBe(2)
    // 手柄 aria-valuenow = 位置百分比
    expect(stops[0]!.getAttribute('aria-valuenow')).toBe('0')
    expect(stops[1]!.getAttribute('aria-valuenow')).toBe('100')
    el.remove()
  })

  it('渐变模式：单色 value（尚未编辑器改写）→ 双 stop 同色铺平，触发文本仍显示原色', () => {
    const el = mount({ mode: 'gradient', value: '#0b6cff' })
    expect(textEl(el).textContent).toBe('#0b6cff')
    expect(gradStopsOf(el).length).toBe(2)
    // 渐变 swatch 为平铺背景
    const sw = el.shadowRoot!.querySelector<HTMLElement>('.swatch')!
    expect(sw.style.backgroundImage).toContain('linear-gradient')
  })

  it('渐变 + 空值：seed 双默认 stop，编辑后写回线性渐变 value', () => {
    const el = mount({ mode: 'gradient' })
    open(el)
    expect(gradStopsOf(el).length).toBe(2)
    expect(el.getAttribute('value')).toBeNull()
    // 点击第一个手柄并改 G → 触发渐变提交
    const stops = gradStopsOf(el)
    stops[0]!.dispatchEvent(new MouseEvent('focusin', { bubbles: true }))
    const g = el.shadowRoot!.querySelector<HTMLInputElement>('.g')!
    g.value = '0'
    g.dispatchEvent(new Event('input', { bubbles: true }))
    // 默认 #0066ff 的 g=102 被置 0 → #0000ff
    expect(el.getAttribute('value')).toMatch(/^linear-gradient\(90deg, #0000ff 0%,/)
    el.remove()
  })

  it('渐变 stop 增删：+ 按钮插入最大空隙中点，- 删除活动 stop（最小 2 个）', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #000 0%, #fff 100%)' })
    open(el)
    const add = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="grad-add"]')!
    add.click()
    let stops = gradStopsOf(el)
    expect(stops.length).toBe(3)
    // 新 stop 落在 0.5
    expect(stops.map((s) => s.getAttribute('aria-valuenow'))).toContain('50')
    // 删除活动 stop（新插入的自动激活）
    const remove = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="grad-remove"]')!
    expect(remove.disabled).toBe(false)
    remove.click()
    stops = gradStopsOf(el)
    expect(stops.length).toBe(2)
    expect(remove.disabled).toBe(true) // 只剩 2 个，删除禁用
    el.remove()
  })

  it('渐变 stop 键盘方向键移动位置（夹取在邻居之间）', () => {
    const el = mount({ mode: 'gradient', value: 'linear-gradient(90deg, #000 0%, #888 50%, #fff 100%)' })
    open(el)
    const stops = gradStopsOf(el)
    expect(stops.length).toBe(3)
    const mid = stops[1]!
    mid.focus()
    expect(el.getAttribute('value')).toContain('#888')
    // ArrowRight → pos 0.51
    mid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    const value = el.getAttribute('value')!
    expect(value).toContain('#888')
    expect(value).not.toContain('#888 50%')
    expect(parseGradientStr(value)![1]!.pos).toBeCloseTo(0.51, 2)
    el.remove()
  })

  it('渐变 + 预设：点击预设改写活动 stop 颜色并序列化', () => {
    const el = mount({
      mode: 'gradient',
      value: 'linear-gradient(90deg, #000000 0%, #0000ff 100%)',
      preset: '["#ff0000"]',
    })
    open(el)
    // 激活第 0 个 stop
    gradStopsOf(el)[0]!.dispatchEvent(new MouseEvent('focusin', { bubbles: true }))
    el.shadowRoot!.querySelector<HTMLButtonElement>('.preset')!.click()
    expect(el.getAttribute('value')).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
    el.remove()
  })

  it('渐变模式 clearable 清除：清空 value 回到占位', () => {
    const el = mount({
      mode: 'gradient',
      value: 'linear-gradient(90deg, #ff0000 0%, #0000ff 100%)',
      clearable: '',
    })
    open(el)
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="clear"]')!.click()
    expect(el.hasAttribute('value')).toBe(false)
    el.remove()
  })

  // ---------- P-D inline 纯面板 ----------

  it('inline：无 trigger，面板就地常显（不依赖 open 属性）', () => {
    const el = mount({ inline: '', value: '#0b6cff' })
    // 面板可见（open class 常驻）
    expect(panelEl(el).classList.contains('open')).toBe(true)
    // trigger 虽存在（SSR 结构一致）但视觉隐藏，点击不开/关 open
    trigger(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    // 不派发 open-change
    let fired = 0
    el.addEventListener('oas-open-change', () => fired++)
    trigger(el).click()
    expect(fired).toBe(0)
    el.remove()
  })

  it('inline：编辑仍然生效（RGB 输入提交）', () => {
    const el = mount({ inline: '', value: '#000000' })
    const r = el.shadowRoot!.querySelector<HTMLInputElement>('.r')!
    r.value = '255'
    r.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.getAttribute('value')).toBe('#ff0000')
    el.remove()
  })
})

/** 解析渐变串（供方向键断言回读 pos） */
function parseGradientStr(v: string): Array<{ pos: number }> | null {
  if (!/^linear-gradient\(/.test(v)) return null
  const body = v.slice('linear-gradient('.length, -1)
  const segs = body.split(',').map((s) => s.trim())
  // 去掉 90deg 方向 token
  if (segs.length && /deg$/.test(segs[0]!)) segs.shift()
  return segs.map((s) => {
    const m = s.match(/([\d.]+)%$/)
    return { pos: m ? Number(m[1]) / 100 : 0 }
  })
}
