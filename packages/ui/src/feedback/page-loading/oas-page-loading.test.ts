import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASPageLoading } from './index.js'

function mount(attrs: Record<string, string> = {}): OASPageLoading {
  const el = new OASPageLoading()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function part(el: OASPageLoading, name: string): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[part="${name}"]`)!
}

function styleText(el: OASPageLoading): string {
  return el.shadowRoot!.querySelector('style')!.textContent!
}

describe('OASPageLoading 显隐与命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认隐藏（无 open 属性）', () => {
    const el = mount()
    expect(el.hasAttribute('open')).toBe(false)
    expect(styleText(el)).toContain(':host(:not([open]))')
  })

  it('open 属性显示全屏遮罩', () => {
    const el = mount({ open: '' })
    expect(part(el, 'mask').tagName).toBe('DIV')
    expect(styleText(el)).toContain('position: fixed')
    expect(styleText(el)).toContain('inset: 0')
  })

  it('show() 写入 open；close() 移除 open 并派发 oas-close', () => {
    const el = mount()
    el.show()
    expect(el.hasAttribute('open')).toBe(true)
    const handler = vi.fn()
    el.addEventListener('oas-close', handler)
    el.close()
    expect(el.hasAttribute('open')).toBe(false)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]![0].detail).toEqual({ mode: 'spinner' })
  })

  it('未打开时 close() 不派发事件（避免空关闭回声）', () => {
    const el = mount()
    const handler = vi.fn()
    el.addEventListener('oas-close', handler)
    el.close()
    expect(handler).not.toHaveBeenCalled()
  })

  it('面板 role=status / polite / aria-busy 同步', () => {
    const el = mount({ open: '' })
    const panel = part(el, 'panel')
    expect(panel.getAttribute('role')).toBe('status')
    expect(panel.getAttribute('aria-live')).toBe('polite')
    expect(panel.getAttribute('aria-busy')).toBe('true')
  })
})

describe('OASPageLoading 三种形态', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认 spinner 形态，data-mode 同步', () => {
    const el = mount({ open: '' })
    expect(el.getAttribute('data-mode')).toBe('spinner')
    expect(styleText(el)).toContain(":host([data-mode='spinner']) .spinner")
  })

  it('skeleton 形态按 rows 生成骨架行，末行短行', () => {
    const el = mount({ open: '', mode: 'skeleton', rows: '3' })
    const rows = el.shadowRoot!.querySelectorAll('.skeleton .row')
    expect(rows.length).toBe(3)
    expect(rows[2]!.classList.contains('short')).toBe(true)
    expect(styleText(el)).toContain(":host([data-mode='skeleton']) .skeleton")
  })

  it('skeleton rows 非法回落 4、越界钳制', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ open: '', mode: 'skeleton' })
    expect(el.shadowRoot!.querySelectorAll('.skeleton .row').length).toBe(4)
    el.setAttribute('rows', '99')
    expect(el.shadowRoot!.querySelectorAll('.skeleton .row').length).toBe(12)
    el.setAttribute('rows', 'abc')
    expect(el.shadowRoot!.querySelectorAll('.skeleton .row').length).toBe(4)
    // 非法值告警一次（同一值重复设置不刷屏）
    el.setAttribute('rows', 'abc')
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('rows')).length).toBe(1)
    warn.mockRestore()
  })

  it('切到 skeleton 时才创建骨架，切回 spinner 不销毁状态', () => {
    const el = mount({ open: '' })
    expect(el.shadowRoot!.querySelectorAll('.skeleton .row').length).toBe(0)
    el.setAttribute('mode', 'skeleton')
    expect(el.shadowRoot!.querySelectorAll('.skeleton .row').length).toBe(4)
    el.setAttribute('mode', 'spinner')
    expect(el.getAttribute('data-mode')).toBe('spinner')
  })

  it('progress 形态：宽度、百分比与 aria-valuenow 同步', () => {
    const el = mount({ open: '', mode: 'progress', value: '42' })
    expect(part(el, 'bar').style.width).toBe('42%')
    expect(part(el, 'percent').textContent).toBe('42%')
    expect(part(el, 'track').getAttribute('role')).toBe('progressbar')
    expect(part(el, 'track').getAttribute('aria-valuenow')).toBe('42')
  })

  it('progress value 越界钳制 / 非法回落 0 并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ open: '', mode: 'progress', value: '-20' })
    expect(part(el, 'bar').style.width).toBe('0%')
    el.setAttribute('value', '120')
    expect(part(el, 'bar').style.width).toBe('100%')
    el.setAttribute('value', 'oops-value-xyz')
    expect(part(el, 'bar').style.width).toBe('0%')
    el.setAttribute('value', 'oops-value-xyz')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('未知 mode 回落 spinner 并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ open: '', mode: 'bogus-mode' })
    expect(el.getAttribute('data-mode')).toBe('spinner')
    el.setAttribute('mode', 'bogus-mode')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('OASPageLoading 文案与动效', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认文案走 i18n，text 属性覆盖', () => {
    const el = mount({ open: '' })
    expect(part(el, 'label').textContent).toMatch(/加载/)
    el.setAttribute('text', '正在准备数据')
    expect(part(el, 'label').textContent).toBe('正在准备数据')
  })

  it('skeleton 形态隐藏文案（骨架自身表达加载）', () => {
    const el = mount({ open: '', mode: 'skeleton' })
    expect(styleText(el)).toContain(":host([data-mode='skeleton']) .label")
    // 视觉隐藏但面板 aria-label 仍提供可读名称
    expect(part(el, 'panel').getAttribute('aria-label')).toMatch(/加载/)
  })

  it('reduced-motion 下关闭旋转与脉冲动画', () => {
    const el = mount({ open: '' })
    expect(styleText(el)).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styleText(el)).toMatch(/\.spinner svg,\s*\.row\s*\{\s*animation: none/)
  })
})
