import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { OASTreeSelect } from './index.js'

const OPTIONS = JSON.stringify([
  {
    label: '前端',
    value: 'fe',
    children: [
      {
        label: '框架',
        value: 'framework',
        children: [
          { label: 'React', value: 'react' },
          { label: 'Vue', value: 'vue' },
        ],
      },
      { label: '样式', value: 'css' },
    ],
  },
  { label: '后端', value: 'be', children: [{ label: 'Node', value: 'node' }] },
])

function mount(attrs: Record<string, string> = {}): OASTreeSelect {
  const el = new OASTreeSelect()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASTreeSelect): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function nodes(el: OASTreeSelect): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll('.node')] as HTMLElement[]
}

describe('OASTreeSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger + 树面板，点击展开显示树节点', async () => {
    const el = mount()
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    trigger(el).click()
    expect(nodes(el).length).toBeGreaterThanOrEqual(2)
  })

  it('多选：勾选叶子更新 value 数组并派发 oas-change', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    const byLabel = (label: string): HTMLElement =>
      [...el.shadowRoot!.querySelectorAll('.node')].find((n) =>
        n.textContent?.includes(label),
      ) as HTMLElement
    byLabel('前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel('框架')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel('React').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toContain('react')
    expect(detail).toEqual({ value: ['react'] })
  })

  it('多选勾选父节点级联选中全部子节点', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    const fe = nodes(el)[0]!
    fe.click()
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value).toContain('fe')
    expect(value).toContain('framework')
    expect(value).toContain('react')
    expect(value).toContain('css')
  })

  it('单选：点击节点 value 为该值并关闭', () => {
    const el = mount()
    trigger(el).click()
    const fe = nodes(el)[0]!
    fe.querySelector('.toggle')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const cssNode = [...el.shadowRoot!.querySelectorAll('.node')].find((n) =>
      n.textContent?.includes('样式'),
    ) as HTMLElement
    cssNode.click()
    expect(el.getAttribute('value')).toBe('css')
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('disabled 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })
})

describe('OASTreeSelect 勾选策略（check-strategy）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const byLabel = (el: OASTreeSelect, label: string): HTMLElement =>
    [...el.shadowRoot!.querySelectorAll('.node')].find((n) =>
      n.textContent?.includes(label),
    ) as HTMLElement

  const openAndExpand = (el: OASTreeSelect): void => {
    trigger(el).click()
    byLabel(el, '前端')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    byLabel(el, '框架')
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  it('all（默认）：勾选父级 value 含父级与全部后代', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([
      'fe',
      'framework',
      'react',
      'vue',
      'css',
    ])
  })

  it('parent：勾选父级 value 只含父级', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['fe'])
  })

  it('child：勾选父级 value 只含叶子', () => {
    const el = mount({ multiple: '', 'check-strategy': 'child' })
    trigger(el).click()
    byLabel(el, '前端').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react', 'vue', 'css'])
  })

  it('parent：逐个勾选叶子，子级全选后 value 收敛为父级', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent' })
    openAndExpand(el)
    byLabel(el, 'React').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['react'])
    byLabel(el, 'Vue').click()
    // 兄弟叶子全选 → 框架自动全选，value 以框架代表
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['framework'])
    byLabel(el, '样式').click()
    // 前端全部子级勾选 → 收敛为前端
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['fe'])
  })

  it('parent：勾选父级后取消一个叶子 → value 收敛为剩余子级父节点', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent', value: '["fe"]' })
    openAndExpand(el)
    byLabel(el, '样式').click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['framework'])
  })

  it('受控：parent 策略外部设置父级 value → 子节点勾选展示且 value 不漂移', () => {
    const el = mount({ multiple: '', 'check-strategy': 'parent', value: '["fe"]' })
    openAndExpand(el)
    const fe = byLabel(el, '前端')
    expect(fe.querySelector('.check')!.classList.contains('checked')).toBe(true)
    expect(byLabel(el, '框架').querySelector('.check')!.classList.contains('checked')).toBe(true)
    expect(byLabel(el, '样式').querySelector('.check')!.classList.contains('checked')).toBe(true)
    expect(el.getAttribute('value')).toBe('["fe"]')
  })
})

describe('OASTreeSelect 虚拟滚动（virtual）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const BIG = JSON.stringify([
    {
      label: 'root',
      value: 'root',
      children: Array.from({ length: 10000 }, (_, i) => ({
        label: `节点 ${i}`,
        value: `n${i}`,
      })),
    },
  ])

  const vlistOf = (el: OASTreeSelect): HTMLElement =>
    el.shadowRoot!.querySelector('oas-virtual-list')!

  const virtualRows = (el: OASTreeSelect): HTMLElement[] => [
    ...vlistOf(el).shadowRoot!.querySelectorAll<HTMLElement>('[role="treeitem"]'),
  ]

  const flushRaf = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  // 非 virtual 分支同步渲染 10001 个节点，jsdom 全量并发下实测 >11s，远超默认 5s 超时
  it('virtual：万级节点仅渲染可见窗口；非 virtual 全量渲染可见行', () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const rows = virtualRows(el)
    // 视口 288 / item-height 36 ≈ 8 项 + 上下 buffer 4 → start 0, end 12
    expect(rows.length).toBe(12)
    expect(rows[0]!.getAttribute('data-index')).toBe('0')
    // 非虚拟：全部可见行渲染（root + 10000 子级）
    const el2 = mount({ multiple: '', expanded: '["root"]', options: BIG })
    trigger(el2).click()
    expect(el2.shadowRoot!.querySelectorAll('[role="treeitem"]').length).toBe(10001)
  }, 30000)

  it('virtual：滚动后窗口平移，padding 撑起滚动高度', async () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    vp.scrollTop = 5000 * 36
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const rows = virtualRows(el)
    expect(rows[0]!.getAttribute('data-index')).toBe('4996')
    expect(rows.length).toBe(16) // 4996..5011
  })

  it('virtual：勾选写回 value，重渲染后勾选态恢复', () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const leaf = virtualRows(el).find((r) => r.getAttribute('data-index') === '1')!
    leaf.click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['n0'])
    const rebuilt = virtualRows(el).find((r) => r.getAttribute('data-index') === '1')!
    expect(rebuilt.querySelector('.check')!.classList.contains('checked')).toBe(true)
  })

  it('virtual：键盘导航移动高亮、滚动进视口、Enter 提交', async () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    const btn = trigger(el)
    // 30 次 ↓：activeIndex 0→30（可见列表 index 0 为 root，index 30 = n29）
    for (let i = 0; i < 30; i++) {
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    }
    expect(btn.getAttribute('aria-activedescendant')).toBe('tree-opt-30')
    const vp = vlistOf(el).shadowRoot!.querySelector<HTMLElement>('.viewport')!
    expect(vp.scrollTop).toBeGreaterThan(0)
    // happy-dom 不自动触发 scroll：手动派发后窗口重算，高亮项应在窗口内
    vp.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const active = virtualRows(el).find((r) => r.classList.contains('active'))
    expect(active?.getAttribute('data-index')).toBe('30')
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['n29'])
  })

  it('virtual：展开/收起重算可见列表', () => {
    const el = mount({ multiple: '', virtual: '', expanded: '["root"]', options: BIG })
    trigger(el).click()
    expect(virtualRows(el)[0]!.getAttribute('data-index')).toBe('0')
    // 收起 root → 可见行只剩 root
    virtualRows(el)[0]!
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(virtualRows(el).length).toBe(1)
    // 再展开 → 恢复窗口渲染
    virtualRows(el)[0]!
      .querySelector('.toggle')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(virtualRows(el).length).toBe(12)
  })

  it('virtual + child 策略：勾选父级 value 只含叶子', () => {
    const el = mount({
      multiple: '',
      'check-strategy': 'child',
      virtual: '',
      expanded: '["root"]',
      options: BIG,
    })
    trigger(el).click()
    virtualRows(el)[0]!.click() // 勾选 root
    const value = JSON.parse(el.getAttribute('value') ?? '[]')
    expect(value.length).toBe(10000)
    expect(value[0]).toBe('n0')
    expect(value[9999]).toBe('n9999')
  })
})

describe('OASTreeSelect focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 trigger', () => {
    const el = new OASTreeSelect()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(
      el.shadowRoot!.querySelector('button[part="trigger"]'),
    )
  })
})
