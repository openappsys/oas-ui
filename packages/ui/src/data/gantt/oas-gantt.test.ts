import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGantt } from './index.js'
import { pickVisibleLabels } from './oas-gantt.js'
import type { GanttTask } from './index.js'

function mount(attrs: Record<string, string> = {}): OASGantt {
  const el = new OASGantt()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function shadowOf(el: OASGantt): ShadowRoot {
  return el.shadowRoot!
}

function bars(el: OASGantt): HTMLElement[] {
  return [...shadowOf(el).querySelectorAll<HTMLElement>('.bars .bar')]
}

function barOf(el: OASGantt, id: string): HTMLElement {
  return shadowOf(el).querySelector<HTMLElement>(`.bars .bar[data-id="${id}"]`)!
}

function nameRows(el: OASGantt): HTMLElement[] {
  return [...shadowOf(el).querySelectorAll<HTMLElement>('.side-body .row-name')]
}

/** 合成指针拖拽序列（down → move → up），clientX 用 defineProperty 兜底（对齐 scheduler 测试模式）。
 *  composed: true 必需——构造的 PointerEvent 默认不出 shadow root（UA 派发的真实指针事件恒 composed），
 *  而组件拖拽监听统一挂 document 层（真实引擎 setPointerCapture 兜底，见组件内注释）。 */
function dragSeq(target: HTMLElement, dx: number, startX = 100): void {
  const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 })
  Object.defineProperty(down, 'clientX', { value: startX })
  target.dispatchEvent(down)
  const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
  Object.defineProperty(move, 'clientX', { value: startX + dx })
  target.dispatchEvent(move)
  const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
  Object.defineProperty(up, 'clientX', { value: startX + dx })
  target.dispatchEvent(up)
}

const BASE_TASKS: GanttTask[] = [
  { id: 't1', name: '需求分析', start: '2026-03-02', end: '2026-03-06', progress: 40 },
  { id: 't2', name: '开发', start: '2026-03-05', end: '2026-03-13', progress: 20, dependencies: [{ id: 't1' }] },
  { id: 'm1', name: '发布', start: '2026-03-16' },
]

describe('OASGantt 渲染基础', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('任务条渲染：bar 定位/宽度（day 档 col=36，5 天条宽 180）；milestone 菱形', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const t1 = barOf(el, 't1')
    expect(t1).not.toBeNull()
    expect(Number.parseFloat(t1.style.width)).toBe(5 * 36)
    const left1 = Number.parseFloat(t1.style.left)
    const t2 = barOf(el, 't2')
    expect(Number.parseFloat(t2.style.left)).toBeGreaterThan(left1)
    const m1 = barOf(el, 'm1')
    expect(m1.classList.contains('milestone')).toBe(true)
  })

  it('时间轴起始留白小：首个任务贴近左缘（起始留白 1 档；旧值 7 天把任务推到可见区右缘）', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' }]) })
    // anchor = 03-02，起始留白 1 天 → 03-01 为第 0 列，任务左缘 = 1 × 36
    expect(Number.parseFloat(barOf(el, 'a').style.left)).toBe(36)
  })

  it('行名超长省略号：.row-name .name 具 min-width:0 + ellipsis（flex 子项默认不收缩会硬裁）', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/\.row-name \.name \{[^}]*min-width: 0/)
    expect(css).toMatch(/\.row-name \.name \{[^}]*text-overflow: ellipsis/)
  })

  it('名称列渲染：行名与任务一一对应；aria-label 含名称与起止', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const names = nameRows(el).map((r) => r.textContent ?? '')
    expect(names.some((t) => t.includes('需求分析'))).toBe(true)
    expect(names.some((t) => t.includes('发布'))).toBe(true)
    const t1 = barOf(el, 't1')
    expect(t1.getAttribute('aria-label') ?? '').toContain('需求分析')
  })

  it('空数据：空态占位（i18n 文案非 key 本身），无任务条', () => {
    const el = mount({ tasks: '[]' })
    expect(bars(el).length).toBe(0)
    const empty = shadowOf(el).querySelector('.empty')
    expect(empty).not.toBeNull()
    expect(empty!.textContent ?? '').not.toContain('gantt.')
    expect((empty!.textContent ?? '').length).toBeGreaterThan(0)
  })

  it('slot="empty" 覆盖默认空态文案', () => {
    const el = new OASGantt()
    el.setAttribute('tasks', '[]')
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'empty')
    tpl.content.textContent = '自定义空态'
    el.appendChild(tpl)
    document.body.appendChild(el)
    expect(shadowOf(el).querySelector('.empty')?.textContent).toContain('自定义空态')
  })

  it('点任务条派发 oas-task-click（detail { id, task }）；双击派发 oas-task-dblclick', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const clicks: string[] = []
    const dbl: string[] = []
    el.addEventListener('oas-task-click', ((e: CustomEvent<{ id: string; task: { name: string } }>) => {
      clicks.push(`${e.detail.id}:${e.detail.task.name}`)
    }) as EventListener)
    el.addEventListener('oas-task-dblclick', ((e: CustomEvent<{ id: string }>) => {
      dbl.push(e.detail.id)
    }) as EventListener)
    barOf(el, 't1').click()
    barOf(el, 't2').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(clicks).toEqual(['t1:需求分析'])
    expect(dbl).toEqual(['t2'])
  })

  it('每条任务渲染后派发 oas-task-render（detail { task, element }）', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS.slice(0, 2)) })
    const rendered: string[] = []
    el.addEventListener('oas-task-render', ((e: CustomEvent<{ task: { id: string } }>) => {
      rendered.push(e.detail.task.id)
    }) as EventListener)
    el.requestUpdate()
    expect(rendered.sort()).toEqual(['t1', 't2'])
  })

  it('非法数据清洗：坏日期/空名/非对象丢弃；缺 id 自动分配且不重复', () => {
    const el = mount({
      tasks: JSON.stringify([
        { name: '坏日期', start: 'bad' },
        { id: 'ok1', name: '', start: '2026-03-02' },
        'junk',
        { name: '合法', start: '2026-03-02' },
        { name: '合法2', start: '2026-03-03' },
      ]),
    })
    expect(el.tasks.length).toBe(2)
    const ids = el.tasks.map((t) => t.id ?? '')
    expect(new Set(ids).size).toBe(2)
    expect(ids.every((id) => id.length > 0)).toBe(true)
  })

  it('progress 越界 clamp 0-100；非法 scale 回退 day', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'p1', name: 'x', start: '2026-03-02', end: '2026-03-03', progress: 140 }]),
      scale: 'bogus',
    })
    expect(el.tasks[0]!.progress).toBe(100)
    expect(shadowOf(el).querySelectorAll('.head-minor .unit').length).toBeGreaterThan(0)
  })

  it('milestone 显式声明优先：type="milestone" 即使带 end 也按里程碑渲染（菱形，end 忽略）+ console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        tasks: JSON.stringify([
          { id: 'm', name: '矛盾里程碑', start: '2026-03-05', end: '2026-03-10', type: 'milestone' },
        ]),
      })
      const bar = barOf(el, 'm')
      expect(bar.classList.contains('milestone')).toBe(true)
      // end 忽略：菱形宽 16px（条形则会按 end 计算宽）
      expect(bar.style.width).toBe('16px')
      expect(bar.querySelector('.dia')).not.toBeNull()
      // 数据矛盾告警一次（重渲染不重复告警；同值 setAttribute 会被 attrCache 短路，用 requestUpdate 触发重建）
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('milestone')).length).toBe(1)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('milestone')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('milestone 拖动只写 start：显式 type="milestone" 带 end 时 end 数据不被改写', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'm', name: '节点', start: '2026-03-05', end: '2026-03-10', type: 'milestone' }]),
    })
    dragSeq(barOf(el, 'm'), 36)
    expect(el.tasks[0]!.start).toBe('2026-03-06')
    // end 数据保留原值（渲染忽略，但清洗层不丢宿主数据）
    expect(el.tasks[0]!.end).toBe('2026-03-10')
  })

  it('start 晚于 end（日期颠倒）：清洗层自动交换 + console.warn 一次；同日任务（1 天工期）不交换', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        tasks: JSON.stringify([{ id: 'x', name: '颠倒', start: '2026-03-10', end: '2026-03-05' }]),
      })
      expect(el.tasks[0]!.start).toBe('2026-03-05')
      expect(el.tasks[0]!.end).toBe('2026-03-10')
      // 交换后按正常条形渲染（03-05..03-10 含端 6 天 × 36 = 216px，非 2px 假条）
      expect(Number.parseFloat(barOf(el, 'x').style.width)).toBe(216)
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('颠倒')).length).toBe(1)
      // 同日（start == end，含端语义 1 天工期）合法不交换
      const el2 = mount({
        tasks: JSON.stringify([{ id: 'y', name: '同日', start: '2026-03-05', end: '2026-03-05' }]),
      })
      expect(el2.tasks[0]!.start).toBe('2026-03-05')
      expect(el2.tasks[0]!.end).toBe('2026-03-05')
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('颠倒')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('updateTask 颠倒 patch（start 晚于 end）同样自动交换', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ tasks: JSON.stringify([{ id: 't', name: 'T', start: '2026-03-02', end: '2026-03-08' }]) })
      expect(el.updateTask('t', { start: '2026-03-15' })).toBe(true)
      expect(el.tasks[0]!.start).toBe('2026-03-08')
      expect(el.tasks[0]!.end).toBe('2026-03-15')
    } finally {
      warn.mockRestore()
    }
  })

  it('start 晚于 end 自愈交换：parent / dependencies 引用不受影响（交换只动日期字段）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        tasks: JSON.stringify([
          { id: 'p', name: '父', start: '2026-03-01', end: '2026-03-20', type: 'summary' },
          { id: 'c', name: '子', start: '2026-03-10', end: '2026-03-05', parent: 'p', dependencies: [{ id: 'z' }] },
          { id: 'z', name: 'Z', start: '2026-03-01', end: '2026-03-02' },
        ]),
      })
      const c = el.tasks.find((t) => t.id === 'c')!
      expect(c.start).toBe('2026-03-05')
      expect(c.end).toBe('2026-03-10')
      expect(c.parent, 'parent 指针保留').toBe('p')
      expect(c.dependencies, 'dependencies 保留').toEqual([{ id: 'z' }])
      // 行树仍按父子关系渲染（c 在 p 之下）
      const names = nameRows(el).map((r) => r.textContent ?? '')
      expect(names.findIndex((t) => t.includes('子'))).toBeGreaterThan(names.findIndex((t) => t.includes('父')))
    } finally {
      warn.mockRestore()
    }
  })

  it('显式 type:"milestone" 但有子任务：按摘要渲染（形态与聚合一致）+ 告警文案指向摘要而非里程碑', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        tasks: JSON.stringify([
          {
            id: 'p',
            name: '父',
            start: '2026-03-02',
            end: '2026-03-10',
            type: 'milestone',
            children: [{ id: 'c', name: '子', start: '2026-03-02', end: '2026-03-04' }],
          },
        ]),
      })
      const bar = barOf(el, 'p')
      expect(bar.classList.contains('summary'), '有子级恒为摘要').toBe(true)
      expect(bar.classList.contains('milestone')).toBe(false)
      const msgs = warn.mock.calls.map((c) => String(c[0]))
      expect(msgs.some((m) => m.includes('milestone') && m.includes('摘要'))).toBe(true)
      expect(
        msgs.some((m) => m.includes('已按里程碑渲染')),
        '不得声称按里程碑渲染（实际是摘要）',
      ).toBe(false)
    } finally {
      warn.mockRestore()
    }
  })

  it('受控反复重写 tasks：milestone 矛盾告警去重不刷屏（warnedMilestones 生命周期）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        tasks: JSON.stringify([{ id: 'm', name: 'M', start: '2026-03-05', end: '2026-03-10', type: 'milestone' }]),
      })
      const before = warn.mock.calls.length
      expect(before).toBeGreaterThan(0)
      // 同 id 内容变更重写 → 重新清洗 + 重渲染，仍不重复告警
      el.setAttribute(
        'tasks',
        JSON.stringify([{ id: 'm', name: 'M2', start: '2026-03-05', end: '2026-03-10', type: 'milestone' }]),
      )
      el.requestUpdate()
      expect(warn.mock.calls.length).toBe(before)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('OASGantt 刻度六档', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const one: GanttTask[] = [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-20' }]

  function minorCount(el: OASGantt): number {
    return shadowOf(el).querySelectorAll('.head-minor .unit').length
  }

  it('day（默认）/ week / month / quarter / year / hour 六档均渲染双层表头且粒度不同', () => {
    const day = mount({ tasks: JSON.stringify(one) })
    const dayN = minorCount(day)
    expect(dayN).toBeGreaterThan(10)
    const dayMajors = [...shadowOf(day).querySelectorAll('.head-major .unit')].map((u) => u.textContent ?? '')
    expect(dayMajors.some((t) => t.includes('2026-03'))).toBe(true)

    const week = mount({ tasks: JSON.stringify(one), scale: 'week' })
    const weekN = minorCount(week)
    expect(weekN).toBeGreaterThan(1)
    expect(weekN, 'week 档单元数应少于 day 档').toBeLessThan(dayN)
    expect(
      [...shadowOf(week).querySelectorAll('.head-minor .unit')].some((u) => (u.textContent ?? '').match(/W\d/)),
    ).toBe(true)

    const month = mount({ tasks: JSON.stringify(one), scale: 'month' })
    expect(
      [...shadowOf(month).querySelectorAll('.head-minor .unit')].some((u) => (u.textContent ?? '').includes('2026-03')),
    ).toBe(true)
    const majors = [...shadowOf(month).querySelectorAll('.head-major .unit')].map((u) => u.textContent ?? '')
    expect(majors.some((t) => t.includes('2026'))).toBe(true)

    const quarter = mount({ tasks: JSON.stringify(one), scale: 'quarter' })
    expect(
      [...shadowOf(quarter).querySelectorAll('.head-minor .unit')].some((u) => (u.textContent ?? '').includes('Q')),
    ).toBe(true)

    const year = mount({ tasks: JSON.stringify(one), scale: 'year' })
    expect(
      [...shadowOf(year).querySelectorAll('.head-minor .unit')].some((u) => (u.textContent ?? '').includes('2026')),
    ).toBe(true)

    const hour = mount({
      tasks: JSON.stringify([{ id: 'h', name: 'H', start: '2026-03-02 08:00', end: '2026-03-02 12:00' }]),
      scale: 'hour',
    })
    expect(
      [...shadowOf(hour).querySelectorAll('.head-minor .unit')].some((u) => (u.textContent ?? '').includes('08')),
    ).toBe(true)
  })

  it('主刻度标签靠 inline-start 对齐（合并格宽于视口时居中会把标签推出视口）', () => {
    const el = mount({ tasks: JSON.stringify(one) })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/\.head-major \.unit \{[^}]*justify-content: flex-start/)
  })

  it('scale 属性切换重渲染并派发 oas-scale-change（首次吸收不派发）', () => {
    const el = mount({ tasks: JSON.stringify(one) })
    const log: string[] = []
    el.addEventListener('oas-scale-change', ((e: CustomEvent<{ scale: string }>) => {
      log.push(e.detail.scale)
    }) as EventListener)
    el.setAttribute('scale', 'month')
    expect(log).toEqual(['month'])
    expect(el.getAttribute('scale')).toBe('month')
  })

  it('轴标签抽稀纯函数：列宽不足时取漂亮步进按 N 取一（日号不堆叠）', () => {
    const dayStrides = [1, 2, 7, 14, 28]
    // 宽列：全显示
    expect(pickVisibleLabels(['01', '02', '03', '04', '05'], 40, dayStrides)).toEqual([0, 1, 2, 3, 4])
    // 窄列（16px）：步进 2（2 × 16 = 32 ≥ 2 字符估宽 13.2 + 间隙 6）
    expect(pickVisibleLabels(['01', '02', '03', '04', '05', '06'], 16, dayStrides)).toEqual([0, 2, 4])
    // 极窄列（8px）：跃到周步进 7
    expect(pickVisibleLabels(new Array(10).fill('01'), 8, dayStrides)).toEqual([0, 7])
    // 月档长标签（7 字符）：44px 列宽下步进 2，且相邻可见标签间距 ≥ 估宽 + 间隙
    const labels = new Array(12).fill('2026-09')
    const idx = pickVisibleLabels(labels, 44, [1, 2, 3, 6, 12], 6)
    expect(idx).toEqual([0, 2, 4, 6, 8, 10])
    expect(44 * (idx[1]! - idx[0]!)).toBeGreaterThanOrEqual(7 * 6.6 + 6)
    // 边界：空标签集 / 列宽不可用（无布局环境）→ 不抽稀
    expect(pickVisibleLabels([], 16, dayStrides)).toEqual([])
    expect(pickVisibleLabels(['a', 'b', 'c'], 0, dayStrides)).toEqual([0, 1, 2])
  })

  it('视口压窄：辅刻度按 N 抽稀（保留格数，仅隐藏文本），相邻可见标签间距 ≥ 2 格', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-02-01', end: '2026-04-30' }]) })
    const tbody = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    // happy-dom 无布局：显式 mock 视口宽触发自适应列宽重排
    Object.defineProperty(tbody, 'clientWidth', { value: 200, configurable: true })
    ;(el as unknown as { onViewportResize(): void }).onViewportResize()
    const cells = [...shadowOf(el).querySelectorAll<HTMLElement>('.head-minor .unit')]
    const visible = cells.filter((c) => (c.textContent ?? '') !== '')
    expect(cells.length, '格线格数不因抽稀减少').toBeGreaterThan(visible.length)
    expect(visible.length).toBeGreaterThan(1)
    // day 档 200px 视口 / 90 天 → 列宽取到下限附近 → 步进 2：可见标签间隔 2 格
    const lefts = visible.map((c) => Number.parseFloat(c.style.left))
    const gap = lefts[1]! - lefts[0]!
    expect(gap).toBeGreaterThanOrEqual(2 * 16 - 0.001)
    for (let i = 1; i < lefts.length; i++) expect(lefts[i]! - lefts[i - 1]!).toBeCloseTo(gap, 5)
  })
})

describe('OASGantt 行树（WBS）与折叠', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TREE: GanttTask[] = [
    {
      id: 'p1',
      name: '阶段一',
      start: '2026-03-02',
      end: '2026-03-13',
      type: 'summary',
      children: [
        { id: 'c1', name: '设计', start: '2026-03-02', end: '2026-03-06' },
        { id: 'c2', name: '编码', start: '2026-03-04', end: '2026-03-13', progress: 50 },
      ],
    },
    { id: 't9', name: '独立任务', start: '2026-03-16', end: '2026-03-17' },
  ]

  it('children 嵌套输入自动拍平：行序父在子前；tasks 读回为扁平 parent 指针', () => {
    const el = mount({ tasks: JSON.stringify(TREE) })
    const names = nameRows(el).map((r) => r.textContent ?? '')
    const i1 = names.findIndex((t) => t.includes('阶段一'))
    const i2 = names.findIndex((t) => t.includes('设计'))
    const i3 = names.findIndex((t) => t.includes('编码'))
    expect(i1).toBe(0)
    expect(i2).toBe(1)
    expect(i3).toBe(2)
    const read = el.tasks
    expect(read.find((t) => t.id === 'c1')?.parent).toBe('p1')
    expect(read.find((t) => t.id === 'c1')?.children, '拍平后子项不再携带 children').toBeUndefined()
  })

  it('扁平 parent 指针等价：行序按数组序展开', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'p', name: '父', start: '2026-03-02', end: '2026-03-13', type: 'summary' },
        { id: 'a', name: '子A', start: '2026-03-02', end: '2026-03-06', parent: 'p' },
        { id: 'b', name: '子B', start: '2026-03-04', end: '2026-03-13', parent: 'p' },
      ]),
    })
    const names = nameRows(el).map((r) => r.textContent ?? '')
    expect(names.length).toBe(3)
    expect(names[0]).toContain('父')
    expect(names[1]).toContain('子A')
  })

  it('summary 摘要条 = 子任务时间并集（隐式推导：被引用为父的任务自动 summary）', () => {
    const el = mount({ tasks: JSON.stringify(TREE) })
    const p1 = barOf(el, 'p1')
    expect(p1.classList.contains('summary')).toBe(true)
    const c1 = barOf(el, 'c1')
    const c2 = barOf(el, 'c2')
    const left = (b: HTMLElement): number => Number.parseFloat(b.style.left)
    const width = (b: HTMLElement): number => Number.parseFloat(b.style.width)
    // 并集 [03-02, 03-13]：左缘 ≤ 子最小左缘，右缘 ≥ 子最大右缘
    expect(left(p1)).toBeLessThanOrEqual(Math.min(left(c1), left(c2)))
    expect(left(p1) + width(p1)).toBeGreaterThanOrEqual(Math.max(left(c1) + width(c1), left(c2) + width(c2)))
  })

  it('点击折叠钮收起子行：expanded 属性写回 JSON 数组（已展开集合）+ oas-expand-change；再点展开', () => {
    const el = mount({ tasks: JSON.stringify(TREE) })
    const log: Array<{ id: string; expanded: boolean }> = []
    el.addEventListener('oas-expand-change', ((e: CustomEvent<{ id: string; expanded: boolean }>) => {
      log.push({ id: e.detail.id, expanded: e.detail.expanded })
    }) as EventListener)
    const toggle = shadowOf(el).querySelector<HTMLButtonElement>('.row-name[data-key="p1"] .toggle')!
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    toggle.click()
    expect(nameRows(el).length, '折叠后子行消失').toBe(2)
    // 缺省全展开 → 折叠唯一 summary 后受控集合为空
    expect(JSON.parse(el.getAttribute('expanded') ?? '[]')).toEqual([])
    expect(log).toEqual([{ id: 'p1', expanded: false }])
    // renderWindow 重建行：重新取 toggle 引用
    const toggleAfter = shadowOf(el).querySelector<HTMLButtonElement>('.row-name[data-key="p1"] .toggle')!
    expect(toggleAfter.getAttribute('aria-expanded')).toBe('false')
    toggleAfter.click()
    expect(nameRows(el).length).toBe(4)
    expect(log.length).toBe(2)
    expect(log[1]).toEqual({ id: 'p1', expanded: true })
    expect(JSON.parse(el.getAttribute('expanded') ?? '[]')).toEqual(['p1'])
  })

  it('expanded 属性受控：集合即展开集（缺省缺省全展开；显式 [] 全收起）', () => {
    const el = mount({ tasks: JSON.stringify(TREE), expanded: '[]' })
    expect(nameRows(el).length, '受控空集合 → 全部收起').toBe(2)
    const el2 = mount({ tasks: JSON.stringify(TREE), expanded: '["p1"]' })
    expect(nameRows(el2).length).toBe(4)
  })

  it('数据 expanded:false 收起（缺省展开的例外）；点击展开后写回受控集合', () => {
    const data: GanttTask[] = [
      {
        id: 'p',
        name: '父',
        start: '2026-03-02',
        end: '2026-03-06',
        type: 'summary',
        expanded: false,
        children: [{ id: 'c', name: '子', start: '2026-03-02', end: '2026-03-03' }],
      },
    ]
    const el = mount({ tasks: JSON.stringify(data) })
    expect(nameRows(el).length).toBe(1)
    expect(el.getAttribute('expanded')).toBeNull()
    shadowOf(el).querySelector<HTMLButtonElement>('.row-name[data-key="p"] .toggle')!.click()
    expect(nameRows(el).length).toBe(2)
    expect(JSON.parse(el.getAttribute('expanded') ?? '[]')).toEqual(['p'])
  })

  it('parent 指针成环：断环按根渲染（不整图空白）+ console.warn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        tasks: JSON.stringify([
          { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', parent: 'b' },
          { id: 'b', name: 'B', start: '2026-03-03', end: '2026-03-06', parent: 'a' },
        ]),
      })
      expect(nameRows(el).length).toBe(2)
      expect(bars(el).length).toBe(2)
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('成环')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('悬空 parent 按根渲染（console.warn 一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        tasks: JSON.stringify([{ id: 'x', name: '孤儿', start: '2026-03-02', end: '2026-03-03', parent: 'ghost' }]),
      })
      expect(nameRows(el).length).toBe(1)
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('ghost')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('aria：summary 行 aria-expanded 同步；树容器 role=tree；行 role=treeitem + aria-level', () => {
    const el = mount({ tasks: JSON.stringify(TREE) })
    expect(shadowOf(el).querySelector('.side-body [role="tree"]')).not.toBeNull()
    const p1Row = shadowOf(el).querySelector('.row-name[data-key="p1"]')
    expect(p1Row?.getAttribute('role')).toBe('treeitem')
    expect(p1Row?.getAttribute('aria-level')).toBe('1')
    const c1Row = shadowOf(el).querySelector('.row-name[data-key="c1"]')
    expect(c1Row?.getAttribute('aria-level')).toBe('2')
  })

  it('展开集合缓存不串味：折叠 → 滚动重渲染 → 再展开，行数随受控集合变化', () => {
    const el = mount({ tasks: JSON.stringify(TREE) })
    const toggle = (): HTMLButtonElement =>
      shadowOf(el).querySelector<HTMLButtonElement>('.row-name[data-key="p1"] .toggle')!
    toggle().click()
    expect(nameRows(el).length).toBe(2)
    // 滚动重渲染复用 buildRows 缓存：仍保持收起
    shadowOf(el).querySelector<HTMLElement>('.tbody')!.dispatchEvent(new Event('scroll'))
    expect(nameRows(el).length).toBe(2)
    toggle().click()
    expect(nameRows(el).length).toBe(4)
  })
})

describe('OASGantt 依赖连线（FS/SS/FF/SF）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountDeps(types: Array<'fs' | 'ss' | 'ff' | 'sf'>): OASGantt {
    const a: GanttTask = { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }
    const b: GanttTask = { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-08', dependencies: [] }
    for (const t of types) b.dependencies!.push({ id: 'a', type: t })
    return mount({ tasks: JSON.stringify([a, b]) })
  }

  it('四种依赖类型各画一条连线（svg.links path[data-type]）', () => {
    const el = mountDeps(['fs', 'ss', 'ff', 'sf'])
    const paths = [...shadowOf(el).querySelectorAll<SVGPathElement>('svg.links path.link[data-from]')]
    expect(paths.length).toBe(4)
    const types = paths.map((p) => p.dataset.type).sort()
    expect(types).toEqual(['ff', 'fs', 'sf', 'ss'])
    expect(paths[0]!.dataset.from).toBe('b')
    expect(paths[0]!.dataset.to).toBe('a')
  })

  it('缺省 type 回落 fs；依赖目标不存在则跳过该线', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-08', dependencies: [{ id: 'a' }, { id: 'ghost' }] },
      ]),
    })
    const paths = shadowOf(el).querySelectorAll<SVGPathElement>('svg.links path.link[data-from]')
    expect(paths.length).toBe(1)
    expect(paths[0]!.dataset.type).toBe('fs')
  })

  it('连线无障碍：可见线 aria-hidden、命中路径 role=button 可聚焦', () => {
    const el = mountDeps(['fs'])
    const svg = shadowOf(el).querySelector('svg.links')!
    expect(svg.getAttribute('aria-hidden')).toBeNull()
    expect(shadowOf(el).querySelector('.link')!.getAttribute('aria-hidden')).toBe('true')
    const hit = shadowOf(el).querySelector('.link-hit')!
    expect(hit.getAttribute('role')).toBe('button')
    expect(hit.getAttribute('tabindex')).toBe('0')
    expect(hit.getAttribute('aria-label')).toBeTruthy()
  })
})

describe('OASGantt 多选 / 行内重命名 / 键盘重排 / 连线键盘', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TASKS = JSON.stringify([
    { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06' },
    { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
    { id: 'z', name: 'Z', start: '2026-03-16', end: '2026-03-20' },
  ])

  function stubCoarse(): void {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('coarse'),
      media: q,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }))
  }

  function pointer(type: string, x: number, y: number, target: EventTarget = document): void {
    const e = new PointerEvent(type, { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(e, 'clientX', { value: x })
    Object.defineProperty(e, 'clientY', { value: y })
    target.dispatchEvent(e)
  }

  function stubSideRect(el: OASGantt): void {
    const side = shadowOf(el).querySelector<HTMLElement>('.side-body')!
    side.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 1000,
        width: 300,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    Object.defineProperty(side, 'scrollTop', { value: 0, configurable: true })
  }

  function clickRow(
    el: OASGantt,
    id: string,
    mods: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean } = {},
  ): void {
    const row = shadowOf(el).querySelector<HTMLElement>(`.row-name[data-key="${id}"]`)!
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: 40 })
    Object.defineProperty(down, 'clientY', { value: 40 })
    row.dispatchEvent(down)
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'shiftKey', { value: !!mods.shiftKey })
    Object.defineProperty(up, 'ctrlKey', { value: !!mods.ctrlKey })
    Object.defineProperty(up, 'metaKey', { value: !!mods.metaKey })
    document.dispatchEvent(up)
  }

  it('点击选择 / Ctrl 切换 / Shift 范围；selection property 与事件', () => {
    const el = mount({ tasks: TASKS })
    const seen: string[][] = []
    el.addEventListener('oas-selection-change', (e) => seen.push((e as CustomEvent).detail.ids))
    clickRow(el, 'x')
    expect(el.selection).toEqual(['x'])
    clickRow(el, 'z', { shiftKey: true })
    expect(el.selection).toEqual(['x', 'y', 'z'])
    clickRow(el, 'y', { ctrlKey: true })
    expect(el.selection).toEqual(['x', 'z'])
    expect(seen.length).toBe(3)
    el.selection = ['y']
    expect(shadowOf(el).querySelector('.row-name[data-key="y"]')!.classList.contains('selected')).toBe(true)
  })

  it('Delete 批量删除所选（连同后代）', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-13',
          type: 'summary',
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-06' }],
        },
        { id: 'x', name: 'X', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let changed = 0
    el.addEventListener('oas-tasks-change', () => changed++)
    clickRow(el, 'p')
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="p"]')!
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(el.tasks.length, '删 p + 后代 c').toBe(1)
    expect(el.tasks[0]!.id).toBe('x')
    expect(changed).toBe(1)
  })

  it('Alt+↓ 键盘同级下移（派发 oas-reparent）', () => {
    const el = mount({ tasks: TASKS })
    const seen: number[] = []
    el.addEventListener('oas-reparent', (e) => seen.push((e as CustomEvent).detail.index))
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
    expect(el.tasks.map((t) => t.id)).toEqual(['y', 'x', 'z'])
    expect(seen.length).toBe(1)
  })

  it('行内重命名：双击 → Enter 提交；Esc 还原', () => {
    const el = mount({ tasks: TASKS })
    let changed = 0
    el.addEventListener('oas-tasks-change', () => changed++)
    const name = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .name')!
    name.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    const input = shadowOf(el).querySelector<HTMLInputElement>('.rename-input')!
    expect(input.value).toBe('X')
    input.value = 'X 改名'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.tasks.find((t) => t.id === 'x')!.name).toBe('X 改名')
    expect(changed).toBe(1)
    // Esc 还原
    const name2 = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .name')!
    name2.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    const input2 = shadowOf(el).querySelector<HTMLInputElement>('.rename-input')!
    input2.value = '不该改'
    input2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(el.tasks.find((t) => t.id === 'x')!.name).toBe('X 改名')
    expect(shadowOf(el).querySelector('.rename-input')).toBeNull()
  })

  it('连线键盘：命中路径聚焦 + Enter 删除依赖', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-dependencies-change', () => fired++)
    const hit = shadowOf(el).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    hit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(fired).toBe(1)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toBeUndefined()
  })

  it('readonly：行键盘不改父子 / 不删任务', () => {
    const el = mount({ tasks: TASKS, readonly: '' })
    let reparent = 0
    let changed = 0
    el.addEventListener('oas-reparent', () => reparent++)
    el.addEventListener('oas-tasks-change', () => changed++)
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(reparent).toBe(0)
    expect(changed).toBe(0)
    expect(el.tasks.length).toBe(3)
  })

  it('toggle 键盘激活不被行 keydown 劫持', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-13',
          type: 'summary',
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-06' }],
        },
      ]),
    })
    const toggle = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="p"] .toggle')!
    toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(el.selection, '行未因 toggle 回车被选中').toEqual([])
  })

  it('removeTasks 派发 selection-change 并清锚点', () => {
    const el = mount({ tasks: TASKS })
    clickRow(el, 'x')
    expect(el.selection).toEqual(['x'])
    let sel = 0
    el.addEventListener('oas-selection-change', () => sel++)
    el.removeTasks(['x'])
    expect(sel).toBe(1)
    expect(el.selection).toEqual([])
    expect(el.tasks.length).toBe(2)
  })

  it('行 Delete 不连带删除已选连线（stopPropagation）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
        { id: 'x', name: 'X', start: '2026-03-16', end: '2026-03-20' },
      ]),
    })
    const hit = shadowOf(el).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true })) // 选中连线
    clickRow(el, 'x') // 选中 x
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies, '连线保留').toEqual([{ id: 'a' }])
    expect(el.tasks.some((t) => t.id === 'x')).toBe(false)
  })

  it('重命名中窗口重建不卡死（可再次重命名）', () => {
    const el = mount({ tasks: TASKS })
    const name = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .name')!
    name.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    expect(shadowOf(el).querySelector('.rename-input')).not.toBeNull()
    shadowOf(el).querySelector('.tbody')!.dispatchEvent(new Event('scroll')) // 触发窗口重建
    const name2 = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .name')!
    name2.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    expect(shadowOf(el).querySelector('.rename-input'), '重建后仍可重命名').not.toBeNull()
  })

  it('重命名 Enter 提交后输入框移除', () => {
    const el = mount({ tasks: TASKS })
    const name = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .name')!
    name.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    const input = shadowOf(el).querySelector<HTMLInputElement>('.rename-input')!
    input.value = 'X2'
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(shadowOf(el).querySelector('.rename-input')).toBeNull()
    expect(el.tasks.find((t) => t.id === 'x')!.name).toBe('X2')
  })

  it('roving：仅活动行 tabIndex=0，其余 -1；点击行更新停靠点', () => {
    const el = mount({ tasks: TASKS })
    const rows = [...shadowOf(el).querySelectorAll<HTMLElement>('.row-name')]
    expect(rows.filter((r) => r.tabIndex === 0).length).toBe(1)
    clickRow(el, 'y')
    const rows2 = [...shadowOf(el).querySelectorAll<HTMLElement>('.row-name')]
    expect(rows2.find((r) => r.dataset.key === 'y')!.tabIndex).toBe(0)
    expect(rows2.find((r) => r.dataset.key === 'x')!.tabIndex).toBe(-1)
  })

  it('readonly：鼠标点选与键盘空格一致（可选），但不重排/不删', () => {
    const el = mount({ tasks: TASKS, readonly: '' })
    clickRow(el, 'x')
    expect(el.selection).toEqual(['x'])
    el.selection = []
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="y"]')!
    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(el.selection).toEqual(['y'])
    let changed = 0
    el.addEventListener('oas-tasks-change', () => changed++)
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(changed).toBe(0)
  })

  it('APG：已展开父行按 → 焦点进首个子级', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-13',
          type: 'summary',
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-06' }],
        },
      ]),
    })
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="p"]')!
    row.focus()
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="c"]')!.tabIndex).toBe(0)
  })

  it('removeTasks 清洗悬空依赖并对受影响后继派 dependencies-change', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
      ]),
    })
    const deps: string[] = []
    el.addEventListener('oas-dependencies-change', (e) => deps.push((e as CustomEvent).detail.taskId))
    el.removeTasks(['a'])
    expect(deps).toEqual(['b'])
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toBeUndefined()
  })

  it('键盘批量删除跳过 disabled 任务', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06' },
        { id: 'd', name: 'D', start: '2026-03-09', end: '2026-03-13', disabled: true },
      ]),
    })
    clickRow(el, 'x')
    clickRow(el, 'd', { ctrlKey: true })
    expect(el.selection).toEqual(['x', 'd'])
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(
      el.tasks.some((t) => t.id === 'x'),
      'x 删除',
    ).toBe(false)
    expect(
      el.tasks.some((t) => t.id === 'd'),
      'disabled 保留',
    ).toBe(true)
  })

  it('行聚焦按 Delete 不误删已选连线（不冒泡到 document）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
        { id: 'y', name: 'Y', start: '2026-03-16', end: '2026-03-20' },
      ]),
    })
    const hit = shadowOf(el).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="y"]')!
    row.focus()
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies, '连线保留').toEqual([{ id: 'a' }])
  })

  it('removeTasks 未知 id / 空数组：不派事件、数据不变', () => {
    const el = mount({ tasks: TASKS })
    let changed = 0
    el.addEventListener('oas-tasks-change', () => changed++)
    el.removeTasks(['ghost'])
    el.removeTasks([])
    expect(changed).toBe(0)
    expect(el.tasks.length).toBe(3)
  })

  it('RTL：Alt+← 缩进（方向镜像）', () => {
    const el = mount({
      dir: 'rtl',
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-13',
          type: 'summary',
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-06' }],
        },
        { id: 'x', name: 'X', start: '2026-03-16', end: '2026-03-20' },
      ]),
    })
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }))
    expect(el.tasks.find((t) => t.id === 'x')!.parent).toBe('p')
  })

  it('外部重写 tasks 剪枝选中/锚点（无幽灵 id，派发 selection-change）', () => {
    const el = mount({ tasks: TASKS })
    const seen: string[][] = []
    el.addEventListener('oas-selection-change', (e) => seen.push((e as CustomEvent).detail.ids))
    clickRow(el, 'x')
    clickRow(el, 'z', { shiftKey: true })
    expect(el.selection).toEqual(['x', 'y', 'z'])
    el.tasks = [{ id: 'z', name: 'Z', start: '2026-03-16', end: '2026-03-20' }]
    expect(el.selection).toEqual(['z'])
    expect(seen.at(-1)).toEqual(['z'])
    // 锚点被剪 → 之后 Shift 点击退化为单选，不产生空区间
    clickRow(el, 'z', { shiftKey: true })
    expect(el.selection).toEqual(['z'])
  })

  it('条上 Delete/Backspace 不冒泡误删已选连线', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
      ]),
    })
    const hit = shadowOf(el).querySelector<HTMLElement>('.link-hit')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(shadowOf(el).querySelector('.link-hit.selected')).not.toBeNull()
    const bar = barOf(el, 'b')
    bar.focus()
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, composed: true }))
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies?.length).toBe(1)
  })

  it('行 treeitem 暴露 aria-posinset / aria-setsize（同级全集，含折叠子级）', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p1',
          name: 'P1',
          start: '2026-03-02',
          end: '2026-03-13',
          type: 'summary',
          children: [
            { id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-06' },
            { id: 'c2', name: 'C2', start: '2026-03-09', end: '2026-03-13' },
          ],
        },
        { id: 'p2', name: 'P2', start: '2026-03-16', end: '2026-03-20' },
      ]),
    })
    const rp1 = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="p1"]')!
    expect(rp1.getAttribute('aria-posinset')).toBe('1')
    expect(rp1.getAttribute('aria-setsize')).toBe('2')
    const rc2 = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="c2"]')!
    expect(rc2.getAttribute('aria-posinset')).toBe('2')
    expect(rc2.getAttribute('aria-setsize')).toBe('2')
  })

  it('snap 平移（month 档）：日历整格平移，工期不变', () => {
    const el = mount({
      scale: 'month',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    const colW = (el as unknown as { colW(): number }).colW()
    dragSeq(barOf(el, 'a'), colW)
    const t = el.tasks[0]!
    // month 档：整格平移（吸附到月单元起点），但工期（天数）保持一致，不产生月末幻影日期
    expect(t.start).not.toBe('2026-03-02')
    expect(t.start.startsWith('2026-04')).toBe(true)
    // 用日历日差（UTC 构造）避免 DST 时区下 ms/86400000 出现 ±1 天抖动
    const dayOf = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
    expect((dayOf(t.end!) - dayOf(t.start)) / 86400000).toBe(4)
  })

  it('month 档：零位移点按 / 微抖条不静默改期（snap n=0 恒等）', () => {
    const el = mount({
      scale: 'month',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    const bar = barOf(el, 'a')
    dragSeq(bar, 0) // 零位移：不得把日期锚到月首
    expect(changed, '零位移不应改期').toBe(0)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
    dragSeq(bar, 10) // 微抖（< 半列宽，round → 0）同样不改期
    expect(changed, '微抖不应改期').toBe(0)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
  })

  it('resize 零位移不静默改期（month/week 短任务）+ month 右拖不反向跳', () => {
    for (const scale of ['month', 'week']) {
      const el = mount({
        scale,
        tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
      })
      let changed = 0
      el.addEventListener('oas-task-change', () => changed++)
      dragSeq(shadowOf(el).querySelector<HTMLElement>('.bar[data-id="a"] .handle-start')!, 0)
      dragSeq(shadowOf(el).querySelector<HTMLElement>('.bar[data-id="a"] .handle-end')!, 0)
      expect(changed, `${scale} 零位移不应改期`).toBe(0)
      expect(el.tasks[0]!.start).toBe('2026-03-02')
      expect(el.tasks[0]!.end).toBe('2026-03-06')
    }
    // month 档 4 天任务右拖起点：最短跨度钳制须夹在原区间内，不得跳到原 start 之前
    const el = mount({
      scale: 'month',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    const colW = (el as unknown as { colW(): number }).colW()
    dragSeq(shadowOf(el).querySelector<HTMLElement>('.bar[data-id="a"] .handle-start')!, colW)
    expect(Date.parse(el.tasks[0]!.start)).toBeGreaterThanOrEqual(Date.parse('2026-03-02'))
  })

  it('month 档键盘 Shift+→ 整体平移，不产生 start>end（工期不变）', () => {
    const el = mount({
      scale: 'month',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    // 键盘改期监听在条上（onBarKeyDown），须派发到 .bar 而非行
    const bar = barOf(el, 'a')
    bar.focus()
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }))
    const t = el.tasks[0]!
    expect(t.start, '应有实际平移（非零操作）').not.toBe('2026-03-02')
    expect(Date.parse(t.start), 'start 应早于 end（不得颠倒）').toBeLessThan(Date.parse(t.end!))
    const dayOf = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
    expect((dayOf(t.end!) - dayOf(t.start)) / 86400000, '工期应保持 4 天').toBe(4)
  })

  it('coarse：渲染重排手柄，从手柄拖拽触发 reparent', () => {
    stubCoarse()
    try {
      const el = mount({ tasks: TASKS })
      const handle = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .row-drag')
      expect(handle).not.toBeNull()
      const side = shadowOf(el).querySelector<HTMLElement>('.side-body')!
      side.getBoundingClientRect = () =>
        ({
          top: 0,
          left: 0,
          right: 300,
          bottom: 1000,
          width: 300,
          height: 1000,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
      Object.defineProperty(side, 'scrollTop', { value: 0, configurable: true })
      const seen: Array<{ id: string; parent: string | null; index: number }> = []
      el.addEventListener('oas-reparent', (e) => seen.push((e as CustomEvent).detail))
      const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
      Object.defineProperty(down, 'clientX', { value: 0 })
      Object.defineProperty(down, 'clientY', { value: 0 })
      handle!.dispatchEvent(down)
      const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
      Object.defineProperty(move, 'clientX', { value: 0 })
      Object.defineProperty(move, 'clientY', { value: 2 * 36 + 9 })
      document.dispatchEvent(move)
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
      expect(seen).toEqual([{ id: 'x', parent: null, index: 1 }])
      expect(el.tasks.map((t) => t.id)).toEqual(['y', 'x', 'z'])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('coarse：点条揭示连线点、点空白收起', () => {
    stubCoarse()
    try {
      const el = mount({ tasks: TASKS })
      const bar = barOf(el, 'x')
      bar.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 }))
      expect(bar.classList.contains('touch-active')).toBe(true)
      const outside = document.createElement('div')
      document.body.appendChild(outside)
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
      expect(barOf(el, 'x').classList.contains('touch-active')).toBe(false)
      pointer('pointerup', 0, 0) // 收尾：关闭条拖拽 ctx，避免 doc 监听残留到后续用例
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('coarse：点手柄（未达判拖阈值）不改变选择', () => {
    stubCoarse()
    try {
      const el = mount({ tasks: TASKS })
      stubSideRect(el)
      const handle = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .row-drag')!
      pointer('pointerdown', 0, 0, handle)
      pointer('pointerup', 0, 0)
      expect(el.selection).toEqual([])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('coarse：进行中的条拖拽存在时手柄被守卫忽略（零 reparent）', () => {
    stubCoarse()
    try {
      const el = mount({ tasks: TASKS })
      stubSideRect(el)
      let fired = 0
      el.addEventListener('oas-reparent', () => fired++)
      pointer('pointerdown', 100, 100, barOf(el, 'x')) // 开始条拖拽 → dragCtx
      const handle = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="y"] .row-drag')!
      // 手柄同 x 起手：条拖拽 dx=0 不收口（否则收口走 update()→cancelReparent 会遮蔽守卫，造成假绿）
      pointer('pointerdown', 100, 0, handle) // 手柄应被 dragCtx 守卫拦下
      pointer('pointermove', 100, 10)
      pointer('pointerup', 100, 10)
      expect(fired).toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('coarse：readonly 下从手柄判拖不重排', () => {
    stubCoarse()
    try {
      const el = mount({ tasks: TASKS, readonly: '' })
      stubSideRect(el)
      let fired = 0
      el.addEventListener('oas-reparent', () => fired++)
      const handle = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"] .row-drag')!
      pointer('pointerdown', 0, 0, handle)
      pointer('pointermove', 0, 80)
      pointer('pointerup', 0, 80)
      expect(fired).toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('attribute 通道重写 tasks 同样剪枝并补发 selection-change', () => {
    const el = mount({ tasks: TASKS })
    const seen: string[][] = []
    el.addEventListener('oas-selection-change', (e) => seen.push((e as CustomEvent).detail.ids))
    clickRow(el, 'x')
    clickRow(el, 'z', { shiftKey: true })
    expect(el.selection).toEqual(['x', 'y', 'z'])
    el.setAttribute('tasks', JSON.stringify([{ id: 'z', name: 'Z', start: '2026-03-16', end: '2026-03-20' }]))
    expect(el.selection).toEqual(['z'])
    expect(seen.length).toBe(3)
    expect(seen.at(-1)).toEqual(['z'])
  })

  it('coarse：揭示态在窗口重建后保持', () => {
    stubCoarse()
    try {
      const el = mount({ tasks: TASKS })
      barOf(el, 'x').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 }))
      expect(barOf(el, 'x').classList.contains('touch-active')).toBe(true)
      el.setAttribute('scale', 'week') // 触发 rebuild（renderWindow → renderBars）
      expect(barOf(el, 'x').classList.contains('touch-active')).toBe(true)
      pointer('pointerup', 0, 0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('悬空 parent 的任务归根：aria-posinset/setsize 按根同级计算', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06', parent: 'ghost' },
        { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    const rx = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
    const ry = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="y"]')!
    expect([rx.getAttribute('aria-posinset'), rx.getAttribute('aria-setsize')]).toEqual(['1', '2'])
    expect([ry.getAttribute('aria-posinset'), ry.getAttribute('aria-setsize')]).toEqual(['2', '2'])
  })
})

describe('OASGantt 拖拽三件套（改期/拉伸/进度）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountDrag(extra: Record<string, string> = {}): OASGantt {
    return mount({
      tasks: JSON.stringify([{ id: 't1', name: '任务', start: '2026-03-02', end: '2026-03-06', progress: 40 }]),
      ...extra,
    })
  }

  it('拖条改期：右移 2 天（day 档 72px）→ start/end 写回 + oas-task-change（old/new）+ oas-tasks-change + 属性反射', () => {
    const el = mountDrag()
    const changes: Array<Record<string, unknown>> = []
    let tasksChanged = 0
    el.addEventListener('oas-task-change', ((e: CustomEvent<Record<string, unknown>>) => {
      changes.push({ ...e.detail })
    }) as EventListener)
    el.addEventListener('oas-tasks-change', () => tasksChanged++)
    dragSeq(barOf(el, 't1'), 72)
    expect(changes.length).toBe(1)
    expect(changes[0]!.id).toBe('t1')
    expect(changes[0]!.oldStart).toBe('2026-03-02')
    expect(changes[0]!.oldEnd).toBe('2026-03-06')
    expect(changes[0]!.start).toBe('2026-03-04')
    expect(changes[0]!.end).toBe('2026-03-08')
    expect(tasksChanged).toBe(1)
    expect(el.tasks[0]!.start).toBe('2026-03-04')
    expect(JSON.parse(el.getAttribute('tasks') ?? '[]')[0].start).toBe('2026-03-04')
  })

  it('零位移松开：零事件零写回', () => {
    const el = mountDrag()
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    el.addEventListener('oas-tasks-change', () => changed++)
    dragSeq(barOf(el, 't1'), 0)
    expect(changed).toBe(0)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
  })

  it('拉伸左手柄：+1 天 → start 后移；右手柄：+2 天 → end 后移（task-change 均派发）', () => {
    const el = mountDrag()
    const hStart = barOf(el, 't1').querySelector<HTMLElement>('.handle-start')!
    dragSeq(hStart, 36)
    expect(el.tasks[0]!.start).toBe('2026-03-03')
    expect(el.tasks[0]!.end).toBe('2026-03-06')
    const hEnd = barOf(el, 't1').querySelector<HTMLElement>('.handle-end')!
    dragSeq(hEnd, 72)
    expect(el.tasks[0]!.end).toBe('2026-03-08')
    expect(el.tasks[0]!.start).toBe('2026-03-03')
  })

  it('拉伸钳制：end 不得小于 start（右手柄拖过起点被钳回）', () => {
    const el = mountDrag()
    const hEnd = barOf(el, 't1').querySelector<HTMLElement>('.handle-end')!
    dragSeq(hEnd, -36 * 10)
    expect(el.tasks[0]!.end).toBe('2026-03-02')
    expect(el.tasks[0]!.start).toBe('2026-03-02')
  })

  it('拖进度手柄：+36px（条宽 180 的 1/5）→ progress 40→60 + oas-progress-change + oas-tasks-change', () => {
    const el = mountDrag()
    const prog: number[] = []
    let tasksChanged = 0
    el.addEventListener('oas-progress-change', ((e: CustomEvent<{ progress: number }>) => {
      prog.push(e.detail.progress)
    }) as EventListener)
    el.addEventListener('oas-tasks-change', () => tasksChanged++)
    const handle = barOf(el, 't1').querySelector<HTMLElement>('.progress-handle')!
    dragSeq(handle, 36)
    expect(prog).toEqual([60])
    expect(el.tasks[0]!.progress).toBe(60)
    expect(tasksChanged).toBe(1)
  })

  it('Esc 取消拖拽：视觉回滚、零事件零写回', () => {
    const el = mountDrag()
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    el.addEventListener('oas-tasks-change', () => changed++)
    const bar = barOf(el, 't1')
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(down, 'clientX', { value: 100 })
    bar.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 172 })
    bar.dispatchEvent(move)
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'clientX', { value: 172 })
    bar.dispatchEvent(up)
    expect(changed).toBe(0)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
    // 视觉回滚到拖前精确位置：anchor=03-01（起始留白 1 档）→ 03-02 落在第 1 列，left = 36；
    // end 含端语义 03-02..03-06 = 5 天 → 宽 180
    expect(Number.parseFloat(bar.style.left)).toBe(36)
    expect(Number.parseFloat(bar.style.width)).toBe(5 * 36)
  })

  it('拖拽中视口 resize（自适应列宽重排）：拖拽终止回滚（零事件，ctx.bar 不悬在脱节 DOM 上）', () => {
    const el = mountDrag()
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    const bar = barOf(el, 't1')
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(down, 'clientX', { value: 100 })
    bar.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 172 })
    bar.dispatchEvent(move)
    // ResizeObserver 回调路径：视口宽变化 → 列宽重排会重建 bars 层，
    // 进行中的拖拽必须先终止（否则 ctx.bar 持已脱离 DOM 的旧节点，视觉断线）
    ;(el as unknown as { onViewportResize(): void }).onViewportResize()
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'clientX', { value: 172 })
    document.dispatchEvent(up)
    expect(changed).toBe(0)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
  })

  it('pointercancel 回滚（零事件）', () => {
    const el = mountDrag()
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    const bar = barOf(el, 't1')
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(down, 'clientX', { value: 100 })
    bar.dispatchEvent(down)
    bar.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, composed: true, pointerId: 1 }))
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'clientX', { value: 200 })
    bar.dispatchEvent(up)
    expect(changed).toBe(0)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
  })

  it('milestone 可拖移动（只改 start；end 保持缺省）', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'm', name: '节点', start: '2026-03-05' }]) })
    dragSeq(barOf(el, 'm'), 36)
    expect(el.tasks[0]!.start).toBe('2026-03-06')
    expect(el.tasks[0]!.end).toBeUndefined()
  })

  it('snap="false"：按像素比例平移（非整格）', () => {
    const el = mountDrag({ snap: 'false' })
    dragSeq(barOf(el, 't1'), 18) // 半格 ≈ 半天
    const start = el.tasks[0]!.start
    expect(start).toContain(' ')
    expect(start.endsWith('12:00')).toBe(true)
  })

  it('拖拽中外部 tasks 属性重写 → 拖拽终止回滚（零事件）', () => {
    const el = mountDrag()
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    const bar = barOf(el, 't1')
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(down, 'clientX', { value: 100 })
    bar.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 172 })
    bar.dispatchEvent(move)
    // 外部受控写回（同值重写即可触发 update）
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 't1', name: '任务', start: '2026-03-02', end: '2026-03-06', progress: 40 }]),
    )
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'clientX', { value: 172 })
    bar.dispatchEvent(up)
    expect(changed).toBe(0)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
  })

  it('键盘改期：聚焦条上 Shift+ArrowRight 移动 1 格（oas-task-change 收口）', () => {
    const el = mountDrag()
    const bar = barOf(el, 't1')
    bar.focus()
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }))
    expect(el.tasks[0]!.start).toBe('2026-03-03')
    expect(el.tasks[0]!.end).toBe('2026-03-07')
  })
})

describe('OASGantt 行虚拟滚动', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function bigTasks(n: number): GanttTask[] {
    const out: GanttTask[] = []
    for (let i = 0; i < n; i++) {
      const d = 1 + (i % 28)
      out.push({
        id: `k${i}`,
        name: `任务${i}`,
        start: `2026-03-${String(d).padStart(2, '0')}`,
        end: `2026-03-${String(Math.min(d + 2, 28)).padStart(2, '0')}`,
      })
    }
    return out
  }

  it('行数远超视口：只渲染窗口行；.inner 总高 = 行数×行高', () => {
    const el = mount({
      tasks: JSON.stringify(bigTasks(60)),
      height: '180',
      'row-height': '36',
    })
    const rendered = shadowOf(el).querySelectorAll('.bars .bar').length
    expect(rendered, '窗口行数应远小于 60').toBeLessThan(20)
    const inner = shadowOf(el).querySelector<HTMLElement>('.inner')!
    expect(Number.parseFloat(inner.style.height)).toBe(60 * 36)
  })

  it('scrollTo(id)：滚到目标行后窗口包含该行（渲染出对应 bar）', () => {
    const el = mount({ tasks: JSON.stringify(bigTasks(60)), height: '180', 'row-height': '36' })
    el.scrollToTask('k50')
    expect(barOf(el, 'k50')).not.toBeNull()
  })

  it('虚拟滚动下依赖两行均在窗口才画线；任一端滚出则省略', () => {
    const tasks = bigTasks(60)
    tasks[0] = { ...tasks[0]!, dependencies: [{ id: 'k55' }] }
    const el = mount({ tasks: JSON.stringify(tasks), height: '180', 'row-height': '36' })
    // k0 与 k55 都不在首屏窗口 → 无线
    expect(shadowOf(el).querySelectorAll('svg.links path[data-from]').length).toBe(0)
    el.scrollToTask('k55')
    // 现在窗口在尾部，k55 可见但 k0 不可见 → 仍无线
    expect(shadowOf(el).querySelectorAll('svg.links path[data-from]').length).toBe(0)
  })
})

describe('OASGantt 只读三级与任务级禁用', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function dragBar(el: OASGantt, id: string, dx = 72): void {
    dragSeq(barOf(el, id), dx)
  }

  it('readonly：拖期与拖进度全部无效（零事件）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 't1', name: 'x', start: '2026-03-02', end: '2026-03-06', progress: 40 }]),
      readonly: '',
    })
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    el.addEventListener('oas-progress-change', () => changed++)
    dragBar(el, 't1')
    expect(el.tasks[0]!.start).toBe('2026-03-02')
    expect(barOf(el, 't1').querySelector('.progress-handle')).toBeNull()
    expect(changed).toBe(0)
  })

  it('dates-readonly：拖期无效、拖进度有效', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 't1', name: 'x', start: '2026-03-02', end: '2026-03-06', progress: 40 }]),
      'dates-readonly': '',
    })
    let dateChanged = 0
    el.addEventListener('oas-task-change', () => dateChanged++)
    dragBar(el, 't1')
    expect(el.tasks[0]!.start).toBe('2026-03-02')
    expect(dateChanged).toBe(0)
    dragSeq(barOf(el, 't1').querySelector<HTMLElement>('.progress-handle')!, 36)
    expect(el.tasks[0]!.progress).toBe(60)
  })

  it('progress-readonly：拖进度无效、拖期有效', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 't1', name: 'x', start: '2026-03-02', end: '2026-03-06', progress: 40 }]),
      'progress-readonly': '',
    })
    let progChanged = 0
    el.addEventListener('oas-progress-change', () => progChanged++)
    expect(barOf(el, 't1').querySelector('.progress-handle')).toBeNull()
    dragBar(el, 't1')
    expect(el.tasks[0]!.start).toBe('2026-03-04')
    expect(progChanged).toBe(0)
  })

  it('任务级 disabled：该任务禁拖、其他任务正常', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: '锁', start: '2026-03-02', end: '2026-03-04', disabled: true },
        { id: 'b', name: '自由', start: '2026-03-05', end: '2026-03-07' },
      ]),
    })
    dragBar(el, 'a')
    expect(el.tasks.find((t) => t.id === 'a')!.start).toBe('2026-03-02')
    dragBar(el, 'b')
    expect(el.tasks.find((t) => t.id === 'b')!.start).toBe('2026-03-07')
  })
})

describe('OASGantt 今日线 / 周末与假日 / tooltip / 标签', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('今日线：范围内且 show-today（默认开）→ 渲染；范围外或 show-today="false" → 隐藏（aria-hidden 装饰）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-03-10T10:00:00'))
      const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-20' }]) })
      const line = shadowOf(el).querySelector('.today-line')
      expect(line).not.toBeNull()
      expect(line!.getAttribute('aria-hidden')).toBe('true')
      expect(line!.hasAttribute('hidden')).toBe(false)
      const el2 = mount({
        tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-20' }]),
        'show-today': 'false',
      })
      expect(shadowOf(el2).querySelector('.today-line:not([hidden])')).toBeNull()
      const el3 = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-05-02', end: '2026-05-20' }]) })
      expect(shadowOf(el3).querySelector('.today-line:not([hidden])')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('周末列高亮（day 档默认开；weekends="false" 关闭）；holidays 假日高亮', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-08' }]) })
    // 2026-03-07 是周六、03-08 是周日 → 至少 2 个高亮格
    expect(shadowOf(el).querySelectorAll('.grid-canvas .weekend').length).toBeGreaterThanOrEqual(2)
    const el2 = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-08' }]),
      weekends: 'false',
    })
    expect(shadowOf(el2).querySelectorAll('.grid-canvas .weekend').length).toBe(0)
    const el3 = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-08' }]),
      holidays: JSON.stringify(['2026-03-04']),
    })
    expect(shadowOf(el3).querySelector('.grid-canvas .holiday')).not.toBeNull()
  })

  it('tooltip：mouseenter 显示浮层（含名称），mouseleave 关闭；template[slot=tooltip] 覆盖内容', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: '悬停我', start: '2026-03-02', end: '2026-03-06', progress: 40 }]),
    })
    const bar = barOf(el, 'a')
    bar.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    const tip = shadowOf(el).querySelector('.tooltip')
    expect(tip).not.toBeNull()
    expect(tip!.textContent ?? '').toContain('悬停我')
    bar.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    expect(shadowOf(el).querySelector('.tooltip')!.hasAttribute('hidden')).toBe(true)

    const el2 = new OASGantt()
    el2.setAttribute('tasks', JSON.stringify([{ id: 'a', name: 'x', start: '2026-03-02', end: '2026-03-03' }]))
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'tooltip')
    const b = document.createElement('b')
    b.setAttribute('data-task-name', '')
    tpl.content.appendChild(b)
    el2.appendChild(tpl)
    document.body.appendChild(el2)
    barOf(el2, 'a').dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    const tip2 = shadowOf(el2).querySelector('.tooltip')!
    expect(tip2.querySelector('[data-task-name]')?.textContent).toBe('x')
  })

  it('label-position：缺省 none（行名列已承载名称，条旁不再重复）；inside/right/left 显式开启', () => {
    const tasks = JSON.stringify([{ id: 'a', name: '标签', start: '2026-03-02', end: '2026-03-06' }])
    // 缺省：不渲染条旁/条内标签（旧缺陷：与左侧行名重复）
    const el = mount({ tasks })
    const bar = barOf(el, 'a')
    expect(bar.classList.contains('label-right')).toBe(false)
    expect(bar.classList.contains('label-inside')).toBe(false)
    expect(bar.querySelector('.bar-label')).toBeNull()
    // 显式开启：三种位置各自生效且渲染标签文本
    const el2 = mount({ tasks, 'label-position': 'inside' })
    const inside = barOf(el2, 'a')
    expect(inside.classList.contains('label-inside')).toBe(true)
    expect(inside.querySelector('.bar-label')?.textContent).toBe('标签')
    const el3 = mount({ tasks, 'label-position': 'right' })
    expect(barOf(el3, 'a').classList.contains('label-right')).toBe(true)
    const el4 = mount({ tasks, 'label-position': 'left' })
    expect(barOf(el4, 'a').classList.contains('label-left')).toBe(true)
    // 非法值回落 none（不渲染标签）
    const el5 = mount({ tasks, 'label-position': 'bogus' })
    expect(barOf(el5, 'a').querySelector('.bar-label')).toBeNull()
  })
})

describe('OASGantt RTL', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('dir=rtl：data-rtl 标记 + 条 left 镜像（ltr left + width === rtl 右缘距）', () => {
    const tasks = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }])
    const ltr = mount({ tasks })
    const rtl = mount({ tasks, dir: 'rtl' })
    expect(rtl.hasAttribute('data-rtl')).toBe(true)
    const b1 = barOf(ltr, 'a')
    const b2 = barOf(rtl, 'a')
    const l1 = Number.parseFloat(b1.style.left)
    const w = Number.parseFloat(b1.style.width)
    const l2 = Number.parseFloat(b2.style.left)
    expect(w).toBe(Number.parseFloat(b2.style.width))
    const canvasW = Number.parseFloat(shadowOf(ltr).querySelector<HTMLElement>('.inner')!.style.width)
    expect(l1 + w, 'rtl 镜像：右缘到画布右缘的距离 = ltr 左缘').toBeCloseTo(canvasW - l2, 5)
  })

  it('RTL 下拖拽方向镜像：向左拖 = 时间前进', () => {
    const tasks = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }])
    const rtl = mount({ tasks, dir: 'rtl' })
    dragSeq(barOf(rtl, 'a'), -72)
    expect(rtl.tasks[0]!.start).toBe('2026-03-04')
  })

  it('RTL：刻度表头单元格镜像（左缘 = canvasW − 区间右缘），末端格贴右缘后落回 0', () => {
    const tasks = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }])
    const rtl = mount({ tasks, dir: 'rtl' })
    const canvasW = Number.parseFloat(shadowOf(rtl).querySelector<HTMLElement>('.inner')!.style.width)
    const colW = 36
    const minors = [...shadowOf(rtl).querySelectorAll<HTMLElement>('.head-minor .unit')]
    // 最后一格覆盖 [canvasW − colW, canvasW]，镜像后左缘 = canvasW − canvasW = 0
    expect(Number.parseFloat(minors[minors.length - 1]!.style.left)).toBeCloseTo(0, 5)
    // 第二格镜像后左缘 = canvasW − 2 × colW
    expect(Number.parseFloat(minors[1]!.style.left)).toBeCloseTo(canvasW - 2 * colW, 5)
  })

  it('RTL 下 scrollToDate 走 scrollLeft 负值模型（真实浏览器 RTL：0 在最右、向左滚为负）', () => {
    const tasks = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }])
    const ltr = mount({ tasks })
    const rtl = mount({ tasks, dir: 'rtl' })
    // happy-dom 无布局：显式 mock 视口/画布尺寸（clientWidth 200、scrollWidth 360 = 画布宽 10 格，
    // 与 .inner 宽自洽 → 最大滚动量 maxScroll = 160）
    for (const el of [ltr, rtl]) {
      const tbody = shadowOf(el).querySelector<HTMLElement>('.tbody')!
      Object.defineProperty(tbody, 'clientWidth', { value: 200, configurable: true })
      Object.defineProperty(tbody, 'scrollWidth', { value: 360, configurable: true })
    }
    ltr.scrollToDate('2026-03-05')
    rtl.scrollToDate('2026-03-05')
    const canvasW = Number.parseFloat(shadowOf(ltr).querySelector<HTMLElement>('.inner')!.style.width)
    const ltrLeft = ltr.shadowRoot!.querySelector<HTMLElement>('.tbody')!.scrollLeft
    const rtlLeft = rtl.shadowRoot!.querySelector<HTMLElement>('.tbody')!.scrollLeft
    // LTR：scrollLeft = 目标物理 x − 半视口（正值模型）
    expect(ltrLeft).toBeGreaterThan(0)
    // RTL 物理 x 是镜像坐标（p = canvasW − x = canvasW − ltrLeft − half）：
    // scrollLeft = (p − half) − maxScroll = canvasW − ltrLeft − 2×half − maxScroll ∈ [−maxScroll, 0]
    expect(rtlLeft).toBe(canvasW - ltrLeft - 200 - 160)
    expect(rtlLeft).toBeLessThan(0)
    // 目标在时间轴起点（RTL 画布物理右端，镜像 p = canvasW → 视口左缘越上界）：钳制在 0（不越成正值）
    rtl.scrollToDate('2026-03-01')
    expect(rtl.shadowRoot!.querySelector<HTMLElement>('.tbody')!.scrollLeft).toBe(0)
    // 目标在画布最左端（RTL 视角的时间轴末端，镜像 p = 0）：钳制在 −maxScroll
    rtl.scrollToDate('2026-04-01')
    expect(rtl.shadowRoot!.querySelector<HTMLElement>('.tbody')!.scrollLeft).toBe(-160)
  })
})

describe('OASGantt 暗色 token 与样式纪律', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('样式无硬编码色值；颜色全走 CSS 变量（语义 token + 组件级 --oas-gantt-* 出口）', async () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const styleEl = shadowOf(el).querySelector('style')!
    const css = styleEl.textContent ?? ''
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).toContain('--oas-gantt-bar-bg')
    expect(css).toContain('--oas-gantt-link-color')
    expect(css).toContain('--oas-gantt-today-color')
    expect(css).toContain('var(--oas-color-')
  })

  it('触摸手势：条身 touch-action pan-y（横向留给拖拽、纵向仍滚动）；手柄/进度点 none', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/\.bar \{[^}]*touch-action: pan-y/)
    expect(css).toMatch(/\.handle \{[^}]*touch-action: none/)
    expect(css).toMatch(/\.progress-handle \{[^}]*touch-action: none/)
  })
})

describe('OASGantt tasks 通道与方法', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('property get/set tasks：读为拷贝；写反射 attribute + 派发 oas-tasks-change + 重渲染', () => {
    const el = mount({})
    let changed = 0
    el.addEventListener('oas-tasks-change', () => changed++)
    el.tasks = [{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' }]
    expect(changed).toBe(1)
    expect(el.getAttribute('tasks')).toContain('2026-03-02')
    expect(barOf(el, 'a')).not.toBeNull()
    const read = el.tasks
    expect(read).not.toBe(el.tasks)
    expect(read[0]!.id).toBe('a')
  })

  it('updateTask(id, patch)：合并写回 + 派发 oas-tasks-change；找不到返回 false；非法 patch 被拒', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    let changed = 0
    el.addEventListener('oas-tasks-change', () => changed++)
    expect(el.updateTask('t1', { end: '2026-03-09' })).toBe(true)
    expect(el.tasks[0]!.end).toBe('2026-03-09')
    expect(changed).toBe(1)
    expect(el.updateTask('nope', { end: '2026-03-09' })).toBe(false)
    expect(el.updateTask('t1', { start: 'not-a-date' })).toBe(false)
    expect(el.tasks[0]!.start).toBe('2026-03-02')
  })

  it('updateTask 非法 end 拒绝（不把 task 悄悄降级为 milestone）；显式空串转 milestone', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 't1', name: 'x', start: '2026-03-02', end: '2026-03-06' }]) })
    expect(el.updateTask('t1', { end: 'bad' })).toBe(false)
    expect(el.tasks[0]!.end).toBe('2026-03-06')
    expect(barOf(el, 't1').classList.contains('milestone')).toBe(false)
    expect(el.updateTask('t1', { end: '' })).toBe(true)
    expect(barOf(el, 't1').classList.contains('milestone')).toBe(true)
  })

  it('scrollToDate / scrollToToday 可用（滚到目标日期）', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-03-10T10:00:00'))
      const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
      expect(() => el.scrollToDate('2026-03-15')).not.toThrow()
      expect(() => el.scrollToToday()).not.toThrow()
      expect(shadowOf(el).querySelector('.bars .bar')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('hour 档改期写回保留时间精度（yyyy-MM-dd HH:mm）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'h', name: 'H', start: '2026-03-02 08:00', end: '2026-03-02 12:00' }]),
      scale: 'hour',
    })
    dragSeq(barOf(el, 'h'), 44) // 1 小时
    expect(el.tasks[0]!.start).toBe('2026-03-02 09:00')
    expect(el.tasks[0]!.end).toBe('2026-03-02 13:00')
  })
})

describe('OASGantt 基线对比（baseline）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TASKS = JSON.stringify([
    {
      id: 'a',
      name: 'A',
      start: '2026-03-02',
      end: '2026-03-06',
      baseline: { start: '2026-03-02', end: '2026-03-04' },
    },
    {
      id: 'b',
      name: 'B',
      start: '2026-03-02',
      end: '2026-03-06',
      baseline: { start: '2026-03-02', end: '2026-03-06' },
    },
    { id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-06', baseline: { start: 'bad' } },
  ])

  it('baseline 属性关闭不渲染；开启后每任务渲染基线条并标差值（非法基线丢弃）', () => {
    const off = mount({ tasks: TASKS })
    expect(shadowOf(off).querySelectorAll('.baseline').length).toBe(0)

    const on = mount({ tasks: TASKS, 'show-baseline': '' })
    const baselines = [...shadowOf(on).querySelectorAll<HTMLElement>('.baseline')]
    // c 的 baseline.start 非法 → 丢弃；a、b 各一条
    expect(baselines.length).toBe(2)
    const a = shadowOf(on).querySelector<HTMLElement>('.baseline[data-id="a"]')!
    expect(a.title, '实际晚基线 2 天').toBe('比基线晚 2 天')
    const b = shadowOf(on).querySelector<HTMLElement>('.baseline[data-id="b"]')!
    expect(b.title, '与基线一致').toBe('与基线一致')
    expect(shadowOf(on).querySelector('.baseline[data-id="c"]'), '非法基线不渲染').toBeNull()
    expect(parseFloat(a.style.width)).toBeGreaterThan(0)
  })

  it('baseline 数据经 taskSnapshot 透传（task-click detail 含 deep copy）', () => {
    const el = mount({ tasks: TASKS, 'show-baseline': '' })
    let seen: GanttTask | undefined
    el.addEventListener('oas-task-click', (e) => {
      seen = (e as CustomEvent).detail.task as GanttTask
    })
    barOf(el, 'a').click()
    expect(seen?.baseline).toEqual({ start: '2026-03-02', end: '2026-03-04' })
    expect(seen?.baseline).not.toBe(el.tasks[0]!.baseline)
  })
})

describe('OASGantt 行拖拽改父子 / 重排（reparent）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const ROWS = JSON.stringify([
    {
      id: 'p1',
      name: 'P1',
      start: '2026-03-02',
      end: '2026-03-13',
      type: 'summary',
      children: [{ id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-06' }],
    },
    { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06' },
    { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
  ])

  function dragRow(el: OASGantt, dragId: string, targetRowIndex: number, clientX: number, rowH = 36): void {
    const row = shadowOf(el).querySelector<HTMLElement>(`.row-name[data-key="${dragId}"]`)!
    const side = shadowOf(el).querySelector<HTMLElement>('.side-body')!
    side.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 1000,
        width: 300,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    Object.defineProperty(side, 'scrollTop', { value: 0, configurable: true })
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: clientX })
    Object.defineProperty(move, 'clientY', { value: targetRowIndex * rowH + rowH / 4 })
    document.dispatchEvent(move)
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
  }

  it('拖到目标前（before）：改同级顺序，派发 oas-reparent { id, parent:null, index }', () => {
    const el = mount({ tasks: ROWS })
    const seen: Array<{ id: string; parent: string | null; index: number }> = []
    el.addEventListener('oas-reparent', (e) => seen.push((e as CustomEvent).detail))
    // 行序：p1(0) c1(1) x(2) y(3)；把 y 拖到 x 之上
    dragRow(el, 'y', 2, 0)
    expect(seen).toEqual([{ id: 'y', parent: null, index: 1 }])
    expect(el.tasks.map((t) => t.id)).toEqual(['p1', 'c1', 'y', 'x'])
  })

  it('拖到目标上（inside）：成为目标子级，派发 parent=target、index=0', () => {
    const el = mount({ tasks: ROWS })
    const seen: Array<{ id: string; parent: string | null; index: number }> = []
    el.addEventListener('oas-reparent', (e) => seen.push((e as CustomEvent).detail))
    // 指针深入右侧 → 落到 x 之下
    dragRow(el, 'y', 2, 200)
    expect(seen).toEqual([{ id: 'y', parent: 'x', index: 0 }])
    expect(el.tasks.find((t) => t.id === 'y')!.parent).toBe('x')
  })

  it('防环：不允许把父拖进自己的后代，零事件', () => {
    const el = mount({ tasks: ROWS })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    dragRow(el, 'p1', 1, 200) // 目标是 c1（p1 的子级）
    expect(fired).toBe(0)
    expect(el.tasks.find((t) => t.id === 'p1')!.parent).toBeUndefined()
  })

  it('readonly：不启动重排，零事件', () => {
    const el = mount({ tasks: ROWS, readonly: '' })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    dragRow(el, 'y', 2, 0)
    expect(fired).toBe(0)
  })
})

describe('OASGantt 依赖连线交互编辑', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TASKS = JSON.stringify([
    { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
    { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13' },
  ])

  function stubBar(el: OASGantt, id: string, left: number, width = 50): HTMLElement {
    const bar = shadowOf(el).querySelector<HTMLElement>(`.bars .bar[data-id="${id}"]`)!
    bar.getBoundingClientRect = () =>
      ({
        left,
        right: left + width,
        top: 0,
        bottom: 22,
        width,
        height: 22,
        x: left,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    return bar
  }

  function linkDrag(el: OASGantt, src: string, endpoint: 'start' | 'end', tgtX: number, tgtY = 11): void {
    const from = stubBar(el, src, 100)
    stubBar(el, src === 'a' ? 'b' : 'a', 300)
    const dot = from.querySelector<HTMLElement>(`.link-${endpoint}`)!
    dot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: tgtX })
    Object.defineProperty(move, 'clientY', { value: tgtY })
    document.dispatchEvent(move)
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'clientX', { value: tgtX })
    Object.defineProperty(up, 'clientY', { value: tgtY })
    document.dispatchEvent(up)
  }

  it('从条 end 拖到目标条左半 → 建 fs 依赖，派发 oas-dependencies-change', () => {
    const el = mount({ tasks: TASKS })
    const seen: Array<{ taskId: string; dependencies: Array<{ id: string; type?: string }> }> = []
    el.addEventListener('oas-dependencies-change', (e) => seen.push((e as CustomEvent).detail))
    linkDrag(el, 'a', 'end', 310) // 目标 b [300,350]，左半 → start
    expect(seen).toEqual([{ taskId: 'b', dependencies: [{ id: 'a', type: 'fs' }] }])
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'fs' }])
  })

  it('同源同型去重、同源多型可并存', () => {
    const el = mount({ tasks: TASKS })
    let fired = 0
    el.addEventListener('oas-dependencies-change', () => fired++)
    linkDrag(el, 'a', 'start', 310) // ss
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'ss' }])
    expect(fired).toBe(1)
    linkDrag(el, 'a', 'start', 310) // 同源同型 → 去重，零事件
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'ss' }])
    expect(fired, '同源同型去重不派发').toBe(1)
    linkDrag(el, 'a', 'end', 310) // fs → 与 ss 并存
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([
      { id: 'a', type: 'ss' },
      { id: 'a', type: 'fs' },
    ])
    expect(fired).toBe(2)
  })

  it('点连线选中 → Delete 删除依赖并派发 oas-dependencies-change', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
      ]),
    })
    const hit = shadowOf(el).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    expect(hit).not.toBeNull()
    let fired = 0
    el.addEventListener('oas-dependencies-change', () => fired++)
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(hit.classList.contains('selected')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(fired).toBe(1)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toBeUndefined()
  })

  it('readonly：不渲染连线点与命中路径', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
      ]),
      readonly: '',
    })
    expect(shadowOf(el).querySelectorAll('.link-dot').length).toBe(0)
    expect(shadowOf(el).querySelectorAll('.link-hit').length).toBe(0)
    expect(shadowOf(el).querySelectorAll('.link').length).toBe(1) // 可见连线仍在
  })
})

describe('OASGantt 评审修复回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function dragRow(el: OASGantt, dragId: string, targetIdx: number, clientX: number, rowH = 36): void {
    const row = shadowOf(el).querySelector<HTMLElement>(`.row-name[data-key="${dragId}"]`)!
    const side = shadowOf(el).querySelector<HTMLElement>('.side-body')!
    side.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 1000,
        width: 300,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    Object.defineProperty(side, 'scrollTop', { value: 0, configurable: true })
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: clientX })
    Object.defineProperty(move, 'clientY', { value: targetIdx * rowH + rowH / 4 })
    document.dispatchEvent(move)
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
  }

  it('parent 成环数据下行拖拽不死循环（访问集守卫）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'A', name: 'A', start: '2026-03-02', end: '2026-03-06', parent: 'B' },
        { id: 'B', name: 'B', start: '2026-03-02', end: '2026-03-06', parent: 'A' },
        { id: 'C', name: 'C', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    dragRow(el, 'C', 0, 0) // 拖到 A 之上（A 处于环内）——旧实现会死循环
    expect(fired).toBe(1) // 完成一次重排即证明未挂起；同时锁「确实生效」而非静默吞
  })

  it('零变化重排（原地/顺序未变）不派发事件', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06' },
        { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    dragRow(el, 'x', 1, 0) // x 拖到 y 之上（本就 x 在 y 前）→ 顺序不变
    expect(fired).toBe(0)
  })

  it('RTL：目标条物理左半 = 语义 end（建 ff 而非 fs）', () => {
    const el = mount({
      dir: 'rtl',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    const seen: string[] = []
    el.addEventListener('oas-dependencies-change', (e) => seen.push((e as CustomEvent).detail.dependencies[0].type))
    const bars = shadowOf(el).querySelector('.bars')!
    const rect = (id: string, left: number) => {
      const b = bars.querySelector(`.bar[data-id="${id}"]`) as HTMLElement
      b.getBoundingClientRect = () =>
        ({
          left,
          right: left + 50,
          top: 0,
          bottom: 22,
          width: 50,
          height: 22,
          x: left,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
      return b
    }
    const from = rect('a', 100)
    rect('b', 300)
    const dot = from.querySelector<HTMLElement>('.link-end')!
    dot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 310 }) // 物理左半
    Object.defineProperty(move, 'clientY', { value: 11 })
    document.dispatchEvent(move)
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'clientX', { value: 310 })
    Object.defineProperty(up, 'clientY', { value: 11 })
    document.dispatchEvent(up)
    expect(seen).toEqual(['ff'])
  })

  it('同源多类型依赖：选中删除只删该类型（按 type 作用域）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        {
          id: 'b',
          name: 'B',
          start: '2026-03-09',
          end: '2026-03-13',
          dependencies: [
            { id: 'a', type: 'fs' },
            { id: 'a', type: 'ss' },
          ],
        },
      ]),
    })
    const hit = shadowOf(el).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"][data-type="fs"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'ss' }])
  })

  it('Delete 仅在组件持有焦点时生效：焦点移至外部输入则不删', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a' }] },
      ]),
    })
    const hit = shadowOf(el).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    let fired = 0
    el.addEventListener('oas-dependencies-change', () => fired++)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(fired, '焦点在宿主输入时不劫持 Delete').toBe(0)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a' }])
  })

  it('行拖拽 Esc 取消：零事件', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06' },
        { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="y"]')!
    const side = shadowOf(el).querySelector<HTMLElement>('.side-body')!
    side.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 1000,
        width: 300,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    Object.defineProperty(side, 'scrollTop', { value: 0, configurable: true })
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 0 })
    Object.defineProperty(move, 'clientY', { value: 9 })
    document.dispatchEvent(move)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(fired).toBe(0)
  })

  function linkDrag(el: OASGantt, src: string, endpoint: 'start' | 'end', tgtX: number, tgtY = 11): void {
    const bars = shadowOf(el).querySelector('.bars')!
    const rect = (id: string, left: number) => {
      const b = bars.querySelector(`.bar[data-id="${id}"]`) as HTMLElement
      b.getBoundingClientRect = () =>
        ({
          left,
          right: left + 50,
          top: 0,
          bottom: 22,
          width: 50,
          height: 22,
          x: left,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
      return b
    }
    const from = rect(src, 100)
    rect(src === 'a' ? 'b' : 'a', 300)
    const dot = from.querySelector<HTMLElement>(`.link-${endpoint}`)!
    dot.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: tgtX })
    Object.defineProperty(move, 'clientY', { value: tgtY })
    document.dispatchEvent(move)
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'clientX', { value: tgtX })
    Object.defineProperty(up, 'clientY', { value: tgtY })
    document.dispatchEvent(up)
  }

  it('disabled 任务可作连线源（只写后继、不改其自身）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06', disabled: true },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    expect(shadowOf(el).querySelector('.bar[data-id="a"] .link-dot'), 'disabled 条仍渲染连线点').not.toBeNull()
    linkDrag(el, 'a', 'end', 310)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'fs' }])
    expect(el.tasks.find((t) => t.id === 'a')!.dependencies, 'disabled 自身未改').toBeUndefined()
  })

  it('disabled 任务不可作连线后继（拖入零依赖零事件）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', disabled: true },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-dependencies-change', () => fired++)
    linkDrag(el, 'a', 'end', 310)
    expect(fired).toBe(0)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toBeUndefined()
  })

  it('sanitizeDeps 同源同型去重（只画一条线）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        {
          id: 'b',
          name: 'B',
          start: '2026-03-09',
          end: '2026-03-13',
          dependencies: [{ id: 'a' }, { id: 'a' }, { id: 'a', type: 'fs' }],
        },
      ]),
    })
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a' }])
    expect(shadowOf(el).querySelectorAll('.link[data-from="b"][data-to="a"]').length).toBe(1)
  })

  it('disabled 目标禁止 drop-inside（不改其聚合）；前/后同级仍允许', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-13',
          type: 'summary',
          disabled: true,
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-06' }],
        },
        { id: 'x', name: 'X', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    dragRow(el, 'x', 0, 200) // inside onto disabled p → 拒绝
    expect(fired).toBe(0)
    expect(el.tasks.find((t) => t.id === 'x')!.parent).toBeUndefined()
    // 前/后同级仍允许（不改 disabled 自身数据）
    dragRow(el, 'x', 0, 0) // before p
    expect(fired).toBe(1)
    expect(el.tasks.map((t) => t.id)).toEqual(['x', 'p', 'c'])
  })

  it('disabled 后继的入边不可选删（与建链对称）；可见线仍在', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', disabled: true, dependencies: [{ id: 'a' }] },
      ]),
    })
    expect(shadowOf(el).querySelector('.link-hit[data-from="b"][data-to="a"]'), '禁用后继无命中路径').toBeNull()
    expect(shadowOf(el).querySelector('.link[data-from="b"][data-to="a"]'), '可见线仍画').not.toBeNull()
  })

  it('sanitizeDeps 保留同源多型（fs + ss 各一，两条线）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        {
          id: 'b',
          name: 'B',
          start: '2026-03-09',
          end: '2026-03-13',
          dependencies: [
            { id: 'a', type: 'fs' },
            { id: 'a', type: 'ss' },
          ],
        },
      ]),
    })
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([
      { id: 'a', type: 'fs' },
      { id: 'a', type: 'ss' },
    ])
    expect(shadowOf(el).querySelectorAll('.link[data-from="b"][data-to="a"]').length).toBe(2)
  })

  it('disabled 行不可作重排源（零事件）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06', disabled: true },
        { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    dragRow(el, 'x', 1, 0)
    expect(fired).toBe(0)
  })

  function startReparent(el: OASGantt, id: string): void {
    const row = shadowOf(el).querySelector<HTMLElement>(`.row-name[data-key="${id}"]`)!
    const side = shadowOf(el).querySelector<HTMLElement>('.side-body')!
    side.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 1000,
        width: 300,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    Object.defineProperty(side, 'scrollTop', { value: 0, configurable: true, writable: true })
    row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 0 })
    Object.defineProperty(move, 'clientY', { value: 9 })
    document.dispatchEvent(move)
  }

  it('拖拽中滚动取消重排（收口零事件）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06' },
        { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    startReparent(el, 'y')
    shadowOf(el).querySelector('.tbody')!.dispatchEvent(new Event('scroll'))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(fired).toBe(0)
  })

  it('scrollToTask 取消进行中的重排（收口零事件）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-06' },
        { id: 'y', name: 'Y', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    startReparent(el, 'y')
    el.scrollToTask('x')
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(fired).toBe(0)
  })

  it('disabled 条/行带 aria-disabled', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06', disabled: true }]),
    })
    expect(shadowOf(el).querySelector('.bar[data-id="d"]')!.getAttribute('aria-disabled')).toBe('true')
    expect(shadowOf(el).querySelector('.row-name[data-key="d"]')!.getAttribute('aria-disabled')).toBe('true')
  })

  it('拖拽到视口下缘自动滚动（rAF tick 按边缘距离滚动 tbody）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    const tb = shadowOf(el).querySelector('.tbody') as HTMLElement
    tb.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    Object.defineProperty(tb, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(tb, 'clientHeight', { value: 200, configurable: true })
    Object.defineProperty(tb, 'scrollTop', { value: 0, configurable: true, writable: true })
    const rafCbs: FrameRequestCallback[] = []
    const orig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCbs.push(cb)
      return rafCbs.length
    }) as typeof requestAnimationFrame
    try {
      const bar = shadowOf(el).querySelector('.bar[data-id="a"]') as HTMLElement
      const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
      Object.defineProperty(down, 'clientX', { value: 100 })
      Object.defineProperty(down, 'clientY', { value: 100 })
      bar.dispatchEvent(down)
      const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
      Object.defineProperty(move, 'clientX', { value: 100 })
      Object.defineProperty(move, 'clientY', { value: 195 }) // 贴近下缘（band 28 → 阈值 172）
      document.dispatchEvent(move)
      expect(rafCbs.length).toBe(1)
      rafCbs[0]!(0)
      expect(tb.scrollTop, '自动向底滚动').toBeGreaterThan(0)
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    } finally {
      globalThis.requestAnimationFrame = orig
    }
  })

  it('RTL 横向自动滚动：贴右缘朝 0 增（不翻号、不瞬移）', () => {
    const el = mount({
      dir: 'rtl',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    const tb = shadowOf(el).querySelector('.tbody') as HTMLElement
    tb.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    Object.defineProperty(tb, 'scrollHeight', { value: 200, configurable: true })
    Object.defineProperty(tb, 'clientHeight', { value: 200, configurable: true })
    Object.defineProperty(tb, 'scrollWidth', { value: 5471, configurable: true })
    Object.defineProperty(tb, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(tb, 'scrollTop', { value: 0, configurable: true, writable: true })
    Object.defineProperty(tb, 'scrollLeft', { value: -2736, configurable: true, writable: true })
    const rafCbs: FrameRequestCallback[] = []
    const orig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCbs.push(cb)
      return rafCbs.length
    }) as typeof requestAnimationFrame
    try {
      const bar = shadowOf(el).querySelector('.bar[data-id="a"]') as HTMLElement
      const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
      Object.defineProperty(down, 'clientX', { value: 100 })
      Object.defineProperty(down, 'clientY', { value: 100 })
      bar.dispatchEvent(down)
      const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
      Object.defineProperty(move, 'clientX', { value: 398 }) // 右缘
      Object.defineProperty(move, 'clientY', { value: 100 })
      document.dispatchEvent(move)
      rafCbs[0]!(0)
      expect(tb.scrollLeft, 'RTL 贴右缘应朝 0 增').toBe(-2713)
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    } finally {
      globalThis.requestAnimationFrame = orig
    }
  })

  it('横向到边界即停（不再排新帧）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    const tb = shadowOf(el).querySelector('.tbody') as HTMLElement
    tb.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    Object.defineProperty(tb, 'scrollHeight', { value: 200, configurable: true })
    Object.defineProperty(tb, 'clientHeight', { value: 200, configurable: true })
    Object.defineProperty(tb, 'scrollWidth', { value: 800, configurable: true })
    Object.defineProperty(tb, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(tb, 'scrollTop', { value: 0, configurable: true, writable: true })
    Object.defineProperty(tb, 'scrollLeft', { value: 400, configurable: true, writable: true }) // LTR limit=400 已到底
    const rafCbs: FrameRequestCallback[] = []
    const orig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCbs.push(cb)
      return rafCbs.length
    }) as typeof requestAnimationFrame
    try {
      const bar = shadowOf(el).querySelector('.bar[data-id="a"]') as HTMLElement
      const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
      Object.defineProperty(down, 'clientX', { value: 100 })
      Object.defineProperty(down, 'clientY', { value: 200 })
      bar.dispatchEvent(down)
      const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
      Object.defineProperty(move, 'clientX', { value: 398 })
      Object.defineProperty(move, 'clientY', { value: 100 })
      document.dispatchEvent(move)
      const before = rafCbs.length
      rafCbs[0]!(0)
      expect(tb.scrollLeft).toBe(400)
      expect(rafCbs.length, '到边界不再排新帧').toBe(before)
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    } finally {
      globalThis.requestAnimationFrame = orig
    }
  })

  function stubTb(
    el: OASGantt,
    o: { sTop?: number; sLeft?: number; maxTop?: number; maxLeft?: number } = {},
  ): HTMLElement {
    const tb = shadowOf(el).querySelector('.tbody') as HTMLElement
    tb.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    Object.defineProperty(tb, 'clientHeight', { value: 200, configurable: true })
    Object.defineProperty(tb, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(tb, 'scrollHeight', { value: 200 + (o.maxTop ?? 0), configurable: true })
    Object.defineProperty(tb, 'scrollWidth', { value: 400 + (o.maxLeft ?? 0), configurable: true })
    Object.defineProperty(tb, 'scrollTop', { value: o.sTop ?? 0, configurable: true, writable: true })
    Object.defineProperty(tb, 'scrollLeft', { value: o.sLeft ?? 0, configurable: true, writable: true })
    return tb
  }

  function withRaf(fn: (cbs: FrameRequestCallback[]) => void): void {
    const cbs: FrameRequestCallback[] = []
    const orig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cbs.push(cb)
      return cbs.length
    }) as typeof requestAnimationFrame
    try {
      fn(cbs)
    } finally {
      globalThis.requestAnimationFrame = orig
    }
  }

  function barPointer(el: OASGantt, id: string, downX: number, moveX: number, moveY: number): void {
    const bar = shadowOf(el).querySelector(`.bar[data-id="${id}"]`) as HTMLElement
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: downX })
    Object.defineProperty(down, 'clientY', { value: moveY })
    bar.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: moveX })
    Object.defineProperty(move, 'clientY', { value: moveY })
    document.dispatchEvent(move)
  }

  const AB = JSON.stringify([
    { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
    { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13' },
  ])

  it('自动滚动触发的 scroll 不取消条拖拽（重建后收口仍提交）', () => {
    const el = mount({ tasks: AB })
    stubTb(el, { maxTop: 1800 })
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    withRaf((cbs) => {
      barPointer(el, 'a', 100, 136, 195) // 右移一格（colW 36）+ 贴下缘
      expect(cbs.length).toBe(1)
      cbs[0]!(0) // tick：置 autoScrolling、滚 scrollTop
      shadowOf(el).querySelector('.tbody')!.dispatchEvent(new Event('scroll')) // 浏览器随后派发
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    })
    expect(changed, '自动滚动不取消，收口提交').toBe(1)
  })

  it('用户滚动取消条拖拽（零事件）', () => {
    const el = mount({ tasks: AB })
    stubTb(el, { maxTop: 1800 })
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    barPointer(el, 'a', 100, 136, 100)
    shadowOf(el).querySelector('.tbody')!.dispatchEvent(new Event('scroll')) // 无 tick → autoScrolling=false
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(changed).toBe(0)
  })

  it('条拖拽 Esc 兜底取消（document 级）', () => {
    const el = mount({ tasks: AB })
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    barPointer(el, 'a', 100, 136, 100)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(changed).toBe(0)
  })

  it('行重排拖拽不触发横向自动滚动（时间轴不动）', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-13',
          type: 'summary',
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-06' }],
        },
        { id: 'x', name: 'X', start: '2026-03-09', end: '2026-03-13' },
      ]),
    })
    const tb = stubTb(el, { sLeft: 500, maxLeft: 1000 })
    const side = shadowOf(el).querySelector<HTMLElement>('.side-body')!
    side.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 300,
        bottom: 1000,
        width: 300,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    Object.defineProperty(side, 'scrollTop', { value: 0, configurable: true, writable: true })
    withRaf((cbs) => {
      const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
      row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 }))
      const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
      Object.defineProperty(move, 'clientX', { value: 10 }) // 物理左缘带内
      Object.defineProperty(move, 'clientY', { value: 100 })
      document.dispatchEvent(move)
      expect(cbs.length).toBe(1)
      cbs[0]!(0)
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    })
    expect(tb.scrollLeft, '重排不改时间轴横向位置').toBe(500)
  })

  it('里程碑只渲染完成端单点连线点', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'm', name: 'M', start: '2026-03-05' }]) })
    const bar = shadowOf(el).querySelector('.bar[data-id="m"]')!
    expect(bar.querySelectorAll('.link-dot').length).toBe(1)
    expect(bar.querySelector('.link-dot.link-end')).not.toBeNull()
    expect(bar.querySelector('.link-dot.link-start')).toBeNull()
  })

  it('横向自动滚动推进被拖条（位移叠加滚动增量）', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]) })
    const tb = stubTb(el, { maxLeft: 1000 })
    let start = ''
    el.addEventListener('oas-task-change', (e) => {
      start = (e as CustomEvent).detail.start
    })
    const bar = shadowOf(el).querySelector('.bar[data-id="a"]') as HTMLElement
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: 100 })
    Object.defineProperty(down, 'clientY', { value: 100 })
    bar.dispatchEvent(down)
    tb.scrollLeft = 36 // 模拟自动滚过一格（指针未动）
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 100 })
    Object.defineProperty(move, 'clientY', { value: 100 })
    document.dispatchEvent(move)
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(start, '滚动增量应推进被拖条日期').toBe('2026-03-03')
  })
})
