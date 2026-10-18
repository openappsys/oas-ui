import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASGantt } from './index.js'
import { pickVisibleLabels, ganttRenderDiag } from './oas-gantt.js'
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

  it('.tbody 禁用滚动锚定：overflow-anchor: none（滚动期重建 DOM 会触发 Chrome 锚定放大，同 oas-virtual-list）', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/\.tbody \{[^}]*overflow-anchor: none/)
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

describe('OASGantt height 属性映射（--oas-gantt-height，与 oas-resource 同协议）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('① height="260" → 组件写宿主自定义属性 --oas-gantt-height:260px；宿主 height 内联不被触碰', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS), height: '260' })
    expect(el.style.getPropertyValue('--oas-gantt-height')).toBe('260px')
    expect(el.style.height, '组件从不写宿主 height 内联').toBe('')
    const ganttEl = shadowOf(el).querySelector<HTMLElement>('.gantt')!
    expect(ganttEl.style.height, 'shadow 内 .gantt 也不落内联高度（高度走 token 变量）').toBe('')
  })

  it('② 宿主内联 --oas-gantt-height:500px（无 height 属性）不受影响；属性接管后移除 → 归零回落（不残留）', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    el.style.setProperty('--oas-gantt-height', '500px')
    el.requestUpdate()
    expect(el.style.getPropertyValue('--oas-gantt-height'), '无 height 属性 → 组件不写不清宿主 token').toBe('500px')
    el.setAttribute('height', '480')
    el.requestUpdate()
    expect(el.style.getPropertyValue('--oas-gantt-height'), '属性在场：接管为 480px').toBe('480px')
    el.removeAttribute('height')
    el.requestUpdate()
    expect(el.style.getPropertyValue('--oas-gantt-height'), '移除属性：归零回落 token 缺省（不残留 480）').toBe('')
  })

  it('③ 非法值/空串：从未写过不写、写过则清除；px 后缀合法', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS), height: 'bad' })
    expect(el.style.getPropertyValue('--oas-gantt-height'), '非法值不写（回落 token 缺省 320）').toBe('')
    el.setAttribute('height', '480')
    el.requestUpdate()
    expect(el.style.getPropertyValue('--oas-gantt-height')).toBe('480px')
    el.setAttribute('height', 'bad')
    el.requestUpdate()
    expect(el.style.getPropertyValue('--oas-gantt-height'), '非法值清除自写值（回落 320/宿主 CSS）').toBe('')
    const el2 = mount({ tasks: JSON.stringify(BASE_TASKS), height: '' })
    expect(el2.style.getPropertyValue('--oas-gantt-height'), '空串按未设置处理').toBe('')
    const el3 = mount({ tasks: JSON.stringify(BASE_TASKS), height: '260px' })
    expect(el3.style.getPropertyValue('--oas-gantt-height'), 'px 后缀合法').toBe('260px')
  })

  it('④ 宿主自带 height 内联（无 height 属性）→ 组件不清除、不覆盖、不写变量', () => {
    const el = new OASGantt()
    el.style.height = '400px'
    el.setAttribute('tasks', JSON.stringify(BASE_TASKS))
    document.body.appendChild(el)
    expect(el.style.height, '宿主内联 height 原样保留').toBe('400px')
    expect(el.hasAttribute('height')).toBe(false)
    expect(el.style.getPropertyValue('--oas-gantt-height')).toBe('')
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
    // onScroll 的窗口重建经 rAF 合帧（同帧多次 scroll 只重建一次）→ 手动 flush 触发重建
    const cbs: FrameRequestCallback[] = []
    const orig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cbs.push(cb)
      return cbs.length
    }) as typeof requestAnimationFrame
    try {
      shadowOf(el).querySelector('.tbody')!.dispatchEvent(new Event('scroll')) // 触发窗口重建
      cbs[0]!(0)
    } finally {
      globalThis.requestAnimationFrame = orig
    }
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

describe('OASGantt 选择变化增量渲染（选择不重跑全量构建）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  interface GanttSelPriv {
    rows: Array<{ task: { id: string } }>
    units: unknown[]
    criticalIds: Set<string>
    conflictIds: Set<string>
    rowIndexById: Map<string, number>
  }
  const priv = (el: OASGantt): GanttSelPriv => el as unknown as GanttSelPriv

  /** 万行数据（id k0..k<N-1>，日期在 3 月内滚动复用） */
  function hugeTasks(n: number): GanttTask[] {
    return Array.from({ length: n }, (_, i) => {
      const d = 1 + (i % 28)
      return {
        id: `k${i}`,
        name: `任务${i}`,
        start: `2026-03-${String(d).padStart(2, '0')}`,
        end: `2026-03-${String(Math.min(d + 2, 28)).padStart(2, '0')}`,
      }
    })
  }

  /** 全量重算诊断计数快照（模块级累加，取差值判定） */
  const snap = (): { rowBuilds: number; unitBuilds: number; cpComputes: number } => ({ ...ganttRenderDiag })

  /** 行点选（pointerdown 到行 + pointerup 到 document，组件的 rowPending 收口路径） */
  function clickRow(el: OASGantt, id: string, mods: { shiftKey?: boolean; ctrlKey?: boolean } = {}): void {
    const row = shadowOf(el).querySelector<HTMLElement>(`.row-name[data-key="${id}"]`)!
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: 40 })
    Object.defineProperty(down, 'clientY', { value: 40 })
    row.dispatchEvent(down)
    const up = new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(up, 'shiftKey', { value: !!mods.shiftKey })
    Object.defineProperty(up, 'ctrlKey', { value: !!mods.ctrlKey })
    document.dispatchEvent(up)
  }

  it('万行：仅改 selection（property 多次 + 点选）→ 行树/刻度/关键路径零重建，DOM 节点身份不变', () => {
    const el = mount({
      tasks: JSON.stringify(hugeTasks(10000)),
      'show-critical-path': '',
      height: '320',
      'row-height': '36',
    })
    const g = priv(el)
    // 挂载本身已发生一次全量构建 → 计数非恒 0（否则「不增」断言是假绿）
    const base = snap()
    expect(base.rowBuilds, '挂载触发 buildRows').toBeGreaterThan(0)
    expect(base.unitBuilds, '挂载触发 buildUnits').toBeGreaterThan(0)
    expect(base.cpComputes, '挂载触发关键路径计算').toBeGreaterThan(0)
    // 选择集 ARIA：树容器声明多选语义（与 Ctrl/Shift/框选能力一致）
    expect(shadowOf(el).querySelector('.side-rows')!.getAttribute('aria-multiselectable')).toBe('true')

    const rowsRef = g.rows
    const unitsRef = g.units
    const critRef = g.criticalIds
    const k0Row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="k0"]')!
    const k0Bar = barOf(el, 'k0')
    const k1Row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="k1"]')!

    // property 通道 ×3 + 点选 ×2（单选 + Shift 区间连选）
    el.selection = ['k0']
    el.selection = ['k0', 'k1']
    el.selection = []
    clickRow(el, 'k2')
    clickRow(el, 'k3', { shiftKey: true })

    const after = snap()
    expect(after.rowBuilds, '选择变化不得触发 buildRows（万行下 O(总量) 行树 + 摘要聚合）').toBe(base.rowBuilds)
    expect(after.unitBuilds, '选择变化不得触发 buildUnits（O(轴长) 刻度构建）').toBe(base.unitBuilds)
    expect(after.cpComputes, '选择变化不得触发关键路径重算（O(V+E) CPM）').toBe(base.cpComputes)
    // 缓存复用：rows / units / criticalIds 为同一引用（未重建）
    expect(g.rows, 'rows 缓存复用').toBe(rowsRef)
    expect(g.units, 'units 缓存复用').toBe(unitsRef)
    expect(g.criticalIds, 'criticalIds 缓存复用').toBe(critRef)
    // DOM 节点身份不变（局部 patch，非整窗重建；重建会丢焦点/拖拽锚点）
    expect(shadowOf(el).querySelector('.row-name[data-key="k0"]')).toBe(k0Row)
    expect(shadowOf(el).querySelector('.row-name[data-key="k1"]')).toBe(k1Row)
    expect(barOf(el, 'k0')).toBe(k0Bar)
    // 选中态正确切换：取消选的 k0/k1 回未选中（行 class/aria/data + 条 class/data）
    expect(k0Row.classList.contains('selected')).toBe(false)
    expect(k0Row.getAttribute('aria-selected')).toBe('false')
    expect(k0Row.getAttribute('data-selected')).toBe('false')
    expect(k0Bar.classList.contains('selected')).toBe(false)
    expect(k0Bar.getAttribute('data-selected')).toBe('false')
    expect(k1Row.getAttribute('aria-selected')).toBe('false')
    // 选中的 k2/k3（Shift 区间连选）行与条都上选中态
    const k3Row = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="k3"]')!
    expect(k3Row.classList.contains('selected')).toBe(true)
    expect(k3Row.getAttribute('aria-selected')).toBe('true')
    expect(k3Row.getAttribute('data-selected')).toBe('true')
    expect(barOf(el, 'k3').classList.contains('selected')).toBe(true)
    expect(barOf(el, 'k3').getAttribute('data-selected')).toBe('true')
    // 公开语义未变
    expect(el.selection.slice().sort()).toEqual(['k2', 'k3'])
  })

  it('局部 patch：选择变化只写受影响行（其余行零 setAttribute、零 class 变更）', () => {
    const el = mount({ tasks: JSON.stringify(hugeTasks(10000)), height: '320', 'row-height': '36' })
    const shadow = shadowOf(el)
    const k0Row = shadow.querySelector<HTMLElement>('.row-name[data-key="k0"]')!
    const k1Row = shadow.querySelector<HTMLElement>('.row-name[data-key="k1"]')!
    const others = [...shadow.querySelectorAll<HTMLElement>('.row-name')].filter((r) => r.dataset.key !== 'k0')
    const before = others.map((r) => ({
      cls: r.className,
      aria: r.getAttribute('aria-selected'),
      data: r.getAttribute('data-selected'),
    }))
    const origSet = HTMLElement.prototype.setAttribute
    const touched: string[] = []
    HTMLElement.prototype.setAttribute = function (this: HTMLElement, name: string, value: string) {
      if (this.classList?.contains('row-name')) touched.push(this.dataset.key ?? '')
      return origSet.call(this, name, value)
    }
    try {
      el.selection = ['k0']
    } finally {
      HTMLElement.prototype.setAttribute = origSet
    }
    // 只有被选中行会被写（写次数 = 该行真正变化的属性个数，含 class 重写）
    expect([...new Set(touched)], '只有受影响行（k0）被写').toEqual(['k0'])
    expect(touched.length, `写次数应远小于窗口行数（实得 ${touched.length}）`).toBeLessThanOrEqual(3)
    expect(k0Row.classList.contains('selected')).toBe(true)
    // 未受影响行：脚本写操作零次 → class / aria-selected / data-selected 逐项不变
    expect(others.length).toBeGreaterThan(3)
    expect(
      others.map((r) => ({
        cls: r.className,
        aria: r.getAttribute('aria-selected'),
        data: r.getAttribute('data-selected'),
      })),
    ).toEqual(before)
    expect(k1Row.classList.contains('selected')).toBe(false)
    expect(k1Row.getAttribute('data-selected')).toBe('false')
  })

  it('数据/依赖/刻度/展开变化 → 计数增（缓存正确失效，计数不是恒零假绿）', () => {
    const tree: GanttTask[] = [
      {
        id: 'p',
        name: 'P',
        start: '2026-03-02',
        end: '2026-03-13',
        children: [
          { id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-06' },
          { id: 'c2', name: 'C2', start: '2026-03-05', end: '2026-03-10' },
        ],
      },
      { id: 'x', name: 'X', start: '2026-03-16', end: '2026-03-20', dependencies: [{ id: 'c1' }] },
    ]
    const el = mount({ tasks: JSON.stringify(tree), 'show-critical-path': '' })
    let prev = snap()
    // ① 依赖变化（updateTask 走 update → 全量重算：依赖图影响 CP 与连线）
    el.updateTask('x', { dependencies: [{ id: 'c1', type: 'ss' }] })
    let next = snap()
    expect(next.rowBuilds, '依赖变化 → buildRows 增').toBeGreaterThan(prev.rowBuilds)
    expect(next.unitBuilds, '依赖变化 → buildUnits 增').toBeGreaterThan(prev.unitBuilds)
    expect(next.cpComputes, '依赖变化 → 关键路径增').toBeGreaterThan(prev.cpComputes)
    // ② tasks 整体重写（attribute 通道）
    prev = next
    el.setAttribute('tasks', JSON.stringify(tree.map((t) => ({ ...t, name: `${t.name}改` }))))
    next = snap()
    expect(next.rowBuilds, 'tasks 重写 → buildRows 增').toBeGreaterThan(prev.rowBuilds)
    expect(next.unitBuilds, 'tasks 重写 → buildUnits 增').toBeGreaterThan(prev.unitBuilds)
    expect(next.cpComputes, 'tasks 重写 → 关键路径增').toBeGreaterThan(prev.cpComputes)
    // ③ scale 变化（刻度与行树都随 update 重建）
    prev = next
    el.setAttribute('scale', 'week')
    next = snap()
    expect(next.rowBuilds, 'scale 变化 → buildRows 增').toBeGreaterThan(prev.rowBuilds)
    expect(next.unitBuilds, 'scale 变化 → buildUnits 增').toBeGreaterThan(prev.unitBuilds)
    // ④ expanded 变化（折叠改变行树）
    prev = next
    el.setAttribute('expanded', '[]')
    next = snap()
    expect(next.rowBuilds, 'expanded 变化 → buildRows 增').toBeGreaterThan(prev.rowBuilds)
    expect(shadowOf(el).querySelectorAll('.side-body .row-name').length, '折叠后仅父行').toBe(2)
  })

  it('windowed：选择变化同样零重建，绝对行号 aria 不受影响（切片内局部 patch）', async () => {
    const start = 12000
    const el = new OASGantt()
    el.setAttribute('windowed', '')
    el.setAttribute('total', '50000')
    el.setAttribute('window-start', String(start))
    el.setAttribute('height', '320')
    el.setAttribute('row-height', '36')
    el.setAttribute(
      'tasks',
      JSON.stringify(
        Array.from({ length: 20 }, (_, i) => ({
          id: `t${start + i}`,
          name: `T${start + i}`,
          start: '2026-03-02',
          end: '2026-03-06',
        })),
      ),
    )
    document.body.appendChild(el)
    // 滚到装载切片（绝对行 12000）——可视窗口与装载区相交才会渲染行
    const tb = tbodyOf(el)
    tb.scrollTop = start * 36
    tb.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const g = priv(el)
    const base = snap()
    const rowsRef = g.rows
    const first = shadowOf(el).querySelector<HTMLElement>('.row-name')!
    expect(first.dataset.key).toBe('t12000')
    expect(first.getAttribute('aria-posinset'), '绝对行号（1 基）').toBe('12001')
    expect(first.hasAttribute('aria-rowindex'), 'treeitem 不使用 aria-rowindex').toBe(false)
    expect(first.getAttribute('aria-setsize')).toBe('50000')

    el.selection = ['t12003']
    el.selection = ['t12005']
    clickRow(el, 't12006')

    expect(snap(), 'windowed 下选择变化同样零全量重算').toEqual(base)
    expect(g.rows).toBe(rowsRef)
    expect(shadowOf(el).querySelector('.row-name[data-key="t12000"]')).toBe(first)
    // 绝对行号 aria 不因选择变化漂移；全量口径由行 setsize 承载（不使用 rowcount/rowindex）
    expect(first.getAttribute('aria-posinset')).toBe('12001')
    expect(first.hasAttribute('aria-rowindex')).toBe(false)
    expect(shadowOf(el).querySelector('.side-rows')!.hasAttribute('aria-rowcount')).toBe(false)
    // 选中态落到切片内目标行（行 aria/class/data + 条 class/data）
    const selRow = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="t12006"]')!
    expect(selRow.getAttribute('aria-selected')).toBe('true')
    expect(selRow.getAttribute('data-selected')).toBe('true')
    expect(selRow.classList.contains('selected')).toBe(true)
    expect(barOf(el, 't12006').classList.contains('selected')).toBe(true)
    expect(el.selection).toEqual(['t12006'])
    el.remove()
  })

  it('写回单通道：一次 updateTask 全量构建恰好 1 次（旧实现属性通道 + 手动 update 双跑）', () => {
    const el = mount({ tasks: JSON.stringify(hugeTasks(200)), height: '320', 'row-height': '36' })
    const before = snap()
    el.updateTask('k0', { progress: 10 })
    const after = snap()
    expect(after.rowBuilds - before.rowBuilds, '一次 updateTask = 1 次 buildRows').toBe(1)
    expect(after.unitBuilds - before.unitBuilds, '一次 updateTask = 1 次 buildUnits').toBe(1)
  })

  it('写回单通道：auto-schedule 联动拖拽全量构建 2 次（拖拽帧 + 联动帧；旧实现 sync+手动双跑 ×2 = 4 次）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02' },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
      ]),
    })
    // 挂载时联动已规整（b 前推到 03-03）→ 快照取挂载后的稳态
    const before = snap()
    dragSeq(barOf(el, 'a'), 72)
    const after = snap()
    expect(after.rowBuilds - before.rowBuilds, '联动拖拽 = 拖拽渲染 + 联动重渲染 = 2（非 4）').toBe(2)
    expect(after.unitBuilds - before.unitBuilds, 'buildUnits 同口径 2 次').toBe(2)
    expect(taskOf(el, 'b').start).toBe('2026-03-05')
  })

  it('写回单通道：auto-schedule 联动一次 updateTask 全量构建 2 次（旧实现 4 次）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
      ]),
    })
    const before = snap()
    el.updateTask('t', { start: '2026-03-01', end: '2026-03-02' })
    const after = snap()
    expect(after.rowBuilds - before.rowBuilds, '联动 updateTask = 提交帧 + 联动帧 = 2（非 4）').toBe(2)
    expect(taskOf(el, 't').start).toBe('2026-03-07')
  })
})

describe('OASGantt 列虚拟滚动（横向时间轴窗口）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 3 年跨度 day 档：units ≈ 1100 列（pad 前后各 1/4 列） */
  const LONG_TASKS = JSON.stringify([{ id: 'a', name: 'A', start: '2026-01-01', end: '2028-12-31' }])

  interface GanttPriv {
    units: Array<{ startMs: number; endMs: number; major: string; minor: string }>
    majorGroups: Array<{ startCol: number; endCol: number; label: string }>
    colW(): number
    canvasW: number
    winStart: number
    winEnd: number
    winColStart: number
    winColEnd: number
    renderWindow(): void
    renderHeader(): void
    computeColWindow(): void
    onViewportResize(): void
  }
  const priv = (el: OASGantt): GanttPriv => el as unknown as GanttPriv

  function stubViewport(el: OASGantt, width: number): HTMLElement {
    const tbody = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    Object.defineProperty(tbody, 'clientWidth', { value: width, configurable: true })
    priv(el).onViewportResize()
    return tbody
  }

  it('无测量环境回落：clientWidth=0 → 列窗口覆盖全部列（表头全量、.inner 总宽不变）', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    expect(g.units.length, '3 年 day 档应远超视口列数').toBeGreaterThan(1000)
    expect(g.winColStart).toBe(0)
    expect(g.winColEnd).toBe(g.units.length)
    expect(shadowOf(el).querySelectorAll('.head-minor .unit').length).toBe(g.units.length)
    expect(Number.parseFloat(shadowOf(el).querySelector<HTMLElement>('.inner')!.style.width)).toBe(
      g.units.length * g.colW(),
    )
  })

  it('列数远超视口：表头/周末格只渲染窗口列（主刻度为相交子集）；.inner 总宽 = 列数×列宽', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    stubViewport(el, 600)
    const colW = g.colW()
    const winSize = g.winColEnd - g.winColStart
    expect(g.winColStart, '未滚动 → 窗口从轴首起').toBe(0)
    expect(winSize, '窗口列数远小于总列数').toBeLessThan(100)
    // 辅刻度：渲染格数 === 窗口列数（含抽稀 blank 格）
    expect(shadowOf(el).querySelectorAll('.head-minor .unit').length).toBe(winSize)
    // 主刻度：只保留与窗口相交的组；left 仍按全局索引写（组起点 ∈ 窗口起点左侧或窗口内）
    const majors = [...shadowOf(el).querySelectorAll<HTMLElement>('.head-major .unit')]
    expect(majors.length, '相交主刻度组数远小于跨度总月数').toBeLessThan(10)
    expect(majors.length).toBeGreaterThanOrEqual(1)
    for (const m of majors) {
      const left = Number.parseFloat(m.style.left)
      expect(left, '组起点在窗口终点之前（相交）').toBeLessThan(g.winColEnd * colW)
      expect(left + Number.parseFloat(m.style.width), '组终点在窗口起点之后（相交）').toBeGreaterThan(
        g.winColStart * colW,
      )
    }
    // 周末/假日背景格只渲染窗口列（3 年约 470 个周末，窗口 42 列内 ≤ 窗口数）
    expect(shadowOf(el).querySelectorAll('.grid-canvas .cell').length).toBeLessThan(winSize + 1)
    // 画布总宽不变（滚动条长度保持）
    expect(Number.parseFloat(shadowOf(el).querySelector<HTMLElement>('.inner')!.style.width)).toBe(
      g.units.length * colW,
    )
  })

  it('横向滚动合帧平移列窗口：同帧多次 scroll 只重建一次，首个渲染辅刻度 left 变大', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    const tbody = stubViewport(el, 600)
    const colW = g.colW()
    const firstBefore = Number.parseFloat(shadowOf(el).querySelector<HTMLElement>('.head-minor .unit')!.style.left)
    const startBefore = g.winColStart
    const cbs: FrameRequestCallback[] = []
    const orig = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cbs.push(cb)
      return cbs.length
    }) as typeof requestAnimationFrame
    try {
      // 同一帧内连续两次 scroll（happy-dom 赋值 scrollLeft 不派发事件，手动 dispatch 走 onScroll 路径）
      Object.defineProperty(tbody, 'scrollLeft', { value: 200 * colW, configurable: true, writable: true })
      tbody.dispatchEvent(new Event('scroll'))
      Object.defineProperty(tbody, 'scrollLeft', { value: 300 * colW, configurable: true, writable: true })
      tbody.dispatchEvent(new Event('scroll'))
      expect(cbs.length, '同帧多次 scroll 只排一次 rAF').toBe(1)
      cbs[0]!(0)
      expect(g.winColStart, '窗口平移到滚动处（−buffer）').toBe(300 - 4)
      const firstAfter = Number.parseFloat(shadowOf(el).querySelector<HTMLElement>('.head-minor .unit')!.style.left)
      expect(firstAfter, '首个渲染辅刻度全局 left 变大').toBeGreaterThan(firstBefore)
      expect(firstAfter).toBe(g.winColStart * colW)
      expect(Number.parseFloat(shadowOf(el).querySelector<HTMLElement>('.inner')!.style.width)).toBe(
        g.units.length * colW,
      )
    } finally {
      globalThis.requestAnimationFrame = orig
    }
  })

  it('RTL 负值 scrollLeft：取绝对值切出同一窗口；镜像 left = canvasW − k×colW − colW', () => {
    const el = mount({ dir: 'rtl', tasks: LONG_TASKS })
    const g = priv(el)
    const tbody = stubViewport(el, 600)
    const colW = g.colW()
    Object.defineProperty(tbody, 'scrollLeft', { value: -(200 * colW), configurable: true, writable: true })
    g.renderWindow()
    expect(g.winColStart, '负值取绝对值后与 LTR 同窗口').toBe(200 - 4)
    expect(g.winColEnd).toBe(Math.min(g.units.length, 200 + Math.ceil(600 / colW) + 4))
    const minors = [...shadowOf(el).querySelectorAll<HTMLElement>('.head-minor .unit')]
    expect(minors.length).toBe(g.winColEnd - g.winColStart)
    expect(Number.parseFloat(minors[0]!.style.left), 'RTL 镜像：left 按全局索引取镜像').toBeCloseTo(
      g.canvasW - g.winColStart * colW - colW,
      5,
    )
  })

  it('容器变宽（列宽被钳位不变）：列窗口随之扩展覆盖新右缘——零 scroll、零数据变化', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    stubViewport(el, 600)
    const colW = g.colW()
    expect(colW, '长跨度 day 档列宽被钳到下限 16（钳位是本回归的前提）').toBe(16)
    expect(g.winColEnd * colW, '窄视口下窗口已覆盖右缘').toBeGreaterThanOrEqual(600)
    const colsBefore = g.winColEnd - g.winColStart
    // 容器变宽：不派发 scroll、不改数据 → ResizeObserver 回调路径（onViewportResize）。
    // 回归点：旧实现只比较 displayColW（钳位下 16 === 16）→ 早退跳过窗口重算 → 右侧露白
    stubViewport(el, 1200)
    expect(g.colW(), '列宽仍被钳位（列宽不变不得作为早退依据）').toBe(16)
    expect(g.winColEnd * colW, '窗口必须覆盖变宽后的视口右缘').toBeGreaterThanOrEqual(1200)
    expect(g.winColEnd - g.winColStart, '可见列数增加').toBeGreaterThan(colsBefore)
    expect(shadowOf(el).querySelectorAll('.head-minor .unit').length, '表头格随窗口重切片').toBe(
      g.winColEnd - g.winColStart,
    )
    expect(el.tasks[0]!.start, '数据不变').toBe('2026-01-01')
    expect(
      Number.parseFloat(shadowOf(el).querySelector<HTMLElement>('.inner')!.style.width),
      '画布总宽不变（滚动范围不随窗口变化）',
    ).toBe(g.units.length * colW)
  })

  it('容器变窄（零滚动）：列窗口同步收缩且仍覆盖收缩后的右缘', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    stubViewport(el, 1200)
    const colsWide = g.winColEnd - g.winColStart
    stubViewport(el, 300)
    expect(g.colW(), '列宽仍钳位 16').toBe(16)
    expect(g.winColEnd * 16, '窗口覆盖收缩后的视口右缘').toBeGreaterThanOrEqual(300)
    expect(g.winColEnd - g.winColStart, '可见列数减少').toBeLessThan(colsWide)
  })

  it('辅刻度抽稀决策全列锁定：窗口平移/变宽/列宽跨步进后逐格可见性与全量计算一致（缓存不漂移）', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    const tbody = stubViewport(el, 600)
    const DAY_STRIDES = [1, 2, 7, 14, 28]
    // 期望基准 = 全列标签 + 同一纯函数（旧实现逐帧全量计算的产物）
    const expectedFor = (c: number): Set<number> =>
      new Set(
        pickVisibleLabels(
          g.units.map((u) => u.minor),
          c,
          DAY_STRIDES,
        ),
      )
    const assertWindow = (expected: Set<number>): void => {
      const cells = [...shadowOf(el).querySelectorAll<HTMLElement>('.head-minor .unit')]
      expect(cells.length).toBe(g.winColEnd - g.winColStart)
      for (let k = g.winColStart; k < g.winColEnd; k++) {
        const cell = cells[k - g.winColStart]!
        expect((cell.textContent ?? '') !== '', `第 ${k} 列可见性应与全列抽稀决策一致`).toBe(expected.has(k))
      }
    }
    const expectedNarrow = expectedFor(16)
    assertWindow(expectedNarrow)
    // 窗口平移（scrollLeft 变化后 renderWindow，等价 rAF 合帧下半段）：缓存命中仍逐格一致
    Object.defineProperty(tbody, 'scrollLeft', { value: 137 * 16, configurable: true, writable: true })
    g.renderWindow()
    assertWindow(expectedNarrow)
    // 视口变宽（列宽仍钳位）：窗口扩展后仍一致
    stubViewport(el, 1200)
    assertWindow(expectedNarrow)
    // 列宽跨抽稀步进（16 → ≈21.7：2 字符估宽 13.2 + 间隙 6 = 19.2，1×colW 越过阈值 → 步进 2 → 1）：
    // 缓存必须随 colW 失效重算（若缓存键漏 colW → 仍按步进 2 → 此断言红）
    stubViewport(el, 24000)
    expect(g.colW(), '列宽脱离钳位并跨过步进阈值').toBeGreaterThan(19.2)
    assertWindow(expectedFor(g.colW()))
  })

  it('主刻度分组预计算逐格一致：窗口切片 === 全量相邻分组后过滤（含窗口起点落组内、组跨窗口两端）', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    const tbody = stubViewport(el, 600)
    const colW = g.colW()
    // 参照系 = 旧实现语义：全量相邻同标签分组，再按「与窗口相交」过滤（start < to && end > from）。
    // 预计算产物（renderHeader 实际渲染序列）必须与该参照逐一相等——否则横滚动画漂移
    const groups: Array<{ start: number; end: number; label: string }> = []
    {
      let i = 0
      while (i < g.units.length) {
        let j = i
        while (j + 1 < g.units.length && g.units[j + 1]!.major === g.units[i]!.major) j++
        groups.push({ start: i, end: j + 1, label: g.units[i]!.major })
        i = j + 1
      }
    }
    expect(groups.length, '3 年 day 档主刻度分组数（≈月数，预计算确实发生）').toBeGreaterThan(30)
    const expectWindow = (from: number, to: number): void => {
      const cells = [...shadowOf(el).querySelectorAll<HTMLElement>('.head-major .unit')]
      const expected = groups.filter((gr) => gr.start < to && gr.end > from)
      expect(cells.length, `窗口 [${from},${to}) 渲染主刻度组数 = 全量分组过滤结果`).toBe(expected.length)
      for (let k = 0; k < expected.length; k++) {
        const gr = expected[k]!
        expect(cells[k]!.textContent, `第 ${k} 组标签`).toBe(gr.label)
        expect(Number.parseFloat(cells[k]!.style.left), `第 ${k} 组 left 按全局列索引`).toBe(gr.start * colW)
        expect(Number.parseFloat(cells[k]!.style.width), `第 ${k} 组 width = 组跨度×列宽`).toBe(
          (gr.end - gr.start) * colW,
        )
      }
    }
    // ① 轴首：窗口起点 = 0（组边界与窗口起点对齐）
    expect(g.winColStart).toBe(0)
    expectWindow(g.winColStart, g.winColEnd)
    // ② 窗口起点落在组内部（137 列 ≈ 月中，二分定位的首组被窗口左缘截断）
    Object.defineProperty(tbody, 'scrollLeft', { value: 137 * colW, configurable: true, writable: true })
    g.renderWindow()
    expect(g.winColStart, '窗口已平移到轴中段').toBeGreaterThan(0)
    expectWindow(g.winColStart, g.winColEnd)
    // ③ 组跨窗口两端：视口收窄到 40px（窗口 ≤ 11 列 < 月组跨度 ~28..31 列），再滚到某大组正中
    //    → 窗口完全落在单组内部（组同时跨窗口左右两缘）
    Object.defineProperty(tbody, 'clientWidth', { value: 40, configurable: true })
    ;(el as unknown as { onViewportResize(): void }).onViewportResize()
    const winSize = g.winColEnd - g.winColStart
    expect(winSize, '窄视口窗口列数（小于组跨度是本情形前提）').toBeLessThan(28)
    const big = groups.find((gr) => gr.end - gr.start >= winSize)
    expect(big, '存在跨度 ≥ 窗口的组（day 档月组）').toBeTruthy()
    const mid = big!.start + Math.floor((big!.end - big!.start) / 2)
    Object.defineProperty(tbody, 'scrollLeft', { value: mid * colW, configurable: true, writable: true })
    g.renderWindow()
    expect(g.winColStart, '窗口起点落在组内部').toBeGreaterThan(big!.start)
    expect(g.winColEnd, '窗口终点落在组内部（组跨窗口两端）').toBeLessThan(big!.end)
    expectWindow(g.winColStart, g.winColEnd)
    // ④ 轴尾：窗口右缘被总列数钳制（末组被窗口右缘截断）
    Object.defineProperty(tbody, 'scrollLeft', { value: 100000, configurable: true, writable: true })
    g.renderWindow()
    expect(g.winColEnd, '窗口右缘钳在总列数').toBe(g.units.length)
    expectWindow(g.winColStart, g.winColEnd)
  })

  it('renderHeader 不随总列数线性（分组预计算 + 二分）：10 年 day 档滚动帧不再扫全列', () => {
    const el = mount({ tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2016-01-01', end: '2025-12-31' }]) })
    const g = priv(el)
    const tbody = stubViewport(el, 600)
    expect(g.units.length, '10 年 day 档列数（旧实现单帧全列扫描 ≈2× 此数）').toBeGreaterThan(3500)
    expect(g.majorGroups.length, '主刻度已预计算分组（≈月数，远小于总列数）').toBeLessThan(200)
    g.renderWindow() // 预热辅刻度抽稀缓存（滚动稳态下缓存命中，计数只反映窗口切片路径）
    // 计数探针：把实例的 units 数据属性换成计数 getter——renderHeader 内每一次 this.units
    // 读取都被记录。旧实现主刻度扫描每帧读 ≈2×总列数（≈7300）；新实现只读缓存键 + 窗口内
    // 可见辅刻度格（≈30）。若退回全列扫描，此断言必红。
    let reads = 0
    const raw = g.units
    Object.defineProperty(el, 'units', {
      get: () => {
        reads++
        return raw
      },
      configurable: true,
    })
    try {
      Object.defineProperty(tbody, 'scrollLeft', { value: 1000 * g.colW(), configurable: true, writable: true })
      g.computeColWindow()
      g.renderHeader()
    } finally {
      delete (el as unknown as { units?: unknown }).units
      ;(el as unknown as { units: unknown }).units = raw
    }
    expect(reads, '滚动帧 renderHeader 读 units 次数有上界（全列扫描应 ≈7300）').toBeLessThan(200)
  })

  it('容器变高（零滚动零数据变化）：行窗口扩展覆盖新视口高——底部不露白', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      id: 'r' + i,
      name: 'R' + i,
      start: '2026-01-01',
      end: '2026-03-31',
    }))
    const el = mount({ tasks: JSON.stringify(rows) })
    const g = priv(el)
    const tbody = shadowOf(el).querySelector<HTMLElement>('.tbody')!
    const rowH = 36
    Object.defineProperty(tbody, 'clientWidth', { value: 600, configurable: true })
    Object.defineProperty(tbody, 'clientHeight', { value: 100, configurable: true })
    ;(el as unknown as { onViewportResize(): void }).onViewportResize()
    expect(g.winEnd * rowH, '矮视口下行窗口已覆盖视口高（卫断言：前提成立）').toBeGreaterThanOrEqual(100)
    const rowsBefore = g.winEnd - g.winStart
    // 容器变高：不滚动、不改数据 → ResizeObserver 回调路径（onViewportResize）。
    // 回归点：旧实现只比较「视口宽 + displayColW」（两者均不变）→ 早退跳过 renderWindow
    // → 行窗口不补，底部露白直到滚动才重建
    Object.defineProperty(tbody, 'clientHeight', { value: 800, configurable: true })
    ;(el as unknown as { onViewportResize(): void }).onViewportResize()
    expect(g.winEnd * rowH, '行窗口必须覆盖变高后的视口底部').toBeGreaterThanOrEqual(800)
    expect(g.winEnd - g.winStart, '可见行数随视口变高增加').toBeGreaterThan(rowsBefore)
    expect(nameRows(el).length, '渲染行名数 = 行窗口宽度').toBe(g.winEnd - g.winStart)
  })

  it('scrollToDate 同步出窗口：调用返回即已渲染目标列窗口 + 表头偏移已同步（与 resource 口径一致）', () => {
    const el = mount({ tasks: LONG_TASKS })
    const g = priv(el)
    const tbody = stubViewport(el, 600)
    const colW = g.colW()
    // F2 回归：scrollToDate 末尾补 syncHeaderOffset（旧实现表头 transform 只在 onScroll 里更新，
    // 调用返回瞬间表头 DOM 已切窗口、transform 仍指旧位 → 错位量 = 整段滚动位移，下一帧才归零）。
    // happy-dom 无布局：stub .inner 与 .thead 的水平 rect 差 42px，断言调用返回瞬间 transform
    // 已按最新差值重写（若漏调用，transform 停留在 mount 时的 'translateX(0px)'）
    stubRect(shadowOf(el).querySelector<HTMLElement>('.inner')!, 0, 42, 600, 200)
    stubRect(shadowOf(el).querySelector<HTMLElement>('.thead')!, 0, 0, 600, 44)
    el.scrollToDate('2027-06-15')
    // 断言窗口状态与 DOM 都已同步反映目标滚动位置（旧实现只设 scrollLeft，窗口靠异步
    // scroll → rAF 合帧补齐 → 调用返回瞬间表头/条仍是旧窗口）
    const sl = tbody.scrollLeft
    expect(sl, 'scrollToDate 已滚动').toBeGreaterThan(0)
    expect(g.winColStart, '列窗口起点与 scrollLeft 同步（max(0, floor(sl/colW) − buffer)）').toBe(
      Math.max(0, Math.floor(sl / colW) - 4),
    )
    const minors = [...shadowOf(el).querySelectorAll<HTMLElement>('.head-minor .unit')]
    expect(minors.length, '表头已按目标窗口重切片').toBe(g.winColEnd - g.winColStart)
    expect(Number.parseFloat(minors[0]!.style.left), '首个渲染辅刻度 left = 窗口起点×列宽').toBe(g.winColStart * colW)
    // F2 回归断言：调用返回瞬间表头两层 transform 已同步（表头与 .inner 水平 rect 差 ≈ 0）
    expect(
      shadowOf(el).querySelector<HTMLElement>('.head-major')!.style.transform,
      'scrollToDate 返回瞬间主刻度层 transform 已重写',
    ).toBe('translateX(42px)')
    expect(
      shadowOf(el).querySelector<HTMLElement>('.head-minor')!.style.transform,
      'scrollToDate 返回瞬间辅刻度层 transform 已重写',
    ).toBe('translateX(42px)')
    // 感知层：目标日期列已落在新窗口内（命令式滚动返回即渲染目标区域）
    const targetMs = new Date(2027, 5, 15).getTime()
    const idx = g.units.findIndex((u) => u.startMs <= targetMs && targetMs < u.endMs)
    expect(idx, '目标日期在轴内').toBeGreaterThanOrEqual(0)
    expect(g.winColStart, '目标列不早于窗口起点').toBeLessThanOrEqual(idx)
    expect(g.winColEnd, '目标列在窗口内').toBeGreaterThan(idx)
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

  it('holidaySet 缓存：同一属性原文复用同一 Set（每帧 JSON.parse 消除）；属性变更即失效，语义与逐次解析一致', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-08' }]),
      holidays: JSON.stringify(['2026-03-04']),
    })
    const api = el as unknown as { holidaySet(): Set<string> }
    const s1 = api.holidaySet()
    const s2 = api.holidaySet()
    expect(s2, '同属性原文 → 复用同一实例（无缓存实现每次 new Set → 此断言红）').toBe(s1)
    expect([...s1]).toEqual(['2026-03-04'])
    // 属性原文变化 → 缓存失效、内容更新
    el.setAttribute('holidays', JSON.stringify(['2026-03-05']))
    const s3 = api.holidaySet()
    expect(s3, '属性原文变化 → 换新缓存').not.toBe(s1)
    expect([...s3]).toEqual(['2026-03-05'])
    // 非法 JSON → 空集（渲染零假日格，与逐次解析语义一致）
    el.setAttribute('holidays', '{bad')
    expect(api.holidaySet().size).toBe(0)
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

  it('自定义字段透传：assignee 等白名单外字段原样保留（读/写/克隆/增量更新）', () => {
    const el = mount({
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', assignee: '张三', tag: 7 }]),
    })
    expect((el.tasks[0] as Record<string, unknown>).assignee).toBe('张三')
    expect((el.tasks[0] as Record<string, unknown>).tag).toBe(7)
    // 增量更新保留其他自定义字段
    el.updateTask('a', { progress: 50 })
    expect((el.tasks[0] as Record<string, unknown>).assignee).toBe('张三')
    // 克隆保留
    const id = el.duplicateTask('a')!
    expect((el.tasks.find((t) => t.id === id) as Record<string, unknown>).assignee).toBe('张三')
    // addTask 携带自定义字段
    const newId = el.addTask({ name: 'B', start: '2026-03-05', end: '2026-03-06', assignee: '李四' })
    expect((el.tasks.find((t) => t.id === newId) as Record<string, unknown>).assignee).toBe('李四')
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

  it('updateTask patch.children：子条目忽略（数据契约以扁平 parent 指针为准）+ devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ tasks: JSON.stringify([{ id: 'p', name: 'P', start: '2026-03-02', end: '2026-03-06' }]) })
      expect(
        el.updateTask('p', {
          name: 'P2',
          children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-03' }],
        }),
      ).toBe(true)
      expect(el.tasks.length, 'patch.children 不被拍平进数据（丢弃改为告警，层级走 parent 指针）').toBe(1)
      expect(el.tasks[0]!.name).toBe('P2')
      expect(warn.mock.calls.some((c) => String(c[0]).includes('patch.children'))).toBe(true)
    } finally {
      warn.mockRestore()
    }
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

  it('级联：拖 A 后 B/C 逐级顺延；工期保持；一次操作只发一次 oas-tasks-change + reschedule 一次', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02' },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'a' }] },
        { id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-02', dependencies: [{ id: 'b' }] },
      ]),
    })
    const seen = watchReschedule(el)
    // 契约（写回单通道收口后）：一次用户操作只发一次 oas-tasks-change——旧实现「拖拽自身 +
    // reschedule」各发一次（共 2 次）；现在联动收口并入外层提交口统一派发（含联动后最终数据），
    // 事件序为 reschedule（联动收口）→ tasks-change（提交口）
    const order: string[] = []
    el.addEventListener('oas-tasks-change', () => order.push('tasks-change'))
    el.addEventListener('oas-reschedule', () => order.push('reschedule'))
    dragSeq(barOf(el, 'a'), 72)
    expect(taskOf(el, 'a').start).toBe('2026-03-04')
    expect(taskOf(el, 'b').start).toBe('2026-03-05')
    expect(taskOf(el, 'c').start).toBe('2026-03-06')
    expect(seen).toHaveLength(1)
    expect([...seen[0]!].sort()).toEqual(['b', 'c'])
    expect(order).toEqual(['reschedule', 'tasks-change'])
    // 属性与 DOM 最终一致
    expect(JSON.parse(el.getAttribute('tasks') ?? '[]').find((t: { id: string }) => t.id === 'c').start).toBe(
      '2026-03-06',
    )
  })

  it('属性通道直接改写 tasks：联动排程事件序统一为 reschedule → tasks-change（一次 tasks-change）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'd' }] },
      ]),
    })
    const order: string[] = []
    el.addEventListener('oas-tasks-change', () => order.push('tasks-change'))
    el.addEventListener('oas-reschedule', () => order.push('reschedule'))
    // 属性通道（非内部写回）：同数据再次写入 → update 末尾 reschedule 前推 t
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'd' }] },
      ]),
    )
    expect(taskOf(el, 't').start).toBe('2026-03-07')
    expect(order).toEqual(['reschedule', 'tasks-change'])
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

describe('OASGantt 依赖 lag/lead', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 前置 d（03-02..03-06，右缘 03-07）+ 后继 t（03-01..03-02，工期 2 天）单一依赖 */
  const pair = (dep: Record<string, unknown>): string =>
    JSON.stringify([
      { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
      { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [dep] },
    ])

  it('sanitizeDeps：保留合法 lag；非法 lag 丢弃；lag 不参与去重键（同源同型不同 lag 仍去重）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02' },
        {
          id: 'b',
          name: 'B',
          start: '2026-03-03',
          end: '2026-03-04',
          dependencies: [
            { id: 'a', type: 'fs', lag: 2 },
            { id: 'a', type: 'fs', lag: 3 }, // 同源同型 → 去重（lag 不参与键）
            { id: 'a', type: 'ss', lag: 'x' }, // 非法 lag（字符串）→ 丢弃 lag 键
          ],
        },
      ]),
    })
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([
      { id: 'a', type: 'fs', lag: 2 },
      { id: 'a', type: 'ss' },
    ])
  })

  it('sanitizeDeps：NaN / Infinity lag 经 property 通道丢弃（有限数值才保留）', () => {
    const el = mount({})
    el.tasks = [
      { id: 'a', name: 'A', start: '2026-03-02' },
      {
        id: 'b',
        name: 'B',
        start: '2026-03-03',
        end: '2026-03-04',
        dependencies: [
          { id: 'a', type: 'fs', lag: Number.NaN },
          { id: 'a', type: 'ss', lag: Number.POSITIVE_INFINITY },
          { id: 'a', type: 'ff', lag: -1.5 },
        ],
      },
    ]
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([
      { id: 'a', type: 'fs' },
      { id: 'a', type: 'ss' },
      { id: 'a', type: 'ff', lag: -1.5 },
    ])
  })

  it('fs + 正 lag：后继起点 = 前置右缘 + lag 天（工期不变）', () => {
    const el = mount({ 'auto-schedule': '', tasks: pair({ id: 'd', type: 'fs', lag: 2 }) })
    // d 右缘 03-07 + 2 天 = 03-09；工期 2 天 → end 03-10
    expect(taskOf(el, 't').start).toBe('2026-03-09')
    expect(taskOf(el, 't').end).toBe('2026-03-10')
  })

  it('ss + 正 lag：后继起点 = 前置起点 + lag 天', () => {
    const el = mount({ 'auto-schedule': '', tasks: pair({ id: 'd', type: 'ss', lag: 2 }) })
    // d 起点 03-02 + 2 天 = 03-04；工期 2 天 → end 03-05
    expect(taskOf(el, 't').start).toBe('2026-03-04')
    expect(taskOf(el, 't').end).toBe('2026-03-05')
  })

  it('ff + 正 lag：后继右缘 = 前置右缘 + lag 天', () => {
    const el = mount({ 'auto-schedule': '', tasks: pair({ id: 'd', type: 'ff', lag: 2 }) })
    // d 右缘 03-07 + 2 天 = 03-09（后继右缘）→ 起点 = 03-09 − 工期 2 = 03-07；end 数据（含端）= 03-08
    expect(taskOf(el, 't').start).toBe('2026-03-07')
    expect(taskOf(el, 't').end).toBe('2026-03-08')
  })

  it('sf + 正 lag：后继右缘 = 前置起点 + lag 天', () => {
    const el = mount({ 'auto-schedule': '', tasks: pair({ id: 'd', type: 'sf', lag: 2 }) })
    // d 起点 03-02 + 2 天 = 03-04（后继右缘）→ 起点 = 03-04 − 工期 2 = 03-02；end 数据（含端）= 03-03
    expect(taskOf(el, 't').start).toBe('2026-03-02')
    expect(taskOf(el, 't').end).toBe('2026-03-03')
  })

  it('负 lag（lead）：约束更松（允许重叠），前推距离小于 lag=0', () => {
    const zero = mount({ 'auto-schedule': '', tasks: pair({ id: 'd', type: 'fs', lag: 0 }) })
    expect(taskOf(zero, 't').start, 'lag=0 → 03-07').toBe('2026-03-07')
    const lead = mount({ 'auto-schedule': '', tasks: pair({ id: 'd', type: 'fs', lag: -2 }) })
    // lead 2 天：右缘 03-07 − 2 天 = 03-05，早于 lag=0 的 03-07（约束更松）；工期 2 天 → end 03-06
    expect(taskOf(lead, 't').start).toBe('2026-03-05')
    expect(taskOf(lead, 't').end).toBe('2026-03-06')
  })

  it('lag 安全域：极大有限 lag（1e8 天）+ auto-schedule 不抛 RangeError（hour 精度走 fmtIso/Intl 崩溃路径）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // 旧实现：1e8 × DAY_MS = 8.64e15 恰在 Date 合法域边缘（Number.isFinite 放行），
      // 排程叠加真实日期后超域 → Invalid Date → fmtIso → Intl.formatToParts 抛 RangeError（白屏）
      const el = mount({
        'auto-schedule': '',
        tasks: JSON.stringify([
          { id: 'd', name: 'D', start: '2026-03-02 08:00', end: '2026-03-02 12:00' },
          {
            id: 't',
            name: 'T',
            start: '2026-03-03 09:00',
            end: '2026-03-03 10:00',
            dependencies: [{ id: 'd', lag: 1e8 }],
          },
        ]),
      })
      // 挂载即清洗：越域 lag 丢弃为无 lag（依赖保留）；fs 约束本已满足 → 数据原样
      expect(taskOf(el, 't').dependencies).toEqual([{ id: 'd' }])
      expect(taskOf(el, 't').start).toBe('2026-03-03 09:00')
      // 命令式改期触发联动前推：前置右缘 03-02 12:00（fmtIso 正常，不产生 Invalid Date）
      expect(() => el.updateTask('t', { start: '2026-03-01 09:00', end: '2026-03-01 10:00' })).not.toThrow()
      expect(taskOf(el, 't').start).toBe('2026-03-02 12:00')
      expect(taskOf(el, 't').end).toBe('2026-03-02 13:00')
      // 组件可渲染（非白屏）
      expect(barOf(el, 't')).not.toBeNull()
    } finally {
      warn.mockRestore()
    }
  })

  it('lag 安全域：日精度极大 lag（1e9 天）属性通道清洗为无 lag，排程产出合法日期（不写 NaN 数据串）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd', lag: 1e9 }] },
      ]),
    })
    const t = taskOf(el, 't')
    expect(t.dependencies).toEqual([{ id: 'd' }])
    // lag 清洗为 0 → 前推到前置右缘 03-07（工期 2 天 → end 03-08）；
    // 旧实现在此写出 NaN-NaN-NaN 数据串（toISODate(Invalid Date)）
    expect(t.start).toBe('2026-03-07')
    expect(t.end).toBe('2026-03-08')
    expect(t.start, '不产生 Invalid Date 数据串').not.toContain('NaN')
    expect(barOf(el, 't')).not.toBeNull()
  })

  it('lag 安全域：1e7 天（旧上限放行）按 0 处理——不写 5 位年份、回写不丢任务、属性通道告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        'auto-schedule': '',
        tasks: JSON.stringify([
          { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
          {
            id: 't',
            name: 'T',
            start: '2026-03-01',
            end: '2026-03-02',
            dependencies: [{ id: 'd', type: 'fs', lag: 1e7 }],
          },
        ]),
      })
      const t = taskOf(el, 't')
      // 旧上限 1e15 ms（≈1.15e7 天）放行 1e7 天 → 2026 + 27397 年 = 29405（5 位年份）
      expect(t.dependencies).toEqual([{ id: 'd', type: 'fs' }])
      expect(t.start).toBe('2026-03-07')
      expect(t.start, '不写出 5 位年份（旧实现 29405-…）').not.toMatch(/^\d{5}-/)
      // 属性通道越域告警一次（实例级去重）
      const msgs = (): string[] => warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('超出安全域'))
      expect(msgs().length).toBe(1)
      expect(msgs()[0]).toContain('lag=10000000')
      el.requestUpdate()
      expect(msgs().length, '重渲染不重复告警').toBe(1)
      // 回写：旧实现 5 位年份不能被 parseTaskDate 回读 → 清洗层静默丢任务
      el.tasks = el.tasks
      expect(el.tasks.map((x) => x.id).sort()).toEqual(['d', 't'])
      expect(taskOf(el, 't').start).toBe('2026-03-07')
    } finally {
      warn.mockRestore()
    }
  })

  it('lag 安全域：1e8 / 1e10 天仍按 0 处理且回写不崩（不写 5 位年份）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        'auto-schedule': '',
        tasks: JSON.stringify([
          { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
          {
            id: 't',
            name: 'T',
            start: '2026-03-01',
            end: '2026-03-02',
            dependencies: [
              { id: 'd', type: 'ss', lag: 1e8 },
              { id: 'd', type: 'ff', lag: 1e10 },
            ],
          },
        ]),
      })
      expect(taskOf(el, 't').dependencies).toEqual([
        { id: 'd', type: 'ss' },
        { id: 'd', type: 'ff' },
      ])
      expect(() => {
        el.tasks = el.tasks
      }).not.toThrow()
      expect(el.tasks.map((x) => x.id).sort()).toEqual(['d', 't'])
      for (const x of el.tasks) expect(x.start).not.toMatch(/^\d{5}-/)
    } finally {
      warn.mockRestore()
    }
  })

  it('lag 安全域：写回结果必须可回读——边界年份（9999）叠加越界时不写 5 位年份、回写不丢任务', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        'auto-schedule': '',
        tasks: JSON.stringify([
          { id: 'd', name: 'D', start: '9999-12-01', end: '9999-12-10' },
          {
            id: 't',
            name: 'T',
            start: '9999-12-01',
            end: '9999-12-02',
            dependencies: [{ id: 'd', type: 'fs', lag: 10000 }], // 安全域内，但叠加 9999 年后为 5 位年份
          },
        ]),
      })
      // 越界写回被拒（不写 10027-…），数据保持可回读
      expect(taskOf(el, 't').start).toBe('9999-12-01')
      expect(taskOf(el, 't').start).not.toMatch(/^\d{5}-/)
      el.tasks = el.tasks
      expect(el.tasks.map((x) => x.id).sort()).toEqual(['d', 't'])
      for (const x of el.tasks) expect(x.start).not.toMatch(/^\d{5}-/)
    } finally {
      warn.mockRestore()
    }
  })

  it('lag 安全域：命令式 addDependency / updateDependency 传 1e308/1e10/Infinity/NaN 不抛且结果合法', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        'auto-schedule': '',
        tasks: JSON.stringify([
          { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
          { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05' },
        ]),
      })
      // a 右缘 03-04 = b 起点：fs 约束已满足（联动不改日期），聚焦 lag 清洗口径
      expect(() => el.addDependency('b', { id: 'a', lag: 1e308 })).not.toThrow()
      expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'fs' }])
      expect(() => el.addDependency('b', { id: 'a', type: 'ss', lag: 1e10 })).not.toThrow()
      expect(() => el.addDependency('b', { id: 'a', type: 'ff', lag: Number.POSITIVE_INFINITY })).not.toThrow()
      expect(() => el.addDependency('b', { id: 'a', type: 'sf', lag: Number.NaN })).not.toThrow()
      expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([
        { id: 'a', type: 'fs' },
        { id: 'a', type: 'ss' },
        { id: 'a', type: 'ff' },
        { id: 'a', type: 'sf' },
      ])
      // 命令式通道告警一次（warnOnce key = lag:<taskId>，同任务去重）
      expect(warn.mock.calls.some((c) => String(c[0]).includes('addDependency 的 lag'))).toBe(true)
      // updateDependency：越域 to.lag → 回退继承原 lag（fs 无原 lag → 不落 lag 键）
      expect(() => el.updateDependency('b', { id: 'a', type: 'fs' }, { id: 'a', type: 'fs', lag: 1e10 })).not.toThrow()
      expect(el.tasks.find((t) => t.id === 'b')!.dependencies![0]).toEqual({ id: 'a', type: 'fs' })
      // 正常 lag 命令式通道不受影响
      expect(el.updateDependency('b', { id: 'a', type: 'fs' }, { id: 'a', type: 'fs', lag: 3 })).toBe(true)
      expect(el.tasks.find((t) => t.id === 'b')!.dependencies![0]).toEqual({ id: 'a', type: 'fs', lag: 3 })
    } finally {
      warn.mockRestore()
    }
  })

  it('lag 安全域：正常 lag（±3）属性通道不受影响', () => {
    const lag3 = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd', lag: 3 }] },
      ]),
    })
    expect(taskOf(lag3, 't').dependencies).toEqual([{ id: 'd', lag: 3 }])
    // d 右缘 03-07 + 3 天 = 03-10；工期 2 天（03-01..03-02 含端）→ end 03-11
    expect(taskOf(lag3, 't').start).toBe('2026-03-10')
    expect(taskOf(lag3, 't').end).toBe('2026-03-11')
    const lead3 = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-10', end: '2026-03-12' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd', lag: -3 }] },
      ]),
    })
    expect(taskOf(lead3, 't').dependencies).toEqual([{ id: 'd', lag: -3 }])
    // d 右缘 03-13 − 3 天 = 03-10（lead 约束更松）；工期 2 天 → end 03-11
    expect(taskOf(lead3, 't').start).toBe('2026-03-10')
    expect(taskOf(lead3, 't').end).toBe('2026-03-11')
  })

  it('addDependency：透传 lag；缺省不写 lag；同源同型不同 lag 仍视为重复', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05' },
      ]),
    })
    expect(el.addDependency('b', { id: 'a', lag: 3 })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([{ id: 'a', type: 'fs', lag: 3 }])
    // 同源同型（lag 不参与去重键）→ false，不追加
    expect(el.addDependency('b', { id: 'a', lag: 5 })).toBe(false)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toHaveLength(1)
    // 缺省 lag 不写键
    expect(el.addDependency('b', { id: 'a', type: 'ss' })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'b')!.dependencies).toEqual([
      { id: 'a', type: 'fs', lag: 3 },
      { id: 'a', type: 'ss' },
    ])
  })

  it('updateDependency：to.lag 缺省继承 from.lag；显式覆盖；无变化（含 lag）返回 false', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05' },
        {
          id: 'c',
          name: 'C',
          start: '2026-03-06',
          end: '2026-03-07',
          dependencies: [{ id: 'a', type: 'ss', lag: 4 }],
        },
      ]),
    })
    // 缺省继承 from.lag=4
    expect(el.updateDependency('c', { id: 'a', type: 'ss' }, { id: 'b' })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'c')!.dependencies).toEqual([{ id: 'b', type: 'ss', lag: 4 }])
    // 无变化（含 lag 一致）→ false
    expect(el.updateDependency('c', { id: 'b', type: 'ss' }, { id: 'b', type: 'ss', lag: 4 })).toBe(false)
    // lag 变化 → true
    expect(el.updateDependency('c', { id: 'b', type: 'ss' }, { id: 'b', type: 'ss', lag: 7 })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'c')!.dependencies).toEqual([{ id: 'b', type: 'ss', lag: 7 }])
    // 显式 to.lag 覆盖继承
    expect(el.updateDependency('c', { id: 'b', type: 'ss' }, { id: 'a', type: 'fs', lag: -1 })).toBe(true)
    expect(el.tasks.find((t) => t.id === 'c')!.dependencies).toEqual([{ id: 'a', type: 'fs', lag: -1 }])
  })

  it('duplicateTask：克隆保留依赖 lag', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'q', name: 'Q', start: '2026-02-01' },
        { id: 'p', name: 'P', start: '2026-03-02', end: '2026-03-06', dependencies: [{ id: 'q', lag: 2 }] },
      ]),
    })
    const newId = el.duplicateTask('p')!
    expect(el.tasks.find((t) => t.id === newId)!.dependencies).toEqual([{ id: 'q', lag: 2 }])
  })

  it('连线命中路径：lag>0 附「lag N 天」+ data-lag；lag<0 附「lead N 天」；0 不附', () => {
    const mk = (lag?: number): OASGantt =>
      mount({
        tasks: JSON.stringify([
          { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
          {
            id: 'b',
            name: 'B',
            start: '2026-03-09',
            end: '2026-03-13',
            dependencies: [lag === undefined ? { id: 'a' } : { id: 'a', lag }],
          },
        ]),
      })
    const lag2 = mk(2)
    const hit2 = shadowOf(lag2).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    expect(hit2.getAttribute('data-lag')).toBe('2')
    expect(hit2.getAttribute('aria-label')).toContain('滞后 2 天')

    const lead1 = mk(-1)
    const hitLead = shadowOf(lead1).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    expect(hitLead.getAttribute('data-lag')).toBe('-1')
    expect(hitLead.getAttribute('aria-label')).toContain('提前 1 天')

    const none = mk()
    const hitNone = shadowOf(none).querySelector<SVGPathElement>('.link-hit[data-from="b"][data-to="a"]')!
    expect(hitNone.getAttribute('data-lag')).toBeNull()
    expect(hitNone.getAttribute('aria-label') ?? '').not.toMatch(/lag|lead/)
  })

  it('极大有限 lag（×DAY_MS 溢出）被丢弃，组件不崩（无 Invalid Date）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-09', end: '2026-03-10', dependencies: [{ id: 'd', lag: 1e308 }] },
      ]),
    })
    // lag 被清洗丢弃 → 依赖退化为无 lag；渲染/排程均正常
    expect(el.tasks.find((x) => x.id === 't')!.dependencies![0]!.lag).toBeUndefined()
    expect(barOf(el, 't')).toBeTruthy()
  })

  it('连线 lag 可见标签：非 0 渲染 .link-label（+N/−N），0 不渲染', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' },
        { id: 'b', name: 'B', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'a', lag: 2 }] },
        { id: 'c', name: 'C', start: '2026-03-16', end: '2026-03-18', dependencies: [{ id: 'b' }] },
      ]),
    })
    const labels = [...shadowOf(el).querySelectorAll('text.link-label')].map((t) => t.textContent)
    expect(labels).toEqual(['+2'])
  })
})

describe('OASGantt 关键路径（show-critical-path）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** a→b、a→c 均为 fs；项目完成 = b 端（03-10 右缘）；c 有 3 天浮时 */
  const TASKS_CP: GanttTask[] = [
    { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
    { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'a' }] },
    { id: 'c', name: 'C', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'a' }] },
  ]

  it('命中关键链 a、b（float=0）；c 浮时>0 不命中；行名同步加类', () => {
    const el = mount({ 'show-critical-path': '', tasks: JSON.stringify(TASKS_CP) })
    expect(barOf(el, 'a').classList.contains('critical'), 'a 关键').toBe(true)
    expect(barOf(el, 'b').classList.contains('critical'), 'b 关键').toBe(true)
    expect(barOf(el, 'c').classList.contains('critical'), 'c 非关键（浮时 3 天）').toBe(false)
    expect(shadowOf(el).querySelector('.row-name[data-key="a"]')!.classList.contains('critical')).toBe(true)
    expect(shadowOf(el).querySelector('.row-name[data-key="c"]')!.classList.contains('critical')).toBe(false)
  })

  it('关闭 show-critical-path（缺省）：零 .critical（对既有渲染零影响）', () => {
    const el = mount({ tasks: JSON.stringify(TASKS_CP) })
    expect(shadowOf(el).querySelectorAll('.bar.critical').length).toBe(0)
    expect(shadowOf(el).querySelectorAll('.row-name.critical').length).toBe(0)
  })

  it('运行期开关属性：即时加/去 .critical', () => {
    const el = mount({ tasks: JSON.stringify(TASKS_CP) })
    expect(barOf(el, 'a').classList.contains('critical')).toBe(false)
    el.setAttribute('show-critical-path', '')
    expect(barOf(el, 'a').classList.contains('critical')).toBe(true)
    el.removeAttribute('show-critical-path')
    expect(barOf(el, 'a').classList.contains('critical')).toBe(false)
  })

  it('lag 参与 float：a→b 加 1 天 lag 后 a 退出关键路径（b 仍关键）', () => {
    const withLag: GanttTask[] = [
      { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'a', lag: 1 }] },
      { id: 'c', name: 'C', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'a' }] },
    ]
    const el = mount({ 'show-critical-path': '', tasks: JSON.stringify(withLag) })
    // a→b lag 1（须早 1 天完成）→ a 浮时 −1 天 → 非关键
    expect(barOf(el, 'a').classList.contains('critical'), 'a 因 lag 退出').toBe(false)
    expect(barOf(el, 'b').classList.contains('critical'), 'b 仍关键').toBe(true)
  })

  it('里程碑参与项目完成与关键链', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
        { id: 'm', name: 'M', start: '2026-03-10', dependencies: [{ id: 'a' }] },
      ]),
    })
    // projectEnd = 里程碑 03-10；a 浮时 5 天 → 非关键；里程碑本身 dur=0 → 关键
    expect(barOf(el, 'm').classList.contains('critical'), '里程碑关键').toBe(true)
    expect(barOf(el, 'a').classList.contains('critical'), 'a 非关键').toBe(false)
  })

  it('无依赖单任务：不崩，且为关键（唯一任务定义项目完成）', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([{ id: 'solo', name: 'S', start: '2026-03-02', end: '2026-03-04' }]),
    })
    expect(barOf(el, 'solo').classList.contains('critical')).toBe(true)
  })

  it('空任务：不崩、零 .critical', () => {
    const el = mount({ 'show-critical-path': '', tasks: '[]' })
    expect(shadowOf(el).querySelectorAll('.bar.critical').length).toBe(0)
  })

  it('依赖成环：返回空集（不死循环、不抛异常）', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'b' }] },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'a' }] },
      ]),
    })
    expect(shadowOf(el).querySelectorAll('.bar.critical').length).toBe(0)
  })

  it('样式：.bar.critical 描边走 CSS 变量、.row-name.critical 用 danger 色；critical 规则在 selected 之前', () => {
    const el = mount({ 'show-critical-path': '', tasks: JSON.stringify(TASKS_CP) })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toMatch(/\.bar\.critical \{[^}]*var\(--oas-gantt-critical-color, var\(--oas-color-danger\)\)/)
    expect(css).toMatch(/\.row-name\.critical \{[^}]*var\(--oas-gantt-critical-color, var\(--oas-color-danger\)\)/)
    // 顺序：critical 在 selected 之前（选中态优先级更高，不被覆盖）
    expect(css.indexOf('.bar.critical')).toBeLessThan(css.indexOf('.bar.selected'))
  })

  it('摘要自身 data 日期超出子级聚合时，真关键链仍高亮（projectEnd 只看节点）', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([
        {
          id: 'p',
          name: 'P',
          start: '2026-03-02',
          end: '2026-03-20', // 过期/偏晚的摘要存储日期（渲染按子级聚合到 03-09）
          type: 'summary',
          children: [
            { id: 'c1', name: 'C1', start: '2026-03-02', end: '2026-03-06' },
            { id: 'c2', name: 'C2', start: '2026-03-07', end: '2026-03-09', dependencies: [{ id: 'c1' }] },
          ],
        },
      ]),
    })
    const ids = [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.critical')].map((b) => b.dataset.id)
    expect(ids.sort()).toEqual(['c1', 'c2'])
  })

  it('show-critical-path="false" 视为关闭（不渲染 .critical）', () => {
    const el = mount({ 'show-critical-path': 'false', tasks: JSON.stringify(TASKS_CP) })
    expect(shadowOf(el).querySelectorAll('.bar.critical').length).toBe(0)
  })

  it('负总时差（违反后继约束）标 .conflict（与 .critical 区分）', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-05', end: '2026-03-06' },
        { id: 's', name: 'S', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'p' }] },
      ]),
    })
    const conflict = [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.conflict')].map((b) => b.dataset.id)
    expect(conflict).toEqual(['p'])
    const crit = [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.critical')].map((b) => b.dataset.id)
    expect(crit).toEqual(['s'])
  })
})

// ===== 本批新增：任务约束（constraint）+ 工作日日历（workdays）+ 依赖环 SCC =====

/** .bar.conflict 的 id 集合（升序，便于断言） */
function conflictIdsOf(el: OASGantt): string[] {
  return [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.conflict')].map((b) => b.dataset.id ?? '').sort()
}

/** .bar.critical 的 id 集合（升序） */
function criticalIdsOf(el: OASGantt): string[] {
  return [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.critical')].map((b) => b.dataset.id ?? '').sort()
}

/** 运行期开启 auto-schedule 并捕获该瞬间的 oas-reschedule ids
 *  （mount 期首帧 reschedule 早于监听挂载，无法直接捕获） */
function enableAuto(el: OASGantt): string[][] {
  const seen: string[][] = []
  el.addEventListener('oas-reschedule', (e) => seen.push((e as CustomEvent<{ ids: string[] }>).detail.ids))
  el.setAttribute('auto-schedule', '')
  return seen
}

describe('OASGantt 任务约束（snet / mso / fnlt）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('snet：start 早于约束日 → 前推到约束日（工期不变；无依赖也生效）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        {
          id: 't',
          name: 'T',
          start: '2026-03-02',
          end: '2026-03-04',
          constraint: 'snet',
          constraintDate: '2026-03-10',
        },
      ]),
    })
    expect(taskOf(el, 't').start).toBe('2026-03-10')
    expect(taskOf(el, 't').end).toBe('2026-03-12')
    // 约束字段落数据（受控读回）
    expect(taskOf(el, 't').constraint).toBe('snet')
    expect(taskOf(el, 't').constraintDate).toBe('2026-03-10')
  })

  it('snet：已满足约束（start 晚于约束日）→ 只推不提前，零 reschedule 事件', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 't',
          name: 'T',
          start: '2026-03-15',
          end: '2026-03-17',
          constraint: 'snet',
          constraintDate: '2026-03-10',
        },
      ]),
    })
    const seen = enableAuto(el)
    expect(taskOf(el, 't').start).toBe('2026-03-15')
    expect(taskOf(el, 't').end).toBe('2026-03-17')
    expect(seen).toEqual([])
  })

  it('snet：与依赖约束取较晚者（约束更晚 → 约束胜）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' }, // 右缘 03-07
        {
          id: 't',
          name: 'T',
          start: '2026-03-01',
          end: '2026-03-02',
          dependencies: [{ id: 'd' }],
          constraint: 'snet',
          constraintDate: '2026-03-10',
        },
      ]),
    })
    expect(taskOf(el, 't').start).toBe('2026-03-10')
    expect(taskOf(el, 't').end).toBe('2026-03-11')
  })

  it('mso：固定锚点——依赖不得前推（约束日与数据一致时零改动零事件）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-02', end: '2026-03-20' }, // 右缘 03-21（远超约束日）
        {
          id: 'm',
          name: 'M',
          start: '2026-03-10',
          end: '2026-03-11',
          dependencies: [{ id: 'p' }],
          constraint: 'mso',
          constraintDate: '2026-03-10',
        },
      ]),
    })
    const seen = enableAuto(el)
    expect(taskOf(el, 'm').start, '不被依赖前推').toBe('2026-03-10')
    expect(taskOf(el, 'm').end).toBe('2026-03-11')
    expect(seen).toEqual([])
  })

  it('mso：数据偏离约束日 → 拉回约束日（保持工期）+ reschedule 事件', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'm',
          name: 'M',
          start: '2026-03-20',
          end: '2026-03-21',
          constraint: 'mso',
          constraintDate: '2026-03-10',
        },
      ]),
    })
    const seen = enableAuto(el)
    expect(taskOf(el, 'm').start).toBe('2026-03-10')
    expect(taskOf(el, 'm').end).toBe('2026-03-11') // 工期 2 天保持
    expect(seen).toEqual([['m']])
  })

  it('mso：后继按固定值前推（以前置的固定区间为基准）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        {
          id: 'm',
          name: 'M',
          start: '2026-03-10',
          end: '2026-03-11',
          constraint: 'mso',
          constraintDate: '2026-03-10',
        },
        { id: 's', name: 'S', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'm' }] },
      ]),
    })
    expect(taskOf(el, 'm').start).toBe('2026-03-10')
    // m 右缘 03-12（日精度 end 含端）→ s 前推到 03-12（工期 2 天）
    expect(taskOf(el, 's').start).toBe('2026-03-12')
    expect(taskOf(el, 's').end).toBe('2026-03-13')
  })

  it('fnlt：不自动移动（数据保持原样、零 reschedule 事件）', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'f',
          name: 'F',
          start: '2026-03-02',
          end: '2026-03-20',
          constraint: 'fnlt',
          constraintDate: '2026-03-05',
        },
      ]),
    })
    const seen = enableAuto(el)
    expect(taskOf(el, 'f').start).toBe('2026-03-02')
    expect(taskOf(el, 'f').end).toBe('2026-03-20')
    expect(seen).toEqual([])
  })

  it('约束违反并入违约集 .conflict（snet 未达 / mso 未落在 / fnlt 超出；合规者不标）', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([
        // snet
        {
          id: 's1',
          name: 'S1',
          start: '2026-03-02',
          end: '2026-03-04',
          constraint: 'snet',
          constraintDate: '2026-03-10',
        },
        {
          id: 's2',
          name: 'S2',
          start: '2026-03-10',
          end: '2026-03-12',
          constraint: 'snet',
          constraintDate: '2026-03-10',
        },
        // mso
        {
          id: 'm1',
          name: 'M1',
          start: '2026-03-12',
          end: '2026-03-13',
          constraint: 'mso',
          constraintDate: '2026-03-10',
        },
        {
          id: 'm2',
          name: 'M2',
          start: '2026-03-10',
          end: '2026-03-11',
          constraint: 'mso',
          constraintDate: '2026-03-10',
        },
        // fnlt（日精度 end 含端：右缘超过约束日右缘 03-06 即违约）
        {
          id: 'f1',
          name: 'F1',
          start: '2026-03-02',
          end: '2026-03-10',
          constraint: 'fnlt',
          constraintDate: '2026-03-05',
        },
        {
          id: 'f2',
          name: 'F2',
          start: '2026-03-02',
          end: '2026-03-05',
          constraint: 'fnlt',
          constraintDate: '2026-03-05',
        },
      ]),
    })
    expect(conflictIdsOf(el)).toEqual(['f1', 'm1', 's1'])
  })

  it('约束违约在 auto-schedule 开启时即标 .conflict（无需 show-critical-path）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        {
          id: 'f',
          name: 'F',
          start: '2026-03-02',
          end: '2026-03-10',
          constraint: 'fnlt',
          constraintDate: '2026-03-05',
        },
      ]),
    })
    const conflict = [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.conflict')].map((b) => b.dataset.id)
    expect(conflict, 'auto-schedule 开即应标违约').toEqual(['f'])
  })

  it('mso 与依赖冲突：mso 任务自身标 .conflict', () => {
    const el = mount({
      'auto-schedule': '',
      'show-critical-path': '',
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-20', end: '2026-03-22' },
        {
          id: 'm',
          name: 'M',
          start: '2026-03-10',
          end: '2026-03-11',
          dependencies: [{ id: 'p' }],
          constraint: 'mso',
          constraintDate: '2026-03-10',
        },
      ]),
    })
    const conflict = [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.conflict')].map((b) => b.dataset.id)
    expect(conflict).toContain('m')
  })

  it('mso 日精度约束 + 带时间 start：不误标 .conflict', () => {
    const el = mount({
      'auto-schedule': '',
      'show-critical-path': '',
      tasks: JSON.stringify([
        {
          id: 'm',
          name: 'M',
          start: '2026-03-10 08:00',
          end: '2026-03-10 12:00',
          constraint: 'mso',
          constraintDate: '2026-03-10',
        },
      ]),
    })
    const conflict = [...shadowOf(el).querySelectorAll<HTMLElement>('.bar.conflict')].map((b) => b.dataset.id)
    expect(conflict).toEqual([])
  })

  it('摘要行带 constraint：忽略 + devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      mount({
        'show-critical-path': '',
        tasks: JSON.stringify([
          {
            id: 'p',
            name: 'P',
            start: '2026-03-02',
            end: '2026-03-06',
            type: 'summary',
            constraint: 'snet',
            constraintDate: '2026-03-10',
            children: [{ id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-03' }],
          },
        ]),
      })
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('摘要任务')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('snet/mso/fnlt 缺可解析 constraintDate → 约束整体丢弃 + 每任务告警一次（受控重写不刷屏）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({
      tasks: JSON.stringify([
        { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-04', constraint: 'snet' },
        { id: 'y', name: 'Y', start: '2026-03-02', end: '2026-03-04', constraint: 'mso', constraintDate: '2026-13-45' },
        { id: 'z', name: 'Z', start: '2026-03-02', end: '2026-03-04', constraint: 'fnlt', constraintDate: '' },
      ]),
    })
    const countWarns = (): number => warn.mock.calls.filter((c) => String(c[0]).includes('constraintDate')).length
    expect(countWarns()).toBe(3)
    for (const id of ['x', 'y', 'z']) {
      expect(taskOf(el, id).constraint, `${id} 约束已丢弃`).toBeUndefined()
      expect(taskOf(el, id).constraintDate).toBeUndefined()
    }
    // 受控整体重写（同 id 同病因）→ warnOnce 去重，不重复刷屏
    el.tasks = [
      { id: 'x', name: 'X', start: '2026-03-02', end: '2026-03-04', constraint: 'snet' },
      { id: 'y', name: 'Y', start: '2026-03-02', end: '2026-03-04', constraint: 'mso', constraintDate: '2026-13-45' },
      { id: 'z', name: 'Z', start: '2026-03-02', end: '2026-03-04', constraint: 'fnlt', constraintDate: '' },
    ]
    expect(countWarns()).toBe(3)
    warn.mockRestore()
  })

  it('updateTask / updateTasks 改 constraint 也触发联动排程（与日期变更同口径）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([{ id: 't', name: 'T', start: '2026-03-02', end: '2026-03-04' }]),
    })
    expect(taskOf(el, 't').start).toBe('2026-03-02')
    const seen: string[][] = []
    el.addEventListener('oas-reschedule', (e) => seen.push((e as CustomEvent<{ ids: string[] }>).detail.ids))
    expect(el.updateTask('t', { constraint: 'snet', constraintDate: '2026-03-10' })).toBe(true)
    expect(taskOf(el, 't').start).toBe('2026-03-10')
    expect(taskOf(el, 't').end).toBe('2026-03-12')
    expect(seen).toEqual([['t']])
    // 批量通道同口径
    expect(el.updateTasks([{ id: 't', constraint: 'snet', constraintDate: '2026-03-20' }])).toBe(1)
    expect(taskOf(el, 't').start).toBe('2026-03-20')
    expect(taskOf(el, 't').end).toBe('2026-03-22')
    expect(seen).toEqual([['t'], ['t']])
  })

  it('asap / 非法约束 / 缺省：等同无约束（不落数据、零行为、零告警）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', constraint: 'asap' },
        // 非法约束 → 丢弃（白名单外不告警；constraintDate 一并丢弃）
        {
          id: 'b',
          name: 'B',
          start: '2026-03-02',
          end: '2026-03-04',
          constraint: 'urgent',
          constraintDate: '2026-03-10',
        },
        { id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-04', constraintDate: '2026-03-10' },
      ]),
    })
    for (const id of ['a', 'b', 'c']) {
      expect(taskOf(el, id).constraint, `${id} 无约束`).toBeUndefined()
      expect(taskOf(el, id).constraintDate).toBeUndefined()
      expect(taskOf(el, id).start, `${id} 日期零行为`).toBe('2026-03-02')
      expect(taskOf(el, id).end).toBe('2026-03-04')
    }
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('[oas-gantt]'))).toHaveLength(0)
    warn.mockRestore()
  })
})

describe('OASGantt 工作日日历（workdays）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 前置 d 右缘 = 03-07（周六）；后继 t 工期 2 天（03-01..03-02） */
  const depPair = JSON.stringify([
    { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
    { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
  ])

  it('前推落周六 → 吸附到周一（对照组：无 workdays 落在周六不吸附）', () => {
    const plain = mount({ 'auto-schedule': '', tasks: depPair })
    expect(taskOf(plain, 't').start, '对照：无 workdays → 落在周六').toBe('2026-03-07')
    expect(taskOf(plain, 't').end).toBe('2026-03-08')

    const el = mount({ 'auto-schedule': '', workdays: '[1,2,3,4,5]', tasks: depPair })
    expect(taskOf(el, 't').start, '周六 → 下周一').toBe('2026-03-09')
    expect(taskOf(el, 't').end, '工期 2 天不变').toBe('2026-03-10')
  })

  it('前推落周日 → 吸附到周一', () => {
    const el = mount({
      'auto-schedule': '',
      workdays: '[1,2,3,4,5]',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-03', end: '2026-03-07' }, // 右缘 03-08（周日）
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
      ]),
    })
    expect(taskOf(el, 't').start).toBe('2026-03-09')
  })

  it('holidays 恒为非工作日（叠加 workdays 与假日）', () => {
    const el = mount({
      'auto-schedule': '',
      workdays: '[1,2,3,4,5]',
      holidays: '["2026-03-09"]',
      tasks: depPair,
    })
    // 03-07 周六 → 03-08 周日 → 03-09 周一（假日）→ 03-10 周二
    expect(taskOf(el, 't').start).toBe('2026-03-10')
    expect(taskOf(el, 't').end).toBe('2026-03-11')

    const holOnly = mount({ 'auto-schedule': '', holidays: '["2026-03-07"]', tasks: depPair })
    // 假日恒为非工作日（与 workdays 是否开启无关）：落点 03-07 为假日 → 吸附到 03-08
    expect(taskOf(holOnly, 't').start, '假日（不依赖 workdays）触发吸附').toBe('2026-03-08')
  })

  it('workdays 缺省 / [] / 全非法 / 非数组 → 不限制（全周工作，零行为）', () => {
    for (const wd of [undefined, '[]', '[7,-1,"x"]', 'not-json', '{}', 'null']) {
      const attrs: Record<string, string> = { 'auto-schedule': '', tasks: depPair }
      if (wd !== undefined) attrs.workdays = wd
      const el = mount(attrs)
      expect(taskOf(el, 't').start, `workdays=${String(wd)} 不吸附`).toBe('2026-03-07')
      expect(taskOf(el, 't').end).toBe('2026-03-08')
    }
  })

  it('ff：吸附对应 end 再派生 start（end 落周六 → 端点上移）', () => {
    const el = mount({
      'auto-schedule': '',
      workdays: '[1,2,3,4,5]',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' }, // 右缘 03-07（周六）
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd', type: 'ff' }] },
      ]),
    })
    // 吸附 end：03-07（周六）→ 03-09（周一）→ start = 03-09 − 2 天 = 03-07 → 起点再吸附到 03-09
    expect(taskOf(el, 't').start).toBe('2026-03-09')
    expect(taskOf(el, 't').end).toBe('2026-03-10')
  })

  it('snet 约束日落非工作日 → 吸附；mso 固定值不吸附（约束优先）', () => {
    const snet = mount({
      'auto-schedule': '',
      workdays: '[1,2,3,4,5]',
      tasks: JSON.stringify([
        {
          id: 't',
          name: 'T',
          start: '2026-03-01',
          end: '2026-03-02',
          constraint: 'snet',
          constraintDate: '2026-03-07', // 周六
        },
      ]),
    })
    expect(taskOf(snet, 't').start, 'snet 取 max 后吸附').toBe('2026-03-09')

    const mso = mount({
      'auto-schedule': '',
      workdays: '[1,2,3,4,5]',
      tasks: JSON.stringify([
        {
          id: 'm',
          name: 'M',
          start: '2026-03-02',
          end: '2026-03-03',
          constraint: 'mso',
          constraintDate: '2026-03-07', // 周六（固定值原样落位）
        },
      ]),
    })
    expect(taskOf(mso, 'm').start).toBe('2026-03-07')
    expect(taskOf(mso, 'm').end).toBe('2026-03-08')
  })

  it('运行期设置 workdays 触发重吸附（落点由周六改到周一）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
      ]),
    })
    expect(taskOf(el, 't').start, '无 workdays：前推到周六 03-07').toBe('2026-03-07')
    el.setAttribute('workdays', '[1,2,3,4,5]')
    expect(taskOf(el, 't').start, '设 workdays：重吸附到周一 03-09').toBe('2026-03-09')
  })

  it('整体重写 tasks（违约）在 auto-schedule 下自动规整', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([{ id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' }]),
    })
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-02', end: '2026-03-06' },
        { id: 't', name: 'T', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
      ]),
    )
    expect(taskOf(el, 't').start, '重写后自动前推到 03-07').toBe('2026-03-07')
  })

  it('约束被清（constraint: undefined）也触发重排程', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-10', end: '2026-03-14' },
        {
          id: 't',
          name: 'T',
          start: '2026-03-02',
          end: '2026-03-04',
          dependencies: [{ id: 'd' }],
          constraint: 'mso',
          constraintDate: '2026-03-02',
        },
      ]),
    })
    // mso 固定 03-02（与依赖冲突被钉住）
    expect(taskOf(el, 't').start).toBe('2026-03-02')
    // 清约束 → 依赖生效，前推到 03-15
    el.updateTask('t', { constraint: undefined, constraintDate: undefined })
    expect(taskOf(el, 't').start).toBe('2026-03-15')
  })

  it('oas-task-change 载荷取订正后终值（与 task 快照一致）', () => {
    const el = mount({
      'auto-schedule': '',
      tasks: JSON.stringify([
        { id: 'm', name: 'M', start: '2026-03-10', end: '2026-03-11', constraint: 'mso', constraintDate: '2026-03-10' },
      ]),
    })
    const seen: Array<{ start: string; end: string }> = []
    el.addEventListener('oas-task-change', ((e: CustomEvent<{ start: string; end: string }>) => {
      seen.push({ start: e.detail.start, end: e.detail.end })
    }) as EventListener)
    // 拖动（模拟事件驱动 applyBarDragVisual 不便 → 直接用 updateTask 触发 commitDates 等价路径）
    const bar = barOf(el, 'm')
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: 100 })
    bar.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 172 })
    document.dispatchEvent(move)
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(seen).toHaveLength(1)
    const final = taskOf(el, 'm')
    expect(seen[0]!.start).toBe(final.start)
    expect(seen[0]!.end).toBe(final.end)
  })

  it('duplicateTask 保留 constraint / constraintDate', () => {
    const el = mount({
      tasks: JSON.stringify([
        {
          id: 'a',
          name: 'A',
          start: '2026-03-02',
          end: '2026-03-04',
          constraint: 'snet',
          constraintDate: '2026-03-05',
        },
      ]),
    })
    const id = el.duplicateTask('a')!
    const c = el.tasks.find((t) => t.id === id)!
    expect(c.constraint).toBe('snet')
    expect(c.constraintDate).toBe('2026-03-05')
  })
})

describe('OASGantt 依赖环 SCC（环内让位 / CP 仍算环外）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('A⇄B 环 + C 环外：环内 A/B 保持现网日期，环外 C 正常前推', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'd', name: 'D', start: '2026-03-10', end: '2026-03-12' }, // 右缘 03-13
        { id: 'c', name: 'C', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'd' }] },
        { id: 'a', name: 'A', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'c' }, { id: 'b' }] },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'a' }] },
      ]),
    })
    const seen = enableAuto(el)
    expect(taskOf(el, 'c').start, '环外节点照常前推').toBe('2026-03-13')
    expect(taskOf(el, 'c').end).toBe('2026-03-14')
    expect(taskOf(el, 'a').start, '环内节点让位（不推远）').toBe('2026-03-05')
    expect(taskOf(el, 'b').start, '环内节点让位（不推远）').toBe('2026-03-05')
    expect(seen).toEqual([['c']])
  })

  it('自环节点让位；同图其它节点照常前推', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'p', name: 'P', start: '2026-03-10', end: '2026-03-11' }, // 右缘 03-12
        { id: 'a', name: 'A', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'a' }, { id: 'p' }] },
        { id: 'b', name: 'B', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'p' }] },
      ]),
    })
    const seen = enableAuto(el)
    expect(taskOf(el, 'a').start, '自环节点让位').toBe('2026-03-01')
    expect(taskOf(el, 'b').start, '环外节点照常前推').toBe('2026-03-12')
    expect(taskOf(el, 'b').end).toBe('2026-03-13')
    expect(seen).toEqual([['b']])
  })

  it('环内节点作前置：用其当前日期参与计算（best-effort，C 依赖环内 A）', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'b' }] },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'a' }] },
        { id: 'c', name: 'C', start: '2026-03-01', end: '2026-03-02', dependencies: [{ id: 'a' }] },
      ]),
    })
    const seen = enableAuto(el)
    // A 让位保持 03-05..03-06（右缘 03-07）→ C 以其现网日期前推到 03-07
    expect(taskOf(el, 'c').start).toBe('2026-03-07')
    expect(taskOf(el, 'c').end).toBe('2026-03-08')
    expect(taskOf(el, 'a').start).toBe('2026-03-05')
    expect(seen).toEqual([['c']])
  })

  it('CP：存在环时仍标出环外关键链（环内节点不参与）', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'b' }] },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'a' }] },
        { id: 'c', name: 'C', start: '2026-03-02', end: '2026-03-04' },
        { id: 'e', name: 'E', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'c' }] },
      ]),
    })
    expect(criticalIdsOf(el), '环外关键链 c→e').toEqual(['c', 'e'])
    expect(conflictIdsOf(el)).toEqual([])
    // 环内节点两个类都不带（连不崩、不误标）
    for (const id of ['a', 'b']) {
      expect(barOf(el, id).classList.contains('critical'), `${id} 环内不标关键`).toBe(false)
      expect(barOf(el, id).classList.contains('conflict'), `${id} 环内不标违约`).toBe(false)
    }
  })

  it('CP：逆拓扑序一趟即精确（长链逆序输入，浮时判定与顺序无关）', () => {
    const el = mount({
      'show-critical-path': '',
      tasks: JSON.stringify([
        // 逆序输入：后继在前、前置在后（单趟按数组顺序松弛会欠收敛）
        { id: 'c', name: 'C', start: '2026-03-10', end: '2026-03-12', dependencies: [{ id: 'b' }] },
        { id: 'x', name: 'X', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'a' }] },
        { id: 'b', name: 'B', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'a' }] },
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04' },
      ]),
    })
    expect(criticalIdsOf(el), '主链 a→b→c 关键').toEqual(['a', 'b', 'c'])
    expect(barOf(el, 'x').classList.contains('critical'), 'x 浮时 6 天非关键').toBe(false)
    expect(barOf(el, 'x').classList.contains('conflict')).toBe(false)
  })
})

describe('OASGantt updateDependency：lag 归零删键', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lag 2 → 显式 0：依赖对象无 lag 键（不留 lag: 0）；缺省继承仍保留既有 lag', () => {
    const el = mount({
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-03' },
        { id: 'b', name: 'B', start: '2026-03-04', end: '2026-03-05', dependencies: [{ id: 'a', lag: 2 }] },
      ]),
    })
    const depOf = (): GanttTask['dependencies'] => taskOf(el, 'b').dependencies

    expect(depOf()).toEqual([{ id: 'a', lag: 2 }])
    // 显式清零 → 删键（不是写 lag: 0）
    expect(el.updateDependency('b', { id: 'a', lag: 2 }, { id: 'a', lag: 0 })).toBe(true)
    expect('lag' in depOf()![0]!).toBe(false)
    expect(depOf()).toEqual([{ id: 'a', type: 'fs' }])
    expect(JSON.stringify(el.tasks.find((t) => t.id === 'b')!.dependencies)).not.toContain('lag')

    // 缺省继承（既有 lag=2）→ 仍保留 lag 键
    expect(el.updateDependency('b', { id: 'a' }, { id: 'a', lag: 2 })).toBe(true)
    expect(depOf()).toEqual([{ id: 'a', type: 'fs', lag: 2 }])

    // 再清零 → 再次删键
    expect(el.updateDependency('b', { id: 'a' }, { id: 'a', lag: 0 })).toBe(true)
    expect('lag' in depOf()![0]!).toBe(false)
  })
})

describe('OASGantt 行名列自定义模板（template[slot="row"]）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountTpl(): OASGantt {
    const el = new OASGantt()
    const tpl = document.createElement('template')
    tpl.setAttribute('slot', 'row')
    tpl.innerHTML = `<span data-task-name></span><span class="owner"></span><input class="owner-edit" />`
    el.appendChild(tpl)
    el.setAttribute(
      'tasks',
      JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-04', owner: '张三' }]),
    )
    document.body.appendChild(el)
    return el
  }

  it('模板克隆进每行、[data-task-name] 自动填名、自定义字段可渲染', () => {
    const el = mountTpl()
    const name = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="a"] .name')!
    expect(name.querySelector('[data-task-name]')!.textContent).toBe('A')
    expect(name.querySelector('.owner-edit')).not.toBeNull()
    // 宿主可读自定义字段 owner 渲染
    const task = el.tasks.find((t) => t.id === 'a') as Record<string, unknown>
    expect(task.owner).toBe('张三')
  })

  it('模板内交互控件不被行拖拽/选中劫持（pointerdown/keydown 守卫）', () => {
    const el = mountTpl()
    const input = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="a"] .owner-edit')!
    let sel = 0
    el.addEventListener('oas-selection-change', () => sel++)
    let reparent = 0
    el.addEventListener('oas-reparent', () => reparent++)
    const down = new PointerEvent('pointerdown', { bubbles: true, composed: true, pointerId: 1, button: 0 })
    Object.defineProperty(down, 'clientX', { value: 0 })
    Object.defineProperty(down, 'clientY', { value: 0 })
    input.dispatchEvent(down)
    const move = new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1 })
    Object.defineProperty(move, 'clientX', { value: 0 })
    Object.defineProperty(move, 'clientY', { value: 40 })
    document.dispatchEvent(move)
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerId: 1 }))
    expect(sel, '模板控件上按下不应选行').toBe(0)
    expect(reparent, '模板控件上拖动不应重排').toBe(0)
  })

  it('模板存在时不绑定行内重命名（宿主自管控件）', () => {
    const el = mountTpl()
    const name = shadowOf(el).querySelector<HTMLElement>('.row-name[data-key="a"] .name')!
    name.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true }))
    expect(shadowOf(el).querySelector('.rename-input')).toBeNull()
  })
})

/**
 * windowed（服务端行窗口模式）+ 宿主托管时间范围（range-start/range-end）机制测试。
 *
 * 契约见 shared/window-data.ts：
 * - 属性 `windowed`（布尔）+ `total`（全量行数）+ `window-start`（tasks[0] 的绝对行下标）；
 *   `tasks` 只承载 [window-start, window-start+len) 的已装载切片，行虚拟化窗口在 total 上算，
 *   渲染/定位按绝对行号。
 * - 可视行窗口 → expandWindow（±8 margin）→ 未被已装载区间覆盖时派发 `oas-window-request`
 *   （detail { start, end, reason }，半开、绝对行下标；同 need 去重，reason ∈ init/scroll/resize/data）。
 * - `range-start`/`range-end`（ISO 日）托管时间轴范围：buildUnits 用该范围（而非 rows 派生）；
 *   视觉时间窗前后各扩 1 个视口宽、`!rangeCovered` 时派发 `oas-range-request`（去重）。
 * - windowed 且缺 range-* → devWarn 一次并回落 rows 派生。
 * - windowed 下本地跨全量能力禁用（auto-schedule / 关键路径在部分数据上会算错）：跳过 + devWarn 一次。
 * - windowed 要求**扁平行切片**（切片即行序，不递归 children / 不受 expanded 影响，绝对行号按
 *   扁平行计）；键盘越出切片末端派发请求；aria 坐标（posinset/setsize/rowindex）按全量口径；
 *   行重排禁用；退出 windowed / 移除 range-* 复位去重态。
 * - 非 windowed：行为完全不变。
 */

interface WinReq {
  start: number
  end: number
  reason: string
}

interface RangeReq {
  startMs: number
  endMs: number
  reason: string
}

/** mount（监听器先于连接挂上，首帧 init 请求也能捕获） */
function mountWindowed(attrs: Record<string, string>): { el: OASGantt; reqs: WinReq[]; rangeReqs: RangeReq[] } {
  const el = new OASGantt()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  const reqs: WinReq[] = []
  const rangeReqs: RangeReq[] = []
  el.addEventListener('oas-window-request', (e) => {
    const d = (e as CustomEvent).detail
    reqs.push({ start: d.start, end: d.end, reason: d.reason })
  })
  el.addEventListener('oas-range-request', (e) => {
    const d = (e as CustomEvent).detail
    rangeReqs.push({ startMs: d.startMs, endMs: d.endMs, reason: d.reason })
  })
  document.body.appendChild(el)
  return { el, reqs, rangeReqs }
}

const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

const DAY_MS = 86_400_000

/** 绝对行 [start, start+len) 的任务窗口切片（任务名/id 带绝对行号便于断言） */
const taskSlice = (start: number, len: number): string =>
  JSON.stringify(
    Array.from({ length: len }, (_, i) => ({
      id: `t${start + i}`,
      name: `任务${start + i}`,
      start: `2026-03-${String((i % 27) + 1).padStart(2, '0')}`,
      end: `2026-03-${String((i % 27) + 2).padStart(2, '0')}`,
    })),
  )

const tbodyOf = (el: OASGantt): HTMLElement => shadowOf(el).querySelector<HTMLElement>('.tbody')!

describe('OASGantt windowed（服务端行窗口模式）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('windowed 生效：tasks 视为 [window-start, window-start+len) 的绝对行切片，按绝对行号定位渲染', () => {
    const { el } = mountWindowed({ windowed: '', total: '100', 'window-start': '10', tasks: taskSlice(10, 5) })
    const names = nameRows(el)
    expect(names.length).toBe(5)
    expect(names[0]!.dataset.key).toBe('t10')
    expect(names[4]!.dataset.key).toBe('t14')
    // 绝对行号定位：行 j 的 top = (window-start + j) × row-height（旧口径 j × row-height 会红）
    expect(names[0]!.style.top).toBe(`${10 * 36}px`)
    expect(names[4]!.style.top).toBe(`${14 * 36}px`)
    // 画布高度按全量 total 撑起（滚动域 = 全量行数，非已装载切片）
    expect(shadowOf(el).querySelector<HTMLElement>('.inner')!.style.height).toBe(`${100 * 36}px`)
    // 左侧列表滚动域同口径
    expect(shadowOf(el).querySelector<HTMLElement>('.side-inner')!.style.height).toBe(`${100 * 36}px`)
  })

  it('首帧派发 oas-window-request（reason=init，绝对半开区间含 margin）', () => {
    // 视口 120/40=3 行 + buffer6 → 可视 [0,9)；±margin8 → 期望 [0,17)；装载 [0,3) 未覆盖
    const { reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 3),
    })
    expect(reqs).toEqual([{ start: 0, end: 17, reason: 'init' }])
  })

  it('宿主回填覆盖期望区间后不再重复派发', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 3),
    })
    expect(reqs.length).toBe(1)
    el.setAttribute('tasks', taskSlice(0, 17)) // 恰好覆盖 [0,17)
    expect(reqs.length).toBe(1) // 覆盖 → 静默（不重派）
  })

  it('滚动触发 reason=scroll 的请求；同 need 去重', async () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 17),
    })
    expect(reqs.length).toBe(0) // 已覆盖，无 init 请求
    const tb = tbodyOf(el)
    tb.scrollTop = 1200 // 行 30
    tb.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 可视 [24,39) → 期望 [16,47)；装载 [0,17) 未覆盖
    expect(reqs).toEqual([{ start: 16, end: 47, reason: 'scroll' }])
    // 同 need（滚动位置未变）再触发不重派
    tb.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs.length).toBe(1)
  })

  it('data 变更后请求 reason=data（同 need 不重派；窗口变化才派）', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 3),
    })
    expect(reqs).toEqual([{ start: 0, end: 17, reason: 'init' }])
    // 宿主回填但未覆盖（need 同 [0,17)）→ 契约去重：不重派
    el.setAttribute('tasks', taskSlice(0, 10))
    expect(reqs.length).toBe(1)
    // 宿主覆盖 [0,17)（去重态重置）后再切窗 [500,510)：need 未覆盖 → data 原因再派
    el.setAttribute('tasks', taskSlice(0, 17))
    expect(reqs.length).toBe(1)
    el.setAttribute('window-start', '500')
    el.setAttribute('tasks', taskSlice(500, 10))
    expect(reqs.length).toBe(2)
    expect(reqs[1]).toEqual({ start: 0, end: 17, reason: 'data' })
  })

  it('虚拟 windowed：可视区间与装载区不相交时不渲染行（画布高度仍按 total 撑起，不把部分数据当全量）', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '100',
      'window-start': '20',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(20, 5),
    })
    // 可视 [0,9) 与装载 [20,25) 不相交 → 无行渲染
    expect(nameRows(el).length).toBe(0)
    expect(bars(el).length).toBe(0)
    expect(shadowOf(el).querySelector<HTMLElement>('.inner')!.style.height).toBe('4000px')
    // 期望区间未覆盖 → init 请求已派发
    expect(reqs[0]).toEqual({ start: 0, end: 17, reason: 'init' })
  })

  it('windowed 未装载（tasks 空）不误显空态文案（全量意义上数据存在）', () => {
    const { el } = mountWindowed({ windowed: '', total: '100', tasks: '[]' })
    expect(shadowOf(el).querySelector<HTMLElement>('.empty')!.hidden).toBe(true)
  })

  it('total 为 0 时 windowed 不生效（回落普通模式：相对行号定位、零请求）', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '0',
      'window-start': '10',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 3),
    })
    expect(nameRows(el)[0]!.style.top).toBe('0px')
    expect(reqs.length).toBe(0)
  })

  it('非 windowed（缺 windowed 属性）：不派发窗口请求（本地全量模式行为不变）', () => {
    const { el, reqs } = mountWindowed({
      total: '1000',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 50),
    })
    expect(reqs.length).toBe(0)
    // 本地模式：行号即渲染下标
    expect(nameRows(el)[0]!.style.top).toBe('0px')
  })

  it('range-start/range-end 托管时间轴范围：buildUnits 用宿主范围（而非 rows min/max）', () => {
    const { el } = mountWindowed({
      'range-start': '2026-01-01',
      'range-end': '2026-12-31',
      tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
    })
    const units = (el as unknown as { units: Array<{ startMs: number; endMs: number }> }).units
    const jan1 = new Date(2026, 0, 1).getTime()
    const dec31End = new Date(2026, 11, 31).getTime() + DAY_MS
    expect(units.length).toBeGreaterThan(0)
    // 轴覆盖宿主范围：首列起点 ≤ 01-01、末列右缘 ≥ 12-31 含端
    expect(units[0]!.startMs).toBeLessThanOrEqual(jan1)
    expect(units[units.length - 1]!.endMs).toBeGreaterThanOrEqual(dec31End)
  })

  it('windowed 且缺 range-start/range-end：devWarn 一次并回落 rows 派生（重渲染不重复告警）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el } = mountWindowed({
        windowed: '',
        total: '10',
        'window-start': '0',
        tasks: JSON.stringify([{ id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-06' }]),
      })
      expect(warn.mock.calls.some((c) => String(c[0]).includes('range-start'))).toBe(true)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('range-start')).length).toBe(1)
      // 回落 rows 派生：轴覆盖 3 月数据
      const units = (el as unknown as { units: Array<{ startMs: number }> }).units
      expect(units.length).toBeGreaterThan(0)
      expect(units[0]!.startMs).toBeLessThanOrEqual(new Date(2026, 2, 1).getTime())
    } finally {
      warn.mockRestore()
    }
  })

  it('托管轴（有 range-*）派发 oas-range-request（reason=init）；同 need 去重；范围变化后 reason=data 再派', () => {
    const { el, rangeReqs } = mountWindowed({
      windowed: '',
      total: '10',
      'window-start': '0',
      'range-start': '2026-03-01',
      'range-end': '2026-03-31',
      tasks: taskSlice(0, 3),
    })
    expect(rangeReqs.length).toBe(1)
    expect(rangeReqs[0]!.reason).toBe('init')
    // need = 可视时间窗 ± 1 视口宽 → 超出轴端点
    expect(rangeReqs[0]!.startMs).toBeLessThan(new Date(2026, 2, 1).getTime())
    expect(rangeReqs[0]!.endMs).toBeGreaterThan(new Date(2026, 2, 31).getTime() + DAY_MS)
    // 同 need（requestUpdate 重评估）→ 去重不重派
    el.requestUpdate()
    expect(rangeReqs.length).toBe(1)
    // 宿主扩大范围 → buildUnits 重建、need 随之变化 → data 原因再派
    el.setAttribute('range-start', '2026-01-01')
    expect(rangeReqs.length).toBe(2)
    expect(rangeReqs[1]!.reason).toBe('data')
  })

  it('非 windowed 且无 range-*：不派发 range 请求', () => {
    const { rangeReqs } = mountWindowed({ tasks: taskSlice(0, 3) })
    expect(rangeReqs.length).toBe(0)
  })

  it('windowed 下 auto-schedule 跳过（数据不被联动改期）+ devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el } = mountWindowed({
        windowed: '',
        total: '10',
        'window-start': '0',
        'auto-schedule': '',
        tasks: JSON.stringify([
          { id: 'a1', name: 'A1', start: '2026-03-10', end: '2026-03-12' },
          { id: 'a2', name: 'A2', start: '2026-03-02', end: '2026-03-04', dependencies: [{ id: 'a1' }] },
        ]),
      })
      // a2.start < a1.end 违反 fs 约束；本地 auto-schedule 会把 a2 推后——windowed 下跳过
      expect(el.tasks.find((t) => t.id === 'a2')!.start).toBe('2026-03-02')
      expect(warn.mock.calls.some((c) => String(c[0]).includes('auto-schedule'))).toBe(true)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('auto-schedule')).length).toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('windowed 下关键路径跳过（无 critical 高亮）+ devWarn 一次；非 windowed 对照照常高亮', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const chainTasks = JSON.stringify([
        { id: 'k1', name: 'K1', start: '2026-03-02', end: '2026-03-04' },
        { id: 'k2', name: 'K2', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'k1' }] },
      ])
      const { el } = mountWindowed({
        windowed: '',
        total: '10',
        'window-start': '0',
        'show-critical-path': '',
        tasks: chainTasks,
      })
      expect(shadowOf(el).querySelectorAll('.bar.critical').length).toBe(0)
      expect(warn.mock.calls.some((c) => String(c[0]).includes('关键路径'))).toBe(true)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('关键路径')).length).toBe(1)
      // 对照（反证）：同数据非 windowed → 依赖链 k1/k2 为关键路径高亮
      const local = mount({ 'show-critical-path': '', tasks: chainTasks })
      const criticalIds = [...shadowOf(local).querySelectorAll<HTMLElement>('.bar.critical')].map((b) => b.dataset.id)
      expect(criticalIds.sort()).toEqual(['k1', 'k2'])
    } finally {
      warn.mockRestore()
    }
  })

  it('windowed 下宿主切窗回填 + 滚动后新切片按绝对行号渲染', async () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 17),
    })
    // 先滚出装载区触发 scroll 请求（宿主据此回填）
    const tb = tbodyOf(el)
    tb.scrollTop = 4000 // 行 100
    tb.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs.some((r) => r.reason === 'scroll')).toBe(true)
    // 宿主按请求回填新窗口 [100,117)
    el.setAttribute('window-start', '100')
    el.setAttribute('tasks', taskSlice(100, 17))
    const names = nameRows(el)
    expect(names.length).toBeGreaterThan(0)
    // 绝对行号定位：首行 top = 100 × 40（若按局部下标 0 × 40 会红）
    expect(names[0]!.dataset.key).toBe('t100')
    expect(names[0]!.style.top).toBe(`${100 * 40}px`)
  })

  // F1 回归：windowed × 层级切片（含折叠父级）——旧实现按树递归 rows 塌缩（1 行 ≪ 切片长度），
  // 覆盖判定误吞请求 + 滚动范围内空白。修复后切片即行序（不递归 children、忽略 expanded）
  it('windowed 要求扁平行切片：层级切片不塌缩、装载区滚动无空白 + devWarn 一次（扁平切片不告警）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // 复现：切片 = 1 个父级 + 100 子级（拍平后 _tasks.length=101），expanded='[]' 全收起
      const slice = JSON.stringify([
        {
          id: 'p',
          name: '父',
          start: '2026-03-02',
          end: '2026-03-05',
          children: Array.from({ length: 100 }, (_, i) => ({
            id: `c${i}`,
            name: `子${i}`,
            start: '2026-03-02',
            end: '2026-03-05',
          })),
        },
      ])
      const { el, reqs } = mountWindowed({
        windowed: '',
        total: '1000',
        'window-start': '0',
        height: '200',
        'row-height': '40',
        expanded: '[]',
        tasks: slice,
      })
      // 扁平化：rows = 切片长度（父 + 100 子），loaded 口径与渲染行数一致（旧实现塌缩成 1 行会红）
      const rows = (el as unknown as { rows: Array<{ task: { id: string } }> }).rows
      expect(rows.length).toBe(101)
      expect(rows[0]!.task.id).toBe('p')
      expect(rows[1]!.task.id).toBe('c0')
      // 切片即行序：展开集合被忽略（expanded='[]' 不再塌缩），父/子按切片顺序全部成行
      const initNames = nameRows(el)
      expect(initNames.length).toBeGreaterThan(1)
      expect(initNames[0]!.dataset.key).toBe('p')
      expect(initNames[1]!.dataset.key).toBe('c0')
      // 装载区内任意滚动位置都有行渲染（旧实现 rows 塌缩 → 空白且不派请求）
      const tb = tbodyOf(el)
      tb.scrollTop = 60 * 40 // 行 60（仍在装载 [0,101) 内）
      tb.dispatchEvent(new Event('scroll'))
      await flushRaf()
      const midNames = nameRows(el)
      expect(midNames.length).toBeGreaterThan(0)
      expect(midNames[0]!.dataset.key).toBe('c53') // 行 60 - buffer 6 → c53（父占 1 行）
      expect(reqs.filter((r) => r.reason === 'scroll')).toEqual([]) // 装载区内不派请求
      // 滚出装载区 → 照常派发 scroll 请求（绝对区间）
      tb.scrollTop = 500 * 40 // 行 500
      tb.dispatchEvent(new Event('scroll'))
      await flushRaf()
      expect(reqs.some((r) => r.reason === 'scroll')).toBe(true)
      // 含层级切片 → devWarn 一次（重渲染不重复）
      expect(warn.mock.calls.some((c) => String(c[0]).includes('扁平行切片'))).toBe(true)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('扁平行切片')).length).toBe(1)
      // 反证：扁平切片不告警
      warn.mockClear()
      mountWindowed({ windowed: '', total: '1000', 'window-start': '0', tasks: taskSlice(0, 5) })
      expect(warn.mock.calls.some((c) => String(c[0]).includes('扁平行切片'))).toBe(false)
    } finally {
      warn.mockRestore()
    }
  })

  // F2 回归：windowed 下键盘移动到切片末端 ↓（/ 首端 ↑）→ 派发 oas-window-request
  //（need 覆盖目标绝对行 ±margin，宿主回填后可达），不得静默无响应
  it('windowed 键盘越出切片末端：派发请求覆盖目标绝对行 ±margin；同 need 去重；越出全量边界不派', () => {
    const { el, reqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 9), // 装载 [0,9)：init need [0,17) 未覆盖 → 先派 init
    })
    expect(reqs).toEqual([{ start: 0, end: 17, reason: 'init' }])
    const names = nameRows(el)
    expect(names.length).toBe(9)
    // 聚焦切片末行 t8 → ↓：目标绝对行 9，need = expandWindow(9,10,1000,8) = [1,18)
    names[8]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(reqs[1]).toEqual({ start: 1, end: 18, reason: 'scroll' })
    // 同 need 再按 → 去重不重派（在途请求未回填前不刷屏）
    names[8]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(reqs.length).toBe(2)
    // 反证：切片末端 = 全量末端 → 目标越出 [0,total) 不派
    const edge = mountWindowed({
      windowed: '',
      total: '9',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      tasks: taskSlice(0, 9),
    })
    expect(edge.reqs.length).toBe(0) // 装载即全量 → init 也被覆盖
    nameRows(edge.el)[8]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    expect(edge.reqs.length).toBe(0)
  })

  // F3 回归：windowed 下 aria 坐标用全量口径（posinset=绝对行号 1 基、setsize=total）；
  // tree/treeitem 不使用 aria-rowcount/aria-rowindex（axe aria-allowed-attr）；非 windowed 保持同级口径
  it('windowed 下 aria 坐标按全量口径；非 windowed 保持同级口径', () => {
    const { el } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '10',
      tasks: taskSlice(10, 5),
    })
    const names = nameRows(el)
    expect(names.length).toBe(5)
    expect(names[0]!.getAttribute('aria-posinset')).toBe('11') // 绝对行号（切片局部 1 会红）
    expect(names[0]!.hasAttribute('aria-rowindex')).toBe(false)
    expect(names[0]!.getAttribute('aria-setsize')).toBe('1000')
    expect(names[4]!.getAttribute('aria-posinset')).toBe('15')
    expect(names[4]!.hasAttribute('aria-rowindex')).toBe(false)
    expect(shadowOf(el).querySelector('.side-rows')!.hasAttribute('aria-rowcount')).toBe(false)
    // 反证：非 windowed 保持既有口径（同级 posinset/setsize，无 rowindex/rowcount）
    const local = mountWindowed({ total: '1000', 'window-start': '10', tasks: taskSlice(10, 5) })
    const lnames = nameRows(local.el)
    expect(lnames[0]!.getAttribute('aria-posinset')).toBe('1')
    expect(lnames[0]!.getAttribute('aria-setsize')).toBe('5')
    expect(lnames[0]!.hasAttribute('aria-rowindex')).toBe(false)
    expect(shadowOf(local.el).querySelector('.side-rows')!.hasAttribute('aria-rowcount')).toBe(false)
  })

  // F4 回归：range-end 含当日（半开 endMs = 次日 00:00，与 resource 托管轴 / 本地 endMsOf 同口径）
  // ——旧实现 day 档靠 pad 兜底、hour 档轴尾停在 range-end 当日 00:00+7h（当日大半无列）
  it('range-end 含当日：day 与 hour 档轴尾都覆盖 range-end 当日（≥ 次日 00:00）', () => {
    const tailOf = (scale: string): number => {
      const { el } = mountWindowed({
        'range-start': '2026-03-01',
        'range-end': '2026-03-31',
        scale,
        tasks: taskSlice(0, 3),
      })
      const units = (el as unknown as { units: Array<{ endMs: number }> }).units
      return units[units.length - 1]!.endMs
    }
    const nextDay = new Date(2026, 2, 31).getTime() + DAY_MS
    expect(tailOf('day')).toBeGreaterThanOrEqual(nextDay)
    expect(tailOf('hour')).toBeGreaterThanOrEqual(nextDay) // 旧实现得 03-31 07:00 → 红
  })

  // F7 回归：windowed 切片越界（window-start + 装载行数 > total）——越界行按 total 夹取不渲染，
  // 实例级 devWarn 一次（旧实现静默截断，宿主误以为切片全部生效）
  it('windowed 切片越界：越界行不渲染（按 total 夹取）+ devWarn 一次', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el } = mountWindowed({
        windowed: '',
        total: '100',
        'window-start': '95',
        height: '120',
        'row-height': '40',
        tasks: taskSlice(95, 20), // loaded [95,115) 越过 total 100 → 越界 15 行
      })
      const msgs = (): string[] =>
        warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('切片超出全量范围'))
      expect(msgs().length, '挂载即告警一次').toBe(1)
      expect(msgs()[0]).toContain('window-start 95')
      expect(msgs()[0]).toContain('越界 15 行')
      // 滚到全量末尾：只渲染 95..99 五行（绝对行号仍正确）
      const tb = tbodyOf(el)
      tb.scrollTop = 95 * 40
      tb.dispatchEvent(new Event('scroll'))
      await flushRaf()
      const rows = nameRows(el)
      expect(rows.map((r) => r.dataset.key)).toEqual(['t95', 't96', 't97', 't98', 't99'])
      el.requestUpdate()
      expect(msgs().length, '重渲染不重复告警').toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  // F5 回归：退出 windowed / 移除 range-* 复位去重态——重进/挂回后首帧重新 init（不被旧去重态吞掉）
  it('windowed 退出重进与 range-* 移除挂回：重新派发 reason=init', () => {
    const { el, reqs, rangeReqs } = mountWindowed({
      windowed: '',
      total: '1000',
      'window-start': '0',
      height: '120',
      'row-height': '40',
      'range-start': '2026-03-01',
      'range-end': '2026-03-31',
      tasks: taskSlice(0, 3),
    })
    expect(reqs.map((r) => r.reason)).toEqual(['init'])
    expect(rangeReqs.map((r) => r.reason)).toEqual(['init'])
    // 退出 windowed 再进：清 winReq 去重态 → 重进同 need 重新 init（旧实现 winReq 残留 → 静默）
    el.removeAttribute('windowed')
    el.setAttribute('windowed', '')
    expect(reqs.map((r) => r.reason)).toEqual(['init', 'init'])
    // range-* 移除再挂回（同值）：清 rangeReq/rangeInitDone → 重新 init（旧实现恒 data）
    el.removeAttribute('range-start')
    el.setAttribute('range-start', '2026-03-01')
    expect(rangeReqs.length).toBe(2)
    expect(rangeReqs[1]!.reason).toBe('init')
  })

  // F6 回归：windowed 下行重排禁用（切片内同级 index 对全量无意义，宿主在全量上处理）——
  // Alt+方向键不派 oas-reparent、数据不动 + devWarn 一次；非 windowed 对照照常重排
  it('windowed 下行重排禁用：Alt+↓ 不派 oas-reparent + devWarn 一次；非 windowed 照常', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el } = mountWindowed({
        windowed: '',
        total: '10',
        'window-start': '0',
        tasks: taskSlice(0, 3),
      })
      let reparent = 0
      el.addEventListener('oas-reparent', () => reparent++)
      nameRows(el)[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }))
      expect(reparent).toBe(0)
      expect(el.tasks.map((t) => t.id)).toEqual(['t0', 't1', 't2'])
      expect(warn.mock.calls.some((c) => String(c[0]).includes('行重排'))).toBe(true)
      el.requestUpdate()
      expect(warn.mock.calls.filter((c) => String(c[0]).includes('行重排')).length).toBe(1)
      // 反证：非 windowed 同操作照常重排（t1 ↓ 与 t2 交换）
      const local = mountWindowed({ tasks: taskSlice(0, 3) })
      let lrep = 0
      local.el.addEventListener('oas-reparent', () => lrep++)
      nameRows(local.el)[1]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
      )
      expect(lrep).toBe(1)
      expect(local.el.tasks.map((t) => t.id)).toEqual(['t0', 't2', 't1'])
    } finally {
      warn.mockRestore()
    }
  })
})

describe('property 通道接受 JSON 字符串（框架把静态 attribute 写成 property）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  it('tasks setter 字符串 → 解析为任务数组', () => {
    const el = mount()
    // @ts-expect-error 以字符串写入：模拟框架把静态 attribute 当 property 传入
    el.tasks = JSON.stringify([{ id: 't1', name: 'A', start: '2026-03-02', end: '2026-03-03' }])
    expect(el.tasks.length).toBe(1)
    expect(el.tasks[0]!.id).toBe('t1')
  })
})

describe('OASGantt 行斑马纹（stripe）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const ROW_H = 36

  function flatTasks(n: number): GanttTask[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      name: `S${i}`,
      start: '2026-03-02',
      end: '2026-03-06',
    }))
  }

  /** top（px）→ 绝对行号：非 windowed top = i×行高、windowed top = (window-start+i)×行高，
   *  两模式下 top/行高都是**全量绝对行号**（absRowTop 契约），断言口径统一 */
  const absOf = (top: string): number => Math.round(Number.parseFloat(top) / ROW_H)

  function stripeAbsRows(el: OASGantt): number[] {
    return [...shadowOf(el).querySelectorAll<HTMLElement>('.stripe-canvas .stripe')].map((s) => absOf(s.style.top))
  }

  /** 私有窗口：触发同步 renderWindow（不走 scroll → rAF 合帧，确定性断言） */
  const rerender = (el: OASGantt): void => (el as unknown as { renderWindow(): void }).renderWindow()

  it('① 默认关：无 .stripe-canvas/.stripe 元素、行名无 data-stripe（零额外 DOM）；stripe="false" 同样关', () => {
    const el = mount({ tasks: JSON.stringify(flatTasks(12)), height: '180', 'row-height': String(ROW_H) })
    expect(shadowOf(el).querySelector('.stripe-canvas')).toBeNull()
    expect(shadowOf(el).querySelectorAll('.stripe').length).toBe(0)
    expect(shadowOf(el).querySelectorAll('.row-name[data-stripe]').length).toBe(0)
    // 防宿主布尔绑定写成 stripe="false" 意外开启（同 auto-schedule / show-critical-path 口径）
    const el2 = mount({
      tasks: JSON.stringify(flatTasks(12)),
      stripe: 'false',
      height: '180',
      'row-height': String(ROW_H),
    })
    expect(shadowOf(el2).querySelector('.stripe-canvas')).toBeNull()
    expect(shadowOf(el2).querySelectorAll('.row-name[data-stripe]').length).toBe(0)
  })

  it('② 开启：窗口内奇数绝对行有条纹、偶数无；行名 data-stripe 同口径且与条纹集合一致', () => {
    const el = mount({
      tasks: JSON.stringify(flatTasks(24)),
      stripe: '',
      height: '180',
      'row-height': String(ROW_H),
    })
    // happy-dom 无布局：viewportH 回落 height 180 → 窗口 [0,11)，奇数绝对行 1/3/5/7/9
    const stripes = stripeAbsRows(el)
    expect(stripes, '窗口行已渲染（前提自检）').toEqual([1, 3, 5, 7, 9])
    const names = nameRows(el)
    expect(names.length).toBe(11)
    names.forEach((r) => {
      const abs = absOf(r.style.top)
      expect(r.hasAttribute('data-stripe'), `绝对行 ${abs} 的行名 data-stripe 应为 ${abs % 2 === 1}`).toBe(
        abs % 2 === 1,
      )
    })
    // 条纹集合与行名底色集合一致（无漏行/残影）
    expect(stripes).toEqual(names.filter((r) => r.hasAttribute('data-stripe')).map((r) => absOf(r.style.top)))
  })

  it('③ 滚动到中部：条纹按绝对奇偶稳定（winStart=21 → 21 有/22 无）；DOM 序着色会整体错位（反证锚点）', () => {
    const el = mount({
      tasks: JSON.stringify(flatTasks(60)),
      stripe: '',
      height: '180',
      'row-height': String(ROW_H),
    })
    const tb = tbodyOf(el)
    // scrollTop = 27×36 → floor=27，−buffer 6 → winStart=21（奇）：首个渲染行即绝对行 21
    tb.scrollTop = 27 * ROW_H
    rerender(el)
    const names = nameRows(el)
    expect(names.length).toBeGreaterThan(0)
    expect(absOf(names[0]!.style.top), '首渲染行 = 绝对行 21（窗口数学自检）').toBe(21)
    // 反证锚点：DOM 序 0 若按序着色应无底色——按**绝对奇偶**必须有（winStart 为奇时两者必错位）
    expect(names[0]!.hasAttribute('data-stripe'), '绝对行 21（奇）→ 行名有底色').toBe(true)
    expect(absOf(names[1]!.style.top)).toBe(22)
    expect(names[1]!.hasAttribute('data-stripe'), '绝对行 22（偶）→ 无').toBe(false)
    for (const abs of stripeAbsRows(el)) expect(abs % 2, `条纹行 ${abs} 应为奇数绝对行`).toBe(1)
    names.forEach((r) => expect(r.hasAttribute('data-stripe')).toBe(absOf(r.style.top) % 2 === 1))
  })

  it('④ windowed 切片：条纹按全量绝对行奇偶（切片 i=0 ↔ 绝对行 21 → 有条纹）', () => {
    const el = new OASGantt()
    el.setAttribute('windowed', '')
    el.setAttribute('total', '100')
    el.setAttribute('window-start', '21')
    el.setAttribute('height', '180')
    el.setAttribute('row-height', String(ROW_H))
    el.setAttribute('stripe', '')
    el.setAttribute('tasks', taskSlice(21, 5))
    document.body.appendChild(el)
    const tb = tbodyOf(el)
    // 可视窗口与装载切片 [21,26) 相交：scrollTop = 21×36 → 全量窗口 [15,32) ∩ [21,26) → 局部 [0,5)
    tb.scrollTop = 21 * ROW_H
    rerender(el)
    const names = nameRows(el)
    expect(names.length, '切片 5 行全渲染').toBe(5)
    // 绝对行号 = window-start + 局部 i：21 奇/22 偶/23 奇/24 偶/25 奇
    names.forEach((r, i) => {
      const abs = absOf(r.style.top)
      expect(abs, 'windowed 定位按绝对行号（absRowTop 契约）').toBe(21 + i)
      expect(r.hasAttribute('data-stripe'), `绝对行 ${abs} 行名底色应为 ${abs % 2 === 1}`).toBe(abs % 2 === 1)
    })
    expect(stripeAbsRows(el)).toEqual([21, 23, 25])
  })

  it('⑤ CSS：--oas-gantt-row-stripe-bg token（缺省 bg-hover）与 .stripe/.stripe-canvas 规则（不拦指针）；行名选中态优先', () => {
    const el = mount({ tasks: JSON.stringify(flatTasks(6)), stripe: '' })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toContain('--oas-gantt-row-stripe-bg')
    expect(css).toMatch(/\.stripe-canvas \{[^}]*pointer-events: none/)
    expect(css).toMatch(/\.stripe-canvas \.stripe \{[^}]*var\(--oas-gantt-row-stripe-bg, var\(--oas-color-bg-hover\)\)/)
    expect(css).toMatch(/\.stripe-canvas \.stripe \{[^}]*pointer-events: none/)
    expect(css).toMatch(
      /\.row-name\[data-stripe\] \{[^}]*var\(--oas-gantt-row-stripe-bg, var\(--oas-color-bg-hover\)\)/,
    )
    // 同特异性下后规则胜：.row-name.selected（选中底色）须定义在 [data-stripe] 之后
    expect(css.indexOf('.row-name[data-stripe]'), '选中态背景覆盖斑马纹').toBeLessThan(
      css.indexOf('.row-name.selected'),
    )
  })

  it('⑥ 移除属性：条纹容器与行名底色即时清除（回归既有外观）', () => {
    const el = mount({
      tasks: JSON.stringify(flatTasks(12)),
      stripe: '',
      height: '180',
      'row-height': String(ROW_H),
    })
    expect(shadowOf(el).querySelectorAll('.stripe').length).toBeGreaterThan(0)
    el.removeAttribute('stripe')
    expect(shadowOf(el).querySelector('.stripe-canvas'), '关闭后容器整体移除，不留一个条纹').toBeNull()
    expect(shadowOf(el).querySelectorAll('.stripe').length).toBe(0)
    expect(shadowOf(el).querySelectorAll('.row-name[data-stripe]').length).toBe(0)
  })
})

// ===== 属性-方法撞名回归（observedAttributes 的 camelCase 与原型方法同名） =====
//
// 机制：宿主框架（Vue 等按 camelCase 做 property 桥接）或用户 JS 写 `el.rowHeight = 48`
// 会在实例上建自有属性遮蔽原型同名方法，组件内部 `this.rowHeight()` 随后抛 TypeError。
// 私有方法已改名（rowHeightPx / labelPositionMode / showTodayOn / datesReadonlyOn /
// progressReadonlyOn），此处锁定：property 写入后 attribute 通道行为仍与未写入时等价。
describe('OASGantt 属性-方法撞名回归', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('property 写入 rowHeight 后 update 不抛错，行高随 row-height 属性生效（.inner 高度 = 行数 × 行高）', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    ;(el as unknown as Record<string, unknown>).rowHeight = 48
    // attribute 变更同步触发 update → 内部 rowHeightPx() 调用；改名前此处抛 TypeError
    expect(() => el.setAttribute('row-height', '48')).not.toThrow()
    // 行为等价断言：BASE_TASKS 3 行 × 48px
    expect(shadowOf(el).querySelector<HTMLElement>('.inner')!.style.height).toBe('144px')
  })

  it('property 写入 labelPosition / showToday / datesReadonly / progressReadonly 后 update 不抛错，行为与 attribute 等价', () => {
    const el = mount({ tasks: JSON.stringify(BASE_TASKS) })
    const rec = el as unknown as Record<string, unknown>
    rec.labelPosition = 'inside'
    rec.showToday = false
    rec.datesReadonly = true
    rec.progressReadonly = true
    expect(() => {
      el.setAttribute('label-position', 'inside')
      el.setAttribute('show-today', 'false')
      el.setAttribute('dates-readonly', '')
      el.setAttribute('progress-readonly', '')
    }).not.toThrow()
    // label-position=inside：条旁标签渲染
    expect(barOf(el, 't1').querySelector('.bar-label')).not.toBeNull()
    // show-today=false：今日线隐藏
    expect(shadowOf(el).querySelector<HTMLElement>('.today-line')!.hidden).toBe(true)
    // dates-readonly / progress-readonly：拖拽手柄与进度手柄不渲染
    expect(barOf(el, 't1').querySelector('.handle')).toBeNull()
    expect(barOf(el, 't1').querySelector('.progress-handle')).toBeNull()
  })
})
