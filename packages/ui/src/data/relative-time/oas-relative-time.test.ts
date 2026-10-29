import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import '@oas-ui/i18n'
import { OASRelativeTime } from './index.js'

const NOW = Date.UTC(2026, 9, 29, 12, 0, 0)
const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

function mount(attrs: Record<string, string> = {}, parent: HTMLElement = document.body): OASRelativeTime {
  const el = new OASRelativeTime()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  parent.appendChild(el)
  return el
}

function timeEl(el: OASRelativeTime): HTMLTimeElement {
  return el.shadowRoot!.querySelector<HTMLTimeElement>('[part="time"]')!
}

function text(el: OASRelativeTime): string {
  return timeEl(el).textContent ?? ''
}

describe('OASRelativeTime 值与语义', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllTimers()
    vi.useRealTimers()
    delete (document as unknown as Record<string, unknown>).hidden
  })

  it('epoch 毫秒字符串渲染相对时间（默认 locale 走全局 i18n zh-CN）', () => {
    const el = mount({ value: String(NOW - 3 * MINUTE) })
    expect(text(el)).toBe('3分钟前')
    expect(timeEl(el).tagName).toBe('TIME')
    expect(timeEl(el).getAttribute('datetime')).toBe('2026-10-29T11:57:00.000Z')
    expect(timeEl(el).hidden).toBe(false)
    expect(timeEl(el).getAttribute('aria-live')).toBe('off')
  })

  it('ISO 8601 输入：datetime 规范化为 UTC ISO，过去/未来方向正确', () => {
    const el = mount({ value: '2026-10-29T10:00:00.000Z' })
    expect(text(el)).toBe('2小时前')
    expect(timeEl(el).getAttribute('datetime')).toBe('2026-10-29T10:00:00.000Z')

    el.setAttribute('value', '2026-10-29T16:00:00+02:00')
    expect(text(el)).toBe('2小时后')
    expect(timeEl(el).getAttribute('datetime')).toBe('2026-10-29T14:00:00.000Z')
  })

  it('property 接受 Date / number，写回 attribute 并即时重算；null 移除属性', () => {
    const el = mount()
    el.value = new Date(NOW - 2 * HOUR)
    expect(el.getAttribute('value')).toBe('2026-10-29T10:00:00.000Z')
    expect(text(el)).toBe('2小时前')

    el.value = NOW - DAY
    expect(el.getAttribute('value')).toBe(String(NOW - DAY))
    expect(text(el)).toBe('昨天')

    el.value = null
    expect(el.hasAttribute('value')).toBe(false)
    expect(text(el)).toBe('')
    expect(timeEl(el).hidden).toBe(true)
  })

  it('数值属性通道在升级前写入也不丢失（Vue / React 绑定）', () => {
    const el = new OASRelativeTime()
    el.value = NOW - 5 * MINUTE
    document.body.appendChild(el)
    expect(text(el)).toBe('5分钟前')
    expect(el.getAttribute('value')).toBe(String(NOW - 5 * MINUTE))
  })

  it('非法 / 缺失值安全空态：无 raw key / NaN / Invalid Date / datetime', () => {
    for (const bad of ['', 'abc', 'NaN', 'Invalid Date', 'undefined', 'null']) {
      const el = mount({ value: bad })
      expect(text(el), `value=${bad}`).toBe('')
      expect(timeEl(el).hidden).toBe(true)
      expect(timeEl(el).hasAttribute('datetime')).toBe(false)
      expect(el.textContent ?? '').toBe('')
      expect(el.shadowRoot!.textContent ?? '').not.toMatch(/NaN|Invalid|undefined|null|value/)
      el.remove()
    }
    const empty = mount()
    expect(text(empty)).toBe('')
    expect(timeEl(empty).hidden).toBe(true)
    expect(timeEl(empty).hasAttribute('datetime')).toBe(false)
  })

  it('单位边界与进位（含未来）', () => {
    const cases: Array<[number, string]> = [
      [59_000, '59秒钟前'],
      [59_500, '1分钟前'],
      [90_000, '2分钟前'],
      [23.5 * HOUR, '1天前'],
      [30 * DAY, '1个月前'],
      [365 * DAY, '1年前'],
      [-2 * HOUR, '2小时后'],
    ]
    for (const [delta, expected] of cases) {
      const el = mount({ value: String(NOW - delta), numeric: 'always' })
      expect(text(el), `delta=${delta}`).toBe(expected)
      el.remove()
    }
  })

  it('numeric=always 显示数字、auto 使用语义文案、非法值按 auto', () => {
    const always = mount({ value: String(NOW - DAY), numeric: 'always' })
    expect(text(always)).toBe('1天前')
    always.remove()
    const auto = mount({ value: String(NOW - DAY), numeric: 'auto' })
    expect(text(auto)).toBe('昨天')
    auto.remove()
    const invalid = mount({ value: String(NOW - DAY), numeric: 'bogus' })
    expect(text(invalid)).toBe('昨天')
  })

  it('locale 生效；非法 locale 回落全局 zh-CN，不抛错、不显示 raw key', () => {
    const en = mount({ value: String(NOW - 3 * MINUTE), locale: 'en-US' })
    expect(text(en)).toBe('3 minutes ago')
    en.remove()

    const de = mount({ value: String(NOW - 2 * HOUR), locale: 'de-DE' })
    expect(text(de)).toBe('vor 2 Stunden')
    de.remove()

    for (const bad of ['zh_CN', 'not-a-locale', 'xx-YY', '']) {
      const el = mount({ value: String(NOW - 3 * MINUTE), locale: bad })
      expect(text(el), `locale=${bad}`).toBe('3分钟前')
      expect(text(el)).not.toContain('relativeTime')
      el.remove()
    }
  })

  it('locale 回落到最近 config-provider（非法显式 locale 也让位给 provider）', () => {
    const provider = document.createElement('oas-config-provider')
    provider.setAttribute('locale', 'en')
    document.body.appendChild(provider)

    const inherited = mount({ value: String(NOW - 3 * MINUTE) }, provider)
    expect(text(inherited)).toBe('3 minutes ago')

    const invalidExplicit = mount({ value: String(NOW - 3 * MINUTE), locale: 'zh_CN' }, provider)
    expect(text(invalidExplicit)).toBe('3 minutes ago')
  })
})

describe('OASRelativeTime auto-refresh 生命周期', () => {
  let hidden = false

  beforeEach(() => {
    document.body.innerHTML = ''
    hidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllTimers()
    vi.useRealTimers()
    delete (document as unknown as Record<string, unknown>).hidden
  })

  it('未开启 auto-refresh：不注册 visibilitychange、不启动定时器', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const el = mount({ value: String(NOW - 10_000) })
    expect(text(el)).toBe('10秒钟前')
    expect(add.mock.calls.some(([type]) => type === 'visibilitychange')).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(text(el)).toBe('10秒钟前')
    add.mockRestore()
  })

  it('开启后秒级每秒刷新，跨单位后仍持续（fake clock）', () => {
    const el = mount({ value: String(NOW - 10_000), 'auto-refresh': '' })
    expect(text(el)).toBe('10秒钟前')
    vi.advanceTimersByTime(1000)
    expect(text(el)).toBe('11秒钟前')
    vi.advanceTimersByTime(1000)
    expect(text(el)).toBe('12秒钟前')
  })

  it('auto-refresh="false" 视为关闭', () => {
    const el = mount({ value: String(NOW - 10_000), 'auto-refresh': 'false' })
    vi.advanceTimersByTime(3000)
    expect(text(el)).toBe('10秒钟前')
  })

  it('页面隐藏暂停刷新，恢复可见立即重算并续排', () => {
    const el = mount({ value: String(NOW - 10_000), 'auto-refresh': '' })
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(5000)
    expect(text(el), '隐藏期间不刷新').toBe('10秒钟前')

    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    expect(text(el), '恢复可见立即重算').toBe('15秒钟前')
    vi.advanceTimersByTime(1000)
    expect(text(el), '恢复后续排').toBe('16秒钟前')
  })

  it('断开连接清理定时器与监听；重连立即重算并恢复刷新', () => {
    const el = mount({ value: String(NOW - 10_000), 'auto-refresh': '' })
    vi.advanceTimersByTime(1000)
    expect(text(el)).toBe('11秒钟前')

    el.remove()
    vi.advanceTimersByTime(5000)
    expect(text(el), '断开后不再刷新').toBe('11秒钟前')
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(5000)
    expect(text(el)).toBe('11秒钟前')

    document.body.appendChild(el)
    expect(text(el), '重连按当前时钟重算').toBe('21秒钟前')
    vi.advanceTimersByTime(1000)
    expect(text(el), '重连后定时器恢复').toBe('22秒钟前')
  })

  it('改 value / numeric / locale 时重排定时器并使用新契约', () => {
    const el = mount({ value: String(NOW - 10_000), 'auto-refresh': '' })
    vi.advanceTimersByTime(1000)
    expect(text(el)).toBe('11秒钟前')

    el.setAttribute('value', String(NOW - HOUR))
    expect(text(el)).toBe('1小时前')
    // 分钟/小时档 30s 节流：1s 内不变，30s 后更新
    vi.advanceTimersByTime(1000)
    expect(text(el)).toBe('1小时前')
    vi.advanceTimersByTime(30_000)
    expect(text(el)).toBe('1小时前') // 1h + 31s 仍四舍五入为 1 小时

    el.setAttribute('numeric', 'always')
    el.setAttribute('locale', 'en-US')
    expect(text(el)).toBe('1 hour ago')
  })
})

describe('OASRelativeTime SSR / 水合', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('SSR 快照结构 + 指纹可被 hydrate 接管（shadow 不重建），随后按当前时钟重算', () => {
    const ref = mount({ value: String(NOW - 3 * MINUTE) })
    const snap = ref.shadowRoot!.innerHTML
    ref.remove()
    expect(snap).toContain('<time part="time"')

    const el = new OASRelativeTime()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-relative-time" data-oas-ssr-v="1">${snap}`
    el.setAttribute('value', String(NOW - 3 * MINUTE))
    const styleRef = el.shadowRoot!.querySelector('style')
    document.body.appendChild(el)

    expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(text(el)).toBe('3分钟前')
    expect(timeEl(el).getAttribute('datetime')).toBe('2026-10-29T11:57:00.000Z')
  })

  it('快照缺 time 结构时 hydrate 回退 render 全量重建', () => {
    const el = new OASRelativeTime()
    el.shadowRoot!.innerHTML = '<meta data-oas-ssr="oas-relative-time" data-oas-ssr-v="1"><span>broken</span>'
    el.setAttribute('value', String(NOW - 3 * MINUTE))
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="time"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    expect(text(el)).toBe('3分钟前')
  })

  it('SSR 渲染路径（template/render/hydrate）不引用 document / window / globalThis', () => {
    const src = readFileSync(join(import.meta.dirname, 'oas-relative-time.ts'), 'utf8')
    const start = src.indexOf('private template(')
    const end = src.indexOf('protected override update(')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const renderPath = src.slice(start, end)
    expect(renderPath).not.toMatch(/\bdocument\b|\bwindow\b|\bglobalThis\b|localStorage|matchMedia/)
  })

  it('未开启 auto-refresh 的首次渲染不触碰浏览器全局（SSR 快照同路径）', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const el = mount({ value: String(NOW - 3 * MINUTE) })
    expect(text(el)).toBe('3分钟前')
    expect(add).not.toHaveBeenCalled()
    add.mockRestore()
  })
})
