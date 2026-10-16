import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OASResource, levelResources } from './index.js'
import type { ResourceItem, ResourceScale, ResourceTask, ResourceOverloadDetail } from './index.js'

function mount(attrs: Record<string, string> = {}): OASResource {
  const el = new OASResource()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function shadowOf(el: OASResource): ShadowRoot {
  return el.shadowRoot!
}

function laneOf(el: OASResource, resourceId: string): HTMLElement {
  return shadowOf(el).querySelector<HTMLElement>(`.lane[data-resource-id="${resourceId}"]`)!
}

function barsOf(el: OASResource, resourceId: string): HTMLElement[] {
  return [...shadowOf(el).querySelectorAll<HTMLElement>(`.lane[data-resource-id="${resourceId}"] .bar`)]
}

function barOf(el: OASResource, taskId: string, resourceId: string): HTMLElement {
  return shadowOf(el).querySelector<HTMLElement>(
    `.lane[data-resource-id="${resourceId}"] .bar[data-task-id="${taskId}"]`,
  )!
}

function pillarsOf(el: OASResource, resourceId: string): HTMLElement[] {
  return [...shadowOf(el).querySelectorAll<HTMLElement>(`.load[data-resource-id="${resourceId}"] .pillar`)]
}

function tickTexts(el: OASResource): string[] {
  return [...shadowOf(el).querySelectorAll<HTMLElement>('.ticks .tick')].map((t) => t.textContent ?? '')
}

const RES: ResourceItem[] = [
  { id: 'r1', name: '前端组' },
  { id: 'r2', name: '后端组' },
]

const RES_JSON = JSON.stringify(RES)

describe('OASResource 属性与数据通道', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('property 写：tasks setter 清洗 + 同步 attribute + 派发 oas-tasks-change 一次（detail.tasks 为拷贝）', () => {
    const el = mount()
    const changes: number[] = []
    el.addEventListener('oas-tasks-change', ((e: CustomEvent<{ tasks: ResourceTask[] }>) => {
      changes.push(e.detail.tasks.length)
    }) as EventListener)
    el.tasks = [
      { id: 't1', name: '开发', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] },
      { name: '坏数据', start: 'bad', end: '2026-03-06' },
    ] as ResourceTask[]
    expect(changes).toEqual([1])
    expect(el.tasks.length).toBe(1)
    expect(el.tasks[0]!.id).toBe('t1')
    // attribute 同步（清洗后的 JSON，可回读）
    expect(JSON.parse(el.getAttribute('tasks')!)).toEqual([
      { id: 't1', name: '开发', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] },
    ])
  })

  it('property 读：resources/tasks 返回拷贝，改返回值不影响内部状态', () => {
    const el = mount({
      resources: RES_JSON,
      tasks: JSON.stringify([{ id: 't1', name: 'A', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] }]),
    })
    // 值拷贝：改返回对象不影响内部
    const tasks = el.tasks
    tasks[0]!.name = '篡改'
    expect(el.tasks[0]!.name).toBe('A')
    // 数组拷贝：pop 不影响内部
    const tasks2 = el.tasks
    tasks2.pop()
    expect(el.tasks.length).toBe(1)
    const res = el.resources
    res.pop()
    expect(el.resources.length).toBe(2)
  })

  it('attribute 通道：JSON 属性可读；改属性触发重渲染（泳道行数随 resources 变化）', () => {
    const el = mount({ resources: RES_JSON, tasks: '[]' })
    expect(el.resources.map((r) => r.id)).toEqual(['r1', 'r2'])
    el.setAttribute('resources', JSON.stringify([{ id: 'r9', name: '测试组' }]))
    const lanes = [...shadowOf(el).querySelectorAll<HTMLElement>('.lane')]
    expect(lanes.map((l) => l.dataset['resourceId'])).toEqual(['r9'])
  })

  it('property 写的 attribute 序列化为公开形态：capacity 缺省不落 capacity:null、resources 空数组不落字段（读回一致）', () => {
    const el = mount()
    el.resources = [{ id: 'r1', name: 'A' }] as ResourceItem[]
    el.tasks = [{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: [] }] as ResourceTask[]
    const resAttr = JSON.parse(el.getAttribute('resources')!)
    expect(resAttr).toEqual([{ id: 'r1', name: 'A' }])
    expect(Object.hasOwn(resAttr[0], 'capacity')).toBe(false)
    const taskAttr = JSON.parse(el.getAttribute('tasks')!)
    expect(taskAttr).toEqual([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03' }])
    expect(Object.hasOwn(taskAttr[0], 'resources')).toBe(false)
    // attribute 与 property 读回内容一致（反证：内部形态序列化会多出 capacity:null / resources:[]）
    expect(resAttr).toEqual(JSON.parse(JSON.stringify(el.resources)))
    expect(taskAttr).toEqual(JSON.parse(JSON.stringify(el.tasks)))
  })

  it('非法数据容错：resources/tasks 非法条目跳过；重复资源 id 去重；不抛异常', () => {
    const el = mount({
      resources: JSON.stringify([
        'junk',
        { id: '', name: '无 id' },
        { id: 'r1' },
        { id: 'r1', name: '第一份' },
        { id: 'r2', name: '后端组', capacity: 'many' },
        { id: 'r3', name: '测试组', capacity: 3 },
      ]),
      tasks: JSON.stringify([
        { id: 'ok', name: '合法', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] },
        { id: 'bad-date', name: '坏日期', start: 'nope', end: '2026-03-03' },
        { id: '', name: '缺 id', start: '2026-03-02', end: '2026-03-03' },
        { name: '缺 id2', start: '2026-03-02', end: '2026-03-03' },
        null,
        { id: 'no-name', start: '2026-03-02', end: '2026-03-03' },
      ]),
    })
    expect(el.resources.map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(el.resources.find((r) => r.id === 'r3')?.capacity).toBe(3)
    // r2 capacity 非法 → 回落默认（capacity 属性或 1）
    expect(el.resources.find((r) => r.id === 'r2')?.capacity).toBeUndefined()
    expect(el.tasks.map((t) => t.id)).toEqual(['ok'])
    expect(() => el.removeAttribute('resources')).not.toThrow()
  })

  it('日期颠倒自愈：end 早于 start 时交换（同 gantt 口径）', () => {
    const el = mount({
      resources: RES_JSON,
      tasks: JSON.stringify([{ id: 't1', name: 'A', start: '2026-03-06', end: '2026-03-02', resources: ['r1'] }]),
    })
    expect(el.tasks[0]!.start).toBe('2026-03-02')
    expect(el.tasks[0]!.end).toBe('2026-03-06')
  })

  it('未知资源 id 容错：分配指向不存在的资源 → 忽略该分配，不报错也不渲染', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: '前端组' }]),
      tasks: JSON.stringify([
        { id: 't1', name: 'A', start: '2026-03-02', end: '2026-03-03', resources: ['r1', 'ghost'] },
      ]),
    })
    // t1 只出现在 r1 泳道；ghost 不产生任何行/条
    expect(barsOf(el, 'r1').length).toBe(1)
    expect(shadowOf(el).querySelector('.lane[data-resource-id="ghost"]')).toBeNull()
    expect(el.tasks[0]!.resources).toEqual(['r1', 'ghost'])
  })
})

describe('OASResource 泳道渲染', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('泳道分组：每资源一行（按 resources 顺序），条随分配落入对应泳道', () => {
    const el = mount({
      resources: RES_JSON,
      tasks: JSON.stringify([
        { id: 't1', name: '需求', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] },
        { id: 't2', name: '开发', start: '2026-03-03', end: '2026-03-06', resources: ['r1', 'r2'] },
        { id: 't3', name: '联调', start: '2026-03-06', end: '2026-03-06', resources: ['r2'] },
      ]),
    })
    const lanes = [...shadowOf(el).querySelectorAll<HTMLElement>('.lane')]
    expect(lanes.map((l) => l.dataset['resourceId'])).toEqual(['r1', 'r2'])
    expect(barsOf(el, 'r1').map((b) => b.dataset['taskId'])).toEqual(['t1', 't2'])
    expect(barsOf(el, 'r2').map((b) => b.dataset['taskId'])).toEqual(['t2', 't3'])
    // 泳道名与资源顺序一致
    const laneNames = lanes.map((l) => l.querySelector('.name')?.textContent)
    expect(laneNames).toEqual(['前端组', '后端组'])
  })

  it('条位置：day 档 colW=36，单任务 2026-03-02..03-06（5 天）→ left=0、width=180；有更早任务时按锚点偏移', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }]),
    })
    const bar = barOf(el, 't1', 'r1')
    expect(Number.parseFloat(bar.style.left)).toBe(0)
    expect(Number.parseFloat(bar.style.width)).toBe(5 * 36)
    // 刻度 5 格（Mar2..Mar6），单滚动容器里泳道与直方图同源
    expect(tickTexts(el).length).toBe(5)
    expect(tickTexts(el)[0]).toBe('03-02')
    expect(shadowOf(el).querySelector('.scroller .lanes')).not.toBeNull()
    expect(shadowOf(el).querySelector('.scroller .loads')).not.toBeNull()
  })

  it('条位置偏移：锚点为最早任务所在 period，后一天任务 left = 1×colW', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 't0', name: '早', start: '2026-03-01', end: '2026-03-01', resources: ['r1'] },
        { id: 't1', name: '晚', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      ]),
    })
    expect(Number.parseFloat(barOf(el, 't0', 'r1').style.left)).toBe(0)
    expect(Number.parseFloat(barOf(el, 't1', 'r1').style.left)).toBe(36)
    expect(Number.parseFloat(barOf(el, 't1', 'r1').style.width)).toBe(36)
  })

  it('点条派发 oas-task-click：detail { id, task, resourceId }；键盘 Enter/Space 同样触发', () => {
    const el = mount({
      resources: RES_JSON,
      tasks: JSON.stringify([{ id: 't1', name: '开发', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }]),
    })
    const clicks: Array<{ id: string; name: string; resourceId: string }> = []
    el.addEventListener('oas-task-click', ((
      e: CustomEvent<{ id: string; task: { name: string }; resourceId: string }>,
    ) => {
      clicks.push({ id: e.detail.id, name: e.detail.task.name, resourceId: e.detail.resourceId })
    }) as EventListener)
    barOf(el, 't1', 'r1').click()
    expect(clicks).toEqual([{ id: 't1', name: '开发', resourceId: 'r1' }])
    clicks.length = 0
    barOf(el, 't1', 'r1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    barOf(el, 't1', 'r1').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    barOf(el, 't1', 'r1').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(clicks.length).toBe(2)
  })

  it('scale 非法回落 day：colW=36、刻度 MM-dd 文案', () => {
    const el = mount({
      scale: 'quarter',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] }]),
    })
    expect(Number.parseFloat(barOf(el, 't1', 'r1').style.width)).toBe(2 * 36)
    expect(tickTexts(el)[0]).toBe('03-02')
  })
})

describe('OASResource 负载直方图', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('day 档负载：跨 period 任务计入各 period；柱高 ∝ 负载（maxLoad 归一）；柱标 data-load/data-period', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A', capacity: 3 }]),
      tasks: JSON.stringify([
        { id: 't1', name: '长任务', start: '2026-03-02', end: '2026-03-10', resources: ['r1'] },
        { id: 't2', name: '短任务', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      ]),
    })
    const pillars = pillarsOf(el, 'r1')
    // Mar2..Mar10 共 9 个 period 有负载
    expect(pillars.length).toBe(9)
    expect(pillars[0]!.dataset['load']).toBe('2')
    expect(pillars[0]!.dataset['period']).toBe('2026-03-02')
    expect(pillars[1]!.dataset['load']).toBe('1')
    // 柱高 ∝ load / maxLoad：maxLoad=2 → 首柱 100%、次柱 50%
    expect(pillars[0]!.style.height).toBe('100%')
    expect(pillars[1]!.style.height).toBe('50%')
    // capacity=3：load 2 不超载
    expect(pillars.every((p) => !p.classList.contains('over'))).toBe(true)
  })

  it('week 档（周一起始）：跨周任务计入两个 period；period 文案 W 周号', () => {
    const el = mount({
      locale: 'zh-CN',
      scale: 'week',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: '跨周', start: '2026-03-02', end: '2026-03-10', resources: ['r1'] }]),
    })
    const pillars = pillarsOf(el, 'r1')
    // 2026-03-02 周一 → W10（03-02..03-08）；03-09/03-10 → W11
    expect(pillars.length).toBe(2)
    expect(pillars[0]!.dataset['period']).toBe('2026-03-02')
    expect(pillars[1]!.dataset['period']).toBe('2026-03-09')
    expect(tickTexts(el)[0]).toMatch(/^W\d/)
  })

  it('month 档：period 按自然月，文案 yyyy-MM', () => {
    const el = mount({
      scale: 'month',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: '月内', start: '2026-03-02', end: '2026-03-31', resources: ['r1'] }]),
    })
    expect(pillarsOf(el, 'r1').length).toBe(1)
    expect(pillarsOf(el, 'r1')[0]!.dataset['period']).toBe('2026-03-01')
    expect(tickTexts(el)).toEqual(['2026-03'])
  })

  it('超载判定反证：同一 load=2，资源 capacity=3 无 .over / capacity 缺省走属性 capacity=2 无 .over / 默认 capacity=1 有 .over', () => {
    const baseTasks = JSON.stringify([
      { id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      { id: 't2', name: 'A2', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
    ])
    const withCap3 = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A', capacity: 3 }]),
      tasks: baseTasks,
    })
    expect(pillarsOf(withCap3, 'r1')[0]!.classList.contains('over')).toBe(false)
    const withAttrCap2 = mount({
      capacity: '2',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: baseTasks,
    })
    expect(pillarsOf(withAttrCap2, 'r1')[0]!.classList.contains('over')).toBe(false)
    const withDefault = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: baseTasks,
    })
    const over = pillarsOf(withDefault, 'r1')[0]!
    expect(over.classList.contains('over')).toBe(true)
    // 直方图行 a11y：负载轨给可访问名称（role=img + aria-label），柱体/列线为装饰 aria-hidden
    const track = withDefault.shadowRoot!.querySelector('.load .load-track')!
    expect(track.getAttribute('role')).toBe('img')
    expect(track.getAttribute('aria-label') ?? '').toContain('超载')
    expect(track.getAttribute('aria-hidden')).toBeNull()
    expect(over.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('OASResource oas-overload 事件', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('挂载即超载：恰好派发一次（render+connect 双 update 按签名去重），detail 含 resourceId/period/load/capacity', () => {
    const events: ResourceOverloadDetail[] = []
    const el = new OASResource()
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A', capacity: 1 }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] },
        { id: 't2', name: 'A2', start: '2026-03-04', end: '2026-03-06', resources: ['r1'] },
      ]),
    )
    el.addEventListener('oas-overload', ((e: CustomEvent<ResourceOverloadDetail>) => {
      events.push(e.detail)
    }) as EventListener)
    document.body.appendChild(el)
    // 挂载期间 render + connect 双 update：签名去重后只派发一次
    expect(events.length).toBe(1)
    el.requestUpdate()
    expect(events.length).toBe(1)
    expect(events[0]!.overloads).toEqual([
      { resourceId: 'r1', period: '2026-03-04', load: 2, capacity: 1 },
      { resourceId: 'r1', period: '2026-03-05', load: 2, capacity: 1 },
      { resourceId: 'r1', period: '2026-03-06', load: 2, capacity: 1 },
    ])
  })

  it('无超载不派发；超载消除后复位，再次超载再派发', () => {
    const events: ResourceOverloadDetail[] = []
    const el = new OASResource()
    el.setAttribute('resources', JSON.stringify([{ id: 'r1', name: 'A' }]))
    el.setAttribute(
      'tasks',
      JSON.stringify([
        { id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
        { id: 't2', name: 'A2', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      ]),
    )
    el.addEventListener('oas-overload', ((e: CustomEvent<ResourceOverloadDetail>) => {
      events.push(e.detail)
    }) as EventListener)
    document.body.appendChild(el)
    expect(events.length).toBe(1)
    // 修掉超载 → 不派发
    el.tasks = [{ id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] }] as ResourceTask[]
    expect(events.length).toBe(1)
    expect(pillarsOf(el, 'r1').every((p) => !p.classList.contains('over'))).toBe(true)
    // 再次超载 → 再派发（签名已复位）
    el.tasks = [
      { id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      { id: 't2', name: 'A2', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
    ] as ResourceTask[]
    expect(events.length).toBe(2)
    expect(events[1]!.overloads[0]!.load).toBe(2)
  })
})

describe('OASResource scrollToDate', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('LTR：scrollLeft = 目标物理 x − 半视口（正值模型）；非法日期为空操作', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }]),
    })
    const scroller = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    // happy-dom 无布局：显式 mock（clientWidth 100、scrollWidth 180 = 5 格 × 36）
    Object.defineProperty(scroller, 'clientWidth', { value: 100, configurable: true })
    Object.defineProperty(scroller, 'scrollWidth', { value: 180, configurable: true })
    // 2026-03-06 = 第 4 格起点 x=144 → scrollLeft = 144 − 50 = 94
    el.scrollToDate('2026-03-06')
    expect(scroller.scrollLeft).toBe(94)
    // 起点附近：目标 x − 半视口 < 0 → 钳制 0
    el.scrollToDate('2026-03-02')
    expect(scroller.scrollLeft).toBe(0)
    expect(() => el.scrollToDate('bad-date')).not.toThrow()
  })

  it('RTL：负值 scrollLeft 模型（0 在最右、向左滚为负），两端钳制', () => {
    const el = mount({
      dir: 'rtl',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }]),
    })
    const scroller = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    Object.defineProperty(scroller, 'clientWidth', { value: 100, configurable: true })
    Object.defineProperty(scroller, 'scrollWidth', { value: 180, configurable: true })
    // maxScroll = 80；x(03-06)=144 → 镜像 p = 180−144 = 36 → left = clamp(36−50,0,80)=0 → scrollLeft = −80
    el.scrollToDate('2026-03-06')
    expect(scroller.scrollLeft).toBe(-80)
    // 时间轴起点（RTL 画布物理右端 p=180）→ left 钳上界 80 → scrollLeft 0
    el.scrollToDate('2026-03-02')
    expect(scroller.scrollLeft).toBe(0)
    // 画布最左端（RTL 视角时间轴末端 p=0）→ scrollLeft = −maxScroll
    el.scrollToDate('2026-03-07')
    expect(scroller.scrollLeft).toBe(-80)
  })
})

describe('levelResources（纯函数）', () => {
  const RES1: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1 }]
  const PAIR: ResourceTask[] = [
    { id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] },
    { id: 't2', name: 'A2', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] },
  ]

  it('day 档：只后移开始较晚（并列取输入序靠后）的任务；保工期；未移动任务不进返回值', () => {
    const input = PAIR.map((t) => ({ ...t, resources: [...(t.resources ?? [])] }))
    const moved = levelResources(RES1, PAIR)
    expect(moved.map((t) => t.id)).toEqual(['t2'])
    const t2 = moved[0]!
    // 后移一天，工期 5 天不变
    expect(t2.start).toBe('2026-03-07')
    expect(t2.end).toBe('2026-03-11')
    // 不改入参
    expect(PAIR).toEqual(input)
    expect(PAIR[0]!.start).toBe('2026-03-02')
    expect(PAIR[1]!.start).toBe('2026-03-02')
  })

  it('week 档：步进一个周 period（+7 天）；month 档：步进一个自然月且工期不变', () => {
    const week = levelResources(RES1, PAIR, { scale: 'week' })
    expect(week[0]!.start).toBe('2026-03-09')
    expect(week[0]!.end).toBe('2026-03-13')
    const monthPair: ResourceTask[] = [
      { id: 'm1', name: 'M1', start: '2026-03-02', end: '2026-03-31', resources: ['r1'] },
      { id: 'm2', name: 'M2', start: '2026-03-10', end: '2026-03-20', resources: ['r1'] },
    ]
    const month = levelResources(RES1, monthPair, { scale: 'month' })
    expect(month.map((t) => t.id)).toEqual(['m2'])
    // 3 月任务移入 4 月：开始晚 31 天（3-10 → 4-10），工期 11 天不变
    expect(month[0]!.start).toBe('2026-04-10')
    expect(month[0]!.end).toBe('2026-04-20')
  })

  it('month 档月末平移：01-31 → 02-28（2026 非闰年钳月末），不溢出到 03 月且工期保持', () => {
    const pair: ResourceTask[] = [
      { id: 'e1', name: '锚', start: '2026-01-31', end: '2026-01-31', resources: ['r1'] },
      { id: 'e2', name: '受害', start: '2026-01-31', end: '2026-01-31', resources: ['r1'] },
    ]
    const moved = levelResources(RES1, pair, { scale: 'month' })
    expect(moved.map((t) => t.id)).toEqual(['e2'])
    // 旧实现 new Date(y, m+1, 31) 溢出成 03-03；钳制后落 02-28，工期 1 天不变
    expect(moved[0]!.start).toBe('2026-02-28')
    expect(moved[0]!.end).toBe('2026-02-28')
  })

  it('确定性：同输入两次调用结果一致（深相等）', () => {
    const a = levelResources(RES1, PAIR)
    const b = levelResources(RES1, PAIR)
    expect(a).toEqual(b)
  })

  it('收敛：level 结果并回数据后组件直方图无 .over、不再派发 oas-overload', () => {
    const moved = levelResources(RES1, PAIR)
    const leveled = PAIR.map((t) => moved.find((m) => m.id === t.id) ?? t)
    document.body.innerHTML = ''
    const el = mount({
      resources: JSON.stringify(RES1),
      tasks: JSON.stringify(leveled),
    })
    expect(pillarsOf(el, 'r1').every((p) => !p.classList.contains('over'))).toBe(true)
  })

  it('达上限停止：maxIter=0 不移动返回空数组；maxIter=2 恰好步进 2 个 period 后停止（仍超载）', () => {
    expect(levelResources(RES1, PAIR, { maxIter: 0 })).toEqual([])
    const two = levelResources(RES1, PAIR, { maxIter: 2 })
    expect(two[0]!.start).toBe('2026-03-04')
    // 2 次移动后 r1 在 03-04 档仍超载 → 结果尚未收敛（对比默认档能收敛到 03-07）
    expect(two[0]!.start).not.toBe('2026-03-07')
  })

  it('只挂未知资源的任务不参与、不移动、返回空', () => {
    const ghost: ResourceTask[] = [
      { id: 'g1', name: 'G', start: '2026-03-02', end: '2026-03-02', resources: ['ghost'] },
    ]
    expect(levelResources(RES1, ghost)).toEqual([])
    expect(ghost[0]!.start).toBe('2026-03-02')
  })

  it('levelResources 输出可写回组件（setter 通道贯通）', () => {
    const el = mount({ resources: JSON.stringify(RES1), tasks: '[]' })
    const moved = levelResources(RES1, PAIR)
    const leveled = PAIR.map((t) => moved.find((m) => m.id === t.id) ?? t)
    el.tasks = leveled as ResourceTask[]
    expect(el.tasks.length).toBe(2)
    expect(el.tasks.find((t) => t.id === 't2')!.start).toBe('2026-03-07')
  })
})

describe('OASResource 空态与语义', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('空 resources 或空 tasks → 空态文案（i18n 非 key 本身），滚动区隐藏，不抛异常', () => {
    const el1 = mount({ resources: '[]', tasks: '[]' })
    const empty1 = shadowOf(el1).querySelector<HTMLElement>('.empty')!
    expect(empty1.hidden).toBe(false)
    expect((empty1.textContent ?? '').length).toBeGreaterThan(0)
    expect(empty1.textContent ?? '').not.toContain('resource.')
    expect(shadowOf(el1).querySelector<HTMLElement>('.scroller')!.hidden).toBe(true)
    expect(() => el1.scrollToDate('2026-03-02')).not.toThrow()

    const el2 = mount({
      resources: RES_JSON,
      tasks: '[]',
    })
    expect(shadowOf(el2).querySelector<HTMLElement>('.empty')!.hidden).toBe(false)
  })

  it('语义：容器 role=group + aria-label（i18n）；条 role=button + aria-label 含任务名/日期/资源名；刻度可读', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: '前端组' }]),
      tasks: JSON.stringify([{ id: 't1', name: '开发', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }]),
    })
    const wrap = shadowOf(el).querySelector('[role="group"]')!
    expect(wrap.getAttribute('aria-label')).toBeTruthy()
    expect(wrap.getAttribute('aria-label')).not.toContain('resource.')
    const bar = barOf(el, 't1', 'r1')
    expect(bar.getAttribute('role')).toBe('button')
    const aria = bar.getAttribute('aria-label') ?? ''
    expect(aria).toContain('开发')
    expect(aria).toContain('2026-03-02')
    expect(aria).toContain('2026-03-06')
    expect(aria).toContain('前端组')
    // 直方图区标题可读（非 key 回落）
    const histHead = shadowOf(el).querySelector('.hist-head .name')!
    expect((histHead.textContent ?? '').length).toBeGreaterThan(0)
    expect(histHead.textContent ?? '').not.toContain('resource.')
  })

  it('height 属性映射为 --oas-resource-height（不写宿主 height 内联）；未提供/非法/移除时移除该自定义属性', () => {
    // 显式提供 height 属性 → 写组件自有自定义属性（.wrap 恒不落内联，交给 CSS height:100% 填充）
    const el = mount({ height: '480', resources: '[]', tasks: '[]' })
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('480px')
    // 不写宿主 height 内联（宿主内联 height 优先级高于 :host 规则；组件从不触碰宿主内联）
    expect(el.style.height).toBe('')
    const wrap = shadowOf(el).querySelector<HTMLElement>('.wrap')!
    expect(wrap.style.height).toBe('')
    // 非法值回落 320
    el.setAttribute('height', 'bad')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('320px')
    // 移除属性 → 移除自定义属性（回落 :host → token 缺省 / 宿主 CSS）
    el.removeAttribute('height')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('')
    expect(el.style.height).toBe('')
    // 未提供属性直接挂载 → 同样不写自定义属性
    const el2 = mount({ resources: '[]', tasks: '[]' })
    expect(el2.style.getPropertyValue('--oas-resource-height')).toBe('')
    expect(el2.style.height).toBe('')
    expect(shadowOf(el2).querySelector<HTMLElement>('.wrap')!.style.height).toBe('')
    // 宿主自带内联高度（无 height 属性）→ 组件不清除、不覆盖、不写自定义属性
    const el3 = new OASResource()
    el3.style.height = '400px'
    document.body.appendChild(el3)
    expect(el3.style.height).toBe('400px')
    expect(el3.hasAttribute('height')).toBe(false)
    expect(el3.style.getPropertyValue('--oas-resource-height')).toBe('')
  })

  it('scale 三档切换：改 scale 属性 → 刻度与直方图 period 粒度随之重建', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: '跨周', start: '2026-03-02', end: '2026-03-10', resources: ['r1'] }]),
    })
    expect(pillarsOf(el, 'r1').length).toBe(9) // day：9 天
    el.setAttribute('scale', 'week')
    expect(pillarsOf(el, 'r1').length).toBe(2) // week：2 周
    el.setAttribute('scale', 'month')
    expect(pillarsOf(el, 'r1').length).toBe(1) // month：1 个月
  })
})

describe('OASResource 自定义字段透传（I4）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('resources/tasks 白名单外未知键保留：property 读回与 attribute 序列化都在', () => {
    const el = mount()
    el.resources = [{ id: 'r1', name: 'A', dept: '前端', level: 3 } as ResourceItem]
    el.tasks = [
      { id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'], assignee: '张三' },
    ] as ResourceTask[]
    expect(el.resources[0]!.dept).toBe('前端')
    expect(el.resources[0]!['level']).toBe(3)
    expect(el.tasks[0]!.assignee).toBe('张三')
    expect(JSON.parse(el.getAttribute('resources')!)[0].dept).toBe('前端')
    expect(JSON.parse(el.getAttribute('tasks')!)[0].assignee).toBe('张三')
  })

  it('attribute 通道同样保留未知键；已知键按校验口径生效（不被自定义键顶掉）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A', dept: '前端' }]),
      tasks: JSON.stringify([
        { id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'], assignee: '张三' },
      ]),
    })
    expect(el.resources[0]!.dept).toBe('前端')
    expect(el.tasks[0]!.assignee).toBe('张三')
    expect(el.tasks[0]!.resources).toEqual(['r1'])
  })

  it('读为深拷贝：自定义键的对象/数组改返回值不影响内部状态（嵌套层同样隔离）', () => {
    const el = mount()
    const meta = { nested: { deep: [1, 2, { x: 1 }] } }
    el.resources = [{ id: 'r1', name: 'A', meta }] as ResourceItem[]
    el.tasks = [
      { id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'], tags: ['a', 'b'] },
    ] as ResourceTask[]
    type Meta = { nested: { deep: Array<number | { x: number }> } }
    // 改读回值的嵌套对象/数组 → 内部（再读回）不受影响
    const metaView = el.resources[0]!.meta as Meta
    const deepTail = metaView.nested.deep[2] as { x: number }
    deepTail.x = 999
    metaView.nested.deep.push(3)
    ;(el.tasks[0]!.tags as string[]).push('c')
    expect((el.resources[0]!.meta as Meta).nested.deep[2]).toEqual({ x: 1 })
    expect((el.resources[0]!.meta as Meta).nested.deep).toHaveLength(3)
    expect(el.tasks[0]!.tags).toEqual(['a', 'b'])
    // 原始入参对象同样不被内部引用（写通道走清洗拷贝）
    expect(meta.nested.deep[2]).toEqual({ x: 1 })
    expect(meta.nested.deep).toHaveLength(3)
  })

  it('危险键硬化：__proto__/constructor/prototype 自定义键被跳过，不触发原型 setter、不落 attribute', () => {
    const el = mount()
    // JSON.parse 会把 "__proto__" 建为自有数据属性（绕过对象字面量的 setter 语义）
    const rawRes = JSON.parse('{"id":"r1","name":"A","__proto__":{"polluted":1},"constructor":"x"}')
    const rawTask = JSON.parse(
      '{"id":"t1","name":"T","start":"2026-03-02","end":"2026-03-03","resources":["r1"],"prototype":"y"}',
    )
    el.resources = [rawRes] as ResourceItem[]
    el.tasks = [rawTask] as ResourceTask[]
    // 原型未被污染（透传赋值走 set 触发 __proto__ setter 的路径被跳过）
    expect(Object.getPrototypeOf(el.resources[0])).toBe(Object.prototype)
    expect((el.resources[0] as Record<string, unknown>).polluted).toBeUndefined()
    expect((el.tasks[0] as Record<string, unknown>).prototype).toBeUndefined()
    expect((el.tasks[0] as Record<string, unknown>).constructor).not.toBe('x')
    // 不落 attribute 序列化
    const resAttr = JSON.parse(el.getAttribute('resources')!)
    expect(Object.hasOwn(resAttr[0], '__proto__')).toBe(false)
    expect(Object.hasOwn(resAttr[0], 'constructor')).toBe(false)
    const taskAttr = JSON.parse(el.getAttribute('tasks')!)
    expect(Object.hasOwn(taskAttr[0], 'prototype')).toBe(false)
  })

  it('levelResources 输出保留自定义键', () => {
    const moved = levelResources([{ id: 'r1', name: 'A', capacity: 1 }], [
      { id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-06', resources: ['r1'], assignee: '甲' },
      { id: 't2', name: 'A2', start: '2026-03-02', end: '2026-03-06', resources: ['r1'], assignee: '乙' },
    ] as ResourceTask[])
    expect(moved[0]!.assignee).toBe('乙')
  })
})

describe('OASResource 重复任务 id（I2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('重复 id 保留首个 + 丢弃后续 + devWarn 一次；点击派发首个任务', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
        tasks: JSON.stringify([
          { id: 'dup', name: '首个', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] },
          { id: 'dup', name: '重复', start: '2026-03-04', end: '2026-03-05', resources: ['r1'] },
        ]),
      })
      expect(el.tasks.length).toBe(1)
      expect(el.tasks[0]!.name).toBe('首个')
      expect(warn).toHaveBeenCalledTimes(1)
      // 泳道只有首个的条
      expect(barsOf(el, 'r1').length).toBe(1)
      const names: string[] = []
      el.addEventListener('oas-task-click', ((e: CustomEvent<{ task: { name: string } }>) => {
        names.push(e.detail.task.name)
      }) as EventListener)
      barOf(el, 'dup', 'r1').click()
      expect(names).toEqual(['首个'])
    } finally {
      warn.mockRestore()
    }
  })

  it('levelResources：被丢弃的重复 id 不进 moved', () => {
    const moved = levelResources([{ id: 'r1', name: 'A', capacity: 1 }], [
      { id: 't1', name: 'A', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] },
      { id: 't1', name: 'A-重复', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] },
    ] as ResourceTask[])
    // 清洗后仅剩首个 → 单任务无超载 → 无 moved
    expect(moved).toEqual([])
  })
})

describe('OASResource 条几何最小宽钳制（F2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('month 档末档单日任务：最小宽度并进 width 与 left，条恒在画布内（left+width ≤ canvasW）', () => {
    const el = mount({
      scale: 'month',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-31', end: '2026-03-31', resources: ['r1'] }]),
    })
    const bar = barOf(el, 't1', 'r1')
    const left = Number.parseFloat(bar.style.left)
    const width = Number.parseFloat(bar.style.width)
    // 反证旧实现：style width = 比例内插 3.55px（< 8），CSS min-width:8px 生效后右缘越出轨道 ~4.4px
    expect(width, 'style 宽度直接钳到最小宽 8（CSS 不再二次放大）').toBe(8)
    expect(left, 'left ≥ 0').toBeGreaterThanOrEqual(0)
    expect(left + width, '条右缘 ≤ canvasW（1 格 × 110）').toBeLessThanOrEqual(110)
  })

  it('MAX_PERIODS 截断形态：起点落在时间轴外的条钳回画布内（left+width ≤ canvasW）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'head', name: '近', start: '2026-01-01', end: '2026-01-02', resources: ['r1'] },
        { id: 'far', name: '远', start: '2100-01-01', end: '2101-01-01', resources: ['r1'] },
      ]),
    })
    const bar = barOf(el, 'far', 'r1')
    const left = Number.parseFloat(bar.style.left)
    const width = Number.parseFloat(bar.style.width)
    // 反证旧实现：xOf 对画布外起点返回 canvasW → left=180000、w=2 → 右缘 180002 越界
    expect(left, 'left ≥ 0').toBeGreaterThanOrEqual(0)
    expect(left + width, '条右缘 ≤ canvasW（5000 格 × 36）').toBeLessThanOrEqual(5000 * 36)
    // 近端任务不受钳制影响
    expect(Number.parseFloat(barOf(el, 'head', 'r1').style.left)).toBe(0)
  }, 30_000)
})

describe('OASResource height 自定义属性接管（F1b：宿主真内联永不被吞 / DSD 自写值不残留）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('DSD 回放态（快照含组件自写 --oas-resource-height:480px + height="480"）→ 移除属性后归零（不残留 480）', () => {
    // 模拟 DSD/SSR 回放态：升级（首帧 update）前宿主已带 height="480" 属性 + 组件自写的自定义属性
    const el = new OASResource()
    el.style.setProperty('--oas-resource-height', '480px')
    el.setAttribute('height', '480')
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    expect(el.style.getPropertyValue('--oas-resource-height'), '属性在：自写高度 480px 生效').toBe('480px')
    el.removeAttribute('height')
    // 反证旧实现「hostHeightBefore 快照」：误把宿主真内联还原成旧高度；新实现直接移除自定义属性 → 回落 token
    expect(el.style.getPropertyValue('--oas-resource-height'), '移除属性后归零（不残留 480）').toBe('')
    expect(el.style.height, 'DSD 自写从不落宿主 height 内联').toBe('')
  })

  it('CSR 宿主真内联（≠ 属性映射值）永不被吞：加 height 属性 → 移除 → 宿主内联仍在', () => {
    const el = new OASResource()
    el.style.height = '400px'
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    expect(el.style.height, '未设属性：宿主内联保持').toBe('400px')
    el.setAttribute('height', '480')
    expect(el.style.height, '设属性：宿主内联仍不被组件触碰').toBe('400px')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('480px')
    el.removeAttribute('height')
    expect(el.style.height, '移除属性：宿主真内联仍在 400px（不被清除）').toBe('400px')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('')
  })

  it('CSR 宿主真内联 == 属性映射值（480px + height="480"）也不被吞——DSD/CSR 无法凭值区分的旧缺陷', () => {
    // 反证旧实现（hostHeightBefore = existing === next ? '' : existing）：宿主真内联 480 被误判为
    // 组件自写 → 移除属性时清掉宿主内联（宿主的 480 丢失）
    const el = new OASResource()
    el.style.height = '480px'
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    el.setAttribute('height', '480')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('480px')
    el.removeAttribute('height')
    expect(el.style.height, '宿主真内联 480px 不得被清').toBe('480px')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('')
  })

  it('CSR 宿主真内联 320px + height="bad"：移除 → 宿主内联仍 320px', () => {
    const el = new OASResource()
    el.style.height = '320px'
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    el.setAttribute('height', 'bad')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('320px')
    el.removeAttribute('height')
    expect(el.style.height, '宿主真内联 320px 不得被清').toBe('320px')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('')
  })

  it('① token 通道：宿主内联 --oas-resource-height:500px（无 height 属性）不被组件清除', () => {
    const el = new OASResource()
    el.style.setProperty('--oas-resource-height', '500px')
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('500px')
    el.requestUpdate()
    // 反证旧改法（无属性恒 removeProperty）：宿主内联 token 被组件清掉 → token 通道失效（回落 320）
    expect(el.style.getPropertyValue('--oas-resource-height'), '无 height 属性时组件既不写也不清宿主内联 token').toBe(
      '500px',
    )
  })

  it('接管语义：宿主内联 token 500px + height="480" 期间由属性接管，移除属性后归零（不残留 480）', () => {
    const el = new OASResource()
    el.style.setProperty('--oas-resource-height', '500px')
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    el.setAttribute('height', '480')
    expect(el.style.getPropertyValue('--oas-resource-height'), '属性在场：接管为 480px').toBe('480px')
    el.removeAttribute('height')
    expect(el.style.getPropertyValue('--oas-resource-height'), '移除属性：归零回落 token 缺省（不残留 480）').toBe('')
  })

  it('加→删→加→删 循环稳定（自定义属性随属性存在性同步，无状态残留）', () => {
    const el = mount({ resources: '[]', tasks: '[]' })
    for (const h of ['480', '500']) {
      el.setAttribute('height', h)
      expect(el.style.getPropertyValue('--oas-resource-height')).toBe(`${h}px`)
      el.removeAttribute('height')
      expect(el.style.getPropertyValue('--oas-resource-height')).toBe('')
    }
    expect(el.style.height, '全程宿主 height 内联不被写入').toBe('')
  })
})

describe('OASResource cloneCustom 记忆化深拷贝（F4）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('150 层嵌套深拷贝无深度截断：读回后篡改最深层不影响内部', () => {
    const el = mount()
    let deep: Record<string, unknown> = { leaf: 1 }
    for (let i = 0; i < 150; i++) deep = { n: i, next: deep }
    el.resources = [{ id: 'r1', name: 'A', deep }] as ResourceItem[]
    type Deep = { leaf?: number; next?: Deep }
    const walk = (d: Deep): Deep => {
      let c = d
      while (c.next) c = c.next
      return c
    }
    // 反证旧实现：>100 层被 MAX_CLONE_DEPTH 按引用返回 → 篡改穿透到内部
    walk(el.resources[0]!.deep as Deep).leaf = 999
    expect(walk(el.resources[0]!.deep as Deep).leaf, '150 层仍为拷贝（篡改不穿透）').toBe(1)
  })

  it('自环/互环不抛：读回为含环拷贝（环闭合在拷贝上），篡改拷贝不影响内部源对象', () => {
    const el = mount()
    const a: Record<string, unknown> = { name: 'a' }
    a['self'] = a
    const b: Record<string, unknown> = { name: 'b' }
    const c: Record<string, unknown> = { name: 'c' }
    b['other'] = c
    c['other'] = b
    expect(() => {
      el.resources = [{ id: 'r1', name: 'A', loop: a, pair: b }] as ResourceItem[]
    }).not.toThrow()
    const view = el.resources[0]!.loop as Record<string, unknown>
    expect(view['name']).toBe('a')
    // 反证旧实现：命中环返回原引用 → self 指回内部源对象 a；新语义环闭合在拷贝上
    expect(view['self'], '自环闭合在拷贝上（非内部源）').toBe(view)
    const bv = el.resources[0]!.pair as Record<string, unknown>
    const cv = bv['other'] as Record<string, unknown>
    expect(cv['other'], '互环闭合在拷贝间').toBe(bv)
    view['name'] = '篡改'
    expect(a['name'], '内部源对象不受读回篡改影响').toBe('a')
  })

  it('同一对象在兄弟位置 → 结果中同一引用（共享关系保持，非各复制一份）', () => {
    const el = mount()
    const shared = { x: 1 }
    el.resources = [{ id: 'r1', name: 'A', a: shared, b: shared }] as ResourceItem[]
    const view = el.resources[0] as Record<string, unknown>
    // 反证旧实现（路径集语义）：a/b 各复制一份 → 不同引用；新语义保持共享
    expect(view['a'], '兄弟位置共享同一拷贝引用').toBe(view['b'])
    ;(view['a'] as { x: number }).x = 42
    expect((view['b'] as { x: number }).x, '改 a 见于 b（同一对象）').toBe(42)
    expect(shared.x, '内部源不受读回篡改影响').toBe(1)
  })
})

describe('OASResource 重叠任务堆叠（I3）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('同资源重叠任务分入不同段（top 偏移段序、轨道高度算式含段数）；不重叠任务同段（段数=1）；段数不落 CSS 变量', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'x1', name: 'a', start: '2026-03-02', end: '2026-03-05', resources: ['r1'] },
        { id: 'x2', name: 'b', start: '2026-03-03', end: '2026-03-06', resources: ['r1'] },
      ]),
    })
    const track = shadowOf(el).querySelector<HTMLElement>('.lane[data-resource-id="r1"] .track')!
    // 段数=2 → 高度算式 2*barH + 3*gap；段数为内部量，不再以 CSS 变量形式出现。
    // gap 由 :host 声明（恒有值），消费点不挂不可达 fallback
    expect(track.style.height).toBe('calc(2 * var(--oas-resource-bar-height, 20px) + 3 * var(--oas-resource-lane-gap))')
    expect(track.style.getPropertyValue('--oas-resource-segments')).toBe('')
    const top0 =
      'calc(var(--oas-resource-lane-gap) + 0 * (var(--oas-resource-bar-height, 20px) + var(--oas-resource-lane-gap)))'
    const top1 =
      'calc(var(--oas-resource-lane-gap) + 1 * (var(--oas-resource-bar-height, 20px) + var(--oas-resource-lane-gap)))'
    expect(barOf(el, 'x1', 'r1').style.top).toBe(top0)
    expect(barOf(el, 'x2', 'r1').style.top).toBe(top1)
    expect(barOf(el, 'x1', 'r1').style.getPropertyValue('--oas-resource-row')).toBe('')

    const el2 = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'y1', name: 'c', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
        { id: 'y2', name: 'd', start: '2026-03-04', end: '2026-03-04', resources: ['r1'] },
      ]),
    })
    const track2 = shadowOf(el2).querySelector<HTMLElement>('.lane[data-resource-id="r1"] .track')!
    expect(track2.style.height).toBe(
      'calc(1 * var(--oas-resource-bar-height, 20px) + 2 * var(--oas-resource-lane-gap))',
    )
    expect(barOf(el2, 'y1', 'r1').style.top).toBe(top0)
    expect(barOf(el2, 'y2', 'r1').style.top).toBe(top0)
  })

  it('三重重叠：段数=3，轨道高度算式 3*barH + 4*gap，段序 0/1/2', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'a1', name: 'a', start: '2026-03-02', end: '2026-03-08', resources: ['r1'] },
        { id: 'a2', name: 'b', start: '2026-03-03', end: '2026-03-09', resources: ['r1'] },
        { id: 'a3', name: 'c', start: '2026-03-04', end: '2026-03-10', resources: ['r1'] },
      ]),
    })
    const track = shadowOf(el).querySelector<HTMLElement>('.lane[data-resource-id="r1"] .track')!
    expect(track.style.height).toBe('calc(3 * var(--oas-resource-bar-height, 20px) + 4 * var(--oas-resource-lane-gap))')
    const rows = ['a1', 'a2', 'a3'].map((id) => barOf(el, id, 'r1').style.top)
    expect(new Set(rows).size).toBe(3)
    expect(rows[2]).toContain('+ 2 * (')
  })
})

describe('OASResource 表头/刻度容器宽度（C1 机制）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ticks 与 hist-pad 显式 = canvasW（与泳道 track 同宽同位，RTL 镜像与横向覆盖前提）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }]),
    })
    expect(shadowOf(el).querySelector<HTMLElement>('.ticks')!.style.width).toBe('180px')
    expect(shadowOf(el).querySelector<HTMLElement>('.hist-pad')!.style.width).toBe('180px')
    expect(shadowOf(el).querySelector<HTMLElement>('.lane .track')!.style.width).toBe('180px')
  })
})

describe('OASResource week 刻度文案（M3）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('非周一起始（en-US 周日起始）用起始日 MM-dd，而非会错一周的 ISO 周号', () => {
    const el = mount({
      locale: 'en-US',
      scale: 'week',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: '跨周', start: '2026-03-02', end: '2026-03-10', resources: ['r1'] }]),
    })
    expect(tickTexts(el)[0]).toBe('03-01')
  })
})

describe('OASResource scrollToDate 居中扣除资源名列（M4）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('LTR：按剩余时间轴区域居中（扣除 sticky 名列宽度）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }]),
    })
    const scroller = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    Object.defineProperty(scroller, 'clientWidth', { value: 300, configurable: true })
    Object.defineProperty(scroller, 'scrollWidth', { value: 1000, configurable: true })
    const name = shadowOf(el).querySelector<HTMLElement>('.name')!
    Object.defineProperty(name, 'offsetWidth', { value: 160, configurable: true })
    // x(03-06)=144；居中于 [160,300] 区域 → scrollLeft = 144 − (300−160)/2 = 74
    el.scrollToDate('2026-03-06')
    expect(scroller.scrollLeft).toBe(74)
  })
})

describe('OASResource 负载行 a11y（M5）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('正常行/超载行各给 aria-label（含资源名与档数）', () => {
    const el = mount({
      resources: JSON.stringify([
        { id: 'r1', name: '张三', capacity: 1 },
        { id: 'r2', name: '李四', capacity: 5 },
      ]),
      tasks: JSON.stringify([
        { id: 'a', name: 'A', start: '2026-03-02', end: '2026-03-02', resources: ['r1', 'r2'] },
        { id: 'b', name: 'B', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
      ]),
    })
    const overTrack = shadowOf(el).querySelector<HTMLElement>('.load[data-resource-id="r1"] .load-track')!
    const normalTrack = shadowOf(el).querySelector<HTMLElement>('.load[data-resource-id="r2"] .load-track')!
    expect(overTrack.getAttribute('role')).toBe('img')
    expect(overTrack.getAttribute('aria-label') ?? '').toContain('张三')
    expect(overTrack.getAttribute('aria-label') ?? '').toContain('超载')
    expect(overTrack.getAttribute('aria-label') ?? '').toContain('1')
    expect(normalTrack.getAttribute('aria-label') ?? '').toContain('李四')
    expect(normalTrack.getAttribute('aria-label') ?? '').toContain('正常')
  })
})

describe('OASResource 日期时间串按日处理（M11）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('带时刻输入截断到当日（日精度 end 含当日）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 't1', name: 'T', start: '2026-03-02T18:30:00', end: '2026-03-04T09:00:00', resources: ['r1'] },
      ]),
    })
    expect(el.tasks[0]!.start).toBe('2026-03-02')
    expect(el.tasks[0]!.end).toBe('2026-03-04')
    // 03-02..03-04（含端）= 3 个 day period
    expect(pillarsOf(el, 'r1').length).toBe(3)
  })
})

describe('OASResource period 截断告警（M2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('超过 MAX_PERIODS → period 数封顶到 5000 且 devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({
        resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
        tasks: JSON.stringify([{ id: 'big', name: '超长', start: '2026-01-01', end: '2045-01-01', resources: ['r1'] }]),
      })
      expect(tickTexts(el).length).toBe(5000)
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('截断告警为实例级：第二个实例（同进程、模块级去重已被前例消费）仍各告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // 此前用例已让模块级 periodsTruncWarned 置位：模块级实现下这里 0 次告警（跨用例顺序耦合）
      const el1 = mount({
        resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
        tasks: JSON.stringify([{ id: 'big', name: '超长', start: '2026-01-01', end: '2045-01-01', resources: ['r1'] }]),
      })
      expect(tickTexts(el1).length).toBe(5000)
      const countAfterFirst = warn.mock.calls.length
      expect(countAfterFirst).toBeGreaterThanOrEqual(1)
      const el2 = mount({
        resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
        tasks: JSON.stringify([
          { id: 'big2', name: '超长', start: '2026-01-01', end: '2045-01-01', resources: ['r1'] },
        ]),
      })
      expect(tickTexts(el2).length).toBe(5000)
      expect(warn.mock.calls.length).toBe(countAfterFirst + 1)
      // 同一实例重复 update 不重复告警
      el2.requestUpdate()
      expect(warn.mock.calls.length).toBe(countAfterFirst + 1)
    } finally {
      warn.mockRestore()
    }
  }, 30_000)
})

describe('OASResource height 协议三态（空串 / px 后缀 / 移除）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('height=""（SFC 空绑定）按未设置处理：不写自定义属性；宿主自带内联不被吞', () => {
    const el = mount({ height: '', resources: '[]', tasks: '[]' })
    expect(el.hasAttribute('height')).toBe(true)
    expect(el.style.getPropertyValue('--oas-resource-height'), '空串不写自定义属性（token/宿主 CSS 生效）').toBe('')
    // 宿主自带内联 360 + 空串属性 → 不清宿主内联
    const el2 = new OASResource()
    el2.style.height = '360px'
    el2.setAttribute('height', '')
    el2.setAttribute('resources', '[]')
    el2.setAttribute('tasks', '[]')
    document.body.appendChild(el2)
    expect(el2.style.height, '空串不吞宿主内联').toBe('360px')
    expect(el2.style.getPropertyValue('--oas-resource-height')).toBe('')
  })

  it('height 接受 px 后缀与纯数字；非法仍回落 320', () => {
    const el = mount({ height: '480px', resources: '[]', tasks: '[]' })
    expect(el.style.getPropertyValue('--oas-resource-height'), '带 px 后缀生效').toBe('480px')
    el.setAttribute('height', '500')
    expect(el.style.getPropertyValue('--oas-resource-height'), '纯数字生效').toBe('500px')
    el.setAttribute('height', 'bad')
    expect(el.style.getPropertyValue('--oas-resource-height'), '非法回落 320').toBe('320px')
    // 全程宿主 height 内联不被写入
    expect(el.style.height).toBe('')
  })

  it('height 属性移除后回落 token：宿主原有内联 400px 始终不被吞', () => {
    const el = new OASResource()
    el.style.height = '400px'
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    expect(el.style.height, '未设属性：宿主内联保持').toBe('400px')
    el.setAttribute('height', '480')
    expect(el.style.height, '设属性：组件不覆盖宿主内联（仅写自定义属性）').toBe('400px')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('480px')
    el.removeAttribute('height')
    expect(el.style.height, '移除属性：宿主原内联 400 仍在').toBe('400px')
    expect(el.style.getPropertyValue('--oas-resource-height'), '移除属性：自定义属性归零').toBe('')
  })
})

describe('OASResource 环检测与 setter 序列化容错', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('cloneCustom 环检测：循环引用自定义键在读路径（levelResources 输出）不抛 RangeError', () => {
    const cyc: Record<string, unknown> = { n: 1 }
    cyc['self'] = cyc
    const RES: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1 }]
    const tasks = [
      { id: 't1', name: 'A1', start: '2026-03-02', end: '2026-03-06', resources: ['r1'], meta: cyc },
      { id: 't2', name: 'A2', start: '2026-03-02', end: '2026-03-06', resources: ['r1'], meta: cyc },
    ] as ResourceTask[]
    let moved: ResourceTask[] = []
    expect(() => {
      moved = levelResources(RES, tasks)
    }, '循环引用不抛栈溢出').not.toThrow()
    expect(moved.map((t) => t.id)).toEqual(['t2'])
    expect(moved[0]!.meta, '自定义键保留（含环深拷贝）').toBeDefined()
  })

  it('setter JSON.stringify 容错：循环引用自定义键不抛，落 devWarn，属性降级为已知字段；读路径同样不抛', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      const cyc: Record<string, unknown> = { n: 1 }
      cyc['self'] = cyc
      expect(() => {
        el.resources = [{ id: 'r1', name: 'A', meta: cyc }] as ResourceItem[]
      }, 'resources setter 不抛').not.toThrow()
      expect(() => {
        el.tasks = [
          { id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'], meta: cyc },
        ] as ResourceTask[]
      }, 'tasks setter 不抛').not.toThrow()
      // 属性降级（逐键）：不可序列化的自定义键被丢弃
      expect(JSON.parse(el.getAttribute('resources')!)).toEqual([{ id: 'r1', name: 'A' }])
      const taskAttr = JSON.parse(el.getAttribute('tasks')!)
      expect(taskAttr).toEqual([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] }])
      expect(warn, '降级落 devWarn').toHaveBeenCalled()
      // 读路径不抛
      expect(() => el.resources).not.toThrow()
      expect(() => el.tasks).not.toThrow()
    } finally {
      warn.mockRestore()
    }
  })

  it('E 降级逐键粒度：只丢弃单个不可序列化自定义键，其余合法自定义键保留在 attribute 与读回', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      const cyc: Record<string, unknown> = { n: 1 }
      cyc['self'] = cyc
      // 反证旧实现：整行降级为已知字段投影 → dept/level 一并丢失
      el.resources = [{ id: 'r1', name: 'A', dept: '前端', level: 3, meta: cyc }] as ResourceItem[]
      expect(JSON.parse(el.getAttribute('resources')!)).toEqual([{ id: 'r1', name: 'A', dept: '前端', level: 3 }])
      // 内部模型不移除自定义键：property 读回仍完整
      expect(el.resources[0]!.dept).toBe('前端')
      expect(el.resources[0]!['level']).toBe(3)
      expect(el.resources[0]!['meta']).toBeDefined()
    } finally {
      warn.mockRestore()
    }
  })

  it('E devWarn 按实例 + tag 去重：同实例同 tag 只告警一次，跨 tag / 跨实例各告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      const cyc: Record<string, unknown> = { n: 1 }
      cyc['self'] = cyc
      const badRes = [{ id: 'r1', name: 'A', meta: cyc }] as ResourceItem[]
      el.resources = badRes
      const afterFirst = warn.mock.calls.length
      expect(afterFirst, '首次 resources 降级告警').toBe(1)
      el.resources = badRes
      expect(warn.mock.calls.length, '同实例同 tag 重复降级不重复告警').toBe(afterFirst)
      // 不同 tag 独立去重
      el.tasks = [
        { id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'], meta: cyc },
      ] as ResourceTask[]
      expect(warn.mock.calls.length, 'tasks tag 首次降级独立告警').toBe(afterFirst + 1)
      // 跨实例不复用去重（实例级，非模块级）
      const el2 = mount()
      el2.resources = badRes
      expect(warn.mock.calls.length, '新实例 resources 降级再告警一次').toBe(afterFirst + 2)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('levelResources weekStart（G）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('weekStart=0（周日起始）把 03-01(周日)/03-02(周一) 判为同一周 → 后移较晚者；缺省周一起始则分属两周无超载', () => {
    const RES: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1 }]
    const tasks: ResourceTask[] = [
      { id: 's1', name: '周日', start: '2026-03-01', end: '2026-03-01', resources: ['r1'] },
      { id: 's2', name: '周一', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
    ]
    // 缺省（周一起始）：03-01 属上一周、03-02 属当周 → 无同档重叠，无移动
    expect(levelResources(RES, tasks), '周一档下无超载').toEqual([])
    // 周日起始：两者同属 03-01..03-07 一周 → 超载，较晚的 03-02 后移一周
    const moved = levelResources(RES, tasks, { scale: 'week', weekStart: 0 })
    expect(moved.map((t) => t.id)).toEqual(['s2'])
    expect(moved[0]!.start, '后移一周至下周日 03-09').toBe('2026-03-09')
    expect(moved[0]!.end, '工期保持 1 天').toBe('2026-03-09')
  })
})

describe('OASResource 抛异常 accessor getter 容错（F2）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('写通道：自定义键 getter 抛异常 → setter 不抛，异常键丢弃、其余键保留，devWarn 一次（实例+tag）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      // 反证旧实现：Object.entries(raw) 会同步调用 getter 抛未捕获异常 → setter 崩
      const badRes = {
        id: 'r1',
        name: 'A',
        dept: '前端',
        get boom() {
          throw new Error('boom')
        },
      }
      expect(() => {
        el.resources = [badRes as unknown as ResourceItem]
      }, 'resources setter 不抛').not.toThrow()
      expect(el.resources[0]!.dept, '其余合法自定义键保留').toBe('前端')
      expect('boom' in (el.resources[0] as object), '抛异常键丢弃').toBe(false)
      expect(JSON.parse(el.getAttribute('resources')!), '序列化后不含异常键').toEqual([
        { id: 'r1', name: 'A', dept: '前端' },
      ])
      const afterFirst = warn.mock.calls.length
      expect(afterFirst, '首次丢弃告警一次').toBe(1)
      // 同实例同 tag 重复写不重复告警
      el.resources = [badRes as unknown as ResourceItem]
      expect(warn.mock.calls.length, '同实例同 tag 去重').toBe(afterFirst)
      // tasks 通道独立容错（独立 tag 去重）
      const badTask = {
        id: 't1',
        name: 'T',
        start: '2026-03-02',
        end: '2026-03-03',
        resources: ['r1'],
        assignee: '张三',
        get boom() {
          throw new Error('boom')
        },
      }
      expect(() => {
        el.tasks = [badTask as unknown as ResourceTask]
      }, 'tasks setter 不抛').not.toThrow()
      expect(el.tasks[0]!.assignee).toBe('张三')
      expect(JSON.parse(el.getAttribute('tasks')!)[0].boom).toBeUndefined()
      expect(warn.mock.calls.length, 'tasks tag 首次丢弃独立告警').toBe(afterFirst + 1)
      // 读路径同样不抛
      expect(() => el.resources).not.toThrow()
      expect(() => el.tasks).not.toThrow()
    } finally {
      warn.mockRestore()
    }
  })

  it('读路径：嵌套自定义对象内 getter 抛异常 → 深拷贝丢弃该键，其余键保留，不抛', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      const nested = {
        ok: 1,
        get boom(): number {
          throw new Error('nested boom')
        },
      }
      el.resources = [{ id: 'r1', name: 'A', nested } as unknown as ResourceItem]
      const view = el.resources[0]!.nested as Record<string, unknown>
      expect(view['ok'], '嵌套其余键保留（深拷贝）').toBe(1)
      expect('boom' in view, '嵌套抛异常键丢弃').toBe(false)
    } finally {
      warn.mockRestore()
    }
  })

  it('纯函数路径：levelResources 遇抛异常 getter 不抛，异常键丢弃、正常任务照常平衡', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const badRes = {
        id: 'r1',
        name: 'A',
        capacity: 1,
        get boom() {
          throw new Error('boom')
        },
      }
      const badTask = {
        id: 't1',
        name: 'A1',
        start: '2026-03-02',
        end: '2026-03-06',
        resources: ['r1'],
        get boom() {
          throw new Error('boom')
        },
      }
      const t2 = { id: 't2', name: 'A2', start: '2026-03-02', end: '2026-03-06', resources: ['r1'] }
      let moved: ResourceTask[] = []
      expect(() => {
        moved = levelResources([badRes as unknown as ResourceItem], [badTask as unknown as ResourceTask, t2])
      }, 'levelResources 不抛').not.toThrow()
      expect(
        moved.map((t) => t.id),
        '正常任务仍被正确后移',
      ).toEqual(['t2'])
    } finally {
      warn.mockRestore()
    }
  })
})

describe('OASResource 焦点环双色（F3）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('.bar:focus-visible 为纯 inset 双层环（无 outline 依赖）：primary 2px 贴条缘 + bg 1px 分隔带', () => {
    const el = mount({ resources: '[]', tasks: '[]' })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    const start = css.indexOf('.bar:focus-visible')
    expect(start, '存在 .bar:focus-visible 规则').toBeGreaterThan(-1)
    // 归一空白：断言不受声明换行/缩进影响
    const block = css.slice(start, css.indexOf('}', start) + 1).replace(/\s+/g, ' ')
    // 反证 H1 旧实现（outline 2px + inset bg 2px）：二者占同一 0–2px 环带，outline 绘制层序压过
    // box-shadow → bg 内描边是死声明，双色环退化为单色 primary（light hover 下与条底仅 ≈2.8:1 < 3:1）
    expect(block, '环不再由 outline 绘制').not.toContain('outline: 2px')
    expect(block, '显式 outline: none（抑 UA 默认焦点描边）').toContain('outline: none')
    expect(block, 'primary 环带绘在上 → 贴条缘 0–2px').toContain('inset 0 0 0 2px var(--oas-color-primary)')
    expect(block, 'bg 分隔带绘在下 → 2–3px（隔开 primary 与条填充）').toContain('inset 0 0 0 3px var(--oas-color-bg)')
    // 反证旧实现（inset spread 4px）：MIN_BAR_W = 8px 的条左右各 4px → 条填充被完全覆盖（可见 0px）
    expect(block, '环带每侧总厚 ≤3px（8px 窄条仍留 2px 填充）').not.toContain('inset 0 0 0 4px')
  })

  it('系统高对比模式（forced-colors）回退为 inset outline，焦点态不消失', () => {
    const el = mount({ resources: '[]', tasks: '[]' })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    const start = css.indexOf('@media (forced-colors: active)')
    expect(start, '存在 forced-colors 回退块').toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf('}', css.indexOf('}', start) + 1) + 1).replace(/\s+/g, ' ')
    // forced-colors 下 box-shadow 被禁用，必须用 outline 兜底（WCAG 2.4.7）
    expect(block, 'forced-colors 下回退 outline').toContain('outline: 2px solid')
    expect(block, 'inset 形态（负 offset）避免 sticky 名列遮挡').toContain('outline-offset: -2px')
  })
})

describe('OASResource 结构性操作容错（G5：revoked Proxy 不抛未捕获异常）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** revoked Proxy 条目：revoke 后所有**结构性**内部方法（instanceof / Array.isArray / Object.keys /
   *  getPrototypeOf）都抛 TypeError——未防护的结构性读取即炸（`typeof` 是唯一不抛的探测，别当它可靠） */
  function makeRevoked(): Record<string, unknown> {
    const { proxy, revoke } = Proxy.revocable(
      { id: 'bad', name: '坏', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] },
      {},
    )
    revoke()
    return proxy as unknown as Record<string, unknown>
  }

  /** revoked 的**顶层数组** Proxy：Array.isArray 走 IsArray 内部方法，此处同样抛 TypeError
   *  （与条目级探测同源，故顶层探测也须防抛） */
  function makeRevokedArray(): unknown[] {
    const { proxy, revoke } = Proxy.revocable<unknown[]>([], {})
    revoke()
    return proxy as unknown as unknown[]
  }

  it('tasks setter 传 revoked Proxy 条目：不抛、条目丢弃为空、attribute 归位 "[]"、tasks-change 照常一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ resources: JSON.stringify([{ id: 'r1', name: 'A' }]) })
      let changes = 0
      el.addEventListener('oas-tasks-change', () => changes++)
      expect(() => {
        el.tasks = [makeRevoked()] as unknown as ResourceTask[]
      }, 'setter 绝不抛').not.toThrow()
      expect(el.tasks, '条目整体丢弃 → 结果为空').toEqual([])
      expect(el.getAttribute('tasks'), 'attribute 同步为空数组').toBe('[]')
      expect(changes, '写通道语义不变：仍派发一次 oas-tasks-change').toBe(1)
      expect(warn, 'devWarn 实例级提示一次').toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('resources setter 传 revoked Proxy 条目：不抛、条目丢弃为空、attribute 归位 "[]"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      expect(() => {
        el.resources = [makeRevoked()] as unknown as ResourceItem[]
      }, 'setter 绝不抛').not.toThrow()
      expect(el.resources).toEqual([])
      expect(el.getAttribute('resources')).toBe('[]')
      expect(warn, 'devWarn 实例级提示一次').toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('有效条目与 revoked 条目混排：revoked 丢弃、有效保留', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ resources: JSON.stringify([{ id: 'r1', name: 'A' }]) })
      expect(() => {
        el.tasks = [
          { id: 'ok', name: '好', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] },
          makeRevoked(),
        ] as unknown as ResourceTask[]
      }, 'setter 绝不抛').not.toThrow()
      expect(
        el.tasks.map((t) => t.id),
        '仅有效条目保留',
      ).toEqual(['ok'])
      expect(JSON.parse(el.getAttribute('tasks')!).map((t: { id: string }) => t.id)).toEqual(['ok'])
    } finally {
      warn.mockRestore()
    }
  })

  it('嵌套 resources 数组值为 revoked Proxy：setter 不抛、该条丢弃（typeof/Array.isArray 抛点同被兜住）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ resources: JSON.stringify([{ id: 'r1', name: 'A' }]) })
      const { proxy: badArr, revoke: revokeArr } = Proxy.revocable(['r1'], {})
      revokeArr()
      expect(() => {
        el.tasks = [
          { id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: badArr as unknown as string[] },
        ] as unknown as ResourceTask[]
      }, 'setter 绝不抛').not.toThrow()
      expect(el.tasks, '值结构性不可读 → 条目整体丢弃').toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('读路径：自定义键值在写入后被 revoke → getter 不抛、该键丢弃、其余键保留、attribute 不受影响', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      const { proxy: meta, revoke: revokeMeta } = Proxy.revocable({ deep: 1 }, {})
      el.resources = [{ id: 'r1', name: 'A', meta }] as unknown as ResourceItem[]
      // 写入时 proxy 尚有效：attribute 已序列化自定义键值；随后 revoke 模拟宿主滞后吊销
      expect(JSON.parse(el.getAttribute('resources')!)[0]).toEqual({ id: 'r1', name: 'A', meta: { deep: 1 } })
      revokeMeta()
      let view: ResourceItem[] = []
      expect(() => {
        view = el.resources
      }, 'getter 绝不抛（revoked 值按无效丢弃该键）').not.toThrow()
      expect(view[0]!.id, '白名单键照常保留').toBe('r1')
      expect('meta' in (view[0] as Record<string, unknown>), 'revoked 自定义键丢弃').toBe(false)
    } finally {
      warn.mockRestore()
    }
  })

  it('纯函数路径：levelResources 传 revoked Proxy 不抛、返回空数组', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      let moved: ResourceTask[] = [{ id: 'sentinel' } as unknown as ResourceTask]
      expect(() => {
        moved = levelResources(
          [makeRevoked()] as unknown as ResourceItem[],
          [makeRevoked()] as unknown as ResourceTask[],
        )
      }, '纯函数绝不抛').not.toThrow()
      expect(moved, '无有效输入 → 无平衡输出').toEqual([])
    } finally {
      warn.mockRestore()
    }
  })

  it('重复 revoked 条目：devWarn 实例级去重（同实例只提示一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      expect(() => {
        el.resources = [makeRevoked(), makeRevoked()] as unknown as ResourceItem[]
      }).not.toThrow()
      expect(el.resources).toEqual([])
      expect(warn, '同实例同 tag 仅告警一次').toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('顶层数组为 revoked Proxy：resources setter 不抛、结果空、attribute "[]"、devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount()
      // 反证 H2 旧实现：首行 `Array.isArray(v)` 对 revoked 数组 Proxy 抛
      // TypeError: ... 'IsArray' on a proxy that has been revoked，setter 未捕获
      expect(() => {
        el.resources = makeRevokedArray() as unknown as ResourceItem[]
      }, 'setter 绝不抛').not.toThrow()
      expect(el.resources, '顶层数组无效 → 视为空输入').toEqual([])
      expect(el.getAttribute('resources'), 'attribute 同步为空数组').toBe('[]')
      expect(warn, 'devWarn 实例级提示一次').toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('顶层数组为 revoked Proxy：tasks setter 不抛、结果空、attribute "[]"、tasks-change 恰一次、devWarn 一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const el = mount({ resources: JSON.stringify([{ id: 'r1', name: 'A' }]) })
      let changes = 0
      el.addEventListener('oas-tasks-change', () => changes++)
      expect(() => {
        el.tasks = makeRevokedArray() as unknown as ResourceTask[]
      }, 'setter 绝不抛').not.toThrow()
      expect(el.tasks, '顶层数组无效 → 视为空输入').toEqual([])
      expect(el.getAttribute('tasks'), 'attribute 同步为空数组').toBe('[]')
      expect(changes, '写通道语义不变：仍派发一次 oas-tasks-change').toBe(1)
      expect(warn, 'devWarn 实例级提示一次').toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
    }
  })

  it('纯函数路径：levelResources 第一/第二参为 revoked 数组 Proxy 不抛、返回空数组', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const rs = [{ id: 'r1', name: 'A' }] as ResourceItem[]
      const ts = [{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] }] as ResourceTask[]
      let outFirst: ResourceTask[] = [{ id: 'sentinel' } as ResourceTask]
      expect(() => {
        outFirst = levelResources(makeRevokedArray() as unknown as ResourceItem[], ts)
      }, '第一参绝不抛').not.toThrow()
      expect(outFirst, '第一参无效 → 无有效输入 → 输出空').toEqual([])
      let outSecond: ResourceTask[] = [{ id: 'sentinel' } as ResourceTask]
      expect(() => {
        outSecond = levelResources(rs, makeRevokedArray() as unknown as ResourceTask[])
      }, '第二参绝不抛').not.toThrow()
      expect(outSecond, '第二参无效 → 输出空').toEqual([])
    } finally {
      warn.mockRestore()
    }
  })
})
