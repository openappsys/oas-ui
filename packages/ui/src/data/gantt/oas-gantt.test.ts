import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGantt } from './index.js'
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
    const paths = [...shadowOf(el).querySelectorAll<SVGPathElement>('svg.links path[data-from]')]
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
    const paths = shadowOf(el).querySelectorAll<SVGPathElement>('svg.links path[data-from]')
    expect(paths.length).toBe(1)
    expect(paths[0]!.dataset.type).toBe('fs')
  })

  it('svg 覆盖层 aria-hidden（装饰层）', () => {
    const el = mountDeps(['fs'])
    expect(shadowOf(el).querySelector('svg.links')?.getAttribute('aria-hidden')).toBe('true')
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
    expect(Number.parseFloat(bar.style.left)).toBeLessThan(Number.parseFloat('9999'))
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

  it('label-position：inside 条内标签 / right 条外右侧（缺省 right）', () => {
    const tasks = JSON.stringify([{ id: 'a', name: '标签', start: '2026-03-02', end: '2026-03-06' }])
    const el = mount({ tasks })
    const bar = barOf(el, 'a')
    expect(bar.classList.contains('label-right')).toBe(true)
    const el2 = mount({ tasks, 'label-position': 'inside' })
    expect(barOf(el2, 'a').classList.contains('label-inside')).toBe(true)
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
