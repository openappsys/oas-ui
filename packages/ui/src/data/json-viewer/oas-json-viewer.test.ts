import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { t } from '@oas-ui/i18n'
import { OASJsonViewer } from './index.js'
import type { JsonValue, JsonViewerToggleDetail } from './index.js'

function mount(attrs: Record<string, string> = {}): OASJsonViewer {
  const el = new OASJsonViewer()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

function rows(el: OASJsonViewer): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="row"]')]
}

function paths(el: OASJsonViewer): string[] {
  return rows(el).map((row) => row.getAttribute('data-path') ?? '')
}

function tree(el: OASJsonViewer): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!
}

const SAMPLE = JSON.stringify({ name: '张三', tags: ['a', 'b'], nested: { ok: true } })

describe('OASJsonViewer 数据通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('text 解析：根行 + 默认展开第一层，值/键/容器摘要可见', () => {
    const el = mount({ text: SAMPLE })
    expect(paths(el)).toEqual(['$', "$['name']", "$['tags']", "$['nested']"])
    expect(rows(el)[0]!.getAttribute('role')).toBe('treeitem')
    expect(rows(el)[0]!.getAttribute('aria-level')).toBe('1')
    expect(rows(el)[1]!.querySelector('[part="value"]')!.textContent).toContain('张三')
    expect(rows(el)[2]!.getAttribute('data-kind')).toBe('array')

    el.setAttribute('expanded', JSON.stringify(['$', "$['tags']"]))
    const arrayRow = rows(el).find((row) => row.getAttribute('data-path') === "$['tags'][0]")!
    expect(arrayRow.querySelector('[part="key"]')!.textContent).toBe('[0]')
  })

  it('data property 优先：写 data 移除 text 属性并渲染对象', () => {
    const el = mount({ text: SAMPLE })
    el.data = { a: 1 }
    expect(el.hasAttribute('text')).toBe(false)
    expect(paths(el)).toEqual(['$', "$['a']"])
    expect(el.text).toBe('')
  })

  it('写 text 清空 data 缓存', () => {
    const el = mount()
    el.data = { a: 1 }
    el.text = '{"b":2}'
    expect(el.getAttribute('text')).toBe('{"b":2}')
    expect(paths(el)).toEqual(['$', "$['b']"])
  })

  it('重复写同值 text / expanded 仍触发一次更新（受控回写边界）', () => {
    const el = mount({ text: '{"a":1}' })
    const spy = vi.spyOn(el as unknown as { runUpdateAndNotify: () => void }, 'runUpdateAndNotify')
    el.text = '{"a":1}'
    expect(spy).toHaveBeenCalledTimes(1)
    el.setAttribute('expanded', '["$"]')
    spy.mockClear()
    el.expanded = ['$']
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('非法 text：错误态 + oas-parse-error；写 data 后恢复', () => {
    const el = new OASJsonViewer()
    const errors: unknown[] = []
    el.addEventListener('oas-parse-error', (e) => errors.push((e as CustomEvent).detail))
    el.setAttribute('text', '{bad')
    document.body.appendChild(el)
    expect(el.shadowRoot!.querySelector('[part="error"]')).not.toBeNull()
    expect(errors).toHaveLength(1)
    expect((errors[0] as { message: string }).message).toBeTruthy()
    el.data = { ok: 1 }
    expect(el.shadowRoot!.querySelector('[part="error"]')).toBeNull()
    expect(paths(el)).toEqual(['$', "$['ok']"])
  })

  it('超深嵌套不向外抛错，转为可恢复错误态', () => {
    let deep: JsonValue = 'leaf'
    for (let i = 0; i < 50_000; i++) deep = { a: deep }
    const el = mount()
    expect(() => {
      el.data = deep
    }).not.toThrow()
    expect(el.shadowRoot!.querySelector('[part="error"]')).not.toBeNull()
    expect(el.shadowRoot!.querySelector('[part="error"]')!.textContent).toContain(t('jsonViewer.tooDeep'))
    el.data = { shallow: true }
    expect(el.shadowRoot!.querySelector('[part="error"]')).toBeNull()
  })

  it('compact 默认行高 20，显式 row-height 优先', () => {
    const compact = mount({ text: '{"a":1}', compact: '' })
    expect(compact.style.getPropertyValue('--_oas-jv-row-height')).toBe('20px')
    const explicit = mount({ text: '{"a":1}', compact: '', 'row-height': '28' })
    expect(explicit.style.getPropertyValue('--_oas-jv-row-height')).toBe('28px')
  })

  it('default-expand-depth=0 只显示根行', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    expect(paths(el)).toEqual(['$'])
  })

  it('空对象/空数组根仍显示根摘要', () => {
    const object = mount({ text: '{}' })
    expect(rows(object)[0]!.querySelector('[part="value"]')!.textContent).toBe('{…} 0 keys')
    const array = mount({ text: '[]' })
    expect(rows(array)[0]!.querySelector('[part="value"]')!.textContent).toBe('[…] 0 items')
  })

  it('空数据渲染空态，错误/空态不用 tree 角色（避免 aria-required-children）', () => {
    const el = mount()
    expect(el.shadowRoot!.querySelector('[part="empty"]')).not.toBeNull()
    expect(tree(el).getAttribute('role')).toBe('group')

    const invalid = mount({ text: '{bad' })
    expect(invalid.shadowRoot!.querySelector('[part="error"]')).not.toBeNull()
    expect(tree(invalid).getAttribute('role')).toBe('group')
  })
})

describe('OASJsonViewer 展开受控/非受控', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('非受控：点击容器行切换展开并派发 oas-toggle', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    const events: JsonViewerToggleDetail[] = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent).detail))
    rows(el)[0]!.click()
    expect(rows(el).length).toBeGreaterThan(1)
    expect(events).toEqual([{ path: '$', expanded: true }])
    rows(el)[0]!.click()
    expect(events.at(-1)).toEqual({ path: '$', expanded: false })
  })

  it('受控：expanded 属性在场只派发事件，不写回属性', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0', expanded: '[]' })
    const events: JsonViewerToggleDetail[] = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent).detail))
    rows(el)[0]!.click()
    expect(events).toEqual([{ path: '$', expanded: true }])
    expect(el.getAttribute('expanded')).toBe('[]')
    expect(paths(el)).toEqual(['$'])
  })

  it('搜索激活时 Home/点击其他行不被每次重绘覆盖活动行', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '1', search: 'a' })
    const viewport = tree(el)
    viewport.focus()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(el.shadowRoot!.querySelector('[part="row"].active')!.getAttribute('data-path')).toBe('$')
    rows(el)
      .find((row) => row.getAttribute('data-path') === "$['nested']")!
      .click()
    expect(el.shadowRoot!.querySelector('[part="row"].active')!.getAttribute('data-path')).toBe("$['nested']")
  })

  it('换查询回到第一个命中；searchNext 只派发一次搜索事件', () => {
    const el = mount({ text: SAMPLE })
    const changes: Array<{ activeIndex: number }> = []
    el.addEventListener('oas-search-change', (e) => changes.push((e as CustomEvent).detail))
    el.setAttribute('search', 'a')
    expect(changes).toHaveLength(1)
    el.searchNext()
    expect(changes).toHaveLength(2)
    el.setAttribute('search', 'b')
    expect(changes.at(-1)!.activeIndex).toBe(0)
  })

  it('设置搜索滚动到首个命中（虚拟大列表）', () => {
    const el = mount({
      text: JSON.stringify(Array.from({ length: 10_000 }, (_, i) => i)),
      height: '120',
      'row-height': '20',
    })
    const viewport = tree(el)
    viewport.scrollTop = 0
    el.search = '9999'
    expect(viewport.scrollTop).toBeGreaterThan(0)
  })

  it('受控 scrollToPath 的 transient 可被 collapseAll 收回', () => {
    const el = mount({
      text: SAMPLE,
      'default-expand-depth': '0',
      expanded: '[]',
    })
    el.scrollToPath("$['nested']['ok']")
    expect(paths(el).length).toBeGreaterThan(1)
    el.collapseAll()
    expect(paths(el)).toEqual(['$'])
    expect(el.getAttribute('expanded')).toBe('[]')
  })

  it('scrollToPath 的自动展开不因无关属性更新被收回', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    el.scrollToPath("$['nested']['ok']")
    el.setAttribute('aria-label', '外部命名')
    expect(paths(el)).toContain("$['nested']['ok']")
  })

  it('断开重挂后交互恢复（onReconnect 重绑）', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    const events: unknown[] = []
    el.addEventListener('oas-toggle', (e) => events.push((e as CustomEvent).detail))
    el.remove()
    document.body.appendChild(el)
    rows(el)[0]!.click()
    expect(events).toHaveLength(1)
  })

  it('非数据属性变化不重建数据树（避免 height 等触发 10k 重解析）', () => {
    let reads = 0
    const value = {
      get a() {
        reads++
        return 1
      },
    }
    const el = mount()
    el.data = value
    const base = reads
    el.setAttribute('height', '300')
    expect(reads).toBe(base)
  })

  it('受控 + 搜索：手动收起祖先在搜索清空后保持收起且不写回属性', () => {
    const el = mount({
      text: SAMPLE,
      'default-expand-depth': '0',
      expanded: '[]',
      search: 'a',
    })
    expect(paths(el).length).toBeGreaterThan(1)
    rows(el)
      .find((row) => row.getAttribute('data-path') === '$')!
      .click()
    expect(paths(el)).toEqual(['$'])
    el.removeAttribute('search')
    expect(el.getAttribute('expanded')).toBe('[]')
    expect(paths(el)).toEqual(['$'])
  })

  it('scrollToPath 支持点号简写并规范化，不存在的 path 不污染状态', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    el.scrollToPath('$.nested.ok')
    expect(paths(el)).toContain("$['nested']['ok']")
    const before = paths(el)
    el.scrollToPath("$['missing']['x']")
    expect(paths(el)).toEqual(before)
    expect(
      rows(el)
        .find((row) => row.classList.contains('active'))!
        .getAttribute('data-path'),
    ).toBe("$['nested']['ok']")
  })

  it('受控：外部写 expanded 后渲染跟随', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0', expanded: '[]' })
    el.setAttribute('expanded', JSON.stringify(['$']))
    expect(paths(el)).toEqual(['$', "$['name']", "$['tags']", "$['nested']"])
  })

  it('批量方法：非受控直接生效；受控派发 oas-expanded-change 不写属性', () => {
    const expandedSets: string[][] = []
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    el.addEventListener('oas-expanded-change', (e) => expandedSets.push((e as CustomEvent).detail.paths))
    el.expandAll()
    expect(paths(el).length).toBeGreaterThan(4)
    expect(expandedSets.at(-1)).toContain('$')

    const controlled = mount({ text: SAMPLE, 'default-expand-depth': '0', expanded: '[]' })
    const controlledSets: string[][] = []
    controlled.addEventListener('oas-expanded-change', (e) => controlledSets.push((e as CustomEvent).detail.paths))
    controlled.expandAll()
    expect(controlled.getAttribute('expanded')).toBe('[]')
    expect(controlledSets[0]).toContain('$')
  })
})

describe('OASJsonViewer 搜索与复制', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  it('搜索：命中计数/自动展开祖先/oas-search-change，next 循环', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    const changes: Array<{ matches: number; activeIndex: number }> = []
    el.addEventListener('oas-search-change', (e) => changes.push((e as CustomEvent).detail))
    el.setAttribute('search', 'a')
    expect(changes.at(-1)).toMatchObject({ matches: 3, activeIndex: 0 })
    expect(paths(el)).toContain("$['tags'][0]")
    el.searchNext()
    expect(changes.at(-1)!.activeIndex).toBe(1)
    el.searchNext()
    el.searchNext()
    expect(changes.at(-1)!.activeIndex).toBe(0)
  })

  it('搜索期间手动 toggle：收起压过自动展开；展开增量清空后保留', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    el.setAttribute('search', 'a')
    const rootRow = rows(el).find((row) => row.getAttribute('data-path') === '$')!
    rootRow.click()
    expect(paths(el)).toEqual(['$'])
    el.removeAttribute('search')
    expect(paths(el)).toEqual(['$'])

    el.setAttribute('search', 'a')
    const nestedRow = rows(el).find((row) => row.getAttribute('data-path') === "$['nested']")!
    nestedRow.click()
    el.removeAttribute('search')
    expect(paths(el)).toEqual(['$', "$['name']", "$['tags']", "$['nested']", "$['nested']['ok']"])
  })

  it('search property 反射 attribute；外部清空时输入框同步为空', () => {
    const el = mount({ text: SAMPLE })
    el.search = 'a'
    expect(el.getAttribute('search')).toBe('a')
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('[part="search"]')!.value).toBe('a')
    el.removeAttribute('search')
    expect(el.search).toBe('')
    expect(el.shadowRoot!.querySelector<HTMLInputElement>('[part="search"]')!.value).toBe('')
  })

  it('搜索无命中：activeIndex=-1、显示无匹配、next/prev 不越界', () => {
    const el = mount({ text: SAMPLE })
    const changes: Array<{ matches: number; activeIndex: number }> = []
    el.addEventListener('oas-search-change', (e) => changes.push((e as CustomEvent).detail))
    el.setAttribute('search', 'zzz')
    expect(changes.at(-1)).toMatchObject({ matches: 0, activeIndex: -1 })
    expect(el.shadowRoot!.querySelector('[part="count"]')!.textContent).toBe('无匹配')
    expect(() => el.searchNext()).not.toThrow()
    expect(() => el.searchPrev()).not.toThrow()
  })

  it('搜索清空：恢复开始搜索时的展开快照，再次搜索重新计算命中', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    expect(paths(el)).toEqual(['$'])
    el.setAttribute('search', 'a')
    expect(paths(el).length).toBeGreaterThan(1)
    const first = el.shadowRoot!.querySelector('[part="count"]')!.textContent
    el.removeAttribute('search')
    expect(paths(el)).toEqual(['$'])
    el.setAttribute('search', 'a')
    expect(el.shadowRoot!.querySelector('[part="count"]')!.textContent).toBe(first)
  })

  it('复制：路径格式可回传 scrollToPath，事件可取消，默认写剪贴板', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const el = mount({ text: JSON.stringify({ 'a.b': [{ c: 1 }] }) })
    const copies: Array<{ path: string; kind: string; text: string }> = []
    const copied: string[] = []
    el.addEventListener('oas-copy', (e) => copies.push((e as CustomEvent).detail))
    el.addEventListener('oas-copied', (e) => copied.push((e as CustomEvent).detail.kind))
    const path = "$['a.b'][0]['c']"
    await el.copyPath(path)
    expect(copies[0]).toMatchObject({ path, kind: 'path', text: path })
    expect(writeText).toHaveBeenCalledWith(path)
    expect(copied).toContain('path')

    const prevented = vi.fn((e: Event) => e.preventDefault())
    el.addEventListener('oas-copy', prevented, { once: true })
    expect(await el.copyValue(path)).toBe(false)
    expect(prevented).toHaveBeenCalled()
  })

  it('复制失败：状态提示 + oas-copy-error', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const el = mount({ text: '{"a":1}' })
    const errors: unknown[] = []
    el.addEventListener('oas-copy-error', (e) => errors.push((e as CustomEvent).detail))
    expect(await el.copyPath()).toBe(false)
    expect(errors).toHaveLength(1)
    expect(el.shadowRoot!.querySelector('[part="status"]')!.textContent).toBe('复制失败')
  })

  it('toolbar=false 时复制反馈显示在浮层（不依赖工具栏可见）', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const el = mount({ text: '{"a":1}', toolbar: 'false' })
    await el.copyPath('$')
    const flash = el.shadowRoot!.querySelector<HTMLElement>('[part="copy-status"]')!
    expect(flash.hidden).toBe(false)
    expect(flash.textContent).toBe(t('jsonViewer.copied'))
  })

  it('复制值/JSON：原始值去引号，JSON 带引号；copyable=false 仍可调用方法', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const el = mount({ text: JSON.stringify({ s: 'hi' }), copyable: 'false' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="copy-path"]')!.hidden, 'copyable=false 隐藏按钮').toBe(
      true,
    )
    await el.copyValue("$['s']")
    expect(writeText).toHaveBeenLastCalledWith('hi')
    expect(el.shadowRoot!.querySelector('[part="status"]')!.textContent).toBe('已复制')
    await el.copyJson("$['s']")
    expect(writeText).toHaveBeenLastCalledWith('"hi"')
    const sets: string[][] = []
    el.addEventListener('oas-expanded-change', (e) => sets.push((e as CustomEvent).detail.paths))
    el.expandAll()
    expect(sets[0]).toContain('$')
  })
})

describe('OASJsonViewer 键盘与虚拟滚动', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('键盘：方向键移动/展开/收起，aria-activedescendant 跟随', () => {
    const el = mount({ text: SAMPLE, 'default-expand-depth': '0' })
    const viewport = tree(el)
    viewport.focus()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    // 根行无子级可见时 ArrowDown 不应越界
    expect(rows(el)).toHaveLength(1)
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(rows(el).length).toBeGreaterThan(1)
    const activeId = viewport.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(el.shadowRoot!.getElementById(activeId!)).not.toBeNull()
    viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(rows(el)).toHaveLength(1)
  })

  it('10k 节点：虚拟窗口只渲染有界行数，滚动后窗口移动', () => {
    const values = Array.from({ length: 10_000 }, (_, i) => i)
    const el = mount({ text: JSON.stringify(values), height: '200', 'row-height': '20' })
    const initial = rows(el).length
    expect(initial).toBeGreaterThan(0)
    expect(initial).toBeLessThan(40)
    const viewport = tree(el)
    viewport.scrollTop = 4000
    viewport.dispatchEvent(new Event('scroll'))
    const after = paths(el)
    expect(after.length).toBeLessThan(40)
    expect(after[0]).not.toBe('$')
  })

  it('树容器 aria-label 可由宿主命名', () => {
    const el = mount({ text: '1', 'aria-label': '接口响应' })
    expect(tree(el).getAttribute('aria-label')).toBe('接口响应')
  })
})
