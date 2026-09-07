import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASCascader } from './index.js'

const OPTIONS = JSON.stringify([
  {
    label: '浙江',
    value: 'zj',
    children: [
      { label: '杭州', value: 'hz' },
      { label: '宁波', value: 'nb' },
    ],
  },
  { label: '江苏', value: 'js', children: [{ label: '南京', value: 'nj' }] },
])

function mount(attrs: Record<string, string> = {}): OASCascader {
  const el = new OASCascader()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  if (!attrs.options) el.setAttribute('options', OPTIONS)
  document.body.appendChild(el)
  return el
}

function trigger(el: OASCascader): HTMLButtonElement {
  return el.shadowRoot!.querySelector('button[part="trigger"]')!
}

function dropdown(el: OASCascader): HTMLElement {
  return el.shadowRoot!.querySelector('.dropdown')!
}

function panels(el: OASCascader): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>('.panel')]
}

function rows(el: OASCascader, panelIdx = 0): HTMLElement[] {
  const p = panels(el)[panelIdx]
  return p ? [...p.querySelectorAll<HTMLElement>('[role="option"]')] : []
}

function searchInput(el: OASCascader): HTMLInputElement {
  return el.shadowRoot!.querySelector('input.search-input')!
}

/** 冲刷微任务 + 一个宏任务（懒加载 Promise 链落定） */
async function tick(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((r) => setTimeout(r, 0))
}

describe('OASCascader', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('渲染 trigger，未选择显示 placeholder', async () => {
    const el = mount({ placeholder: '请选择地区' })
    await Promise.resolve()
    expect(trigger(el).getAttribute('role')).toBe('combobox')
    expect(trigger(el).textContent).toContain('请选择地区')
  })

  it('value 为路径数组时显示各级 label 拼接', () => {
    const el = mount({ value: '["zj","hz"]' })
    expect(trigger(el).textContent).toContain('浙江 / 杭州')
  })

  it('点击展开显示第一级面板', () => {
    const el = mount()
    trigger(el).click()
    const ps = panels(el)
    expect(ps.length).toBeGreaterThanOrEqual(1)
    expect(ps[0]!.querySelectorAll('[role="option"]').length).toBe(2)
  })

  it('逐级选择到叶子，value 更新为完整路径并派发 oas-change', () => {
    const el = mount()
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(rows(el, 0)[0] as HTMLElement).click()
    expect(panels(el).length).toBe(2)
    ;(rows(el, 1)[0] as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['zj', 'hz'])
    expect(detail).toEqual({ value: ['zj', 'hz'] })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('changeOnSelect：选中非叶子也立即派发并关闭', () => {
    const el = mount({ 'change-on-select': '' })
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(rows(el, 0)[0] as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['zj'])
    expect(detail).toEqual({ value: ['zj'] })
  })

  it('disabled 不可交互', () => {
    const el = mount({ disabled: '' })
    expect(trigger(el).disabled).toBe(true)
  })

  it('options property setter 反射 attribute（宿主 property 通道）', () => {
    const el = mount({ options: '[]' })
    el.options = [
      { label: 'A', value: 'a', children: [{ label: 'A1', value: 'a1' }] },
    ]
    expect(JSON.parse(el.getAttribute('options') ?? '[]')).toHaveLength(1)
    trigger(el).click()
    expect(rows(el, 0).length).toBe(1)
  })
})

describe('OASCascader 显示格式（show-all-levels / separator）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('show-all-levels="false" 仅显示末级 label', () => {
    const el = mount({ value: '["zj","hz"]', 'show-all-levels': 'false' })
    expect(trigger(el).textContent).toContain('杭州')
    expect(trigger(el).textContent).not.toContain('浙江')
  })

  it('separator 自定义分隔符', () => {
    const el = mount({ value: '["zj","hz"]', separator: ' - ' })
    expect(trigger(el).textContent).toContain('浙江 - 杭州')
  })

  it('缺省 show-all-levels 保持完整路径（默认 true，不破坏存量用法）', () => {
    const el = mount({ value: '["zj","hz"]' })
    expect(trigger(el).textContent).toContain('浙江 / 杭州')
  })
})

describe('OASCascader multiple 多选', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('多选面板行渲染 checkbox', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    expect(rows(el, 0)[0]!.querySelector('.check')).not.toBeNull()
  })

  it('勾选叶子提交路径数组且不关闭面板', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-change', (e: Event) => (detail = (e as CustomEvent).detail))
    ;(rows(el, 0)[0] as HTMLElement).click() // 下钻浙江
    ;(rows(el, 1)[0]!.querySelector('.check') as HTMLElement).click() // 勾选杭州
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['zj', 'hz']])
    expect(detail).toEqual({ value: [['zj', 'hz']] })
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
  })

  it('级联勾选父级：默认 value-mode=all 提交父级与全部子级路径', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    ;(rows(el, 0)[0]!.querySelector('.check') as HTMLElement).click() // 勾选浙江
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([
      ['zj'],
      ['zj', 'hz'],
      ['zj', 'nb'],
    ])
  })

  it('勾选部分子级：父级行呈现半选态', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    ;(rows(el, 0)[0] as HTMLElement).click()
    ;(rows(el, 1)[0]!.querySelector('.check') as HTMLElement).click() // 仅杭州
    const zjCheck = el.shadowRoot!.querySelectorAll<HTMLElement>('.panel')[0]!
      .querySelector('[role="option"] .check')!
    expect(zjCheck.classList.contains('half')).toBe(true)
  })

  it('多选标签（chips）渲染路径文本，可单独移除', () => {
    const el = mount({ multiple: '', value: '[["zj","hz"],["js","nj"]]' })
    const chips = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.chip')]
    expect(chips.length).toBe(2)
    expect(chips[0]!.textContent).toContain('浙江 / 杭州')
    ;(chips[0]!.querySelector('.remove') as HTMLElement).click()
    // 移除后重派生值：江苏子级全选按级联收敛补父级（与 tree-select 移除语义一致）
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['js'], ['js', 'nj']])
  })

  it('预设多值字面显示（chips 与 value 严格一致，不做归一改写）', () => {
    const el = mount({ multiple: '', 'value-mode': 'parentFirst', value: '[["zj"],["zj","hz"]]' })
    expect(el.shadowRoot!.querySelectorAll('.chip').length).toBe(2)
  })
})

describe('OASCascader check-strictly 父子解绑', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('勾选父级只提交父级路径，子级不联动', () => {
    const el = mount({ multiple: '', 'check-strictly': '' })
    trigger(el).click()
    ;(rows(el, 0)[0]!.querySelector('.check') as HTMLElement).click() // 勾选浙江
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['zj']])
    // 下钻后勾选杭州：值与父级并存、互不影响
    ;(rows(el, 0)[0] as HTMLElement).click()
    ;(rows(el, 1)[0]!.querySelector('.check') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['zj'], ['zj', 'hz']])
  })

  it('strict 模式忽略 value-mode（勾什么是什么）', () => {
    const el = mount({ multiple: '', 'check-strictly': '', 'value-mode': 'onlyLeaf' })
    trigger(el).click()
    ;(rows(el, 0)[0]!.querySelector('.check') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['zj']])
  })
})

describe('OASCascader value-mode 值策略', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('parentFirst：勾选父级只提交父级', () => {
    const el = mount({ multiple: '', 'value-mode': 'parentFirst' })
    trigger(el).click()
    ;(rows(el, 0)[0]!.querySelector('.check') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['zj']])
  })

  it('onlyLeaf：勾选父级提交全部叶子路径', () => {
    const el = mount({ multiple: '', 'value-mode': 'onlyLeaf' })
    trigger(el).click()
    ;(rows(el, 0)[0]!.querySelector('.check') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['zj', 'hz'], ['zj', 'nb']])
  })

  it('非法值回落 all', () => {
    const el = mount({ multiple: '', 'value-mode': 'bogus' })
    trigger(el).click()
    ;(rows(el, 0)[0]!.querySelector('.check') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([
      ['zj'],
      ['zj', 'hz'],
      ['zj', 'nb'],
    ])
  })
})

describe('OASCascader filterable 搜索', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('filterable 展开显示搜索框', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    const input = searchInput(el)
    expect(input.hidden).toBe(false)
    expect(input.getAttribute('aria-label')).toBeTruthy()
  })

  it('输入后展示扁平路径结果', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    const input = searchInput(el)
    input.value = '杭'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const results = el.shadowRoot!.querySelectorAll('.search-results [role="option"]')
    expect(results.length).toBe(1)
    expect(results[0]!.textContent).toContain('浙江 / 杭州')
  })

  it('输入派发 oas-search 事件', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    let detail: unknown
    el.addEventListener('oas-search', (e: Event) => (detail = (e as CustomEvent).detail))
    const input = searchInput(el)
    input.value = '南'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(detail).toEqual({ value: '南' })
  })

  it('点击搜索结果提交完整路径并关闭（单选）', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    const input = searchInput(el)
    input.value = '南京'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    ;(el.shadowRoot!.querySelector('.search-results [role="option"]') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['js', 'nj'])
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
  })

  it('搜索无匹配显示 noMatch 空态', () => {
    const el = mount({ filterable: '' })
    trigger(el).click()
    const input = searchInput(el)
    input.value = '不存在'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const status = el.shadowRoot!.querySelector('.empty')
    expect(status).not.toBeNull()
    expect(status!.textContent).toContain('无匹配选项')
  })

  it('el.filter 自定义匹配函数（仅匹配第二级）', () => {
    const el = mount({ filterable: '' })
    el.filter = (q, path) => path.length === 2 && path[1]!.label.includes(q)
    trigger(el).click()
    const input = searchInput(el)
    input.value = '杭州'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const results = el.shadowRoot!.querySelectorAll('.search-results [role="option"]')
    expect(results.length).toBe(1)
    expect(results[0]!.textContent).toContain('浙江 / 杭州')
  })

  it('多选搜索结果点击勾选路径，面板保持展开', () => {
    const el = mount({ multiple: '', filterable: '' })
    trigger(el).click()
    const input = searchInput(el)
    input.value = '南京'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    ;(el.shadowRoot!.querySelector('.search-results [role="option"]') as HTMLElement).click()
    // 对齐 tree-select 级联收敛约定：子级全选时父级自动进值（all 策略）
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([['js'], ['js', 'nj']])
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
  })
})

describe('OASCascader lazy 动态加载', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('展开未加载节点触发 el.load，先 loading 后渲染子级', async () => {
    const el = mount({ options: JSON.stringify([{ label: '部门A', value: 'a' }]) })
    const spy = vi.fn(() =>
      Promise.resolve([
        { label: '组1', value: 'g1', isLeaf: true },
        { label: '组2', value: 'g2', isLeaf: true },
      ]),
    )
    el.load = spy
    trigger(el).click()
    ;(rows(el, 0)[0] as HTMLElement).click()
    expect(spy).toHaveBeenCalledWith({ option: expect.objectContaining({ value: 'a' }), path: ['a'], depth: 1 })
    expect(el.shadowRoot!.textContent).toContain('加载中')
    await tick()
    expect(rows(el, 1).length).toBe(2)
    // isLeaf 子级点击直接提交
    ;(rows(el, 1)[0] as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['a', 'g1'])
  })

  it('isLeaf=true 节点不触发 load，点击即提交', () => {
    const el = mount({
      options: JSON.stringify([{ label: '叶子', value: 'leaf', isLeaf: true }]),
    })
    const spy = vi.fn(() => Promise.resolve([]))
    el.load = spy
    trigger(el).click()
    const row = rows(el, 0)[0]!
    expect(row.querySelector('.arrow')).toBeNull()
    row.click()
    expect(spy).not.toHaveBeenCalled()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['leaf'])
  })

  it('根级懒加载：options 为空时打开面板加载第一级', async () => {
    const el = mount({ options: '[]' })
    el.load = ({ depth }) =>
      depth === 0
        ? Promise.resolve([{ label: '根1', value: 'r1' }])
        : Promise.resolve([{ label: '子', value: 'c1', isLeaf: true }])
    trigger(el).click()
    expect(el.shadowRoot!.textContent).toContain('加载中')
    await tick()
    expect(rows(el, 0).length).toBe(1)
    ;(rows(el, 0)[0] as HTMLElement).click()
    await tick()
    expect(rows(el, 1).length).toBe(1)
  })

  it('load 返回空数组后节点退化为叶子', async () => {
    const el = mount({ options: JSON.stringify([{ label: '空 children', value: 'x' }]) })
    el.load = () => Promise.resolve([])
    trigger(el).click()
    ;(rows(el, 0)[0] as HTMLElement).click()
    await tick()
    const row = rows(el, 0)[0]!
    expect(row.querySelector('.arrow')).toBeNull()
    row.click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['x'])
  })

  it('升级前赋的 load expando 在连接后被 property 通道回收', async () => {
    const el = new OASCascader()
    el.setAttribute('options', '[]')
    ;(el as unknown as Record<string, unknown>).load = () =>
      Promise.resolve([{ label: '根', value: 'r', isLeaf: true }])
    document.body.appendChild(el)
    expect(Object.prototype.hasOwnProperty.call(el, 'load')).toBe(false)
    trigger(el).click()
    await tick()
    expect(rows(el, 0).length).toBe(1)
  })
})

describe('OASCascader clearable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('单选清空：派发 oas-clear 与 oas-change 空值', () => {
    const el = mount({ clearable: '', value: '["zj","hz"]' })
    const clearBtn = el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!
    expect(clearBtn.hidden).toBe(false)
    let clearDetail: unknown
    let changeDetail: unknown
    el.addEventListener('oas-clear', (e: Event) => (clearDetail = (e as CustomEvent).detail))
    el.addEventListener('oas-change', (e: Event) => (changeDetail = (e as CustomEvent).detail))
    clearBtn.click()
    expect(clearDetail).toEqual({ value: ['zj', 'hz'] })
    expect(changeDetail).toEqual({ value: [] })
    expect(el.getAttribute('value')).toBeNull()
    expect(clearBtn.hidden).toBe(true)
  })

  it('多选清空：value 归空数组', () => {
    const el = mount({ clearable: '', multiple: '', value: '[["zj","hz"]]' })
    ;(el.shadowRoot!.querySelector('[part="clear"]') as HTMLElement).click()
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([])
  })

  it('无值时不显示清空按钮', () => {
    const el = mount({ clearable: '' })
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="clear"]')!.hidden).toBe(true)
  })
})

describe('OASCascader expand-trigger hover', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('悬停父级延时展开子级列', () => {
    const el = mount({ 'expand-trigger': 'hover' })
    trigger(el).click()
    expect(panels(el).length).toBe(1)
    rows(el, 0)[0]!.dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(200)
    expect(panels(el).length).toBe(2)
  })
})

describe('OASCascader size / status', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('size 镜像 data-size，非法值回落 medium', () => {
    const el = mount({ size: 'small' })
    expect(el.getAttribute('data-size')).toBe('small')
    el.setAttribute('size', 'large')
    expect(el.getAttribute('data-size')).toBe('large')
    el.setAttribute('size', 'huge')
    expect(el.getAttribute('data-size')).toBe('medium')
  })

  it('status=error 镜像 data-status 且 trigger 标 aria-invalid', () => {
    const el = mount({ status: 'error' })
    expect(el.getAttribute('data-status')).toBe('error')
    expect(trigger(el).getAttribute('aria-invalid')).toBe('true')
    el.removeAttribute('status')
    expect(el.hasAttribute('data-status')).toBe(false)
    expect(trigger(el).getAttribute('aria-invalid')).toBeNull()
  })

  it('status warning/success 镜像且不标 aria-invalid', () => {
    const warn = mount({ status: 'warning' })
    expect(warn.getAttribute('data-status')).toBe('warning')
    expect(trigger(warn).getAttribute('aria-invalid')).toBeNull()
    const ok = mount({ status: 'success' })
    expect(ok.getAttribute('data-status')).toBe('success')
  })

  it('size/status 样式档位规则存在（token 驱动）', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain("[data-size='small']")
    expect(css).toContain("[data-size='large']")
    expect(css).toContain("[data-status='error']")
    expect(css).toContain("[data-status='warning']")
    expect(css).toContain("[data-status='success']")
  })
})

describe('OASCascader 受控 open', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('open 属性展开面板，宿主设置也派发 oas-open-change', () => {
    const el = mount()
    let detail: unknown
    el.addEventListener('oas-open-change', (e: Event) => (detail = (e as CustomEvent).detail))
    el.setAttribute('open', '')
    expect(dropdown(el).classList.contains('open')).toBe(true)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true')
    expect(panels(el).length).toBe(1)
    expect(detail).toEqual({ open: true })
  })

  it('点击触发器关闭：移除 open 属性并派发事件', () => {
    const el = mount()
    el.setAttribute('open', '')
    let detail: unknown
    el.addEventListener('oas-open-change', (e: Event) => (detail = (e as CustomEvent).detail))
    trigger(el).click()
    expect(el.hasAttribute('open')).toBe(false)
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false')
    expect(detail).toEqual({ open: false })
  })

  it('Esc 关闭并还焦 trigger', () => {
    const el = mount()
    trigger(el).click()
    dropdown(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(el.hasAttribute('open')).toBe(false)
    expect(el.shadowRoot!.activeElement).toBe(trigger(el))
  })

  it('点击外部关闭', () => {
    const el = mount()
    trigger(el).click()
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(el.hasAttribute('open')).toBe(false)
  })
})

describe('OASCascader max-tag-count 折叠', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('超出部分折叠为 +N，title 列出隐藏项', () => {
    const el = mount({
      multiple: '',
      'max-tag-count': '2',
      value: JSON.stringify([
        ['zj', 'hz'],
        ['zj', 'nb'],
        ['js', 'nj'],
      ]),
    })
    const chips = [...el.shadowRoot!.querySelectorAll<HTMLElement>('.chip:not(.chip-plus)')]
    expect(chips.length).toBe(2)
    const plus = el.shadowRoot!.querySelector<HTMLElement>('.chip-plus')!
    expect(plus.textContent).toBe('+1')
    expect(plus.getAttribute('title')).toContain('南京')
  })

  it('未设置 max-tag-count 时不折叠', () => {
    const el = mount({
      multiple: '',
      value: JSON.stringify([
        ['zj', 'hz'],
        ['zj', 'nb'],
        ['js', 'nj'],
      ]),
    })
    expect(el.shadowRoot!.querySelectorAll('.chip:not(.chip-plus)').length).toBe(3)
    expect(el.shadowRoot!.querySelector('.chip-plus')).toBeNull()
  })
})

describe('OASCascader 空态', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('options 为空显示暂无数据', () => {
    const el = mount({ options: '[]' })
    trigger(el).click()
    const status = el.shadowRoot!.querySelector('.empty')
    expect(status).not.toBeNull()
    expect(status!.textContent).toContain('暂无数据')
  })
})

describe('OASCascader 浮层迁移（fixed + computePosition）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('dropdown 使用 fixed 定位样式', () => {
    const el = mount()
    const css = el.shadowRoot!.querySelector('style')!.textContent ?? ''
    expect(css).toContain('position: fixed')
    expect(css).not.toContain('top: calc(100% + 4px)')
  })

  it('展开后写入 fixed 坐标（positionDropdown 执行）', () => {
    const el = mount()
    trigger(el).click()
    const dd = dropdown(el)
    expect(dd.style.top.endsWith('px')).toBe(true)
    expect(dd.style.left.endsWith('px')).toBe(true)
  })
})

describe('OASCascader 键盘', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function key(el: OASCascader, k: string): void {
    dropdown(el).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  }

  it('→ 下钻、← 回退收列、首列 ← 关闭', () => {
    const el = mount()
    trigger(el).click()
    key(el, 'ArrowRight')
    expect(panels(el).length).toBe(2)
    key(el, 'ArrowLeft')
    expect(panels(el).length).toBe(1)
    key(el, 'ArrowLeft')
    expect(el.hasAttribute('open')).toBe(false)
  })

  it('Enter 叶子提交完整路径', () => {
    const el = mount()
    trigger(el).click()
    key(el, 'ArrowRight')
    key(el, 'Enter')
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual(['zj', 'hz'])
  })

  it('多选 Enter 勾选当前行（级联父级）', () => {
    const el = mount({ multiple: '' })
    trigger(el).click()
    key(el, 'Enter')
    expect(JSON.parse(el.getAttribute('value') ?? '[]')).toEqual([
      ['zj'],
      ['zj', 'hz'],
      ['zj', 'nb'],
    ])
    expect(el.hasAttribute('open')).toBe(true)
  })

  it('↑/↓ 在列内移动高亮（跳过禁用项）', () => {
    const el = mount({
      options: JSON.stringify([
        { label: 'A', value: 'a', children: [{ label: 'A1', value: 'a1' }] },
        { label: 'B', value: 'b', disabled: true },
      ]),
    })
    trigger(el).click()
    key(el, 'ArrowDown')
    const active = el.shadowRoot!.querySelector('.option.active')!
    expect(active.getAttribute('data-index')).toBe('0') // B 禁用被跳过，回到 A
  })
})

describe('OASCascader focus 委托', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('host.focus() 委托到 shadow 内 trigger', () => {
    const el = new OASCascader()
    el.setAttribute('options', OPTIONS)
    document.body.appendChild(el)
    el.focus()
    expect(el.shadowRoot!.activeElement).toBe(
      el.shadowRoot!.querySelector('button[part="trigger"]'),
    )
  })
})
