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
})
