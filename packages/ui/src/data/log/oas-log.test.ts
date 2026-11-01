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
    expect(el.shadowRoot!.querySelectorAll('[part="line"]')[1]!.querySelector('.mark')!.textContent).toBe('INFO')
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

  it('keyword 非空时只显示命中行（大小写不敏感），移除恢复全部', () => {
    const el = mount(['ERROR 启动失败', 'INFO 一切正常', 'error 又失败了', 'DEBUG 忽略我'])
    el.setAttribute('keyword', 'error')
    expect(rows(el).length).toBe(2)
    expect(rows(el)[0]!.textContent).toContain('ERROR 启动失败')
    expect(rows(el)[1]!.textContent).toContain('error 又失败了')
    // 纯空白 keyword 视为不过滤
    el.setAttribute('keyword', '   ')
    expect(rows(el).length).toBe(4)
    el.setAttribute('keyword', 'error')
    el.removeAttribute('keyword')
    expect(rows(el).length).toBe(4)
  })

  it('keyword 命中片段包 mark，与 highlight 通道叠加、levels 按原始索引保留', () => {
    const el = mount(['ERROR 连接 timeout', 'INFO 一切正常', 'WARN 再次 timeout'])
    el.setAttribute('levels', '["error","info","warning"]')
    el.setAttribute('highlight', '["ERROR"]')
    el.setAttribute('keyword', 'timeout')
    const rs = rows(el)
    expect(rs.length).toBe(2)
    // 命中行同时有 highlight 通道的 mark 与 keyword 的 mark
    expect(rs[0]!.querySelectorAll('.mark').length).toBe(2)
    expect(rs[0]!.querySelector('[part="line"]')!.textContent).toContain('ERROR 连接 timeout')
    // levels 按原始 data 索引对齐：第 0 行 error、第 2 行 warning
    expect(rs[0]!.getAttribute('data-level')).toBe('error')
    expect(rs[1]!.getAttribute('data-level')).toBe('warning')
    // 无 keyword 时 highlight/levels 行为不变
    el.removeAttribute('keyword')
    expect(rows(el).length).toBe(3)
  })

  it('keyword 过滤后行号显示原始 data 行号', () => {
    const el = mount(['aaa', 'bbb keyword', 'ccc', 'ddd keyword'])
    el.setAttribute('line-number', '')
    el.setAttribute('keyword', 'keyword')
    const gutters = Array.from(el.shadowRoot!.querySelectorAll('.gutter')).map((g) => g.textContent)
    expect(gutters).toEqual(['2', '4'])
  })

  it('过滤态顶部插入历史行后，复用行重算行号与 levels（viewMap 漂移）', () => {
    const el = mount(['a1', 'a2', 'hit-3'])
    el.setAttribute('line-number', '')
    el.setAttribute('keyword', 'hit')
    el.setAttribute('levels', '["info","info","error"]')
    const row = () => rows(el)[0]!
    expect(row().querySelector('.gutter')!.textContent).toBe('3')
    expect(row().getAttribute('data-level')).toBe('error')
    // 顶部插入两行历史日志：可见行文本不变，但 data 索引从 2 → 4
    el.lines = ['x1', 'x2', 'a1', 'a2', 'hit-3']
    el.setAttribute('levels', '["info","info","info","info","error"]')
    expect(row().querySelector('.gutter')!.textContent).toBe('5')
    expect(row().getAttribute('data-level')).toBe('error')
    // levels 同步按新索引对齐：新数据第 5 行改为 info
    el.setAttribute('levels', '["info","info","info","info","info"]')
    expect(row().getAttribute('data-level')).toBe('info')
  })

  it('keyword 无命中显示「无匹配」空态（locale），数据本空仍显示空态文案', () => {
    const el = mount(['INFO 一切正常'])
    el.setAttribute('keyword', '不存在的关键字')
    expect(el.shadowRoot!.querySelector('[part="empty"]')!.hasAttribute('hidden')).toBe(false)
    expect(el.shadowRoot!.textContent).toContain('无匹配日志')
    setLocale(en)
    el.setAttribute('keyword', '另一个不存在')
    expect(el.shadowRoot!.textContent).toContain('No matching logs')
    setLocale('zh-CN')
    // 数据本空 + keyword：仍显示常规空态文案
    const empty = mount()
    empty.setAttribute('keyword', 'x')
    expect(empty.shadowRoot!.textContent).toContain('暂无日志')
  })

  it('oas-search：keyword 变化/数据变化时派发 detail { keyword, matched, total }', () => {
    const el = mount(['ERROR a', 'INFO b', 'ERROR c'])
    const spy = vi.fn()
    el.addEventListener('oas-search', spy)
    el.setAttribute('keyword', 'error')
    expect(spy).toHaveBeenCalledTimes(1)
    expect((spy.mock.calls[0]![0] as CustomEvent).detail).toEqual({
      keyword: 'error',
      matched: 2,
      total: 3,
    })
    // 数据变化重新派发（过滤范围 = 当前已加载行）
    el.lines = ['ERROR a', 'INFO b', 'ERROR c', 'ERROR d']
    expect(spy).toHaveBeenCalledTimes(2)
    expect((spy.mock.calls[1]![0] as CustomEvent).detail).toEqual({
      keyword: 'error',
      matched: 3,
      total: 4,
    })
    // 清空 keyword：matched 恢复为全部
    el.removeAttribute('keyword')
    expect(spy).toHaveBeenCalledTimes(3)
    expect((spy.mock.calls[2]![0] as CustomEvent).detail).toEqual({
      keyword: '',
      matched: 4,
      total: 4,
    })
  })

  it('keyword 过滤不改动宿主数据（lines 只读快照不变）', () => {
    const el = mount(['ERROR a', 'INFO b'])
    el.setAttribute('keyword', 'error')
    expect(el.lines).toEqual(['ERROR a', 'INFO b'])
    el.removeAttribute('keyword')
    expect(el.lines).toEqual(['ERROR a', 'INFO b'])
  })

  it('RTL：dir=rtl 下行号列走逻辑属性（行内轴末端对齐），渲染正常', () => {
    const el = new OASLog()
    el.setAttribute('dir', 'rtl')
    el.lines = ['ERROR a']
    document.body.appendChild(el)
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toMatch(/\.gutter\s*\{[^}]*padding-inline-end:\s*var\(--oas-space-3\)/)
    expect(css).toMatch(/\.gutter\s*\{[^}]*text-align:\s*end/)
    expect(css).not.toMatch(/padding-right:/)
    expect(css).not.toMatch(/padding-left:/)
    expect(el.shadowRoot!.querySelectorAll('.row').length).toBe(1)
    el.remove()
  })
})

describe('property 通道接受 JSON 字符串（框架把静态 attribute 写成 property）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  it('lines setter 字符串 → 解析为字符串数组', () => {
    const el = mount()
    // @ts-expect-error 以字符串写入：模拟框架把静态 attribute 当 property 传入
    el.lines = JSON.stringify(['a', 'b'])
    expect(el.lines).toEqual(['a', 'b'])
  })
})

// ===== ANSI 着色（ansi 属性，opt-in） =====
const ESC = '\u001b['

function lineAt(el: OASLog, i = 0): HTMLElement {
  return el.shadowRoot!.querySelectorAll('[part="line"]')[i] as HTMLElement
}

/** 与无障碍门禁同公式的感知对比度（测试侧独立复算，避免复用实现） */
function perceptual(fg: string, bg: string): number {
  const y = (hex: string): number => {
    const n = Number.parseInt(hex.slice(1), 16)
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    return 0.2126729 * (r! / 255) ** 2.4 + 0.7151522 * (g! / 255) ** 2.4 + 0.072175 * (b! / 255) ** 2.4
  }
  const clamp = (v: number): number => (v > 0.022 ? v : v + (0.022 - v) ** 1.414)
  const tY = clamp(y(fg))
  const bY = clamp(y(bg))
  if (Math.abs(bY - tY) < 0.0005) return 0
  if (bY > tY) {
    const raw = (bY ** 0.56 - tY ** 0.57) * 1.14
    return Math.abs(raw < 0.1 ? 0 : raw - 0.027) * 100
  }
  const raw = (bY ** 0.65 - tY ** 0.62) * 1.14
  return Math.abs(raw > -0.1 ? 0 : raw + 0.027) * 100
}

describe('OASLog ANSI 着色（ansi 属性）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('默认关闭：转义序列按原文本显示（现有行为不变）', () => {
    const el = mount([`${ESC}31mERROR${ESC}0m boom`])
    expect(lineAt(el).textContent).toBe(`${ESC}31mERROR${ESC}0m boom`)
    expect(lineAt(el).querySelector('span')).toBeNull()
  })

  it('开启后剔除 SGR 序列，前景色渲染为 span class，显示文本干净', () => {
    const el = mount([`${ESC}31mERROR${ESC}0m boom`])
    el.setAttribute('ansi', '')
    const line = lineAt(el)
    expect(line.textContent).toBe('ERROR boom')
    const fg = line.querySelector('.ansi-fg-red')!
    expect(fg.textContent).toBe('ERROR')
    // reset 后片段无样式：纯文本节点直接挂 line（不包多余 span）
    const tail = Array.from(line.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent === ' boom')
    expect(tail!.nodeType).toBe(Node.TEXT_NODE)
  })

  it('ansi 开启但行无转义码：保持纯文本渲染（无 span）', () => {
    const el = mount(['plain line'])
    el.setAttribute('ansi', '')
    expect(lineAt(el).textContent).toBe('plain line')
    expect(lineAt(el).querySelector('span')).toBeNull()
  })

  it('bold/dim/italic/underline 组合与 22/23/24 逐项关闭', () => {
    const el = mount([
      `${ESC}1;2;3;4;32mfull${ESC}22m no-bold-dim${ESC}23m no-italic${ESC}24m no-underline${ESC}0m tail`,
    ])
    el.setAttribute('ansi', '')
    const spans = lineAt(el).querySelectorAll('span')
    expect(spans[0]!.classList.contains('ansi-bold')).toBe(true)
    expect(spans[0]!.classList.contains('ansi-dim')).toBe(true)
    expect(spans[0]!.classList.contains('ansi-italic')).toBe(true)
    expect(spans[0]!.classList.contains('ansi-underline')).toBe(true)
    expect(spans[0]!.classList.contains('ansi-fg-green')).toBe(true)
    // 22 只关 bold/dim，italic/underline/颜色保留
    expect(spans[1]!.classList.contains('ansi-bold')).toBe(false)
    expect(spans[1]!.classList.contains('ansi-dim')).toBe(false)
    expect(spans[1]!.classList.contains('ansi-italic')).toBe(true)
    expect(spans[1]!.classList.contains('ansi-underline')).toBe(true)
    expect(spans[1]!.classList.contains('ansi-fg-green')).toBe(true)
    // 23 关 italic
    expect(spans[2]!.classList.contains('ansi-italic')).toBe(false)
    expect(spans[2]!.classList.contains('ansi-underline')).toBe(true)
    // 24 关 underline；reset（0）后的 tail 回到无样式
    expect(spans[3]!.classList.contains('ansi-underline')).toBe(false)
    expect(spans[3]!.classList.contains('ansi-fg-green')).toBe(true)
    expect(lineAt(el).textContent!.endsWith('tail')).toBe(true)
  })

  it('40-47 / 100-107 背景色 class；39/49 清除前景/背景恢复继承', () => {
    const el = mount([`${ESC}31;41mboth${ESC}39m no-fg${ESC}49m no-bg${ESC}0m ${ESC}103mbright-bg${ESC}0m`])
    el.setAttribute('ansi', '')
    const spans = lineAt(el).querySelectorAll('span')
    expect(spans[0]!.classList.contains('ansi-fg-red')).toBe(true)
    expect(spans[0]!.classList.contains('ansi-bg-red')).toBe(true)
    // 39 只清前景（bg red 保留）
    expect(spans[1]!.classList.contains('ansi-fg-red')).toBe(false)
    expect(spans[1]!.classList.contains('ansi-bg-red')).toBe(true)
    // 49 清背景后片段无样式 → 文本节点；下一个 span 是 103 亮色背景
    expect(spans[2]!.classList.contains('ansi-bg-bright-yellow')).toBe(true)
  })

  it('彩色背景上的 16 色前景按对比度兜底（红底白字/黑字自动可读）', () => {
    const el = mount([`${ESC}41;97mred-white${ESC}0m ${ESC}41;30mred-black${ESC}0m ${ESC}103mbright-bg${ESC}0m`])
    el.setAttribute('ansi', '')
    const spans = lineAt(el).querySelectorAll('span')
    expect(spans[0]!.classList.contains('ansi-bg-red')).toBe(true)
    expect(spans[0]!.style.color).toMatch(/255, 255, 255|#fff/i)
    // 黑字在 ANSI 红底上对比不足 → 自动改用白字
    expect(spans[1]!.classList.contains('ansi-bg-red')).toBe(true)
    expect(spans[1]!.style.color).toMatch(/255, 255, 255|#fff/i)
    // 亮黄底 → 深色字
    expect(spans[2]!.classList.contains('ansi-bg-bright-yellow')).toBe(true)
    expect(spans[2]!.style.color).toMatch(/0, 0, 0|#000/i)
  })

  it('inverse 交换前景/背景；无色可换时走 token 反白 class', () => {
    const el = mount([`${ESC}7minv${ESC}0m | ${ESC}31;7mswap${ESC}0m`])
    el.setAttribute('ansi', '')
    const spans = lineAt(el).querySelectorAll('span')
    expect(spans[0]!.classList.contains('ansi-inverse')).toBe(true)
    // 原本只有前景色：交换后只剩背景色
    expect(spans[1]!.classList.contains('ansi-bg-red')).toBe(true)
    expect(spans[1]!.classList.contains('ansi-fg-red')).toBe(false)
  })

  it('256 色（38;5;n / 48;5;n）渲染 inline style rgb', () => {
    const el = mount([`${ESC}38;5;39mA${ESC}0m${ESC}48;5;203mB${ESC}0m`])
    el.setAttribute('ansi', '')
    const spans = lineAt(el).querySelectorAll('span')
    expect(spans[0]!.classList.contains('ansi-rgb-fg')).toBe(true)
    expect(spans[0]!.style.getPropertyValue('--ansi-fg-light')).toMatch(/^rgb\(/)
    expect(spans[1]!.getAttribute('style')).toContain('background-color')
    expect(spans[1]!.getAttribute('style')).toContain('255, 95, 95')
  })

  it('truecolor（38;2;r;g;b / 48;2;...）渲染 inline style rgb', () => {
    const el = mount([`${ESC}38;2;12;34;56mX${ESC}0m${ESC}48;2;255;0;128mY${ESC}0m`])
    el.setAttribute('ansi', '')
    const spans = lineAt(el).querySelectorAll('span')
    expect(spans[0]!.classList.contains('ansi-rgb-fg')).toBe(true)
    expect(spans[0]!.style.getPropertyValue('--ansi-fg-light')).toBe('rgb(12, 34, 56)')
    expect(spans[1]!.getAttribute('style')).toContain('rgb(255, 0, 128)')
  })

  it('未知/非法序列剔除且后续文本保留（不影响后续解析）', () => {
    const el = mount(['a\x1b[99zb', `x${ESC}38;5;999mY`, 'p\x1bQ q', `${ESC}31;<;1mz`])
    el.setAttribute('ansi', '')
    const lines = el.shadowRoot!.querySelectorAll('[part="line"]')
    // 非 SGR CSI（终止字节 z）整体剔除
    expect(lines[0]!.textContent).toBe('ab')
    // 越界 256 色索引：序列剔除、颜色忽略、文本保留
    expect(lines[1]!.textContent).toBe('xY')
    // 单字符 ESC 序列剔除
    expect(lines[2]!.textContent).toBe('p q')
    // 参数中段非法（< 为参数字节但非数字）：合法部分继续生效（31 红色 + 1 加粗）
    expect(lines[3]!.textContent).toBe('z')
    expect(lines[3]!.querySelectorAll('.ansi-bold').length).toBe(1)
    expect(lines[3]!.querySelectorAll('.ansi-fg-red').length).toBe(1)
  })

  it('OSC 序列剔除（BEL 与 ST 终止均支持；链接文本保留）', () => {
    const el = mount(['a\x1b]0;title\x07b', 'c\x1b]8;;https://e.com\x1b\\link\x1b]8;;\x1b\\d'])
    el.setAttribute('ansi', '')
    const lines = el.shadowRoot!.querySelectorAll('[part="line"]')
    expect(lines[0]!.textContent).toBe('ab')
    // OSC 8 只声明超链接目标，链接可见文本保留（本组件不做 OSC 8 渲染）
    expect(lines[1]!.textContent).toBe('clinkd')
  })

  it('未终止 OSC 遇下一 ESC：整段剔除且后续 SGR 正常解析', () => {
    const el = mount([`a\x1b]0;title${ESC}31mred${ESC}0m`])
    el.setAttribute('ansi', '')
    const line = lineAt(el)
    expect(line.textContent).toBe('ared')
    expect(line.querySelector('.ansi-fg-red')?.textContent).toBe('red')
  })

  it('未终止 DCS/APC/半截 CSI 遇下一 ESC：控制串不泄漏且后续 SGR 正常解析', () => {
    const el = mount([
      `a\x1bPpayload${ESC}31mred${ESC}0m`,
      `b\x1b_payload${ESC}32mgreen${ESC}0m`,
      `c\x1b[31${ESC}0mred`,
    ])
    el.setAttribute('ansi', '')
    const lines = el.shadowRoot!.querySelectorAll('[part="line"]')
    expect([...lines].map((line) => line.textContent)).toEqual(['ared', 'bgreen', 'cred'])
    expect(lines[0]!.querySelector('.ansi-fg-red')?.textContent).toBe('red')
    expect(lines[1]!.querySelector('.ansi-fg-green')?.textContent).toBe('green')
  })

  it('未终止的 OSC / DCS 控制串吃满行尾，不泄漏控制字符', () => {
    const el = mount(['a\x1b]0;title without terminator', 'b\x1bPpayload without terminator', 'tail\x1b', 'csi\x1b[31'])
    el.setAttribute('ansi', '')
    const lines = el.shadowRoot!.querySelectorAll('[part="line"]')
    expect(lines[0]!.textContent).toBe('a')
    expect(lines[1]!.textContent).toBe('b')
    // 孤立 ESC 也剔除，不把控制字符留在 DOM
    expect(lines[2]!.textContent).toBe('tail')
    // 行尾半截 CSI 整体剔除，不把参数当文本显示
    expect(lines[3]!.textContent).toBe('csi')
  })

  it('常见多字节 ESC 序列与 C0 控制字符剔除（保留制表符）', () => {
    const el = mount(['a\x1b7b', 'c\x1b(Bd', 'e\x1b#8f', 'g\x1b%Gh', 'i\x07j\x08k', 'l\tm'])
    el.setAttribute('ansi', '')
    const texts = Array.from(el.shadowRoot!.querySelectorAll('[part="line"]')).map((l) => l.textContent)
    expect(texts).toEqual(['ab', 'cd', 'ef', 'gh', 'ijk', 'l\tm'])
  })

  it('keyword 命中仍为 mark，ANSI 前景色不丢（mark 继承片段色）', () => {
    const el = mount([`${ESC}31mERROR${ESC}0m connect ${ESC}1;34mtimeout${ESC}0m`])
    el.setAttribute('ansi', '')
    el.setAttribute('keyword', 'timeout')
    const line = lineAt(el)
    expect(line.textContent).toBe('ERROR connect timeout')
    const mark = line.querySelector('.mark')!
    expect(mark.textContent).toBe('timeout')
    expect(mark.className).toContain('ansi-colored')
    expect(mark.parentElement!.classList.contains('ansi-bold')).toBe(true)
    expect(mark.parentElement!.classList.contains('ansi-fg-blue')).toBe(true)
  })

  it('keyword 过滤按可见文本匹配（转义码打断关键词也能命中）', () => {
    const el = mount([`${ESC}31merr${ESC}0mor: boom`, 'plain line'])
    el.setAttribute('ansi', '')
    el.setAttribute('keyword', 'error')
    const lines = Array.from(el.shadowRoot!.querySelectorAll('[part="line"]')) as HTMLElement[]
    expect(lines).toHaveLength(1)
    expect(lines[0]!.textContent).toBe('error: boom')
    // 命中跨 ANSI 边界时仍要有 mark，且两段分别继承各自片段色
    const marks = lines[0]!.querySelectorAll('.mark')
    expect(marks).toHaveLength(2)
    expect(Array.from(marks).map((m) => m.textContent)).toEqual(['err', 'or'])
    expect(marks[0]!.className).toContain('ansi-colored')
    expect(marks[1]!.className).not.toContain('ansi-colored')
    expect(marks[0]!.parentElement!.classList.contains('ansi-fg-red')).toBe(true)
  })

  it('highlight 命中片段位于 ANSI 前景 span 内层', () => {
    const el = mount([`${ESC}35mBuild 500ms done${ESC}0m`])
    el.setAttribute('ansi', '')
    el.setAttribute('highlight', '["500"]')
    const mark = lineAt(el).querySelector('.mark')!
    expect(mark.textContent).toBe('500')
    expect(mark.parentElement!.classList.contains('ansi-fg-magenta')).toBe(true)
  })

  it('levels 行级语义色与 ANSI 共存（data-level 保留，前景由片段承载）', () => {
    const el = mount([`${ESC}31mERROR${ESC}0m boom`, 'plain ok'])
    el.setAttribute('ansi', '')
    el.setAttribute('levels', '["error","info"]')
    const rs = rows(el)
    expect(rs[0]!.getAttribute('data-level')).toBe('error')
    expect(rs[0]!.querySelectorAll('.ansi-fg-red').length).toBe(1)
    expect(rs[1]!.getAttribute('data-level')).toBe('info')
  })

  it('ansi 从开到关、从关到开重刷已有行', () => {
    const el = mount([`${ESC}31mred${ESC}0m`])
    el.setAttribute('ansi', '')
    expect(lineAt(el).textContent).toBe('red')
    el.removeAttribute('ansi')
    expect(lineAt(el).textContent).toBe(`${ESC}31mred${ESC}0m`)
    el.setAttribute('ansi', '')
    expect(lineAt(el).textContent).toBe('red')
    expect(lineAt(el).querySelectorAll('.ansi-fg-red').length).toBe(1)
  })

  it('增量追加：旧行不丢色、新行正确解析', () => {
    const el = mount([`${ESC}31mred${ESC}0m`])
    el.setAttribute('ansi', '')
    const first = rows(el)[0]!
    el.lines = [`${ESC}31mred${ESC}0m`, `${ESC}32mgreen${ESC}0m`]
    const after = rows(el)
    expect(after.length).toBe(2)
    expect(after[0]).toBe(first)
    expect(after[0]!.querySelectorAll('.ansi-fg-red').length).toBe(1)
    expect(after[1]!.querySelectorAll('.ansi-fg-green').length).toBe(1)
  })

  it('reconcile 按原始文本比较：显示文本相同但转义码不同的行不被误判复用', () => {
    const el = mount([`${ESC}31mALERT${ESC}0m`, `${ESC}32mALERT${ESC}0m`])
    el.setAttribute('ansi', '')
    expect(rows(el)[0]!.querySelectorAll('.ansi-fg-red').length).toBe(1)
    expect(rows(el)[1]!.querySelectorAll('.ansi-fg-green').length).toBe(1)
    // 中间插入显示文本相同、转义码不同的行：按原始文本对齐，中间差异行重建
    el.lines = [`${ESC}31mALERT${ESC}0m`, `${ESC}33mALERT${ESC}0m`, `${ESC}32mALERT${ESC}0m`]
    const after = rows(el)
    expect(after.length).toBe(3)
    expect(after[0]!.querySelectorAll('.ansi-fg-red').length).toBe(1)
    expect(after[1]!.querySelectorAll('.ansi-fg-yellow').length).toBe(1)
    expect(after[2]!.querySelectorAll('.ansi-fg-green').length).toBe(1)
  })

  it('恶意文本按纯文本渲染，不产生 HTML 注入', () => {
    const el = mount([`<script>alert(1)</script>${ESC}31m & "x" <b>y</b>${ESC}0m`])
    el.setAttribute('ansi', '')
    const line = lineAt(el)
    expect(line.querySelector('script')).toBeNull()
    expect(line.querySelector('b')).toBeNull()
    expect(line.textContent).toContain('<script>alert(1)</script>')
    expect(line.textContent).toContain('& "x" <b>y</b>')
  })

  it('ANSI 色板走 light-dark() 双主题（CSS 机制层）', () => {
    const el = mount(['a'])
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    expect(css).toContain('light-dark(')
    expect(css).toContain('.ansi-fg-red')
    expect(css).toContain('.ansi-bg-red')
    expect(css).toContain('.ansi-bold')
    expect(css).toContain('.ansi-inverse')
  })

  it('16 色背景全部有一档黑/白前景达到感知对比度 ≥60（色板守卫）', () => {
    const el = mount(['a'])
    const css = el.shadowRoot!.querySelector('style')!.textContent!
    const entries = [...css.matchAll(/--ansi-bg-([a-z-]+): (#[0-9a-f]{6});/g)]
    expect(entries).toHaveLength(16)
    for (const [, name, hex] of entries) {
      const best = Math.max(perceptual('#000000', hex!), perceptual('#ffffff', hex!))
      expect(best, `${name} ${hex} 最优前景`).toBeGreaterThanOrEqual(60)
    }
  })

  it('16 色绿/青背景自动选白色前景（最优档达标）', () => {
    const el = mount([`${ESC}42mok${ESC}0m ${ESC}46mcyan${ESC}0m`])
    el.setAttribute('ansi', '')
    const spans = lineAt(el).querySelectorAll('span')
    expect(spans[0]!.classList.contains('ansi-bg-green')).toBe(true)
    expect(spans[0]!.style.color).toBe('rgb(255, 255, 255)')
    expect(spans[1]!.classList.contains('ansi-bg-cyan')).toBe(true)
    expect(spans[1]!.style.color).toBe('rgb(255, 255, 255)')
  })
})

// ===== 属性-方法撞名回归（observedAttributes 的 camelCase 与原型方法同名） =====
//
// 机制：宿主框架按 camelCase 做 property 桥接或用户 JS 写 `el.xxx = ...` 会在实例上
// 建自有属性遮蔽原型同名方法，组件内部 `this.xxx()` 随后抛 TypeError。
// 私有方法已改名（autoScroll → autoScrollOn）。
describe('OASLog 属性-方法撞名回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  it('property 写入 autoScroll 后追加日志的自动滚底路径不抛错', () => {
    const el = mount()
    ;(el as unknown as Record<string, unknown>).autoScroll = false
    const vp = viewport(el)
    stubScroll(vp, { scrollHeight: 1000, clientHeight: 100, scrollTop: 900 })
    vp.dispatchEvent(new Event('scroll'))
    expect(() => {
      el.lines = ['新日志']
    }).not.toThrow()
    expect(vp.scrollTop, '默认 auto-scroll=true：贴底时追加仍滚到底').toBe(1000)
  })
})
