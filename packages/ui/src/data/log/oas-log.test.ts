import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
import '@oas-ui/i18n'
import { OASLog } from './index.js'

function mount(lines?: string[]): OASLog {
  const el = new OASLog()
  if (lines) el.lines = lines
  document.body.appendChild(el)
  return el
}

function viewport(el: OASLog): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('.viewport')!
}

function rows(el: OASLog): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll('.row'))
}

interface ScrollMetrics {
  scrollHeight: number
  clientHeight: number
  scrollTop: number
}

/** happy-dom 不参与布局，桩掉视口滚动度量 */
function stubScroll(vp: HTMLElement, metrics: ScrollMetrics): void {
  Object.defineProperty(vp, 'scrollHeight', { value: metrics.scrollHeight, configurable: true })
  Object.defineProperty(vp, 'clientHeight', { value: metrics.clientHeight, configurable: true })
  Object.defineProperty(vp, 'scrollTop', {
    value: metrics.scrollTop,
    configurable: true,
    writable: true,
  })
}

describe('OASLog', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('空 lines 显示空态占位', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.querySelector('[part="log"]')!.hasAttribute('hidden')).toBe(true)
  })

  it('非空 lines 渲染对应行数', () => {
    const el = mount(['启动服务', '监听 3000 端口'])
    expect(rows(el).length).toBe(2)
    expect(el.shadowRoot!.textContent).toContain('启动服务')
  })

  it('追加 lines 时增量渲染，不重建已有行', () => {
    const el = mount(['第一行'])
    const first = rows(el)[0]
    el.lines = ['第一行', '第二行', '第三行']
    const after = rows(el)
    expect(after.length).toBe(3)
    expect(after[0]).toBe(first)
    expect(after[1]!.textContent).toContain('第二行')
  })

  it('lines 收缩时移除多余行', () => {
    const el = mount(['a', 'b', 'c'])
    el.lines = ['a']
    expect(rows(el).length).toBe(1)
  })

  it('line-number 属性控制行号栏显示', () => {
    const el = mount(['a', 'b'])
    const log = el.shadowRoot!.querySelector('[part="log"]')!
    expect(log.getAttribute('data-line-number')).toBe('false')
    el.setAttribute('line-number', '')
    expect(log.getAttribute('data-line-number')).toBe('true')
    const gutters = el.shadowRoot!.querySelectorAll('[part="line-number"]')
    expect(Array.from(gutters).map((g) => g.textContent)).toEqual(['1', '2'])
  })

  it('停靠底部时追加自动滚动到底', () => {
    const el = mount()
    const vp = viewport(el)
    stubScroll(vp, { scrollHeight: 1000, clientHeight: 100, scrollTop: 900 })
    vp.dispatchEvent(new Event('scroll'))
    el.lines = ['新日志']
    expect(vp.scrollTop).toBe(1000)
  })

  it('用户上翻时不自动滚动', () => {
    const el = mount()
    const vp = viewport(el)
    stubScroll(vp, { scrollHeight: 1000, clientHeight: 100, scrollTop: 300 })
    vp.dispatchEvent(new Event('scroll'))
    el.lines = ['新日志']
    expect(vp.scrollTop).toBe(300)
  })

  it('auto-scroll="false" 时始终不自动滚动', () => {
    const el = mount()
    el.setAttribute('auto-scroll', 'false')
    const vp = viewport(el)
    stubScroll(vp, { scrollHeight: 1000, clientHeight: 100, scrollTop: 900 })
    vp.dispatchEvent(new Event('scroll'))
    el.lines = ['新日志']
    expect(vp.scrollTop).toBe(900)
  })

  it('lines 属性支持 JSON 字符串通道', () => {
    const el = new OASLog()
    el.setAttribute('lines', '["第一行","第二行"]')
    document.body.appendChild(el)
    expect(rows(el).length).toBe(2)
  })

  it('locale：空态文案随 setLocale 切换', () => {
    const el = mount()
    expect(el.shadowRoot!.textContent).toContain('暂无日志')
    setLocale(en)
    expect(el.shadowRoot!.textContent).toContain('No logs')
    setLocale('zh-CN')
    expect(el.shadowRoot!.textContent).toContain('暂无日志')
  })

  it('断开连接时移除滚动监听', () => {
    const el = mount(['a'])
    const vp = viewport(el)
    const spy = vi.spyOn(vp, 'removeEventListener')
    el.remove()
    expect(spy).toHaveBeenCalledWith('scroll', expect.any(Function))
    spy.mockRestore()
  })

  it('滚动到顶部阈值内派发 oas-require-more（from=top），停留不重复、离开复位后再触发', () => {
    const el = mount(Array.from({ length: 30 }, (_, i) => `line-${i}`))
    const vp = viewport(el)
    const spy = vi.fn()
    el.addEventListener('oas-require-more', spy)
    stubScroll(vp, { scrollHeight: 2000, clientHeight: 200, scrollTop: 0 })
    vp.dispatchEvent(new Event('scroll'))
    expect(spy).toHaveBeenCalledTimes(1)
    expect((spy.mock.calls[0]![0] as CustomEvent).detail).toEqual({ from: 'top' })
    // 仍停留在顶部：边缘触发，不连发
    vp.dispatchEvent(new Event('scroll'))
    expect(spy).toHaveBeenCalledTimes(1)
    // 离开顶部后再次回顶：重新触发
    stubScroll(vp, { scrollHeight: 2000, clientHeight: 200, scrollTop: 500 })
    vp.dispatchEvent(new Event('scroll'))
    stubScroll(vp, { scrollHeight: 2000, clientHeight: 200, scrollTop: 0 })
    vp.dispatchEvent(new Event('scroll'))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('滚动到底部阈值内派发 from=bottom；offset-bottom 控制阈值', () => {
    const el = mount(Array.from({ length: 30 }, (_, i) => `line-${i}`))
    const vp = viewport(el)
    const spy = vi.fn()
    el.addEventListener('oas-require-more', spy)
    // 默认 offset-bottom=0：剩余距离为 0 才触发
    stubScroll(vp, { scrollHeight: 2000, clientHeight: 200, scrollTop: 1700 })
    vp.dispatchEvent(new Event('scroll'))
    expect(spy).not.toHaveBeenCalled()
    stubScroll(vp, { scrollHeight: 2000, clientHeight: 200, scrollTop: 1800 })
    vp.dispatchEvent(new Event('scroll'))
    expect(spy).toHaveBeenCalledTimes(1)
    expect((spy.mock.calls[0]![0] as CustomEvent).detail).toEqual({ from: 'bottom' })
    // 设置 offset-bottom=120：剩余 100 即触发
    const el2 = mount(Array.from({ length: 30 }, (_, i) => `line-${i}`))
    el2.setAttribute('offset-bottom', '120')
    const vp2 = viewport(el2)
    const spy2 = vi.fn()
    el2.addEventListener('oas-require-more', spy2)
    stubScroll(vp2, { scrollHeight: 2000, clientHeight: 200, scrollTop: 1700 })
    vp2.dispatchEvent(new Event('scroll'))
    expect(spy2).toHaveBeenCalledTimes(1)
    expect((spy2.mock.calls[0]![0] as CustomEvent).detail).toEqual({ from: 'bottom' })
  })

  it('顶部插入历史行复用已有行节点（key 对齐 reconcile），行号重排', () => {
    const el = mount(['a', 'b', 'c'])
    const rowA = rows(el)[0]!
    const rowC = rows(el)[2]!
    el.lines = ['x', 'y', 'a', 'b', 'c']
    const after = rows(el)
    expect(after.length).toBe(5)
    expect(after[2]).toBe(rowA)
    expect(after[4]).toBe(rowC)
    expect(after[0]!.textContent).toContain('x')
    const gutter = (r: HTMLElement): string => r.querySelector('[part="line-number"]')!.textContent!
    expect(gutter(after[0]!)).toBe('1')
    expect(gutter(after[4]!)).toBe('5')
  })

  it('中间行变更时重建差异行并保留前后未变行', () => {
    const el = mount(['a', 'b', 'c', 'd'])
    const rowA = rows(el)[0]!
    const rowB = rows(el)[1]!
    const rowD = rows(el)[3]!
    el.lines = ['a', 'B', 'c', 'd']
    const after = rows(el)
    expect(after[0]).toBe(rowA)
    expect(after[3]).toBe(rowD)
    expect(after[1]!.textContent).toContain('B')
    expect(after[1]).not.toBe(rowB)
  })

  it('highlight 关键词命中渲染 mark 片段，未命中行无 mark', () => {
    const el = mount(['ERROR 启动失败', 'INFO 一切正常'])
    el.setAttribute('highlight', '["ERROR"]')
    const lineEls = el.shadowRoot!.querySelectorAll('[part="line"]')
    expect(lineEls[0]!.querySelectorAll('.mark').length).toBe(1)
    expect(lineEls[0]!.querySelector('.mark')!.textContent).toBe('ERROR')
    expect(lineEls[1]!.querySelector('.mark')).toBeNull()
    // 通道变更重刷已有行
    el.setAttribute('highlight', '["INFO"]')
    expect(el.shadowRoot!.querySelectorAll('[part="line"]')[0]!.querySelector('.mark')).toBeNull()
    expect(
      el.shadowRoot!.querySelectorAll('[part="line"]')[1]!.querySelector('.mark')!.textContent,
    ).toBe('INFO')
  })

  it('highlight 支持正则条目，非法正则被跳过；匹配文本走 textContent 防注入', () => {
    const el = mount(['status 500 <b>', 'status ok'])
    // 注意 JSON 语义：正则反斜杠需写成 \\（解析后才是 \b\d{3}\b）
    el.setAttribute('highlight', '[{"pattern":"\\\\b\\\\d{3}\\\\b"},{"pattern":"("}]')
    const first = rows(el)[0]!.querySelector('[part="line"]')!
    expect(first.querySelector('.mark')!.textContent).toBe('500')
    expect(first.querySelector('b')).toBeNull()
    expect(rows(el)[1]!.querySelector('[part="line"]')!.querySelector('.mark')).toBeNull()
  })

  it('levels JSON 通道为行设置级别语义色（含别名归一）', () => {
    const el = mount(['ok', 'warn', 'boom', 'unknown'])
    el.setAttribute('levels', '["success","warn","fatal","weird"]')
    const rs = rows(el)
    expect(rs[0]!.getAttribute('data-level')).toBe('success')
    expect(rs[1]!.getAttribute('data-level')).toBe('warning')
    expect(rs[2]!.getAttribute('data-level')).toBe('error')
    expect(rs[3]!.hasAttribute('data-level')).toBe(false)
  })

  it('loading 属性显示加载浮层、同步 aria-busy 与 locale 文案', () => {
    const el = mount(['a'])
    const overlay = el.shadowRoot!.querySelector('[part="loading"]')!
    const log = el.shadowRoot!.querySelector('[part="log"]')!
    expect(overlay.hasAttribute('hidden')).toBe(true)
    el.setAttribute('loading', '')
    expect(overlay.hasAttribute('hidden')).toBe(false)
    expect(overlay.textContent).toContain('加载中')
    expect(log.getAttribute('aria-busy')).toBe('true')
    el.removeAttribute('loading')
    expect(overlay.hasAttribute('hidden')).toBe(true)
    expect(log.getAttribute('aria-busy')).toBe('false')
  })

  it('scrollTo(top/bottom/像素) 滚动视口并维护贴底状态', () => {
    const el = mount(Array.from({ length: 30 }, (_, i) => `line-${i}`))
    const vp = viewport(el)
    stubScroll(vp, { scrollHeight: 1000, clientHeight: 100, scrollTop: 300 })
    vp.dispatchEvent(new Event('scroll'))
    el.scrollTo('bottom')
    expect(vp.scrollTop).toBe(1000)
    el.scrollTo('top')
    expect(vp.scrollTop).toBe(0)
    el.scrollTo(120)
    expect(vp.scrollTop).toBe(120)
    // 非法目标不抛错、不滚动
    el.scrollTo('middle' as unknown as number)
    expect(vp.scrollTop).toBe(120)
  })
})
