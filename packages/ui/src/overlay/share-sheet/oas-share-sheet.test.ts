import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASShareSheet } from './index.js'

const CHANNELS = JSON.stringify([
  { key: 'copy', name: '复制链接', icon: 'copy' },
  { key: 'mail', name: '邮件', icon: 'mail' },
  { key: 'more', name: '更多' },
])

function mount(attrs: Record<string, string> = {}): OASShareSheet {
  const el = new OASShareSheet()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function channels(el: OASShareSheet): HTMLButtonElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.channel')]
}

function click(el: OASShareSheet, selector: string): void {
  el.shadowRoot!.querySelector<HTMLElement>(selector)!.click()
}

describe('OASShareSheet 渲染与文案', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认标题/取消/关闭文案走 i18n', () => {
    const el = mount({ open: '', channels: CHANNELS })
    expect(el.shadowRoot!.querySelector('.heading')!.textContent).toBe('分享到')
    expect(el.shadowRoot!.querySelector('.cancel')!.textContent).toBe('取消')
    expect(el.shadowRoot!.querySelector('.close-btn')!.getAttribute('aria-label')).toBe('关闭')
  })

  it('heading / cancel-text 覆盖默认文案', () => {
    const el = mount({ open: '', channels: CHANNELS, heading: '发给好友', 'cancel-text': '算了' })
    expect(el.shadowRoot!.querySelector('.heading')!.textContent).toBe('发给好友')
    expect(el.shadowRoot!.querySelector('.cancel')!.textContent).toBe('算了')
    expect(el.shadowRoot!.querySelector('.sheet')!.getAttribute('aria-label')).toBe('发给好友')
  })

  it('按 channels 渲染宫格渠道（图标名 + 名称）', () => {
    const el = mount({ open: '', channels: CHANNELS })
    const items = channels(el)
    expect(items.length).toBe(3)
    expect(items[0]!.textContent).toContain('复制链接')
    expect(items[0]!.querySelector('oas-icon')!.getAttribute('name')).toBe('copy')
    // 无图标渠道用名称首字符占位
    expect(items[2]!.querySelector('.channel-icon')!.textContent).toBe('更')
  })

  it('空渠道显示空态文案', () => {
    const el = mount({ open: '', channels: '[]' })
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toBe('暂无可分享渠道')
  })

  it('非法 channels JSON 忽略并告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({ open: '', channels: '{not json' })
    expect(channels(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('.empty')?.textContent).toBe('暂无可分享渠道')
    el.setAttribute('channels', '{not json')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('非法渠道项（缺 key/name）跳过，不影响合法项', () => {
    const el = mount({
      open: '',
      channels: JSON.stringify([{ name: '缺 key' }, { key: 'ok', name: '合法' }, { key: '', name: '' }]),
    })
    const items = channels(el)
    expect(items.length).toBe(1)
    expect(items[0]!.textContent).toContain('合法')
  })

  it('对话框使用 aria-modal + 标题作为可读名称', () => {
    const el = mount({ open: '', channels: CHANNELS })
    const sheet = el.shadowRoot!.querySelector('[part="sheet"]')!
    expect(sheet.getAttribute('role')).toBe('dialog')
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(sheet.getAttribute('aria-label')).toBe('分享到')
  })

  it('关闭态 visibility:hidden（离屏面板不可聚焦/不进可访问性树），打开时恢复', () => {
    const el = mount({ channels: CHANNELS })
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.sheet\s*\{[^}]*visibility: hidden/)
    expect(css).toMatch(/:host\(\[open\]\) \.sheet\s*\{[^}]*visibility: visible/)
  })
})

describe('OASShareSheet 交互与事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('点击渠道派发 oas-select（含 key/name/channel）后自动关闭并派发 oas-close', () => {
    const el = mount({ open: '', channels: CHANNELS })
    const select = vi.fn()
    const close = vi.fn()
    el.addEventListener('oas-select', select)
    el.addEventListener('oas-close', close)
    channels(el)[1]!.click()
    expect(select).toHaveBeenCalledTimes(1)
    const detail = select.mock.calls[0]![0].detail
    expect(detail.key).toBe('mail')
    expect(detail.name).toBe('邮件')
    expect(detail.channel.key).toBe('mail')
    expect(el.hasAttribute('open')).toBe(false)
    expect(close.mock.calls[0]![0].detail).toEqual({ reason: 'select', key: 'mail' })
  })

  it('取消按钮关闭（reason=cancel），不派发 oas-select', () => {
    const el = mount({ open: '', channels: CHANNELS })
    const select = vi.fn()
    const close = vi.fn()
    el.addEventListener('oas-select', select)
    el.addEventListener('oas-close', close)
    click(el, '.cancel')
    expect(select).not.toHaveBeenCalled()
    expect(el.hasAttribute('open')).toBe(false)
    expect(close.mock.calls[0]![0].detail).toEqual({ reason: 'cancel' })
  })

  it('关闭按钮 / 点遮罩 / Esc 分别派发对应 reason', () => {
    const el = mount({ open: '', channels: CHANNELS })
    const close = vi.fn()
    el.addEventListener('oas-close', close)
    click(el, '.close-btn')
    expect(close.mock.calls.at(-1)![0].detail).toEqual({ reason: 'close' })

    el.setAttribute('open', '')
    click(el, '.backdrop')
    expect(close.mock.calls.at(-1)![0].detail).toEqual({ reason: 'backdrop' })

    el.setAttribute('open', '')
    el.shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(close.mock.calls.at(-1)![0].detail).toEqual({ reason: 'esc' })
  })

  it('show() 展开、close() 收起并派发 api 来源', () => {
    const el = mount({ channels: CHANNELS })
    const close = vi.fn()
    el.addEventListener('oas-close', close)
    el.show()
    expect(el.hasAttribute('open')).toBe(true)
    el.close()
    expect(el.hasAttribute('open')).toBe(false)
    expect(close.mock.calls[0]![0].detail).toEqual({ reason: 'api' })
  })

  it('未打开时 Esc / 遮罩点击不派发事件', () => {
    const el = mount({ channels: CHANNELS })
    const close = vi.fn()
    el.addEventListener('oas-close', close)
    click(el, '.backdrop')
    el.shadowRoot!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(close).not.toHaveBeenCalled()
  })

  it('打开时焦点进入首个渠道（键盘可达基础）', () => {
    const el = mount({ channels: CHANNELS })
    el.show()
    const first = channels(el)[0]!
    const root = el.shadowRoot!
    expect(root.activeElement === first || document.activeElement === first).toBe(true)
  })
})

describe('OASShareSheet property 通道（channels）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('赋数组 → 反射为 JSON 属性并渲染渠道（不被 update() 覆盖回空态）', () => {
    const el = mount()
    el.channels = [
      { key: 'a', name: '甲' },
      { key: 'b', name: '乙', icon: 'copy' },
    ]
    expect(el.getAttribute('channels')).toBe(
      JSON.stringify([
        { key: 'a', name: '甲' },
        { key: 'b', name: '乙', icon: 'copy' },
      ]),
    )
    expect(channels(el).length).toBe(2)
    expect(channels(el)[0]!.textContent).toContain('甲')
    // 后续属性变更触发 update() 不得把数组写入清掉（历史缺陷：字段同名被解析结果覆盖）
    el.setAttribute('heading', '再同步一次')
    expect(el.channels.map((c) => c.key)).toEqual(['a', 'b'])
    expect(channels(el).length).toBe(2)
  })

  it('赋合法 JSON 字符串走属性通道，getter 读回解析结果', () => {
    const el = mount()
    el.channels = JSON.stringify([{ key: 'copy', name: '复制链接', icon: 'copy' }])
    expect(el.channels).toEqual([{ key: 'copy', name: '复制链接', icon: 'copy' }])
    expect(channels(el).length).toBe(1)
  })

  it('赋空数组 → 清空渠道显示空态；非法项被跳过', () => {
    const el = mount({ channels: CHANNELS })
    expect(channels(el).length).toBe(3)
    el.channels = []
    expect(channels(el).length).toBe(0)
    expect(el.shadowRoot!.querySelector('.empty')!.textContent).toBe('暂无可分享渠道')
    el.channels = [
      { key: '', name: '缺 key' },
      { key: 'ok', name: '合法' },
    ]
    expect(el.channels!.map((c) => c.key)).toEqual(['ok'])
  })

  it('原型上有 get+set 双通道，实例无同名 own property（框架 property 写入不丢值）', () => {
    const el = mount()
    expect(Object.prototype.hasOwnProperty.call(el, 'channels')).toBe(false)
    const desc = Object.getOwnPropertyDescriptor(OASShareSheet.prototype, 'channels')
    expect(typeof desc?.get).toBe('function')
    expect(typeof desc?.set).toBe('function')
  })
})
