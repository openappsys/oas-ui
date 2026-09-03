import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import '@oas-ui/i18n'
import { OASThemeEditor } from './index.js'
import { parseCssColorToHex } from './oas-theme-editor.js'

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
  '--oas-radius-xs': '2px',
  '--oas-radius-sm': '4px',
  '--oas-radius-md': '6px',
  '--oas-radius-lg': '10px',
  '--oas-radius-xl': '14px',
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

function colorTextInput(row: HTMLElement): HTMLInputElement {
  return row.querySelector<HTMLInputElement>('input[type="text"]')!
}

function sliderInput(row: HTMLElement): HTMLInputElement {
  return row.querySelector<HTMLInputElement>('input[type="range"]')!
}

function searchInput(el: OASThemeEditor): HTMLInputElement {
  return el.shadowRoot!.querySelector<HTMLInputElement>('.search')!
}

function groups(el: OASThemeEditor): HTMLDetailsElement[] {
  return [...el.shadowRoot!.querySelectorAll('details[part="group"]')] as HTMLDetailsElement[]
}

function groupFor(el: OASThemeEditor, title: string): HTMLDetailsElement | undefined {
  return groups(el).find(
    (g) => g.querySelector('.group-title')!.textContent === title,
  )
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

// ---------------------------------------------------------------------------
// 增强：颜色函数值编辑 / importJson / exportCss / preset / 滑块 / 折叠与搜索
// ---------------------------------------------------------------------------

describe('OASThemeEditor 颜色函数值编辑', () => {
  const FN_VARS = {
    '--demo-color-rgb': 'rgb(11, 108, 255)',
    '--demo-color-oklch': 'oklch(0.55 0.13 250)',
    '--demo-color-mix': 'color-mix(in srgb, #0b6cff 85%, black)',
  }

  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('parseCssColorToHex：hex/rgb/hsl/hwb/oklch 可解析，var()/color-mix/非法 返回 null', () => {
    expect(parseCssColorToHex('#0b6cff')).toBe('#0b6cff')
    expect(parseCssColorToHex('#0B6CFF')).toBe('#0b6cff')
    expect(parseCssColorToHex('#0b6')).toBe('#00bb66')
    expect(parseCssColorToHex('rgb(11, 108, 255)')).toBe('#0b6cff')
    expect(parseCssColorToHex('rgb(11 108 255)')).toBe('#0b6cff')
    expect(parseCssColorToHex('rgba(11, 108, 255, 0.5)')).toBe('#0b6cff')
    expect(parseCssColorToHex('hsl(210, 50%, 50%)')).toBe('#4080bf')
    expect(parseCssColorToHex('hwb(210 20% 30%)')).toBe('#3373b3')
    expect(parseCssColorToHex('oklch(0.55 0.13 250)')).toBe('#2a75ba')
    expect(parseCssColorToHex('var(--oas-color-primary)')).toBeNull()
    expect(parseCssColorToHex('color-mix(in srgb, #0b6cff 85%, black)')).toBeNull()
    expect(parseCssColorToHex('not-a-color')).toBeNull()
    expect(parseCssColorToHex('')).toBeNull()
  })

  it('rgb() 值：色板解析为非黑 hex，文本框显示原值且可编辑', () => {
    const el = mount({ token: '["--demo-color-rgb"]' }, FN_VARS)
    const row = rowFor(el, '--demo-color-rgb')!
    expect(colorInput(row).value).toBe('#0b6cff')
    expect(colorInput(row).disabled).toBe(false)
    expect(colorTextInput(row).value).toBe('rgb(11, 108, 255)')
  })

  it('oklch() 值：色板解析为非黑 hex（不回落 #000000）', () => {
    const el = mount({ token: '["--demo-color-oklch"]' }, FN_VARS)
    const row = rowFor(el, '--demo-color-oklch')!
    expect(colorInput(row).value).toBe('#2a75ba')
    expect(colorInput(row).value).not.toBe('#000000')
    expect(colorTextInput(row).value).toBe('oklch(0.55 0.13 250)')
  })

  it('不可解析值（color-mix）：色板禁用置中性态，仅文本框可编辑；输入合法色后写回并重新启用色板', () => {
    const el = mount({ token: '["--demo-color-mix"]' }, FN_VARS)
    const row = rowFor(el, '--demo-color-mix')!
    const swatch = colorInput(row)
    expect(swatch.disabled).toBe(true)
    expect(swatch.classList.contains('swatch-neutral')).toBe(true)
    expect(colorTextInput(row).value).toBe('color-mix(in srgb, #0b6cff 85%, black)')

    const text = colorTextInput(row)
    text.value = 'rgb(1, 2, 3)'
    text.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--demo-color-mix')).toBe('rgb(1, 2, 3)')
    expect(swatch.disabled).toBe(false)
    expect(swatch.classList.contains('swatch-neutral')).toBe(false)
    expect(swatch.value).toBe('#010203')
  })

  it('文本框非法颜色不写回 + is-invalid 提示态', () => {
    const el = mount({ token: '["--demo-color-rgb"]' }, FN_VARS)
    const row = rowFor(el, '--demo-color-rgb')!
    const text = colorTextInput(row)
    text.value = 'not-a-color'
    text.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--demo-color-rgb')).toBe('rgb(11, 108, 255)')
    expect(text.classList.contains('is-invalid')).toBe(true)

    text.value = 'var(--oas-color-primary)'
    text.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--demo-color-rgb')).toBe('rgb(11, 108, 255)')

    text.value = '#abcdef'
    text.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--demo-color-rgb')).toBe('#abcdef')
    expect(text.classList.contains('is-invalid')).toBe(false)
  })
})

describe('OASThemeEditor importJson / exportCss', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('importJson 应用 token 集到 themeRoot 并同步面板（含 JSON 字符串入参）', () => {
    const el = mount()
    el.importJson({ '--oas-color-primary': '#ff6600', '--oas-font-size-md': '16px' })
    expect(el.style.getPropertyValue('--oas-color-primary')).toBe('#ff6600')
    expect(el.style.getPropertyValue('--oas-font-size-md')).toBe('16px')
    const colorRow = rowFor(el, '--oas-color-primary')!
    expect(colorRow.querySelector('.value')!.textContent).toBe('#ff6600')
    expect(colorInput(colorRow).value).toBe('#ff6600')
    expect(colorTextInput(colorRow).value).toBe('#ff6600')
    const numRow = rowFor(el, '--oas-font-size-md')!
    expect(numberInput(numRow).value).toBe('16')
    expect(sliderInput(numRow).value).toBe('16')

    el.importJson('{"--oas-space-2": "12px"}')
    expect(el.style.getPropertyValue('--oas-space-2')).toBe('12px')
  })

  it('importJson 非 -- 键忽略 + dev 告警同值去重', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    el.importJson({ 'color-primary': '#ff0000', '--oas-space-2': '10px' })
    expect(el.style.getPropertyValue('color-primary')).toBe('')
    expect(el.style.getPropertyValue('--oas-space-2')).toBe('10px')
    expect(warn).toHaveBeenCalledTimes(1)
    el.importJson({ 'color-primary': '#00ff00' })
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('importJson 非法入参（非对象/坏 JSON）不写入并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    el.importJson('not-json')
    el.importJson(42 as unknown as Record<string, unknown>)
    expect(el.exportJson()['--oas-color-primary']).toBe('#0b6cff')
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('exportCss 输出 :root 块，每行一个变量', () => {
    const el = mount({
      token: JSON.stringify(['--oas-color-primary', '--oas-font-size-md']),
    })
    expect(el.exportCss()).toBe(
      ':root {\n  --oas-color-primary: #0b6cff;\n  --oas-font-size-md: 14px;\n}',
    )
  })
})

describe('OASThemeEditor 预设主题', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('compact 预设：control-height 各档 -4px、space 各档按比例收缩', () => {
    const el = mount()
    el.applyPreset('compact')
    expect(el.style.getPropertyValue('--oas-control-height-md')).toBe('28px')
    expect(el.style.getPropertyValue('--oas-control-height-xs')).toBe('16px')
    expect(el.style.getPropertyValue('--oas-space-4')).toBe('12px')
    expect(el.style.getPropertyValue('--oas-space-6')).toBe('24px')
    // 颜色不动
    expect(el.style.getPropertyValue('--oas-color-primary')).toBe('#0b6cff')
    // 面板就地刷新
    expect(numberInput(rowFor(el, '--oas-control-height-md')!).value).toBe('28')
    expect(sliderInput(rowFor(el, '--oas-space-4')!).value).toBe('12')
  })

  it('comfortable 预设：control-height 各档 +4px、space 各档按比例放大', () => {
    const el = mount()
    el.applyPreset('comfortable')
    expect(el.style.getPropertyValue('--oas-control-height-md')).toBe('36px')
    expect(el.style.getPropertyValue('--oas-control-height-xl')).toBe('52px')
    expect(el.style.getPropertyValue('--oas-space-4')).toBe('20px')
    expect(el.style.getPropertyValue('--oas-space-6')).toBe('40px')
  })

  it('default 预设等价 reset：清除 preset 写入的内联变量', () => {
    const el = mount()
    el.applyPreset('compact')
    expect(el.style.getPropertyValue('--oas-control-height-md')).toBe('28px')
    el.applyPreset('default')
    expect(el.style.getPropertyValue('--oas-control-height-md')).toBe('')
    expect(el.style.getPropertyValue('--oas-space-4')).toBe('')
  })

  it('非法 preset 名忽略 + dev 告警同值去重', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount()
    el.applyPreset('bogus')
    el.applyPreset('bogus')
    // 非法名不写任何 preset token，保持 mount 种子值
    expect(el.style.getPropertyValue('--oas-control-height-md')).toBe('32px')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('preset 属性触发应用', () => {
    const el = mount({ preset: 'compact' })
    expect(el.style.getPropertyValue('--oas-control-height-md')).toBe('28px')
    expect(el.style.getPropertyValue('--oas-space-2')).toBe('6px')
  })
})

describe('OASThemeEditor 滑块联动', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('range 拖动同步 number 输入框并写回（含 min/max 边界）', () => {
    const el = mount()
    const row = rowFor(el, '--oas-font-size-md')!
    const slider = sliderInput(row)
    slider.value = '48'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--oas-font-size-md')).toBe('48px')
    expect(numberInput(row).value).toBe('48')

    slider.value = '3'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--oas-font-size-md')).toBe('8px')
    expect(numberInput(row).value).toBe('8')

    slider.value = '60'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--oas-font-size-md')).toBe('48px')
    expect(numberInput(row).value).toBe('48')
  })

  it('number 输入同步滑块值', () => {
    const el = mount()
    const row = rowFor(el, '--oas-font-size-md')!
    const input = numberInput(row)
    input.value = '16'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(el.style.getPropertyValue('--oas-font-size-md')).toBe('16px')
    expect(sliderInput(row).value).toBe('16')
  })
})

describe('OASThemeEditor 组折叠与搜索', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('组用 details/summary 可折叠，默认展开', () => {
    const el = mount()
    const colorGroup = groupFor(el, '颜色')!
    expect(colorGroup.tagName.toLowerCase()).toBe('details')
    expect(colorGroup.open).toBe(true)
    expect(colorGroup.querySelector('.group-title')!.tagName.toLowerCase()).toBe('summary')
    colorGroup.open = false
    expect(colorGroup.open).toBe(false)
    expect(rows(el).length).toBeGreaterThan(0)
  })

  it('搜索按 token 名子串过滤：匹配行保留、无匹配组隐藏、组自动展开', () => {
    const el = mount()
    const fontSizeGroup = groupFor(el, '字号')!
    fontSizeGroup.open = false // 手动折叠，验证过滤时自动展开
    const search = searchInput(el)
    search.value = 'space'
    search.dispatchEvent(new Event('input', { bubbles: true }))

    expect(rowFor(el, '--oas-space-2')!.style.display).toBe('')
    expect(rowFor(el, '--oas-color-primary')!.style.display).toBe('none')
    expect(rowFor(el, '--oas-font-size-md')!.style.display).toBe('none')
    expect(groupFor(el, '颜色')!.style.display).toBe('none')
    expect(groupFor(el, '间距')!.style.display).toBe('')
    expect(fontSizeGroup.open).toBe(true)
  })

  it('清空搜索恢复：全部行显示、组恢复过滤前的折叠状态', () => {
    const el = mount()
    const fontSizeGroup = groupFor(el, '字号')!
    fontSizeGroup.open = false
    const search = searchInput(el)
    search.value = 'space'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    expect(fontSizeGroup.open).toBe(true)

    search.value = ''
    search.dispatchEvent(new Event('input', { bubbles: true }))
    expect(rowFor(el, '--oas-color-primary')!.style.display).toBe('')
    expect(rowFor(el, '--oas-font-size-md')!.style.display).toBe('')
    expect(groupFor(el, '颜色')!.style.display).toBe('')
    expect(fontSizeGroup.open).toBe(false)
  })
})
