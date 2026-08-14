import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@oas-ui/i18n'
import { OASThemeEditor } from './index.js'

/**
 * 默认分组 + 默认 token 集对应的关键变量（theme/src/index.css 定义的语义 token）。
 * happy-dom 不会把 :root 内联自定义属性级联到后代，故直接设在宿主元素上模拟继承值。
 */
const DEFAULT_VARS: Record<string, string> = {
  '--oas-color-primary': '#0b6cff',
  // hover/active 已改 color-mix 加深派生（85%/75% black），此处写解析后的 hex 保持 mock 与真实 token 一致
  '--oas-color-primary-hover': '#095cd9',
  '--oas-color-primary-active': '#0851bf',
  '--oas-color-success': '#16a34a',
  '--oas-color-warning': '#d97706',
  '--oas-color-danger': '#dc2626',
  '--oas-color-text-primary': '#18181b',
  '--oas-color-text-secondary': '#71717a',
  '--oas-color-text-disabled': '#a1a1aa',
  '--oas-color-border': '#e4e4e7',
  '--oas-color-border-strong': '#d4d4d8',
  '--oas-color-bg': '#ffffff',
  '--oas-color-bg-elevated': '#ffffff',
  '--oas-color-bg-hover': '#f4f4f5',
  '--oas-color-bg-disabled': '#f4f4f5',
  '--oas-font-size-xs': '12px',
  '--oas-font-size-sm': '13px',
  '--oas-font-size-md': '14px',
  '--oas-font-size-lg': '16px',
  '--oas-font-size-xl': '20px',
  '--oas-space-1': '4px',
  '--oas-space-2': '8px',
  '--oas-space-3': '12px',
  '--oas-space-4': '16px',
  '--oas-space-5': '24px',
  '--oas-space-6': '32px',
  '--oas-radius-sm': '4px',
  '--oas-radius-md': '6px',
  '--oas-radius-lg': '10px',
  '--oas-control-height-xs': '20px',
  '--oas-control-height-sm': '24px',
  '--oas-control-height-md': '32px',
  '--oas-control-height-lg': '40px',
  '--oas-control-height-xl': '48px',
}

function mount(
  attrs: Record<string, string> = {},
  vars: Record<string, string> = DEFAULT_VARS,
): OASThemeEditor {
  const el = new OASThemeEditor()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v)
  document.body.appendChild(el)
  return el
}

function rows(el: OASThemeEditor): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('[part="row"]')] as HTMLElement[]
}

function rowFor(el: OASThemeEditor, token: string): HTMLElement | undefined {
  return rows(el).find((r) => r.textContent!.includes(token))
}

function colorInput(row: HTMLElement): HTMLInputElement {
  return row.querySelector<HTMLInputElement>('input[type="color"]')!
}

function numberInput(row: HTMLElement): HTMLInputElement {
  return row.querySelector<HTMLInputElement>('input[type="number"]')!
}

describe('OASThemeEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认渲染全部分组标题（颜色/字号/间距/圆角/控件高度）', () => {
    const el = mount()
    const titles = [...el.shadowRoot!.querySelectorAll('.group-title')].map((t) => t.textContent)
    expect(titles).toEqual(['颜色', '字号', '间距', '圆角', '控件高度'])
  })

  it('控件高度组含五档 token（xs/sm/md/lg/xl）', () => {
    const el = mount()
    for (const name of ['--oas-control-height-xs', '--oas-control-height-xl']) {
      const row = rowFor(el, name)
      expect(row, `${name} 应出现在默认集`).toBeDefined()
    }
    expect(numberInput(rowFor(el, '--oas-control-height-xs')!).value).toBe('20')
    expect(numberInput(rowFor(el, '--oas-control-height-xl')!).value).toBe('48')
  })

  it('颜色 token 行用 color input，显示当前值', () => {
    const el = mount()
    const row = rowFor(el, '--oas-color-primary')!
    expect(colorInput(row).value).toBe('#0b6cff')
    expect(row.querySelector('.value')!.textContent).toBe('#0b6cff')
  })

  it('数字 token 行用 number input（去 px），值显示保留单位', () => {
    const el = mount()
    const row = rowFor(el, '--oas-font-size-md')!
    expect(numberInput(row).value).toBe('14')
    expect(row.querySelector('.value')!.textContent).toBe('14px')
  })

  it('编辑颜色：写入宿主 CSS 变量 + 派发 oas-change + 值显示刷新', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const input = colorInput(rowFor(el, '--oas-color-primary')!)
    input.value = '#ff0000'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--oas-color-primary')).toBe('#ff0000')
    expect(detail).toEqual({ token: '--oas-color-primary', value: '#ff0000' })
    expect(rowFor(el, '--oas-color-primary')!.querySelector('.value')!.textContent).toBe('#ff0000')
  })

  it('编辑数字：写回带 px 单位', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const input = numberInput(rowFor(el, '--oas-font-size-md')!)
    input.value = '16'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--oas-font-size-md')).toBe('16px')
    expect(detail).toEqual({ token: '--oas-font-size-md', value: '16px' })
  })

  it('数字输入空值/非法值不写入不派发', () => {
    const el = mount()
    let fired = 0
    el.addEventListener('oas-change', () => fired++)
    const input = numberInput(rowFor(el, '--oas-font-size-md')!)
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.value = 'abc'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(fired).toBe(0)
    // 初始值（14px）保持不变
    expect(el.style.getPropertyValue('--oas-font-size-md')).toBe('14px')
  })

  it('token 属性自定义列表：只渲染指定 token，不存在的变量跳过', () => {
    const el = mount({
      token: JSON.stringify(['--oas-color-primary', '--oas-does-not-exist', '--oas-space-2']),
    })
    const r = rows(el)
    expect(r.length).toBe(2)
    expect(r[0]!.textContent).toContain('--oas-color-primary')
    expect(r[1]!.textContent).toContain('--oas-space-2')
  })

  it('token 属性非法 JSON 时回退默认集', () => {
    const el = mount({ token: 'not-json' })
    expect(rows(el).length).toBeGreaterThan(0)
    expect(rowFor(el, '--oas-color-primary')).toBeDefined()
  })

  it('exportJson() 返回当前 token 集', () => {
    const el = mount()
    const json = el.exportJson()
    expect(json['--oas-color-primary']).toBe('#0b6cff')
    expect(json['--oas-font-size-md']).toBe('14px')
    expect(json['--oas-space-2']).toBe('8px')
    expect(json['--oas-control-height-md']).toBe('32px')
  })

  it('存在 config-provider 祖先时写入最近 provider（子树继承）', () => {
    const cp = document.createElement('oas-config-provider')
    document.body.appendChild(cp)
    const el = new OASThemeEditor()
    for (const [k, v] of Object.entries(DEFAULT_VARS)) cp.style.setProperty(k, v)
    cp.appendChild(el)
    const input = colorInput(rowFor(el, '--oas-color-primary')!)
    expect(input.value).toBe('#0b6cff')
    input.value = '#112233'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(cp.style.getPropertyValue('--oas-color-primary')).toBe('#112233')
    expect(el.style.getPropertyValue('--oas-color-primary')).toBe('')
  })

  it('reset() 清除已写入的内联变量', () => {
    const el = mount()
    const input = colorInput(rowFor(el, '--oas-color-primary')!)
    input.value = '#ff0000'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--oas-color-primary')).toBe('#ff0000')
    el.reset()
    expect(el.style.getPropertyValue('--oas-color-primary')).toBe('')
  })

  it('变量不存在时默认集跳过对应 token 不报错', () => {
    const el = mount({}, { '--oas-color-primary': '#0b6cff' })
    expect(rowFor(el, '--oas-color-primary')).toBeDefined()
    expect(rowFor(el, '--oas-space-2')).toBeUndefined()
  })
})
