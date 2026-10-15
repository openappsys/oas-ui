import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGantt } from './index.js'
import { pickVisibleLabels } from './oas-gantt.js'
import type { GanttTask, GanttReparentDetail } from './index.js'
import type { GanttTaskAddDetail } from './oas-gantt.js'

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

  it('milestone 拖动：显式 type="milestone" 携带的 end 归一为 start（契约 start == end）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'm', name: '节点', start: '2026-03-05', end: '2026-03-10', type: 'milestone' }]),
    })
    dragSeq(barOf(el, 'm'), 36)
    expect(el.tasks[0]!.start).toBe('2026-03-06')
    // 矛盾 end 归一为 start，不留 start>end 隐患（渲染只出单点，end 语义本就忽略）
    expect(el.tasks[0]!.end).toBe('2026-03-06')
  })

  it('显式 type="milestone" 且无 end：拖动只写 start，不凭空添 end、无矛盾告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ tasks: JSON.stringify([{ id: 'm', name: '节点', start: '2026-03-05', type: 'milestone' }]) })
      dragSeq(barOf(el, 'm'), 36)
      expect(el.tasks[0]!.start).toBe('2026-03-06')
      expect(el.tasks[0]!.end).toBeUndefined()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('milestone')).length).toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('milestone 改期事件 oldEnd 取旧 start（勿用新 start）', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'm', name: '节点', start: '2026-03-05', type: 'milestone' }]) })
    const seen: Array<{ oldStart: string; oldEnd: string; start: string; end: string }> = []
    el.addEventListener('oas-task-change', (e) => seen.push((e as CustomEvent).detail))
    dragSeq(barOf(el, 'm'), 36)
    expect(seen).toHaveLength(1)
    expect(seen[0]!.oldStart).toBe('2026-03-05')
    expect(seen[0]!.start).toBe('2026-03-06')
    expect(seen[0]!.oldEnd, 'oldEnd 应是旧 start 而非新 start').toBe('2026-03-05')
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

  it('显式带 end 的里程碑前移跨过残留 end 不产生 start>end（end 归一为 start）', () => {
    const el = mount({
      scale: 'month',
      tasks: JSON.stringify([{ id: 'm', name: 'M', type: 'milestone', start: '2026-03-02', end: '2026-03-05' }]),
    })
    const bar = barOf(el, 'm')
    bar.focus()
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }))
    const t = el.tasks[0]!
    expect(Date.parse(t.start), '不得颠倒 start>end').toBeLessThanOrEqual(Date.parse(t.end!))
    expect(t.end, 'end 归一为 start').toBe(t.start)
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

/** 本地时区今天（与组件 toISODate 同口径） */
function todayIso(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 显式伪造元素属性（happy-dom 无布局：clientWidth/scrollLeft 默认不可写） */
function stubProp(el: HTMLElement, key: string, value: unknown): void {
  Object.defineProperty(el, key, { value, configurable: true, writable: true })
}

describe('OASGantt 创作：addTask', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('缺省新增：name 走 gantt.newTask、start=今天、end=start（1 天含端）、追加根级末尾、派发 oas-task-add', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' }]) })
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    const id = el.addTask()
    expect(id).not.toBe('')
    const tasks = el.tasks
    expect(tasks).toHaveLength(2)
    expect(tasks[tasks.length - 1]!.id).toBe(id)
    const t = tasks.find((x) => x.id === id)!
    expect(t.name, '默认 zh-CN 文案').toBe('新任务')
    expect(t.start).toBe(todayIso())
    expect(t.end).toBe(todayIso())
    expect(added).toHaveLength(1)
    expect(added[0]!.id).toBe(id)
    expect(added[0]!.task.name).toBe('新任务')
  })

  it('指定 id 生效；id 冲突时自动避让', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02' }]) })
    const explicit = el.addTask({ id: 'custom', name: 'E', start: '2026-03-04' })
    expect(explicit).toBe('custom')
    const clone = el.addTask({ id: 'a', name: 'Dup', start: '2026-03-04' })
    expect(clone).not.toBe('a')
    expect(el.tasks.filter((t) => t.id === 'a')).toHaveLength(1)
  })

  it('parent 指定挂到该父级子级；parent 不存在按根处理', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-06',
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-03' }],
        },
      ]),
    })
    const child = el.addTask({ name: 'N', start: '2026-03-04', end: '2026-03-05' }, { parent: 'p' })
    expect(el.tasks.find((t) => t.id === child)!.parent).toBe('p')
    const orphan = el.addTask({ name: 'O', start: '2026-03-04' }, { parent: 'ghost' })
    expect(el.tasks.find((t) => t.id === orphan)!.parent).toBeUndefined()
  })

  it('opts.before / opts.after 定位插入点', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'x', name: 'X', start: '2026-03-09', end: '2026-03-10' },
      ]),
    })
    const before = el.addTask({ name: 'B', start: '2026-03-04' }, { before: 'x' })
    expect(el.tasks.map((t) => t.id).indexOf(before)).toBe(el.tasks.map((t) => t.id).indexOf('x') - 1)
    const after = el.addTask({ name: 'AF', start: '2026-03-04' }, { after: 'x' })
    expect(el.tasks.map((t) => t.id).indexOf(after)).toBe(el.tasks.map((t) => t.id).indexOf('x') + 1)
  })

  it('type=milestone 不补 end（单点，无 end）', () => {
    const el = mount({ tasks: '[]' })
    const id = el.addTask({ type: 'milestone' })
    expect(el.tasks.find((t) => t.id === id)!.end).toBeUndefined()
  })

  it('非法输入（start 非法）返回空串且零改动/零事件', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02' }]) })
    let events = 0
    el.addEventListener('oas-task-add', () => events++)
    el.addEventListener('oas-tasks-change', () => events++)
    const before = JSON.stringify(el.tasks)
    expect(el.addTask({ name: 'N', start: 'nope' })).toBe('')
    expect(JSON.stringify(el.tasks)).toBe(before)
    expect(events).toBe(0)
  })

  it('受控 expanded 未展开 parent 时，新增子级自动展开 parent 并回写属性', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-06',
          children: [{ id: 'c', name: 'C', start: '2026-03-02' }],
        },
      ]),
      expanded: '[]',
    })
    const id = el.addTask({ start: '2026-03-04' }, { parent: 'p' })
    expect(id).not.toBe('')
    expect(JSON.parse(el.getAttribute('expanded')!)).toContain('p')
    expect(nameRows(el).some((n) => n.dataset.key === id)).toBe(true)
  })
})

describe('OASGantt 创作：moveTask', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TREE = JSON.stringify([
    {
      id: 'p',
      name: 'P',
      start: '2026-03-02',
      end: '2026-03-06',
      children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-03' }],
    },
    { id: 'x', name: 'X', start: '2026-03-09', end: '2026-03-10' },
  ])

  it('改 parent 并派发 oas-reparent（含移动后同级序号）', () => {
    const el = mount({ tasks: TREE })
    const rep: GanttReparentDetail[] = []
    el.addEventListener('oas-reparent', ((e: CustomEvent<GanttReparentDetail>) => {
      rep.push(e.detail)
    }) as EventListener)
    expect(el.moveTask('x', { parent: 'p' })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'x')!.parent).toBe('p')
    expect(rep).toHaveLength(1)
    expect(rep[0]).toEqual({ id: 'x', parent: 'p', index: 1 })
  })

  it('按 index 在同一 parent 下重排（顺序改变）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-02', end: '2026-03-06', type: 'summary' },
        { id: 'a', name: 'A', start: '2026-03-02', parent: 'p' },
        { id: 'b', name: 'B', start: '2026-03-02', parent: 'p' },
        { id: 'c', name: 'C', start: '2026-03-02', parent: 'p' },
      ]),
    })
    const rep: GanttReparentDetail[] = []
    el.addEventListener('oas-reparent', ((e: CustomEvent<GanttReparentDetail>) => {
      rep.push(e.detail)
    }) as EventListener)
    expect(el.moveTask('c', { parent: 'p', index: 0 })).toBe(true)
    expect(el.tasks.map((t) => t.id)).toEqual(['p', 'c', 'a', 'b'])
    expect(rep[0]).toEqual({ id: 'c', parent: 'p', index: 0 })
  })

  it('index 超出范围钳制到同级末尾', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-02', end: '2026-03-06', type: 'summary' },
        { id: 'a', name: 'A', start: '2026-03-02', parent: 'p' },
        { id: 'b', name: 'B', start: '2026-03-02', parent: 'p' },
      ]),
    })
    expect(el.moveTask('a', { parent: 'p', index: 99 })).toBe(true)
    expect(el.tasks.map((t) => t.id)).toEqual(['p', 'b', 'a'])
  })

  it('防环/防悬空：自身、其后代、不存在 → false 且零改动', () => {
    const el = mount({ tasks: TREE })
    const before = JSON.stringify(el.tasks)
    expect(el.moveTask('p', { parent: 'p' })).toBe(false)
    expect(el.moveTask('p', { parent: 'c' })).toBe(false)
    expect(el.moveTask('p', { parent: 'ghost' })).toBe(false)
    expect(el.moveTask('ghost', { parent: null })).toBe(false)
    expect(JSON.stringify(el.tasks)).toBe(before)
  })

  it('零变化（原地放下）返回 false 且不派发', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02' }]) })
    let n = 0
    el.addEventListener('oas-reparent', () => n++)
    expect(el.moveTask('a', { parent: null })).toBe(false)
    expect(n).toBe(0)
  })
})

describe('OASGantt 创作：duplicateTask', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('深拷贝子树：各自新 id、parent 映射到新 id、紧跟原子树之后', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-06',
          children: [
            { id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-03' },
            { id: 'c2', name: 'C2', start: '2026-03-04', end: '2026-03-05' },
          ],
        },
        { id: 'x', name: 'X', start: '2026-03-09', end: '2026-03-10' },
      ]),
    })
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    const newId = el.duplicateTask('p')!
    expect(newId).not.toBe('')
    expect(newId).not.toBe('p')
    const tasks = el.tasks
    const clones = tasks.filter((t) => t.id === newId || t.parent === newId)
    expect(clones, '根 + 两个子全新 id').toHaveLength(3)
    expect(clones.some((t) => ['p', 'c1', 'c2'].includes(t.id ?? ''))).toBe(false)
    // DFS 序紧跟原子树（原数组 [p,c1,c2,x] → 克隆插在 index 3）
    expect(tasks.map((t) => t.id).slice(3, 6)).toEqual([newId, clones[1]!.id, clones[2]!.id])
    expect(clones[1]!.parent).toBe(newId)
    expect(clones[2]!.parent).toBe(newId)
    expect(added).toHaveLength(1)
    expect(added[0]!.id).toBe(newId)
  })

  it('opts.id / opts.name / opts.parent 覆盖根克隆', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-06',
          children: [{ id: 'c', name: 'C', start: '2026-03-02' }],
        },
        { id: 'q', name: 'Q', start: '2026-03-09', end: '2026-03-10', type: 'summary' },
        { id: 'z', name: 'Z', start: '2026-03-09', parent: 'q' },
      ]),
    })
    const newId = el.duplicateTask('c', { id: 'copy', name: '副本', parent: 'q' })!
    expect(newId).toBe('copy')
    const t = el.tasks.find((x) => x.id === 'copy')!
    expect(t.name).toBe('副本')
    expect(t.parent).toBe('q')
  })

  it('id 不存在 → null', () => {
    const el = mount({ tasks: '[]' })
    expect(el.duplicateTask('nope')).toBeNull()
  })

  it('opts.parent 指向不存在的 id → 按根处理（不留悬空父指针）', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02' }]) })
    const newId = el.duplicateTask('a', { parent: 'ghost' })!
    expect(el.tasks.find((t) => t.id === newId)!.parent).toBeUndefined()
  })
})

describe('OASGantt 创作：依赖命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const AB = JSON.stringify([
    { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
    { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05' },
  ])

  it('addDependency：追加（type 缺省 fs）、同源同型去重、自身/不存在 false、事件', () => {
    const el = mount({ tasks: AB })
    const evs: Array<{ taskId: string; dependencies: Array<{ id: string; type?: string }> }> = []
    el.addEventListener('oas-dependencies-change', ((e: CustomEvent) => {
      evs.push(e.detail)
    }) as EventListener)
    expect(el.addDependency('b', { id: 'a' })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'fs' }])
    expect(el.addDependency('b', { id: 'a', type: 'fs' }), '同源同型重复').toBe(false)
    expect(el.addDependency('b', { id: 'a', type: 'ss' }), '同源异型可并存').toBe(true)
    expect(el.addDependency('b', { id: 'b' }), '自身').toBe(false)
    expect(el.addDependency('b', { id: 'ghost' }), '不存在').toBe(false)
    expect(el.addDependency('ghost', { id: 'a' }), '宿主任务不存在').toBe(false)
    expect(evs, '仅两次真实变更').toHaveLength(2)
    expect(evs[1]!.taskId).toBe('b')
    expect(evs[1]!.dependencies).toEqual([
      { id: 'a', type: 'fs' },
      { id: 'a', type: 'ss' },
    ])
  })

  it('removeDependency：给 type 只删该型；未给 type 删该 id 全部；找不到 false', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        {
          id: 'b',
          name: 'B',
          start: '2026-03-04',
          end: '2026-03-05',
          dependencies: [
            { id: 'a', type: 'fs' },
            { id: 'a', type: 'ss' },
          ],
        },
      ]),
    })
    const evs: unknown[] = []
    el.addEventListener('oas-dependencies-change', ((e: CustomEvent) => {
      evs.push(e.detail)
    }) as EventListener)
    expect(el.removeDependency('b', { id: 'a', type: 'fs' })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'ss' }])
    expect(el.removeDependency('b', { id: 'a', type: 'ff' }), '无该型').toBe(false)
    expect(el.removeDependency('b', { id: 'a' }), '删该 id 全部').toBe(true)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toBeUndefined()
    expect(el.removeDependency('ghost', { id: 'a' })).toBe(false)
    expect(evs).toHaveLength(2)
  })

  it('updateDependency：to.type 缺省继承 from.type、重复去重、非法 false', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05' },
        {
          id: 'c',
          name: 'C',
          start: '2026-03-06',
          end: '2026-03-07',
          dependencies: [{ id: 'a', type: 'ss' }],
        },
        {
          id: 'd',
          name: 'D',
          start: '2026-03-08',
          end: '2026-03-09',
          dependencies: [
            { id: 'a', type: 'fs' },
            { id: 'b', type: 'fs' },
          ],
        },
      ]),
    })
    const evs: Array<{ taskId: string; dependencies: Array<{ id: string; type?: string }> }> = []
    el.addEventListener('oas-dependencies-change', ((e: CustomEvent) => {
      evs.push(e.detail)
    }) as EventListener)
    // 继承 from.type=ss
    expect(el.updateDependency('c', { id: 'a', type: 'ss' }, { id: 'b' })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'c')!.dependencies).toEqual([{ id: 'b', type: 'ss' }])
    // 去重：a→b 后与既有 b 重复，只保留一条
    expect(el.updateDependency('d', { id: 'a', type: 'fs' }, { id: 'b', type: 'fs' })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'd')!.dependencies).toEqual([{ id: 'b', type: 'fs' }])
    // 非法
    expect(el.updateDependency('c', { id: 'nope' }, { id: 'b' }), 'from 不存在').toBe(false)
    expect(el.updateDependency('c', { id: 'b', type: 'ss' }, { id: 'ghost' }), 'to 不存在').toBe(false)
    expect(el.updateDependency('c', { id: 'b', type: 'ss' }, { id: 'c' }), 'to 指向自身').toBe(false)
    // 无实际变化
    expect(el.updateDependency('c', { id: 'b', type: 'ss' }, { id: 'b', type: 'ss' })).toBe(false)
    expect(evs).toHaveLength(2)
  })
})

describe('OASGantt 创作：updateTasks 批量', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('批量浅合并返回生效条数，只派发一次 oas-tasks-change', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05' },
      ]),
    })
    let n = 0
    el.addEventListener('oas-tasks-change', () => n++)
    const applied = el.updateTasks([
      { id: 'a', name: 'A2' },
      { id: 'b', progress: 50 },
      { id: 'ghost', name: 'G' },
    ])
    expect(applied).toBe(2)
    expect(n, '一次提交一次事件').toBe(1)
    expect(el.tasks.find((t) => t.id === 'a')!.name).toBe('A2')
    expect(el.tasks.find((t) => t.id === 'b')!.progress).toBe(50)
  })

  it('非法 end 跳过该条；全非法时零事件零渲染', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' }]) })
    let n = 0
    el.addEventListener('oas-tasks-change', () => n++)
    expect(el.updateTasks([{ id: 'a', end: 'nope' }])).toBe(0)
    expect(n).toBe(0)
    expect(el.tasks.find((t) => t.id === 'a')!.end).toBe('2026-03-03')
  })
})

describe('OASGantt 创作：zoomIn / zoomOut / fit', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('zoomIn 向细档、zoomOut 向粗档步进并派发 oas-scale-change；端点 no-op', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02' }]), scale: 'day' })
    const scales: string[] = []
    el.addEventListener('oas-scale-change', ((e: CustomEvent<{ scale: string }>) => {
      scales.push(e.detail.scale)
    }) as EventListener)
    el.zoomIn()
    expect(el.getAttribute('scale')).toBe('hour')
    el.zoomIn()
    expect(el.getAttribute('scale'), '最细档端点 no-op').toBe('hour')
    el.zoomOut()
    expect(el.getAttribute('scale')).toBe('day')
    el.zoomOut()
    expect(el.getAttribute('scale')).toBe('week')
    expect(scales).toEqual(['hour', 'day', 'week'])
  })

  it('最粗档 zoomOut 为 no-op', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02' }]), scale: 'year' })
    el.zoomOut()
    expect(el.getAttribute('scale')).toBe('year')
  })

  it('fit：无任务 no-op（scale 不变）', () => {
    const el = mount({ tasks: '[]', scale: 'day' })
    el.fit()
    expect(el.getAttribute('scale')).toBe('day')
  })

  it('fit：取最细且能容纳全部任务的档并滚动定位到最早任务', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }]) })
    const spy = vi.spyOn(el, 'scrollToDate')
    const tb = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    // 3 天跨度、可用宽 1200：hour 需 72*22=1584 放不下，day 需 3*16=48 可容纳 → day（最细可视档）
    stubProp(tb, 'clientWidth', 1200)
    el.fit()
    expect(el.getAttribute('scale')).toBe('day')
    expect(spy).toHaveBeenCalledWith('2026-03-02')
    spy.mockRestore()
  })

  it('fit：可用宽收窄则回落更粗档，极窄回落最粗 year', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }]) })
    const tb = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    stubProp(tb, 'clientWidth', 40) // day 需 48 放不下，week 需 3/7*36≈15.4 可容纳 → week
    el.fit()
    expect(el.getAttribute('scale')).toBe('week')
    stubProp(tb, 'clientWidth', 1) // 逐档皆放不下 → 最粗 year
    el.fit()
    expect(el.getAttribute('scale')).toBe('year')
  })
})

describe('OASGantt 创作：creatable 行内新建', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TREE = JSON.stringify([
    {
      id: 'p',
      name: 'P',
      start: '2026-03-02',
      end: '2026-03-06',
      children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-03' }],
    },
  ])

  it('creatable 关（默认）不渲染 .row-add', () => {
    const el = mount({ tasks: TREE })
    expect(shadowOf(el).querySelectorAll('.row-add').length).toBe(0)
  })

  it('creatable 开：每行渲染 .row-add，摘要行 aria-label 走 gantt.addChild、叶子走 gantt.addTask', () => {
    const el = mount({ tasks: TREE, creatable: '' })
    expect(shadowOf(el).querySelectorAll('.row-add').length).toBe(2)
    expect(
      shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="p"] .row-add')!.getAttribute('aria-label'),
    ).toBe('添加子任务')
    expect(
      shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="c"] .row-add')!.getAttribute('aria-label'),
    ).toBe('添加任务')
  })

  it('点击摘要行「＋」加子级并聚焦/进入重命名', () => {
    const el = mount({ tasks: TREE, creatable: '' })
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="p"] .row-add')!.click()
    expect(added).toHaveLength(1)
    expect(el.tasks.find((t) => t.id === added[0]!.id)!.parent).toBe('p')
    expect(shadowOf(el).querySelector('.rename-input'), '进入行内重命名').not.toBeNull()
  })

  it('点击叶子行「＋」在其后加同级', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05' },
      ]),
      creatable: '',
    })
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="a"] .row-add')!.click()
    expect(added).toHaveLength(1)
    const ids = el.tasks.map((t) => t.id)
    expect(ids.indexOf(added[0]!.id)).toBe(ids.indexOf('a') + 1)
    expect(el.tasks.find((t) => t.id === added[0]!.id)!.parent).toBeUndefined()
  })

  it('readonly 不渲染 .row-add；disabled 行不渲染', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05', disabled: true },
      ]),
      creatable: '',
    })
    expect(shadowOf(el).querySelector('.row-name[data-key="a"] .row-add')).not.toBeNull()
    expect(shadowOf(el).querySelector('.row-name[data-key="b"] .row-add'), 'disabled 行').toBeNull()
    el.setAttribute('readonly', '')
    expect(shadowOf(el).querySelectorAll('.row-add').length, 'readonly 全不渲染').toBe(0)
  })

  it('行尾「＋」新建继承所在行开始日（不落到今天/视线外）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }]),
      creatable: '',
    })
    shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="a"] .row-add')!.click()
    const added = el.tasks.filter((t) => t.id !== 'a')
    expect(added).toHaveLength(1)
    expect(added[0]!.start).toBe('2026-03-02')
    expect(added[0]!.end).toBe('2026-03-02')
  })

  it('双击 tbody 空白按落点日期建任务并进入重命名', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }]),
      creatable: '',
    })
    const tbody = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    const inner = shadowOf(el).querySelector<HTMLElement>('.inner')!
    inner.getBoundingClientRect = () =>
      ({ left: 0, right: 400, top: 0, bottom: 200, width: 400, height: 200, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    stubProp(tbody, 'scrollLeft', 0)
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    const ev = new MouseEvent('dblclick', { bubbles: true })
    // colW=36（无布局回落基准）；units[0]=03-01 → units[2]=03-03
    Object.defineProperty(ev, 'clientX', { value: 2 * 36 + 5 })
    Object.defineProperty(ev, 'clientY', { value: 10 })
    tbody.dispatchEvent(ev)
    expect(added).toHaveLength(1)
    expect(el.tasks.find((t) => t.id === added[0]!.id)!.start).toBe('2026-03-03')
    expect(shadowOf(el).querySelector('.rename-input')).not.toBeNull()
  })

  it('双击 side-body 空白按今天建任务', () => {
    const el = mount({ tasks: '[]', creatable: '' })
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    shadowOf(el)
      .querySelector<HTMLElement>('.side-body')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(added).toHaveLength(1)
    expect(el.tasks.find((t) => t.id === added[0]!.id)!.start).toBe(todayIso())
  })

  it('双击任务条不触发新建（忽略交互元素）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }]),
      creatable: '',
    })
    // 让落点解析可用（否则 dateAtClientX 因无布局恒 null，用例无法区分守卫是否有效）
    const inner = shadowOf(el).querySelector<HTMLElement>('.inner')!
    inner.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 4000,
        top: 0,
        bottom: 200,
        width: 4000,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    let n = 0
    el.addEventListener('oas-task-add', () => n++)
    barOf(el, 'a').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    expect(n).toBe(0)
  })

  it('creatable 关时双击空白不新建', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }]) })
    let n = 0
    el.addEventListener('oas-task-add', () => n++)
    shadowOf(el)
      .querySelector<HTMLElement>('.tbody')!
      .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(n).toBe(0)
  })
})

describe('OASGantt 创作：复审修复回归（守卫 / 克隆依赖 / RTL 落点 / 非法 end）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('行尾「＋」上的 pointerdown 不触发行重排', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-07' },
      ]),
      creatable: '',
    })
    let fired = 0
    el.addEventListener('oas-reparent', () => fired++)
    // 给侧栏真实几何盒：若守卫失效，拖到 b 行会触发重排（否则落点恒为自身、用例无法区分）
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
    const add = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="a"] .row-add')!
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: 0 })
    Object.defineProperty(down, 'clientY', { value: 0 })
    add.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 0 })
    Object.defineProperty(move, 'clientY', { value: 36 + 30 }) // 落到 b 行下半区（after，产生真实变更）
    document.dispatchEvent(move)
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(fired, '＋ 上按下不应进入行重排').toBe(0)
    expect(el.tasks.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('未受控 + 摘要行数据 expanded:false：点「＋」加子级会自动展开并进入重命名', () => {
    const el = mount({
      creatable: '',
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-06',
          type: 'summary',
          expanded: false,
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-03' }],
        },
      ]),
    })
    // 初始收起：子行不渲染
    expect(shadowOf(el).querySelector('.row-name[data-key="c"]')).toBeNull()
    shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="p"] .row-add')!.click()
    const added = el.tasks.filter((t) => t.parent === 'p' && t.id !== 'c')
    expect(added).toHaveLength(1)
    expect(
      shadowOf(el).querySelector(`.row-name[data-key="${added[0]!.id}"]`),
      '新子级应可见（自动展开）',
    ).not.toBeNull()
    expect(shadowOf(el).querySelector('.rename-input')).not.toBeNull()
  })

  it('行尾「＋」聚焦后 Space/Enter 不被行 keydown 抢走（不改选中）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }]),
      creatable: '',
    })
    let sel = 0
    el.addEventListener('oas-selection-change', () => sel++)
    const add = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="a"] .row-add')!
    add.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    add.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(sel, '＋ 上按键不应触发行选中').toBe(0)
  })

  it('双击依赖连线命中路径不触发空白新建', () => {
    const el = mount({
      creatable: '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-07', dependencies: [{ id: 'a' }] },
      ]),
    })
    let n = 0
    el.addEventListener('oas-task-add', () => n++)
    const inner = shadowOf(el).querySelector<HTMLElement>('.inner')!
    inner.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 4000,
        top: 0,
        bottom: 200,
        width: 4000,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    const hit = shadowOf(el).querySelector<HTMLElement>('.link-hit')!
    hit.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    expect(n, '双击连线不应新建任务').toBe(0)
  })

  it('duplicateTask：子树内部依赖映射到克隆 id（不与原体串联），外部依赖保留原 id', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-10',
          children: [
            { id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-04' },
            {
              id: 'c2',
              name: 'C2',
              start: '2026-03-05',
              end: '2026-03-07',
              dependencies: [{ id: 'c1' }, { id: 'ext' }],
            },
          ],
        },
        { id: 'ext', name: 'EXT', start: '2026-03-01', end: '2026-03-02' },
      ]),
    })
    const newId = el.duplicateTask('p')!
    const tasks = el.tasks
    // 克隆子级 c2：parent 指向克隆根，依赖 c1 → 克隆 c1（非原 c1），ext 保留
    const cloneC1 = tasks.find((t) => t.parent === newId && t.name === 'C1')!
    const clonedChild2 = tasks.find((t) => t.parent === newId && t.name === 'C2')!
    expect(clonedChild2.dependencies!.map((d) => d.id)).toEqual([cloneC1.id, 'ext'])
    expect(
      clonedChild2.dependencies!.some((d) => d.id === 'c1'),
      '不应指向原 c1',
    ).toBe(false)
  })

  it('addTask：非法 end 显式拒绝（返回空串，零改动零事件）', () => {
    const el = mount({ tasks: '[]' })
    let n = 0
    el.addEventListener('oas-task-add', () => n++)
    expect(el.addTask({ name: 'N', start: '2026-03-02', end: 'nope' })).toBe('')
    expect(el.tasks).toHaveLength(0)
    expect(n).toBe(0)
  })

  it('双击 tbody 空白：按 .inner 逆变换取落点日期（与 bar.left 精确互逆）', () => {
    const el = mount({
      creatable: '',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-25' }]),
    })
    const units = (el as unknown as { units: Array<{ startMs: number }> }).units
    const inner = shadowOf(el).querySelector<HTMLElement>('.inner')!
    inner.getBoundingClientRect = () =>
      ({
        left: 0,
        right: 4000,
        top: 0,
        bottom: 200,
        width: 4000,
        height: 200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    const i = Math.min(3, units.length - 1)
    const colW = (el as unknown as { colW(): number }).colW()
    const ev = new MouseEvent('dblclick', { bubbles: true })
    Object.defineProperty(ev, 'clientX', { value: i * colW + colW / 2 }) // 落在第 i 格中央
    Object.defineProperty(ev, 'clientY', { value: 10 })
    shadowOf(el).querySelector<HTMLElement>('.tbody')!.dispatchEvent(ev)
    expect(added).toHaveLength(1)
    const d = new Date(units[i]!.startMs)
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(el.tasks.find((t) => t.id === added[0]!.id)!.start).toBe(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    )
  })

  it('RTL 双击 tbody 空白：x = canvasW − physical（镜像逆变换，含已滚动）', () => {
    const el = mount({
      dir: 'rtl',
      creatable: '',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-25' }]),
    })
    const units = (el as unknown as { units: Array<{ startMs: number }> }).units
    const canvasW = (el as unknown as { canvasW: number }).canvasW
    const colW = (el as unknown as { colW(): number }).colW()
    const scroll = 5 * colW
    const inner = shadowOf(el).querySelector<HTMLElement>('.inner')!
    inner.getBoundingClientRect = () =>
      ({
        left: -scroll,
        right: 4000,
        top: 0,
        bottom: 200,
        width: 4000,
        height: 200,
        x: -scroll,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    stubProp(shadowOf(el).querySelector<HTMLElement>('.tbody')!, 'scrollLeft', -scroll)
    const i = Math.min(4, units.length - 1)
    // 期望 x = i*colW + colW/2；physical = x − ... → clientX = inner.left + canvasW − x
    const clientX = -scroll + canvasW - (i * colW + colW / 2)
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    const ev = new MouseEvent('dblclick', { bubbles: true })
    Object.defineProperty(ev, 'clientX', { value: clientX })
    Object.defineProperty(ev, 'clientY', { value: 10 })
    shadowOf(el).querySelector<HTMLElement>('.tbody')!.dispatchEvent(ev)
    expect(added).toHaveLength(1)
    const d = new Date(units[i]!.startMs)
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(el.tasks.find((t) => t.id === added[0]!.id)!.start).toBe(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    )
  })
})

// ===== 本批增强：依赖联动排程 / 框选多任务 / 拖拽建任务 =====

/** 按 id 取任务快照（找不到即抛，避免断言静默空转） */
function taskOf(el: OASGantt, id: string): GanttTask {
  const t = el.tasks.find((x) => x.id === id)
  if (!t) throw new Error(`task not found: ${id}`)
  return t
}

/** 伪造元素几何盒（happy-dom 无布局） */
function stubRect(el: Element, top: number, left: number, width: number, height: number): void {
  ;(el as HTMLElement).getBoundingClientRect = () =>
    ({
      top,
      left,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect
}

/** 合成指针事件（clientX/Y 用 defineProperty 兜底；Ctrl/Cmd 供追加语义） */
function pointerAt(
  type: string,
  x: number,
  y: number,
  target: EventTarget,
  mods: { ctrlKey?: boolean; metaKey?: boolean } = {},
): PointerEvent {
  const e = new PointerEvent(type, { bubbles: true, composed: true, pointerId: 1, button: 0 })
  Object.defineProperty(e, 'clientX', { value: x })
  Object.defineProperty(e, 'clientY', { value: y })
  if (mods.ctrlKey) Object.defineProperty(e, 'ctrlKey', { value: true })
  if (mods.metaKey) Object.defineProperty(e, 'metaKey', { value: true })
  target.dispatchEvent(e)
  return e
}

/** 完整空白拖拽手势：down 落面板，move/up 落 document（对齐组件自建 bind/unbind 模式） */
function marqueeGesture(
  panel: HTMLElement,
  from: [number, number],
  to: [number, number],
  mods: { ctrlKey?: boolean; metaKey?: boolean } = {},
): void {
  pointerAt('pointerdown', from[0], from[1], panel, mods)
  pointerAt('pointermove', to[0], to[1], document)
  pointerAt('pointerup', to[0], to[1], document, mods)
}

describe('OASGantt 依赖联动排程（auto-schedule）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function watchReschedule(el: OASGantt): string[][] {
    const seen: string[][] = []
    el.addEventListener('oas-reschedule', (e) => seen.push((e as CustomEvent<{ ids: string[] }>).detail.ids))
    return seen
  }

  it('fs：后继起点早于前置右缘 → 最小前推，工期不变', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' }, // 右缘 03-07
        { id: 't', name: 'T', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'd' }] }, // 工期 3 天
      ]),
    })
    const seen = watchReschedule(el)
    expect(el.updateTask('t', { name: 'T2', start: '2026-03-02', end: '2026-03-04' })).toBe(true)
    expect(taskOf(el, 't').start).toBe('2026-03-07')
    expect(taskOf(el, 't').end).toBe('2026-03-09')
    expect(seen).toEqual([['t']])
  })

  it('ss：后继起点早于前置起点 → 前推到前置起点', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-05', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd', type: 'ss' }] },
      ]),
    })
    const seen = watchReschedule(el)
    el.updateTask('t', { start: '2026-03-01', end: '2026-03-02' })
    expect(taskOf(el, 't').start).toBe('2026-03-05')
    expect(taskOf(el, 't').end).toBe('2026-03-06')
    expect(seen).toEqual([['t']])
  })

  it('ff：后继完成早于前置完成 → 前推（保持工期）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' }, // 右缘 03-07
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd', type: 'ff' }] }, // 工期 2 天
      ]),
    })
    const seen = watchReschedule(el)
    el.updateTask('t', { start: '2026-03-01', end: '2026-03-02' })
    expect(taskOf(el, 't').start).toBe('2026-03-05')
    expect(taskOf(el, 't').end).toBe('2026-03-06')
    expect(seen).toEqual([['t']])
  })

  it('sf：后继完成早于前置起点 → 前推（保持工期）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-05', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd', type: 'sf' }] },
      ]),
    })
    const seen = watchReschedule(el)
    el.updateTask('t', { start: '2026-03-01', end: '2026-03-02' })
    expect(taskOf(el, 't').start).toBe('2026-03-03')
    expect(taskOf(el, 't').end).toBe('2026-03-04')
    expect(seen).toEqual([['t']])
  })

  it('级联：拖 A 后 B/C 逐级顺延；工期保持；reschedule 一次 + tasks-change（拖拽自身 + reschedule）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02' },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
        { id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'b' }] },
      ]),
    })
    const seen = watchReschedule(el)
    let tasksChanged = 0
    el.addEventListener('oas-tasks-change', () => tasksChanged++)
    dragSeq(barOf(el, 'a'), 72)
    expect(taskOf(el, 'a').start).toBe('2026-03-04')
    expect(taskOf(el, 'b').start).toBe('2026-03-05')
    expect(taskOf(el, 'c').start).toBe('2026-03-06')
    expect(seen).toHaveLength(1)
    expect([...seen[0]!].sort()).toEqual(['b', 'c'])
    // 拖拽自身的 tasks-change + reschedule 收口的一次 tasks-change
    expect(tasksChanged).toBe(2)
  })

  it('迭代松弛：依赖链数组顺序逆序（后继在前）也能级联到稳定', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'b' }] },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02' },
      ]),
    })
    const seen = watchReschedule(el)
    el.updateTask('a', { start: '2026-03-05', end: '2026-03-05' })
    // 单趟松弛只会把 c 推到 b 的旧值（03-03）；迭代到位应为 03-07
    expect(taskOf(el, 'a').start).toBe('2026-03-05')
    expect(taskOf(el, 'b').start).toBe('2026-03-06')
    expect(taskOf(el, 'c').start).toBe('2026-03-07')
    expect(seen).toHaveLength(1)
    expect([...seen[0]!].sort()).toEqual(['b', 'c'])
  })

  it('只推不提前：约束已满足时零改动零 reschedule 事件', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-10', end: '2026-03-12', dependencies: [{ id: 'd' }] },
      ]),
    })
    const seen = watchReschedule(el)
    el.updateTask('t', { start: '2026-03-10', end: '2026-03-12' })
    expect(taskOf(el, 't').start).toBe('2026-03-10')
    expect(seen).toHaveLength(0)
  })

  it('跳过 disabled 任务与摘要（有子级）：仅普通后继被推', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 'dis', name: 'Dis', start: '2026-03-01', end: '2026-03-02', disabled: true, dependencies: [{ id: 'd' }] },
        {
          id: 'p',
          name: 'P',
          start: '2026-03-01',
          end: '2026-03-02',
          children: [{ id: 'pc', name: 'PC', start: '2026-03-01', end: '2026-03-02' }],
          dependencies: [{ id: 'd' }],
        },
        { id: 'x', name: 'X', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
      ]),
    })
    const seen = watchReschedule(el)
    el.updateTask('x', { start: '2026-03-01', end: '2026-03-02' })
    expect(taskOf(el, 'dis').start).toBe('2026-03-01')
    expect(taskOf(el, 'p').start).toBe('2026-03-01')
    expect(taskOf(el, 'x').start).toBe('2026-03-07')
    expect(seen).toEqual([['x']])
  })

  it('成环（A→B→A）不死循环、不抛异常（迭代上限收敛）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'b' }] },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
      ]),
    })
    const seen = watchReschedule(el)
    expect(() => el.updateTask('a', { start: '2026-03-02', end: '2026-03-02' })).not.toThrow()
    // 成环 → 排程无解：跳过（不推远数据、零 reschedule 事件），不挂死
    expect(seen).toHaveLength(0)
    expect(taskOf(el, 'a').start).toBe('2026-03-02')
    expect(taskOf(el, 'b').start).toBe('2026-03-02')
    for (const t of el.tasks) {
      expect(Number.isNaN(Date.parse(t.start))).toBe(false)
      expect(Number.isNaN(Date.parse(t.end ?? t.start))).toBe(false)
    }
  })

  it('auto-schedule 关（默认）：拖拽 / updateTask 零额外改动与事件', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02' },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
      ]),
    })
    const seen = watchReschedule(el)
    let tasksChanged = 0
    el.addEventListener('oas-tasks-change', () => tasksChanged++)
    dragSeq(barOf(el, 'a'), 72)
    expect(taskOf(el, 'b').start).toBe('2026-03-02')
    expect(seen).toHaveLength(0)
    expect(tasksChanged).toBe(1)
    el.updateTask('b', { start: '2026-03-02', end: '2026-03-02' })
    expect(seen).toHaveLength(0)
    expect(tasksChanged).toBe(2)
  })

  it('auto-schedule="false" 显式关：等效默认关（不改数据、零事件）', () => {
    const el = mount({
      'auto-schedule': 'false',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02' },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
      ]),
    })
    const seen = watchReschedule(el)
    dragSeq(barOf(el, 'a'), 72)
    expect(taskOf(el, 'b').start).toBe('2026-03-02')
    expect(seen).toHaveLength(0)
  })

  it('updateTasks：含 start/end 变更时触发；仅改其它字段不触发', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'd' }] },
      ]),
    })
    const seen = watchReschedule(el)
    // 挂载即开 auto-schedule → 首次 update 已规整（t 前推到 03-07）
    expect(taskOf(el, 't').start).toBe('2026-03-07')
    expect(el.updateTasks([{ id: 't', progress: 50 }])).toBe(1)
    expect(seen).toHaveLength(0)
    expect(taskOf(el, 't').start).toBe('2026-03-07')
    // 再改回违约日期 → 触发联动前推
    expect(el.updateTasks([{ id: 't', start: '2026-03-01', end: '2026-03-02' }])).toBe(1)
    expect(seen).toEqual([['t']])
    expect(taskOf(el, 't').start).toBe('2026-03-07')
  })

  it('addDependency 成功后触发联动前推', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02' },
      ]),
    })
    const seen = watchReschedule(el)
    expect(el.addDependency('t', { id: 'd' })).toBe(true)
    expect(taskOf(el, 't').start).toBe('2026-03-07')
    expect(taskOf(el, 't').end).toBe('2026-03-08')
    expect(seen).toEqual([['t']])
  })

  it('updateDependency 约束收紧后触发联动前推', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd1', name: 'D1', start: '2026-03-02', end: '2026-03-04' },
        { id: 'd2', name: 'D2', start: '2026-03-10', end: '2026-03-12' },
        { id: 't', name: 'T', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'd1' }] },
      ]),
    })
    const seen = watchReschedule(el)
    expect(el.updateDependency('t', { id: 'd1' }, { id: 'd2' })).toBe(true)
    expect(taskOf(el, 't').start).toBe('2026-03-13')
    expect(taskOf(el, 't').end).toBe('2026-03-14')
    expect(seen).toEqual([['t']])
  })

  it('多前置取最靠后约束（fs 需 03-11 vs ss 需 03-20 → 取 03-20）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'p1', name: 'P1', start: '2026-03-08', end: '2026-03-10' },
        { id: 'p2', name: 'P2', start: '2026-03-20', end: '2026-03-22' },
        {
          id: 't',
          name: 'T',
          start: '2026-03-01',
          end: '2026-03-02',
          dependencies: [
            { id: 'p1', type: 'fs' },
            { id: 'p2', type: 'ss' },
          ],
        },
      ]),
    })
    el.updateTasks([{ id: 'p2', start: '2026-03-20', end: '2026-03-22' }])
    expect(taskOf(el, 't').start).toBe('2026-03-20')
  })

  it('依赖成环：跳过排程（数据不推远、零 reschedule 事件）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'b' }] },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
      ]),
    })
    const seen = watchReschedule(el)
    el.updateTasks([{ id: 'a', start: '2026-03-02', end: '2026-03-02' }])
    expect(taskOf(el, 'a').start).toBe('2026-03-02')
    expect(taskOf(el, 'b').start).toBe('2026-03-02')
    expect(seen).toEqual([])
  })

  it('带时间精度任务参与排程时保持日期时间格式', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02 08:00', end: '2026-03-02 12:00' },
        { id: 't', name: 'T', start: '2026-03-02 06:00', end: '2026-03-02 07:00', dependencies: [{ id: 'd' }] },
      ]),
    })
    el.updateTasks([{ id: 'd', start: '2026-03-02 08:00', end: '2026-03-02 12:00' }])
    expect(taskOf(el, 't').start).toBe('2026-03-02 12:00')
    expect(taskOf(el, 't').end).toBe('2026-03-02 13:00')
  })

  it('摘要作前置：按后代聚合区间约束（忽略摘要自身 date 字段）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        {
          id: 's',
          name: 'S',
          start: '2026-03-02',
          end: '2026-03-06',
          type: 'summary',
          children: [{ id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-10' }],
        },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 's' }] },
      ]),
    })
    // 聚合 end = 03-10（含端 → 右缘 03-11）→ t.start = 03-11（非摘要自身 end 03-06 的 03-07）
    expect(taskOf(el, 't').start).toBe('2026-03-11')
  })

  it('运行期开启 auto-schedule：立即规整既存违约一次', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
      ]),
    })
    expect(taskOf(el, 't').start, '未开启前不动').toBe('2026-03-01')
    el.setAttribute('auto-schedule', '')
    expect(taskOf(el, 't').start, '开启后立即前推').toBe('2026-03-07')
  })
})

describe('OASGantt 框选多任务（marquee）', () => {
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

  function side(el: OASGantt): HTMLElement {
    return shadowOf(el).querySelector<HTMLElement>('.side-body')!
  }
  function body(el: OASGantt): HTMLElement {
    return shadowOf(el).querySelector<HTMLElement>('.tbody')!
  }
  function stubSide(el: OASGantt): void {
    const s = side(el)
    stubRect(s, 0, 0, 300, 1000)
    stubProp(s, 'scrollTop', 0)
  }

  it('行带框选：选中与选框纵向相交的窗口行', () => {
    const el = mount({ tasks: TASKS })
    stubSide(el)
    marqueeGesture(side(el), [20, 10], [40, 50])
    expect(el.selection).toEqual(['x', 'y'])
    expect(shadowOf(el).querySelector('.marquee')).toBeNull()
  })

  it('拖动中渲染 .marquee 覆盖层（内联几何），松开移除', () => {
    const el = mount({ tasks: TASKS })
    stubSide(el)
    pointerAt('pointerdown', 20, 10, side(el))
    pointerAt('pointermove', 40, 50, document)
    const overlay = shadowOf(el).querySelector<HTMLElement>('.marquee')
    expect(overlay).not.toBeNull()
    expect(Number.parseFloat(overlay!.style.width)).toBe(20)
    expect(Number.parseFloat(overlay!.style.height)).toBe(40)
    pointerAt('pointerup', 40, 50, document)
    expect(shadowOf(el).querySelector('.marquee')).toBeNull()
  })

  it('条相交框选：命中 .bar client rect 的任务（替换语义）', () => {
    const el = mount({ tasks: TASKS })
    stubRect(barOf(el, 'x'), 0, 0, 100, 10)
    stubRect(barOf(el, 'y'), 36, 0, 100, 10)
    stubRect(barOf(el, 'z'), 72, 0, 100, 10)
    marqueeGesture(body(el), [0, 0], [50, 40])
    expect(el.selection).toEqual(['x', 'y'])
  })

  it('Ctrl 追加：求和而非替换', () => {
    const el = mount({ tasks: TASKS })
    stubSide(el)
    el.selection = ['z']
    marqueeGesture(side(el), [20, 10], [40, 50], { ctrlKey: true })
    expect(el.selection.slice().sort()).toEqual(['x', 'y', 'z'])
  })

  it('空白单击（未拖动）清空选择', () => {
    const el = mount({ tasks: TASKS })
    stubSide(el)
    el.selection = ['x', 'y']
    marqueeGesture(side(el), [20, 10], [20, 10])
    expect(el.selection).toEqual([])
    expect(shadowOf(el).querySelector('.marquee')).toBeNull()
  })

  it('readonly：框选仍可用（查看态）', () => {
    const el = mount({ tasks: TASKS, readonly: '' })
    stubSide(el)
    marqueeGesture(side(el), [20, 10], [40, 50])
    expect(el.selection).toEqual(['x', 'y'])
  })

  it('不误触行拖拽：行上起手走重排，无 marquee 覆盖层', () => {
    const el = mount({ tasks: TASKS })
    stubSide(el)
    let reparent = 0
    el.addEventListener('oas-reparent', () => reparent++)
    const row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="x"]')!
    pointerAt('pointerdown', 0, 0, row)
    pointerAt('pointermove', 0, 80, document)
    pointerAt('pointerup', 0, 80, document)
    expect(reparent).toBe(1)
    expect(shadowOf(el).querySelector('.marquee')).toBeNull()
    expect(el.selection).toEqual([])
  })

  it('不误触条拖拽：条上起手走改期，无 marquee 覆盖层', () => {
    const el = mount({ tasks: TASKS })
    let changed = 0
    el.addEventListener('oas-task-change', () => changed++)
    dragSeq(barOf(el, 'x'), 72)
    expect(changed).toBe(1)
    expect(shadowOf(el).querySelector('.marquee')).toBeNull()
    expect(el.selection).toEqual([])
  })
})

describe('OASGantt 拖拽建任务（creatable 时间轴空白拖）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const TASKS = JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' }])

  /** 让 dateAtClientX 可用：stub .inner 几何盒 + tbody.scrollLeft（day 档 colW=36，units[0]=03-01） */
  function setupLayout(el: OASGantt): HTMLElement {
    const tbody = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    const inner = shadowOf(el).querySelector<HTMLElement>('.inner')!
    stubRect(inner, 0, 0, 4000, 200)
    stubProp(tbody, 'scrollLeft', 0)
    return tbody
  }

  it('空白拖出区间：按起止列建任务并进入重命名', () => {
    const el = mount({ tasks: TASKS, creatable: '' })
    const tbody = setupLayout(el)
    const added: GanttTaskAddDetail[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail)
    }) as EventListener)
    marqueeGesture(tbody, [2 * 36 + 5, 10], [4 * 36 + 5, 10])
    expect(added).toHaveLength(1)
    const t = taskOf(el, added[0]!.id)
    expect(t.start).toBe('2026-03-03')
    expect(t.end).toBe('2026-03-05')
    expect(shadowOf(el).querySelector('.rename-input')).not.toBeNull()
  })

  it('反向拖（从右向左）：起止取 min/max，跨度一致且不触发 start>end 自愈告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ tasks: TASKS, creatable: '' })
      const tbody = setupLayout(el)
      const added: string[] = []
      el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
        added.push(e.detail.id)
      }) as EventListener)
      marqueeGesture(tbody, [4 * 36 + 5, 10], [2 * 36 + 5, 10])
      expect(added).toHaveLength(1)
      const t = taskOf(el, added[0]!)
      expect(t.start).toBe('2026-03-03')
      expect(t.end).toBe('2026-03-05')
      // 若按原始落点顺序写（start > end），清洗层会自愈交换并告警一次——断言无此告警
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('颠倒')).length).toBe(0)
    } finally {
      warn.mockRestore()
    }
  })

  it('同格拖 → 1 天（end = start）', () => {
    const el = mount({ tasks: TASKS, creatable: '' })
    const tbody = setupLayout(el)
    const added: string[] = []
    el.addEventListener('oas-task-add', ((e: CustomEvent<GanttTaskAddDetail>) => {
      added.push(e.detail.id)
    }) as EventListener)
    marqueeGesture(tbody, [2 * 36 + 5, 10], [2 * 36 + 11, 10])
    expect(added).toHaveLength(1)
    const t = taskOf(el, added[0]!)
    expect(t.start).toBe('2026-03-03')
    expect(t.end).toBe('2026-03-03')
  })

  it('非 creatable：时间轴空白拖走框选，不建任务', () => {
    const el = mount({ tasks: TASKS })
    const tbody = setupLayout(el)
    let added = 0
    el.addEventListener('oas-task-add', () => added++)
    marqueeGesture(tbody, [10, 10], [200, 60])
    expect(added).toBe(0)
    expect(el.tasks).toHaveLength(1)
  })

  it('readonly + creatable：拖拽不建任务', () => {
    const el = mount({ tasks: TASKS, creatable: '', readonly: '' })
    const tbody = setupLayout(el)
    let added = 0
    el.addEventListener('oas-task-add', () => added++)
    marqueeGesture(tbody, [10, 10], [200, 60])
    expect(added).toBe(0)
    expect(el.tasks).toHaveLength(1)
  })

  it('无布局（.inner 宽 0）：拖拽不建任务', () => {
    const el = mount({ tasks: TASKS, creatable: '' })
    const tbody = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    let added = 0
    el.addEventListener('oas-task-add', () => added++)
    marqueeGesture(tbody, [10, 10], [200, 10])
    expect(added).toBe(0)
  })

  it('creatable 下空白单击：清空已有选择（与左侧列表一致）', () => {
    const el = mount({ tasks: TASKS, creatable: '' })
    const tbody = setupLayout(el)
    el.selection = ['a']
    let changed = 0
    el.addEventListener('oas-selection-change', () => changed++)
    marqueeGesture(tbody, [50, 10], [50, 10])
    expect(el.selection).toEqual([])
    expect(changed).toBe(1)
    expect(el.tasks).toHaveLength(1)
  })

  it('拖拽建任务中按 Esc：取消手势、不建任务、移除覆盖层', () => {
    const el = mount({ tasks: TASKS, creatable: '' })
    const tbody = setupLayout(el)
    let added = 0
    el.addEventListener('oas-task-add', () => added++)
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: 2 * 36 + 5 })
    Object.defineProperty(down, 'clientY', { value: 10 })
    tbody.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 5 * 36 + 5 })
    Object.defineProperty(move, 'clientY', { value: 10 })
    document.dispatchEvent(move)
    expect(shadowOf(el).querySelector('.marquee')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(added, 'Esc 后不应建任务').toBe(0)
    expect(shadowOf(el).querySelector('.marquee')).toBeNull()
  })

  it('触屏（pointerType=touch）：时间轴空白拖不建任务、不框选（留给原生滚动）', () => {
    const el = mount({ tasks: TASKS, creatable: '' })
    const tbody = setupLayout(el)
    let added = 0
    el.addEventListener('oas-task-add', () => added++)
    const opt = { bubbles: true, composed: true, pointerId: 1, button: 0, pointerType: 'touch' }
    const down = new PointerEvent('pointerdown', opt)
    Object.defineProperty(down, 'clientX', { value: 2 * 36 + 5 })
    Object.defineProperty(down, 'clientY', { value: 10 })
    tbody.dispatchEvent(down)
    const move = new PointerEvent('pointermove', opt)
    Object.defineProperty(move, 'clientX', { value: 5 * 36 + 5 })
    Object.defineProperty(move, 'clientY', { value: 10 })
    document.dispatchEvent(move)
    document.dispatchEvent(new PointerEvent('pointerup', opt))
    expect(added).toBe(0)
    expect(shadowOf(el).querySelector('.marquee')).toBeNull()
  })
})
