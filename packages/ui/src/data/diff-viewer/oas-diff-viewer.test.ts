import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OASDiffViewer } from './index.js'
import type { DiffViewerChangeDetail, DiffViewerHunkToggleDetail } from './index.js'

function mount(attrs: Record<string, string> = {}): OASDiffViewer {
  const el = new OASDiffViewer()
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  document.body.appendChild(el)
  return el
}

const rowEls = (el: OASDiffViewer): HTMLElement[] => [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="row"]')]
const foldEls = (el: OASDiffViewer): HTMLElement[] => [...el.shadowRoot!.querySelectorAll<HTMLElement>('[part="fold"]')]
const viewport = (el: OASDiffViewer): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>('[part="viewport"]')!

const BEFORE = 'alpha\nbeta\ngamma\ndelta'
const AFTER = 'alpha\nBETA\ngamma\ndelta\nextra'

/** 8 行前缀 + 1 处替换 + 8 行后缀（context=2 时产生 2 个折叠块） */
const LONG_BEFORE = `${Array.from({ length: 8 }, (_, i) => `line-${i + 1}`).join('\n')}\nold\n${Array.from(
  { length: 8 },
  (_, i) => `tail-${i + 1}`,
).join('\n')}`
const LONG_AFTER = `${Array.from({ length: 8 }, (_, i) => `line-${i + 1}`).join('\n')}\nnew\n${Array.from(
  { length: 8 },
  (_, i) => `tail-${i + 1}`,
).join('\n')}`

describe('OASDiffViewer 基础渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染行、行号、正负号与统计', () => {
    const el = mount({ 'old-text': BEFORE, 'new-text': AFTER })
    expect(el.stats).toEqual({ added: 2, removed: 1, unchanged: 3, hunks: 2 })
    expect(rowEls(el)).toHaveLength(6)
    const added = rowEls(el).filter((row) => row.getAttribute('data-op') === 'insert')
    expect(added).toHaveLength(2)
    expect(added[0]!.querySelector<HTMLElement>('[part="code"]')!.textContent).toBe('BETA')
    expect(added[0]!.querySelector('[part="after-no"]')!.textContent).toBe('2')
    const removed = rowEls(el).find((row) => row.getAttribute('data-op') === 'delete')!
    expect(removed.querySelector('[part="before-no"]')!.textContent).toBe('2')
    expect(removed.querySelector('[part="after-no"]')!.textContent).toBe('')
    expect(removed.querySelector('.sign')!.textContent).toBe('\u2212')

    const stats = el.shadowRoot!
    expect(stats.querySelector('[part="added"]')!.textContent).toBe('+2')
    expect(stats.querySelector('[part="removed"]')!.textContent).toBe('\u22121')
    expect(stats.querySelector('[part="summary"]')!.textContent).toBe('2 处差异')
    expect(viewport(el).getAttribute('aria-rowcount')).toBe(String(rowEls(el).length))
    expect(viewport(el).getAttribute('aria-colcount')).toBe('3')
    expect(rowEls(el)[0]!.getAttribute('aria-rowindex')).toBe('1')
  })

  it('词级高亮只标记变化片段', () => {
    const el = mount({ 'old-text': 'value = 1', 'new-text': 'value = 2' })
    const changed = el.shadowRoot!.querySelectorAll('.seg.changed')
    expect([...changed].map((node) => node.textContent)).toEqual(['1', '2'])
  })

  it('相同内容标记无差异，空内容显示空态', () => {
    const same = mount({ 'old-text': 'a\nb', 'new-text': 'a\nb' })
    expect(same.stats).toEqual({ added: 0, removed: 0, unchanged: 2, hunks: 0 })
    expect(same.shadowRoot!.querySelector('[part="status"]')!.textContent).toBe('两侧内容相同')
    expect(rowEls(same)).toHaveLength(2)

    const empty = mount()
    expect(empty.shadowRoot!.querySelector('[part="placeholder"]')!.textContent).toBe('暂无可对比内容')
    expect(viewport(empty).getAttribute('role')).toBe('group')
    expect(empty.shadowRoot!.querySelector('[part="rows"]')!.hasAttribute('role')).toBe(false)
  })

  it('before/after property 与 attribute 双向同步', () => {
    const el = mount({ 'old-text': 'a', 'new-text': 'b' })
    el.oldText = 'c'
    el.newText = 'd'
    expect(el.getAttribute('old-text')).toBe('c')
    expect(el.getAttribute('new-text')).toBe('d')
    expect(rowEls(el)).toHaveLength(2)
  })

  it('ignore-whitespace 忽略空白差异', () => {
    const strict = mount({ 'old-text': 'a  b', 'new-text': 'a b' })
    expect(strict.stats.added + strict.stats.removed).toBe(2)
    const loose = mount({ 'old-text': 'a  b', 'new-text': 'a b', 'ignore-whitespace': '' })
    expect(loose.stats).toEqual({ added: 0, removed: 0, unchanged: 1, hunks: 0 })
  })

  it('超出 max-edits 降级并提示', () => {
    const before = Array.from({ length: 30 }, (_, i) => `old-${i}`).join('\n')
    const after = Array.from({ length: 30 }, (_, i) => `new-${i}`).join('\n')
    const el = mount({ 'old-text': before, 'new-text': after, 'max-edits': '3' })
    expect(el.degraded).toBe(true)
    expect(el.hasAttribute('data-degraded')).toBe(true)
    expect(el.shadowRoot!.querySelector('[part="status"]')!.textContent).toBe('差异过大，已按整块替换显示')
  })

  it('toolbar=false 隐藏工具栏，aria-label 转发到 viewport', () => {
    const el = mount({ 'old-text': 'a', 'new-text': 'b', toolbar: 'false', 'aria-label': '配置对比' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="toolbar"]')!.hidden).toBe(true)
    expect(viewport(el).getAttribute('aria-label')).toBe('配置对比')
    const fallback = mount({ 'old-text': 'a', 'new-text': 'b' })
    expect(viewport(fallback).getAttribute('aria-label')).toBe('差异对比')
  })
})

describe('OASDiffViewer 折叠', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('默认折叠未修改区块，点击按钮展开并派发事件', () => {
    const el = mount({ 'old-text': LONG_BEFORE, 'new-text': LONG_AFTER, context: '2' })
    expect(foldEls(el)).toHaveLength(2)
    const events: DiffViewerHunkToggleDetail[] = []
    el.addEventListener('oas-hunk-toggle', (event) => events.push((event as CustomEvent).detail))
    const button = foldEls(el)[0]!.querySelector<HTMLButtonElement>('[part="fold-toggle"]')!
    expect(button.textContent).toBe('展开 6 行未修改')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    button.click()
    expect(foldEls(el)).toHaveLength(1)
    expect(rowEls(el).some((row) => row.querySelector('[part="code"]')!.textContent === 'line-3')).toBe(true)
    expect(events).toEqual([{ index: 0, expanded: true, start: 0, count: 6 }])
  })

  it('expandAll / collapseAll 批量切换并派发对应 expanded 事件', () => {
    const el = mount({ 'old-text': LONG_BEFORE, 'new-text': LONG_AFTER, context: '2' })
    const events: DiffViewerHunkToggleDetail[] = []
    el.addEventListener('oas-hunk-toggle', (event) => events.push((event as CustomEvent).detail))
    el.expandAll()
    expect(foldEls(el)).toHaveLength(0)
    expect(events).toHaveLength(2)
    expect(events.every((event) => event.expanded)).toBe(true)
    events.length = 0
    el.collapseAll()
    expect(foldEls(el)).toHaveLength(2)
    expect(events).toHaveLength(2)
    expect(events.every((event) => event.expanded === false)).toBe(true)
    expect(el.shadowRoot!.querySelector<HTMLButtonElement>('[part="collapse-all"]')!.disabled).toBe(true)
  })

  it('折叠按钮上的 Enter 不会被视口当成活动行切换', () => {
    const el = mount({ 'old-text': LONG_BEFORE, 'new-text': LONG_AFTER, context: '2' })
    const button = foldEls(el)[0]!.querySelector<HTMLButtonElement>('[part="fold-toggle"]')!
    button.focus()
    const foldsBefore = foldEls(el).length
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(foldEls(el)).toHaveLength(foldsBefore)
  })

  it('CSS 变量可被外部样式覆盖（未设置对应属性时）', () => {
    const el = mount({ 'old-text': 'a', 'new-text': 'b' })
    expect(el.style.getPropertyValue('--oas-diff-viewer-height')).toBe('')
    expect(el.style.getPropertyValue('--oas-diff-viewer-row-height')).toBe('')
    el.style.setProperty('--oas-diff-viewer-row-height', '30px')
    expect(el.style.getPropertyValue('--oas-diff-viewer-row-height')).toBe('30px')
    const sized = mount({ 'old-text': 'a', 'new-text': 'b', height: '200', 'row-height': '18' })
    expect(sized.style.getPropertyValue('--oas-diff-viewer-height')).toBe('200px')
    expect(sized.style.getPropertyValue('--oas-diff-viewer-row-height')).toBe('18px')
  })

  it('数据更新后折叠状态重置', () => {
    const el = mount({ 'old-text': LONG_BEFORE, 'new-text': LONG_AFTER, context: '2' })
    el.expandAll()
    expect(foldEls(el)).toHaveLength(0)
    el.newText = `${LONG_AFTER}\nmore`
    expect(foldEls(el)).toHaveLength(2)
  })
})

describe('OASDiffViewer 视图与键盘', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mode=split 渲染双列与列头', () => {
    const el = mount({
      'old-text': 'old-a\nold-b\nkeep',
      'new-text': 'new-a\nkeep',
      mode: 'split',
      'old-label': '旧版',
    })
    expect(el.dataset.mode).toBe('split')
    const head = el.shadowRoot!.querySelector<HTMLElement>('[part="split-head"]')!
    expect(head.hidden).toBe(false)
    expect(head.querySelector('[part="before-label"]')!.textContent).toBe('旧版')
    expect(head.querySelector('[part="after-label"]')!.textContent).toBe('修改后')
    expect(rowEls(el)).toHaveLength(3)
    expect(rowEls(el)[1]!.querySelector('[part="before-code"]')!.textContent).toBe('\u2212old-b')
    expect(rowEls(el)[1]!.querySelector('[part="after-code"]')!.textContent).toBe('')
    // 新增侧行首校验（PRD：不单靠颜色）
    expect(rowEls(el)[0]!.querySelector('[part="after-code"]')!.textContent).toBe('+new-a')
  })

  it('show-line-numbers=false 不渲染行号单元格', () => {
    const el = mount({ 'old-text': 'a', 'new-text': 'b', 'show-line-numbers': 'false' })
    expect(el.shadowRoot!.querySelector('[part="before-no"]')).toBeNull()
    expect(el.shadowRoot!.querySelector('[part="after-no"]')).toBeNull()
    expect(el.dataset.lineNumbers).toBe('false')
    expect(viewport(el).getAttribute('aria-colcount')).toBe('1')
  })

  it('键盘移动活动行并同步 aria-activedescendant', () => {
    const el = mount({ 'old-text': BEFORE, 'new-text': AFTER })
    const host = viewport(el)
    host.focus()
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(host.getAttribute('aria-activedescendant')).toBe(rowEls(el)[1]!.id)
    expect(rowEls(el)[1]!.classList.contains('active')).toBe(true)
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(host.getAttribute('aria-activedescendant')).toBe(rowEls(el).at(-1)!.id)
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(host.getAttribute('aria-activedescendant')).toBe(rowEls(el)[0]!.id)
  })

  it('Enter 展开当前折叠块', () => {
    const el = mount({ 'old-text': LONG_BEFORE, 'new-text': LONG_AFTER, context: '2' })
    const host = viewport(el)
    host.focus()
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(foldEls(el)).toHaveLength(2)
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(foldEls(el)).toHaveLength(1)
  })

  it('scrollToChange 定位到变更块首行', () => {
    const before = Array.from({ length: 200 }, (_, i) => `line-${i}`).join('\n')
    const after = before.replace('line-120', 'changed-120')
    const el = mount({ 'old-text': before, 'new-text': after, height: '200', 'row-height': '20', context: '500' })
    expect(el.scrollToChange(0)).toBe(true)
    const active = el.shadowRoot!.querySelector('[part="row"].active')!
    expect(active.getAttribute('data-op')).toBe('delete')
    expect(viewport(el).scrollTop).toBeGreaterThan(0)
    expect(el.scrollToChange(99)).toBe(false)
  })

  it('split 模式下 scrollToChange 映射到合并后的并排行', () => {
    const before = Array.from({ length: 100 }, (_, i) => `line-${i}`).join('\n')
    const after = before.replace('line-30', 'changed-30').replace('line-70', 'changed-70')
    const el = mount({
      'old-text': before,
      'new-text': after,
      mode: 'split',
      height: '200',
      'row-height': '20',
      context: '500',
    })
    expect(el.scrollToChange(1)).toBe(true)
    const active = el.shadowRoot!.querySelector('[part="row"].active')!
    // 两处替换各合并为一行：第 2 个变更块落在并排行 70
    expect(Number(active.getAttribute('data-index'))).toBe(70)
    expect(active.querySelector('[part="before-code"]')!.textContent).toContain('line-70')
    expect(active.querySelector('[part="after-code"]')!.textContent).toContain('+changed-70')
  })
})

describe('OASDiffViewer 虚拟滚动', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('超过阈值只渲染可视窗口，滚动后窗口移动', () => {
    const before = Array.from({ length: 2000 }, (_, i) => `line-${i}`).join('\n')
    const after = before.replace('line-1000', 'changed-1000')
    const el = mount({
      'old-text': before,
      'new-text': after,
      height: '200',
      'row-height': '20',
      'virtual-threshold': '50',
      context: '3000',
    })
    const first = rowEls(el)
    expect(first.length).toBeLessThan(40)
    expect(first.some((row) => row.querySelector('[part="code"]')!.textContent === 'line-0')).toBe(true)
    const host = viewport(el)
    host.scrollTop = 8000
    host.dispatchEvent(new Event('scroll'))
    const moved = rowEls(el)
    expect(moved.length).toBeLessThan(40)
    expect(moved.some((row) => row.querySelector('[part="code"]')!.textContent === 'line-0')).toBe(false)
  })

  it('wrap 关闭虚拟滚动并渲染全部行', () => {
    const before = Array.from({ length: 500 }, (_, i) => `line-${i}`).join('\n')
    const after = before.replace('line-250', 'changed-250')
    const el = mount({ 'old-text': before, 'new-text': after, wrap: '', 'virtual-threshold': '10', context: '3000' })
    expect(el.hasAttribute('data-wrap')).toBe(true)
    expect(rowEls(el)).toHaveLength(501)
  })

  it('wrap + split 同时生效：双列内容完整、退出虚拟滚动', () => {
    const before = Array.from({ length: 120 }, (_, i) => `line-${i}`).join('\n')
    const after = before.replace('line-60', 'changed-60')
    const el = mount({
      'old-text': before,
      'new-text': after,
      mode: 'split',
      wrap: '',
      'virtual-threshold': '10',
      context: '3000',
    })
    expect(el.dataset.mode).toBe('split')
    expect(rowEls(el)).toHaveLength(120)
    expect(el.shadowRoot!.querySelectorAll('[part="before-code"]')).toHaveLength(120)
    expect(el.shadowRoot!.querySelectorAll('[part="after-code"]')).toHaveLength(120)
  })
})

describe('OASDiffViewer 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('数据更新派发 oas-diff-change', () => {
    const el = mount({ 'old-text': 'a', 'new-text': 'b' })
    const details: DiffViewerChangeDetail[] = []
    el.addEventListener('oas-diff-change', (event) => details.push((event as CustomEvent).detail))
    el.newText = 'a\nb'
    expect(details).toEqual([{ added: 1, removed: 0, unchanged: 1, hunks: 1 }])
  })
})
