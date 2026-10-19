import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setLocale } from '@oas-ui/i18n'
import en from '@oas-ui/i18n/en'
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

describe('levelResources reassign（重分配：不改日期、换资源）', () => {
  const RES2: ResourceItem[] = [
    { id: 'r1', name: 'A', capacity: 1 },
    { id: 'r2', name: 'B', capacity: 1 },
  ]
  const span = (id: string, resources: string[], start = '2026-03-02', end = '2026-03-06'): ResourceTask => ({
    id,
    name: id,
    start,
    end,
    resources,
  })

  it('超载任务改派给空闲资源：日期/工期不变、只返回被改派任务、不改入参', () => {
    const tasks = [span('t1', ['r1']), span('t2', ['r1'])]
    const input = JSON.parse(JSON.stringify(tasks))
    const moved = levelResources(RES2, tasks, { mode: 'reassign' })
    // 受害者选择与 shift 一致：开始较晚者；并列取输入序靠后
    expect(moved.map((t) => t.id)).toEqual(['t2'])
    expect(moved[0]!.resources).toEqual(['r2'])
    expect(moved[0]!.start).toBe('2026-03-02')
    expect(moved[0]!.end).toBe('2026-03-06')
    // 不改入参
    expect(tasks).toEqual(input)
  })

  it('目标无余量时不改派、也不退化为顺延：返回空、日期保持', () => {
    const tasks = [span('t1', ['r1']), span('t2', ['r1']), span('u1', ['r2'])]
    const moved = levelResources(RES2, tasks, { mode: 'reassign' })
    expect(moved).toEqual([])
    expect(tasks.map((t) => t.start)).toEqual(['2026-03-02', '2026-03-02', '2026-03-02'])
  })

  it('必须整段有余量：目标只在任务覆盖的部分 period 有空 → 不改派', () => {
    const tasks = [span('t1', ['r1']), span('t2', ['r1']), span('u1', ['r2'], '2026-03-05', '2026-03-05')]
    const moved = levelResources(RES2, tasks, { mode: 'reassign' })
    // r2 在 03-05 已满，两个候选任务都跨该档 → 无法整段容纳
    expect(moved).toEqual([])
  })

  it('多资源任务：只替换超载资源，保留其它分配', () => {
    const resources: ResourceItem[] = [
      { id: 'r1', name: 'A', capacity: 1 },
      { id: 'r2', name: 'B', capacity: 1 },
      { id: 'r3', name: 'C', capacity: 1 },
    ]
    const tasks = [span('t1', ['r1']), span('t2', ['r1', 'r3'])]
    const moved = levelResources(resources, tasks, { mode: 'reassign' })
    expect(moved.map((t) => t.id)).toEqual(['t2'])
    expect(moved[0]!.resources).toEqual(['r2', 'r3'])
  })

  it('目标选择：优先最空闲（worst load ratio 最小），而非输入序第一个', () => {
    const resources: ResourceItem[] = [
      { id: 'r1', name: 'A', capacity: 1 },
      { id: 'r2', name: 'B', capacity: 2 },
      { id: 'r3', name: 'C', capacity: 2 },
    ]
    const tasks = [
      span('t1', ['r1']),
      span('t2', ['r1']),
      span('u1', ['r2']), // r2 在整段已占 1/2；r3 空闲
    ]
    const moved = levelResources(resources, tasks, { mode: 'reassign' })
    expect(moved.map((t) => t.id)).toEqual(['t2'])
    expect(moved[0]!.resources).toEqual(['r3'])
  })

  it('确定性 + maxIter：同输入同输出；maxIter=0 不动作；maxIter=1 只改派一个', () => {
    const resources: ResourceItem[] = [
      { id: 'r1', name: 'A', capacity: 1 },
      { id: 'r2', name: 'B', capacity: 1 },
      { id: 'r3', name: 'C', capacity: 1 },
    ]
    const tasks = [span('t1', ['r1']), span('t2', ['r1']), span('t3', ['r1'])]
    expect(levelResources(resources, tasks, { mode: 'reassign', maxIter: 0 })).toEqual([])
    expect(levelResources(resources, tasks, { mode: 'reassign', maxIter: 1 })).toHaveLength(1)
    expect(levelResources(resources, tasks, { mode: 'reassign' })).toEqual(
      levelResources(resources, tasks, { mode: 'reassign' }),
    )
    const moved = levelResources(resources, tasks, { mode: 'reassign' })
    // 先改派最晚者 t3→r2（并列目标取输入序），再 t2→r3；返回按输入序
    expect(moved.map((t) => t.resources)).toEqual([['r3'], ['r2']])
  })

  it('收敛：结果并回后组件直方图无 .over（重分配模式）', () => {
    const tasks = [span('t1', ['r1']), span('t2', ['r1'])]
    const moved = levelResources(RES2, tasks, { mode: 'reassign' })
    const leveled = tasks.map((t) => moved.find((m) => m.id === t.id) ?? t)
    document.body.innerHTML = ''
    const el = mount({ resources: JSON.stringify(RES2), tasks: JSON.stringify(leveled) })
    expect(pillarsOf(el, 'r1').every((p) => !p.classList.contains('over'))).toBe(true)
    expect(pillarsOf(el, 'r2').every((p) => !p.classList.contains('over'))).toBe(true)
  })

  it('显式 mode:shift 与缺省一致；非法 mode 回落 shift', () => {
    const tasks = [span('t1', ['r1']), span('t2', ['r1'])]
    const def = levelResources(RES2, tasks)
    expect(levelResources(RES2, tasks, { mode: 'shift' })).toEqual(def)
    expect(levelResources(RES2, tasks, { mode: 'bogus' as never })).toEqual(def)
    // shift 改日期（03-07），reassign 不改日期（03-02）
    expect(def[0]!.start).toBe('2026-03-07')
    expect(levelResources(RES2, tasks, { mode: 'reassign' })[0]!.start).toBe('2026-03-02')
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
    // 非法值不写变量（与 oas-gantt 同协议）：清除本实例自写值回落，不写 320 覆盖宿主 token
    el.setAttribute('height', 'bad')
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('')
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
    // F1 语义：非法值不写 --oas-resource-height（反证旧实现写 320px 覆盖宿主 token）
    expect(el.style.getPropertyValue('--oas-resource-height')).toBe('')
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

  it('height 接受 px 后缀与纯数字；非法值不写变量（不覆盖宿主 token）', () => {
    const el = mount({ height: '480px', resources: '[]', tasks: '[]' })
    expect(el.style.getPropertyValue('--oas-resource-height'), '带 px 后缀生效').toBe('480px')
    el.setAttribute('height', '500')
    expect(el.style.getPropertyValue('--oas-resource-height'), '纯数字生效').toBe('500px')
    el.setAttribute('height', 'bad')
    expect(el.style.getPropertyValue('--oas-resource-height'), '非法值清除自写值、不写 320').toBe('')
    // 全程宿主 height 内联不被写入
    expect(el.style.height).toBe('')
  })

  it('F1 非法值不覆盖宿主 token：宿主内联/class 设 --oas-resource-height:500px + height="bad" → token 保留 500px', () => {
    // 反证旧实现：heightAttrValue() != null 即写 ${heightPx()}px（非法回落 320）→ 宿主 token 被覆盖成 320px，
    // 且移除属性后宿主原 token 丢失（组件 removeProperty 清掉的是「组件写的 320」，宿主原值已被顶掉）
    const el = new OASResource()
    el.style.setProperty('--oas-resource-height', '500px')
    el.setAttribute('resources', '[]')
    el.setAttribute('tasks', '[]')
    document.body.appendChild(el)
    el.setAttribute('height', 'bad')
    expect(el.style.getPropertyValue('--oas-resource-height'), '非法值不写变量，宿主 token 500px 保留').toBe('500px')
    el.removeAttribute('height')
    expect(el.style.getPropertyValue('--oas-resource-height'), '移除属性后宿主 token 仍 500px').toBe('500px')
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

describe('OASResource 横向虚拟化（时间轴 period 列窗口）', { timeout: 30_000 }, () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  /** 冲刷一帧 rAF：scroll handler 的窗口重渲染在下一帧执行 */
  const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  /**
   * 注入 FakeRO（happy-dom 的 ResizeObserver 是永不回调的 stub）：记录创建实例，测试手动触发回调。
   * 必须在 mount() 前调用（bind 时决定是否建立观察器）。
   */
  type FakeRO = { cb: ResizeObserverCallback; observed: Element[]; disconnected: number }
  const installFakeRO = (): FakeRO[] => {
    const created: FakeRO[] = []
    class RO {
      cb: ResizeObserverCallback
      observed: Element[] = []
      disconnected = 0
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb
        created.push(this as unknown as FakeRO)
      }
      observe(t: Element): void {
        this.observed.push(t)
      }
      unobserve(): void {}
      disconnect(): void {
        this.disconnected++
      }
    }
    vi.stubGlobal('ResizeObserver', RO as unknown as typeof ResizeObserver)
    return created
  }

  /** 泳道布局缓存视图（含 F1 窗口查询索引与快路径边界） */
  type LaneCache = {
    entries: Array<{ key: string; taskId: string; index: number; segIndex: number; xStart: number; w: number }>
    segs: number
    order: number[]
    segTree: Float64Array | null
    segTreeSize: number
    maxEnd: number
    minStart: number
  }
  /** 内部诊断视图（只读）：布局缓存 / 负载矩阵缓存 / 窗口索引 / 预计算计数 / cull 访问计数 */
  type Internals = {
    laneLayout: Map<string, LaneCache>
    loadRows: Array<{ resource: { id: string }; capacity: number; loads: number[]; overCount: number }>
    winColStart: number
    winColEnd: number
    laneLayoutBuilds: number
    laneCullVisits: number
    canvasW: number
  }
  const internals = (el: OASResource): Internals => el as unknown as Internals
  /** 当前列窗口的像素范围（与 renderLanes 的 cull 口径一致） */
  const winRange = (el: OASResource): { left: number; right: number } => {
    const colW = 36
    return { left: internals(el).winColStart * colW - colW, right: internals(el).winColEnd * colW + colW }
  }

  /** 2026-01-01..2028-12-31（day 档）：1096 个 period，锚点 2026-01-01，colW=36 */
  const LONG_TOTAL = 1096
  const LONG_TASKS = JSON.stringify([
    { id: 'long', name: '三年', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] },
  ])
  const longMount = (extra: Record<string, string> = {}): OASResource =>
    mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: LONG_TASKS,
      ...extra,
    })
  const scrollerOf = (el: OASResource): HTMLElement => shadowOf(el).querySelector<HTMLElement>('.scroller')!
  const tickLefts = (el: OASResource): number[] =>
    [...shadowOf(el).querySelectorAll<HTMLElement>('.ticks .tick')].map((t) => Number.parseFloat(t.style.left))
  /** 伪视口：happy-dom 无布局（clientWidth 恒 0），显式定值并触发窗口重算 */
  const stubViewport = (el: OASResource, clientWidth: number): HTMLElement => {
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: clientWidth, configurable: true })
    el.requestUpdate()
    return sc
  }

  it('① 视口受限：只建窗口 + overscan 的刻度与负载列（远少于全量），滚动长度仍 = periods × colW', () => {
    const el = longMount()
    stubViewport(el, 360)
    const ticks = tickLefts(el)
    expect(ticks.length, '窗口化后刻度数为正').toBeGreaterThan(0)
    expect(ticks.length, '窗口 + overscan（360/36 + 4 = 14）左右').toBeLessThan(100)
    expect(ticks.length, '确实发生窗口化（远少于全量）').toBeLessThan(LONG_TOTAL)
    // 滚动长度不变：刻度容器 / 泳道轨 / 直方图表头宽仍 = canvasW（scrollbar 长度不缩水）
    const canvasW = LONG_TOTAL * 36
    const sr = shadowOf(el)
    expect(sr.querySelector<HTMLElement>('.ticks')!.style.width).toBe(`${canvasW}px`)
    expect(sr.querySelector<HTMLElement>('.lane .track')!.style.width).toBe(`${canvasW}px`)
    expect(sr.querySelector<HTMLElement>('.hist-pad')!.style.width).toBe(`${canvasW}px`)
    // 负载列同步窗口化：列数 == 刻度数（同一窗口），柱体只建窗口内
    expect(sr.querySelectorAll('.load .col').length).toBe(ticks.length)
    expect(sr.querySelectorAll('.load .pillar').length).toBeLessThan(LONG_TOTAL)
  })

  it('② 滚动平移：scrollLeft 变大 → 窗口右移（首刻度 left 前移），rAF 节流后生效', async () => {
    const el = longMount()
    const sc = stubViewport(el, 360)
    expect(tickLefts(el)[0], '初始窗口自画布左缘始').toBe(0)
    sc.scrollLeft = 3600
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // floor(3600/36) = 100 → 窗口起点 100 − 4 = 96 → 首刻度 left = 96 × 36
    expect(tickLefts(el)[0], '窗口随滚动平移').toBe(96 * 36)
  })

  it('③ 视口不可测（无布局，clientWidth=0）→ 回落全量渲染（既有非虚拟口径不变）', () => {
    const el = longMount()
    el.requestUpdate()
    expect(tickLefts(el).length, '回落全量：刻度数 == periods 总数').toBe(LONG_TOTAL)
  })

  it('④ RTL 负值 scrollLeft：窗口与同 |scrollLeft| 的 LTR 一致（abs 标准化）', async () => {
    const ltr = longMount()
    const ltrSc = stubViewport(ltr, 360)
    ltrSc.scrollLeft = 3600
    ltrSc.dispatchEvent(new Event('scroll'))
    await flushRaf()

    const rtl = longMount({ dir: 'rtl' })
    const rtlSc = stubViewport(rtl, 360)
    rtlSc.scrollLeft = -3600
    rtlSc.dispatchEvent(new Event('scroll'))
    await flushRaf()

    expect(tickTexts(rtl), 'RTL 窗口与 LTR 同窗口同刻度序列').toEqual(tickTexts(ltr))
    expect(tickTexts(rtl)[0], '窗口已右移（非全量首刻度）').not.toBe('01-01')
  })

  it('⑤ 泳道条按列窗口相交 cull：窗口外不建 DOM、窗口内相交（含跨边界）仍建；段堆叠仍按全部任务', () => {
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'near', name: '近', start: '2026-01-02', end: '2026-01-03', resources: ['r1'] },
        { id: 'cross', name: '跨边', start: '2026-01-10', end: '2026-01-20', resources: ['r1'] },
        { id: 'far1', name: '远1', start: '2028-06-01', end: '2028-06-05', resources: ['r1'] },
        { id: 'far2', name: '远2', start: '2028-06-03', end: '2028-06-07', resources: ['r1'] },
      ]),
    })
    stubViewport(el, 360)
    const ids = [...shadowOf(el).querySelectorAll<HTMLElement>('.lane .bar')].map((b) => b.dataset['taskId'])
    expect(ids, '窗口内条保留').toContain('near')
    expect(ids, '跨窗口边界条（相交）保留').toContain('cross')
    expect(ids, '窗口外条被 cull（不建 DOM）').not.toContain('far1')
    expect(ids).not.toContain('far2')
    // 段堆叠仍按全部 assigned 计算：far2 与 far1 重叠 → 2 段（与是否建 DOM 无关）
    const track = shadowOf(el).querySelector<HTMLElement>('.lane .track')!
    expect(track.style.height).toContain('2 * var(--oas-resource-bar-height')
  })

  it('⑥ 负载矩阵大数据集（5 资源 × 2000 任务 × 3 年 day 档）：period 数正确且逐 period 负载与朴素重叠统计一致', () => {
    const RES_N = 5
    const TASK_N = 2000
    const resources = Array.from({ length: RES_N }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const START_UTC = Date.UTC(2026, 0, 1)
    const isoAt = (dayIndex: number): string => {
      const d = new Date(START_UTC + dayIndex * 86_400_000)
      const p = (n: number): string => String(n).padStart(2, '0')
      return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
    }
    const base = Array.from({ length: TASK_N }, (_, i) => {
      const iso = isoAt(i % LONG_TOTAL)
      return { id: `t${i}`, name: `T${i}`, start: iso, end: iso, resources: [`r${i % RES_N}`] }
    })
    // 制造同资源同档叠加（maxLoad > 1）：每个资源在 2026-01-01 各压 3 条单日任务
    const busy = Array.from({ length: RES_N * 3 }, (_, i) => ({
      id: `b${i}`,
      name: `B${i}`,
      start: '2026-01-01',
      end: '2026-01-01',
      resources: [`r${i % RES_N}`],
    }))
    const tasks = [...base, ...busy]
    const el = mount({ scale: 'day', resources: JSON.stringify(resources), tasks: JSON.stringify(tasks) })
    // period 数未被截断到异常（1096 远小于 MAX_PERIODS = 5000）
    expect(shadowOf(el).querySelectorAll('.ticks .tick').length).toBe(LONG_TOTAL)
    // 逐 period 负载与朴素「任务区间 ∩ period 区间」统计一致（测试侧独立实现，不读组件内部状态）
    const naive = new Array<number>(LONG_TOTAL).fill(0)
    for (const t of tasks) {
      if (t.resources[0] !== 'r0') continue
      const [y, m, d] = t.start.split('-').map(Number)
      const idx = Math.round((Date.UTC(y!, m! - 1, d!) - START_UTC) / 86_400_000)
      naive[idx] = naive[idx]! + 1
    }
    const cols = [...shadowOf(el).querySelectorAll<HTMLElement>('.load[data-resource-id="r0"] .col')]
    expect(cols.length, '负载列覆盖全部 period').toBe(LONG_TOTAL)
    const got = cols.map((c) => {
      const pillar = c.querySelector<HTMLElement>('.pillar')
      return pillar ? Number(pillar.dataset['load']) : 0
    })
    expect(got, '逐 period 负载与朴素统计一致').toEqual(naive)
    expect(Math.max(...naive), '数据集确实产生叠加负载（maxLoad > 1）').toBeGreaterThan(1)
  }, 30_000)

  it('⑦ scrollToDate 命令式滚动即时同步窗口：调用返回后目标区已渲染（不等 scroll 的 rAF 帧）', () => {
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'head', name: '头', start: '2026-01-01', end: '2026-01-05', resources: ['r1'] },
        { id: 'mid', name: '中', start: '2026-04-01', end: '2026-04-05', resources: ['r1'] },
      ]),
    })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 520, configurable: true })
    el.requestUpdate()
    // 视口受限：滚动前远端条在窗口外（未建 DOM）
    expect(barOf(el, 'mid', 'r1'), '窗口外远端条初始被 cull').toBeFalsy()
    el.scrollToDate('2026-04-01')
    expect(barOf(el, 'mid', 'r1'), '命令式滚动后目标条同步在 DOM').toBeTruthy()
    expect(barOf(el, 'head', 'r1'), '已移出窗口的远端条被 cull').toBeFalsy()
  })

  it('⑧ 断开连接取消防泄漏：挂起的滚动帧被 cancelAnimationFrame 取消', () => {
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')
    try {
      const el = longMount()
      const sc = stubViewport(el, 360)
      sc.scrollLeft = 3600
      sc.dispatchEvent(new Event('scroll')) // 挂起一帧（rAF 节流）
      document.body.removeChild(el) // 断开 → cleanup 取消挂起帧
      expect(cancel, '断开时取消挂起帧（不在游离 shadow 上重渲染）').toHaveBeenCalled()
    } finally {
      cancel.mockRestore()
    }
  })

  it('⑨ 容器尺寸变化（无 scroll / 无数据变更）→ ResizeObserver 重算列窗口：刻度覆盖新右缘、列数增加', () => {
    const ros = installFakeRO()
    const el = longMount()
    const sc = stubViewport(el, 600)
    const before = tickLefts(el)
    expect(before.length, '600px 视口下已窗口化').toBeLessThan(LONG_TOTAL)
    expect(ros.length, 'bind 时挂了 ResizeObserver').toBe(1)
    expect(ros[0]!.observed, '观察 scroller').toContain(sc)
    // 变宽到 1200（不派发 scroll、不改数据），仅由 ResizeObserver 触发窗口重算。
    // 反证「无 RO」实现：窗口恒停在 600px 的 21 列（右缘 756 < 1200）→ 右缘露白
    Object.defineProperty(sc, 'clientWidth', { value: 1200, configurable: true })
    ros[0]!.cb([], {} as ResizeObserver)
    const after = tickLefts(el)
    expect(after.length, '列数随视口变宽增加').toBeGreaterThan(before.length)
    const lastRight = after[after.length - 1]! + 36
    expect(lastRight, '末刻度右缘覆盖新视口右缘（scrollLeft 0 + 1200）').toBeGreaterThanOrEqual(1200)
    expect(after.length, '仍为窗口化（远少于全量）').toBeLessThan(LONG_TOTAL)
  })

  it('⑩ 隐藏/0 宽挂载回落全量；容器变宽 + ResizeObserver 回调 → 切回窗口（不再 1096 条）', () => {
    const ros = installFakeRO()
    const el = longMount()
    const sc = scrollerOf(el)
    // 挂载期不可测（happy-dom clientWidth 恒 0，等价 display:none 容器）→ 回落全量
    el.requestUpdate()
    expect(tickLefts(el).length, '不可测视口 → 全量渲染').toBe(LONG_TOTAL)
    // 容器可见/变宽 → RO 触发 → 切换为窗口渲染（反证「无 RO」实现：永久停留 1096 条全量）
    Object.defineProperty(sc, 'clientWidth', { value: 600, configurable: true })
    ros[0]!.cb([], {} as ResizeObserver)
    const ticks = tickLefts(el)
    expect(ticks.length, 'RO 触发后切回窗口（不再全量）').toBeLessThan(LONG_TOTAL)
    expect(ticks.length, '窗口内有刻度').toBeGreaterThan(0)
  })

  it('⑪ 横向滚动重渲染复用条节点：聚焦条在窗口滑动后仍在 DOM、焦点保持，事件/aria/data 不变', async () => {
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'long', name: '三年', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] },
        { id: 'mid', name: '中', start: '2026-01-11', end: '2026-01-11', resources: ['r1'] },
      ]),
    })
    const sc = stubViewport(el, 360)
    const bar = barOf(el, 'mid', 'r1')
    expect(bar, '目标条在窗口内').toBeTruthy()
    bar.focus()
    expect(shadowOf(el).activeElement, '前置：条已聚焦').toBe(bar)
    const beforeFirstTick = tickLefts(el)[0]
    // 横向滚动一屏（窗口确实平移，非空操作）
    sc.scrollLeft = 360
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 反证「整段重建」实现：renderLanes 无条件 innerHTML='' → bar 被替换、activeElement 掉回 body
    expect(tickLefts(el)[0], '窗口已平移（确实重渲染了）').not.toBe(beforeFirstTick)
    expect(bar.isConnected, '聚焦条节点未被重建（仍在 DOM）').toBe(true)
    expect(barOf(el, 'mid', 'r1'), '仍是同一节点（复用而非重建）').toBe(bar)
    expect(shadowOf(el).activeElement, '焦点不掉（activeElement 仍为该条）').toBe(bar)
    // 复用路径下事件/几何/易读名称不退化
    expect(bar.dataset['taskId']).toBe('mid')
    expect(bar.dataset['resourceId']).toBe('r1')
    expect(bar.getAttribute('aria-label') ?? '').toContain('中')
    const clicks: string[] = []
    el.addEventListener('oas-task-click', ((e: CustomEvent<{ id: string }>) => {
      clicks.push(e.detail.id)
    }) as EventListener)
    bar.click()
    expect(clicks, '复用条点击仍派发 oas-task-click').toEqual(['mid'])
  })

  it('⑫ 窗口滑动后无重复/泄漏条：窗口内条数 === 布局缓存相交数，key 互不重复且都能命中缓存', async () => {
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 't1', name: 'A', start: '2026-03-05', end: '2026-03-05', resources: ['r1'] },
        { id: 't2', name: 'B', start: '2026-03-12', end: '2026-03-13', resources: ['r1'] },
        { id: 't3', name: 'C', start: '2026-04-10', end: '2026-04-12', resources: ['r1'] },
        { id: 't4', name: 'D', start: '2026-04-20', end: '2026-04-20', resources: ['r1'] },
        { id: 't5', name: 'E', start: '2026-05-30', end: '2026-05-30', resources: ['r1'] },
      ]),
    })
    const sc = stubViewport(el, 360)
    sc.scrollLeft = 1296 // 对齐 2026-04-10（锚点 2026-03-05 后 36 天）
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const layout = internals(el).laneLayout.get('r1')!
    const { left, right } = winRange(el)
    const expected = layout.entries.filter((e) => !(e.xStart > right || e.xStart + e.w < left)).length
    expect(expected, '窗口内有相交条（断言非平凡）').toBeGreaterThan(0)
    expect(expected, '窗口外仍有被 cull 的条（断言非平凡）').toBeLessThan(layout.entries.length)
    const bars = barsOf(el, 'r1')
    expect(bars.length, '窗口内条数 === 缓存相交数').toBe(expected)
    const keys = bars.map((b) => b.dataset['key'] ?? '')
    expect(new Set(keys).size, 'key 无重复').toBe(keys.length)
    const cacheKeys = new Set(layout.entries.map((e) => e.key))
    expect(
      keys.every((k) => cacheKeys.has(k)),
      'DOM 条 key 都能命中缓存（无孤儿）',
    ).toBe(true)
  })

  it('⑬ scroll 帧不重新分段：布局预计算只在 update() 跑（1500 重叠 span 亦不随全量增长）', async () => {
    const TASK_N = 1500
    const isoAt = (dayIndex: number): string => {
      const d = new Date(Date.UTC(2026, 0, 1) + dayIndex * 86_400_000)
      const p = (n: number): string => String(n).padStart(2, '0')
      return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
    }
    // 相邻两天任务互相重叠（跨度 2 天、起点逐日推进）→ 每资源 2 段、1500 条条几何
    const tasks = Array.from({ length: TASK_N }, (_, i) => ({
      id: `t${i}`,
      name: `T${i}`,
      start: isoAt(i),
      end: isoAt(i + 1),
      resources: ['r1'],
    }))
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify(tasks),
    })
    const sc = stubViewport(el, 360)
    const builds = internals(el).laneLayoutBuilds
    expect(builds, 'update() 触发布局预计算').toBeGreaterThan(0)
    for (let i = 1; i <= 5; i++) {
      sc.scrollLeft = i * 360
      sc.dispatchEvent(new Event('scroll'))
      await flushRaf()
    }
    // 反证「scroll 帧重新 filter/sort/贪心」实现：每帧都会触发布局重算（builds 随帧递增）
    expect(internals(el).laneLayoutBuilds, '滚动帧不触发布局重算/分段').toBe(builds)
    expect(barsOf(el, 'r1').length, '窗口内条数有界（虚拟化生效）').toBeLessThan(100)
  })

  it('⑭ 负载超载档数随矩阵预算缓存（滚动帧不重算矩阵/不重做 reduce）+ scroller 禁用滚动锚定', async () => {
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'a', name: 'A1', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
        { id: 'b', name: 'A2', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
        { id: 'c', name: 'B', start: '2026-12-31', end: '2026-12-31', resources: ['r1'] },
      ]),
    })
    const sc = stubViewport(el, 360)
    // overCount 缓存值正确（默认 capacity=1，2026-03-02 档 load=2 → 1 个超载档），a11y 名称照旧反映
    const rows = internals(el).loadRows
    expect(rows[0]!.overCount, '超载档数随矩阵预算').toBe(1)
    const track = shadowOf(el).querySelector('.load .load-track')!
    expect(track.getAttribute('aria-label') ?? '', 'a11y 名称仍读超载档数').toContain('超载')
    // 滚动帧复用同一负载矩阵（不重算矩阵 → 不重做整条 loads 的 reduce）
    const matrixBefore = internals(el).loadRows
    sc.scrollLeft = 3600
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(internals(el).loadRows, '滚动帧不重建负载矩阵').toBe(matrixBefore)
    // overflow-anchor: none（滚动期重建窗口内容会触发滚动锚定 → 滚轮增量被逐帧放大）
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    const start = css.indexOf('.scroller {')
    const block = css.slice(start, css.indexOf('}', start)).replace(/\s+/g, ' ')
    expect(block, 'scroller 声明 overflow-anchor: none').toContain('overflow-anchor: none')
  })

  it('⑮ 断开连接 disconnect 旧观察器（防泄漏）；重连幂等重挂且尺寸变化仍生效', () => {
    const ros = installFakeRO()
    const el = longMount()
    const sc = stubViewport(el, 600)
    expect(ros.length).toBe(1)
    document.body.removeChild(el)
    expect(ros[0]!.disconnected, '断开连接 disconnect 旧观察器').toBeGreaterThanOrEqual(1)
    // 重连：bind 幂等重挂新观察器（observe scroller）
    document.body.appendChild(el)
    expect(ros.length, '重连重挂新观察器').toBe(2)
    expect(ros[1]!.observed, '新观察器观察 scroller').toContain(sc)
    // 重连后尺寸变化仍驱动窗口重算（不因断连丢失观察）
    const before = tickLefts(el).length
    Object.defineProperty(sc, 'clientWidth', { value: 1200, configurable: true })
    ros[1]!.cb([], {} as ResizeObserver)
    expect(tickLefts(el).length, '重连后 RO 重算仍生效').toBeGreaterThan(before)
  })

  // ===== F1：窗口 cull 变为「窗口相关」而非「全量相关」 =====

  /** 2026-01-01 起第 n 天的 ISO 日期（day 档一天一个 period） */
  const isoDay = (n: number): string => {
    const d = new Date(Date.UTC(2026, 0, 1) + n * 86_400_000)
    const p = (v: number): string => String(v).padStart(2, '0')
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
  }
  /** 任意列宽下的窗口像素范围（既有 winRange 固定 day 档 colW=36，month 档需自算） */
  const winRangeWith = (el: OASResource, colW: number): { left: number; right: number } => ({
    left: internals(el).winColStart * colW - colW,
    right: internals(el).winColEnd * colW + colW,
  })
  /** 朴素全量扫描（改造前 renderLanes 的口径）：相交条在 entries 中的下标，按 entries 原序 */
  const naiveCull = (cache: LaneCache, left: number, right: number): number[] => {
    const out: number[] = []
    cache.entries.forEach((e, i) => {
      if (!(e.xStart > right || e.xStart + e.w < left)) out.push(i)
    })
    return out
  }
  /** 断言 DOM 条与朴素全量扫描逐条一致（key 序列 + 每条 left/width 几何），返回朴素结果 */
  const expectCullMatchesNaive = (el: OASResource, rid: string, colW: number): number[] => {
    const cache = internals(el).laneLayout.get(rid)!
    const { left, right } = winRangeWith(el, colW)
    const expected = naiveCull(cache, left, right)
    const bars = barsOf(el, rid)
    expect(
      bars.map((b) => b.dataset['key']),
      `窗口 [${left},${right}] 条集合/顺序与朴素全量扫描一致`,
    ).toEqual(expected.map((i) => cache.entries[i]!.key))
    for (let k = 0; k < bars.length; k++) {
      const e = cache.entries[expected[k]!]!
      // happy-dom 把内联 px 值截到 6 位小数 → 用数值比较（5 位精度足够判定几何一致）
      expect(Number.parseFloat(bars[k]!.style.width), '条宽与布局几何一致').toBeCloseTo(e.w, 4)
      expect(Number.parseFloat(bars[k]!.style.left), '条左缘与布局几何一致（LTR）').toBeCloseTo(e.xStart, 4)
    }
    return expected
  }
  /** 滚到指定 scrollLeft 并冲刷渲染帧 */
  const scrollTo = async (sc: HTMLElement, scrollLeft: number): Promise<void> => {
    sc.scrollLeft = scrollLeft
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
  }

  it('⑯ 结构等价①：day 档多窗口下「二分 + 段树下探」cull 与朴素全量扫描逐条一致（含跨窗口长条/贴边条）', async () => {
    const tasks: Array<Record<string, unknown>> = [
      { id: 'long', name: '跨整画布', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] },
    ]
    for (let d = 0; d < 300; d++) {
      tasks.push({ id: `d${d}`, name: `D${d}`, start: isoDay(d), end: isoDay(d), resources: ['r1'] })
    }
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify(tasks),
    })
    const sc = stubViewport(el, 360)
    const cache = internals(el).laneLayout.get('r1')!
    expect(cache.entries.length, '全部条都在布局缓存里').toBe(tasks.length)
    // 索引自检：order 按 xStart 升序（同值保原序）；段树根 == 全量 max(xEnd)
    const maxEnd = Math.max(...cache.entries.map((e) => e.xStart + e.w))
    expect(cache.order, 'order 按 xStart 升序且稳定').toEqual(
      [...cache.order].sort((a, b) => cache.entries[a]!.xStart - cache.entries[b]!.xStart || a - b),
    )
    expect(cache.segTree, '段树已建').not.toBeNull()
    expect(cache.segTree![1], '段树根 == 全量 max(xEnd)').toBe(maxEnd)
    expect(cache.maxEnd).toBe(maxEnd)
    expect(cache.minStart).toBe(Math.min(...cache.entries.map((e) => e.xStart)))

    let longHits = 0
    let onlyLong = 0
    for (const sl of [0, 36, 36 * 97, 36 * 150, 36 * 299, 36 * 600, 36 * 1000]) {
      await scrollTo(sc, sl)
      const expected = expectCullMatchesNaive(el, 'r1', 36)
      if (expected.some((i) => cache.entries[i]!.taskId === 'long')) longHits++
      if (expected.length === 1) onlyLong++
    }
    expect(longHits, '跨窗口长条在每个窗口都命中（不丢条）').toBe(7)
    expect(onlyLong, '确有「只剩长条」的窗口（短条已全部被 cull）').toBeGreaterThan(0)
  })

  it('⑰ 结构等价②：month 档被钳到 MIN_BAR_W 的条，多窗口下仍与朴素全量扫描逐条一致', async () => {
    // 2026 年 month 档（12 列 × 110px）：单日条按比例内插 w ≈ 3.5 → 钳到 MIN_BAR_W = 8
    const tasks: Array<Record<string, unknown>> = [
      { id: 'long', name: '跨整画布', start: '2026-01-01', end: '2026-12-31', resources: ['r1'] },
    ]
    for (let d = 1; d <= 31; d++) {
      const day = `2026-03-${String(d).padStart(2, '0')}`
      tasks.push({ id: `m${d}`, name: `M${d}`, start: day, end: day, resources: ['r1'] })
    }
    const el = mount({
      scale: 'month',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify(tasks),
    })
    const sc = stubViewport(el, 360)
    const cache = internals(el).laneLayout.get('r1')!
    expect(cache.entries.filter((e) => e.w === 8).length, '确有被钳到最小宽的条（断言非平凡）').toBeGreaterThan(0)
    for (const sl of [0, 110, 110 * 2, 110 * 5, 10 ** 6]) {
      await scrollTo(sc, sl)
      expectCullMatchesNaive(el, 'r1', 110)
    }
  })

  it('㉑ 随机化性质等价：200 个任意窗口位置下 cullLane 与朴素全量扫描逐条相同（含钳制/跨界/空集窗口）', () => {
    // 确定性 LCG（不引依赖）：跨度 1..45 天的任务随机铺满三年 → 大量重叠段堆叠 + 长短混合
    let seed = 20260101
    const rnd = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    const tasks: Array<Record<string, unknown>> = []
    for (let i = 0; i < 400; i++) {
      const s = Math.floor(rnd() * (LONG_TOTAL - 60))
      const len = 1 + Math.floor(rnd() * 45)
      tasks.push({ id: `r${i}`, name: `R${i}`, start: isoDay(s), end: isoDay(s + len - 1), resources: ['r1'] })
    }
    // 一条跨整画布长条：任意窗口都含跨界长条 → 每个窗口都应命中（漏条立刻暴露）
    tasks.push({ id: 'span', name: '整窗', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] })
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify(tasks),
    })
    // cullLane 只看画布坐标系、与视口无关，可直接喂任意像素窗口（无需滚动/建视口）
    const cache = internals(el).laneLayout.get('r1')!
    const view = el as unknown as { cullLane: (l: LaneCache, left: number, right: number) => number[] }
    const canvasW = internals(el).canvasW
    let hits = 0
    for (let w = 0; w < 200; w++) {
      const left = Math.floor(rnd() * (canvasW + 200)) - 100
      const right = left + Math.floor(rnd() * 900)
      const got = view.cullLane(cache, left, right)
      expect(got, `窗口 [${left},${right}] 条集合/顺序与朴素全量扫描一致`).toEqual(naiveCull(cache, left, right))
      expect(new Set(got).size, '无重复下标').toBe(got.length)
      expect(got, '升序（entries 原序）').toEqual([...got].sort((a, b) => a - b))
      if (got.length > 0) hits++
    }
    expect(hits, '每个窗口都命中跨窗长条（无漏条窗口）').toBe(200)
  })

  it('⑱ 帧成本不随总量线性：单资源 5000 条铺满三年画布，窗口内条数有界且候选访问数 << 总条数', async () => {
    const N = 5000
    const tasks = Array.from({ length: N }, (_, i) => {
      const day = i % LONG_TOTAL
      return { id: `t${i}`, name: `T${i}`, start: isoDay(day), end: isoDay(day), resources: ['r1'] }
    })
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify(tasks),
    })
    const sc = stubViewport(el, 360)
    const cache = internals(el).laneLayout.get('r1')!
    expect(cache.entries.length, '全量条都在缓存').toBe(N)
    // 反证「全量扫描」实现：每次窗口帧都遍历 5000 条 → laneCullVisits ≈ 5000，本组断言必红
    const visitLog: number[] = []
    for (const sl of [0, 3600, 36 * 500, 36 * 900]) {
      await scrollTo(sc, sl)
      const bars = barsOf(el, 'r1')
      expect(bars.length, '窗口内条数有界（虚拟化生效）').toBeGreaterThan(0)
      expect(bars.length, '窗口内条数远小于总条数').toBeLessThan(200)
      const visits = internals(el).laneCullVisits
      expect(visits, '候选访问数有界（不随 5000 条线性增长）').toBeLessThan(400)
      expect(visits, '候选访问数远小于总条数').toBeLessThan(N / 10)
      visitLog.push(visits)
      expectCullMatchesNaive(el, 'r1', 36)
    }
    expect(visitLog.length, '逐窗口都取到访问计数（非恒真断言）').toBe(4)
    expect(Math.max(...visitLog), '任一窗口的访问数都远小于总条数').toBeLessThan(N / 10)
  })

  it('⑲ 反向毒化回归：远端长条 + 5000 条窗口左外侧短条，候选访问数仍有界（前缀最大回扫实现会退化为全量）', async () => {
    const SHORT = 5000
    const tasks: Array<Record<string, unknown>> = [
      { id: 'long', name: '三年', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] },
    ]
    // 短条全落在前 250 天（每天 20 条 → 段数有界、贪心分段仍是 O(n·segs)）。
    // 窗口滚到约第 900 天时它们整体位于 winLeft 左侧且与窗口不相交——正是「前缀最大被长条毒化」的反例。
    for (let i = 0; i < SHORT; i++) {
      const day = Math.floor(i / 20)
      tasks.push({ id: `s${i}`, name: `S${i}`, start: isoDay(day), end: isoDay(day), resources: ['r1'] })
    }
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify(tasks),
    })
    const sc = stubViewport(el, 360)
    const cache = internals(el).laneLayout.get('r1')!
    expect(cache.entries.length, '总量 5001 条（断言非平凡）').toBe(SHORT + 1)
    await scrollTo(sc, 36 * 900)
    expect(
      barsOf(el, 'r1').map((b) => b.dataset['taskId']),
      '仅跨窗口长条命中（短条全部被 cull）',
    ).toEqual(['long'])
    expect(expectCullMatchesNaive(el, 'r1', 36), '与朴素口径一致：窗口内仅 1 条').toHaveLength(1)
    const visits = internals(el).laneCullVisits
    expect(visits, '候选访问数有界（不随 5001 条线性增长）').toBeLessThan(200)
    expect(visits, '候选访问数远小于总条数').toBeLessThan(cache.entries.length / 10)
    // 反证：换成「xEnd 前缀最大 + 自 hi−1 回扫」实现时，跨窗长条令全部前缀 max ≥ winLeft，
    // 回扫走满 5001 条 → 上面两条断言变红（实测该写法 visits = 5001，本实现 = 30）
  })

  it('⑳ 边界：首窗 winLeft≤0 / 末窗 winRight≥canvasW / 空 entries / 单条跨整窗', async () => {
    // 单条跨整窗：任意窗口都恰好命中 1 条，访问数只随 log n
    const solo = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 'one', name: '整窗', start: '2026-01-01', end: '2028-12-31', resources: ['r1'] }]),
    })
    const soloSc = stubViewport(solo, 360)
    for (const sl of [0, 36 * 400, 10 ** 6]) {
      await scrollTo(soloSc, sl)
      expect(expectCullMatchesNaive(solo, 'r1', 36), '单条跨整窗恒命中').toEqual([0])
      expect(internals(solo).laneCullVisits, '单条时访问数极小（O(log n)）').toBeLessThan(16)
    }

    // 首窗（winLeft = −colW ≤ 0）：贴画布左缘的条不丢
    const el = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([
        { id: 'head', name: '头', start: '2026-01-01', end: '2026-01-02', resources: ['r1'] },
        { id: 'far', name: '远', start: '2028-12-01', end: '2028-12-02', resources: ['r1'] },
      ]),
    })
    const sc = stubViewport(el, 360)
    const firstWindow = winRangeWith(el, 36)
    expect(firstWindow.left, '首窗 winLeft ≤ 0').toBeLessThanOrEqual(0)
    expect(expectCullMatchesNaive(el, 'r1', 36), '首窗含贴左缘条且远端条被 cull').toEqual([0])

    // 末窗：scrollLeft 超界被夹到末尾 → winRight ≥ canvasW，远端条不丢
    await scrollTo(sc, 10 ** 6)
    expect(winRangeWith(el, 36).right, '末窗 winRight ≥ canvasW').toBeGreaterThanOrEqual(internals(el).canvasW)
    expect(expectCullMatchesNaive(el, 'r1', 36), '末窗命中末端条').toHaveLength(1)

    // 空 entries：无任务资源泳道 / 完全无任务都不崩、零访问
    const empty = mount({
      scale: 'day',
      resources: JSON.stringify([
        { id: 'r1', name: 'A' },
        { id: 'r2', name: 'B' },
      ]),
      tasks: '[]',
    })
    expect(shadowOf(empty).querySelectorAll('.bar').length, '无任务 → 无条').toBe(0)
    expect(internals(empty).laneCullVisits, '空 entries 不产生候选访问').toBe(0)

    const partial = mount({
      scale: 'day',
      resources: JSON.stringify([
        { id: 'r1', name: 'A' },
        { id: 'r2', name: 'B' },
      ]),
      tasks: JSON.stringify([{ id: 't', name: 'T', start: '2026-01-01', end: '2026-01-02', resources: ['r1'] }]),
    })
    stubViewport(partial, 360)
    expect(barsOf(partial, 'r2').length, '无任务资源泳道无条（空 entries 不崩）').toBe(0)
    expect(expectCullMatchesNaive(partial, 'r2', 36), '空泳道朴素口径同为空').toEqual([])
  })
})

describe('OASResource 行虚拟化（纵向窗口，泳道/负载两区独立）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  /** 冲刷一帧 rAF：scroll handler 的窗口重渲染在下一帧执行（同横向虚拟化组口径） */
  const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  /** 内部诊断视图（只读）：列/行窗口索引与行高前缀模型 */
  type RowInternals = {
    winColStart: number
    winColEnd: number
    winLaneStart: number
    winLaneEnd: number
    winLoadStart: number
    winLoadEnd: number
    laneRowOffsets: number[]
  }
  const internals = (el: OASResource): RowInternals => el as unknown as RowInternals

  /** 行虚拟化默认 token 模型高（happy-dom 读不到 token → 回落缺省）：泳道行 36+1px 框线、负载行 64+1px */
  const LANE_ROW_H = 37
  const LOAD_ROW_H = 65

  const laneRows = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.lanes .row.lane'),
  ]
  const loadRows = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.loads .row.load'),
  ]
  const laneSpacers = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.lanes > .row-spacer'),
  ]
  const loadSpacers = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.loads > .row-spacer'),
  ]

  /** N 资源共用一条单日任务（时间轴 1 个 period；每资源 1 条/1 柱），stub 视口 400×180 并重算窗口 */
  const mountMany = (n: number, vh = 180): OASResource => {
    const resources = Array.from({ length: n }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const task = { id: 't0', name: 'T', start: '2026-03-02', end: '2026-03-02', resources: resources.map((r) => r.id) }
    const el = mount({
      scale: 'day',
      resources: JSON.stringify(resources),
      tasks: JSON.stringify([task]),
    })
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: vh, configurable: true })
    el.requestUpdate()
    return el
  }

  it('① 视口受限：泳道/负载行数有上界（≈窗口+缓冲），spacer 撑起总高 = 全量行数 × 行模型高', () => {
    const N = 500
    const el = mountMany(N)
    const lanes = laneRows(el)
    const loads = loadRows(el)
    expect(lanes.length, '泳道行窗口化（远少于 500）').toBeLessThan(60)
    expect(lanes.length, '窗口内有行（非空）').toBeGreaterThan(0)
    expect(loads.length, '负载行同步窗口化（两区独立窗口）').toBeLessThan(60)
    expect(lanes.length).toBeLessThan(N)
    // 滚动总高不变：spacerTop + 窗内行 × 行模型高 + spacerBottom = 全量 N 行模型高
    expect(laneSpacers(el).length, '泳道区恰两个 spacer（上/下占位）').toBe(2)
    const [lTop, lBottom] = laneSpacers(el) as [HTMLElement, HTMLElement]
    const laneSum =
      Number.parseFloat(lTop.style.height) + lanes.length * LANE_ROW_H + Number.parseFloat(lBottom.style.height)
    expect(Math.round(laneSum), '泳道区总高 = 500 × 37（行盒 + 1px 框线同式）').toBe(N * LANE_ROW_H)
    expect(loadSpacers(el).length, '负载区恰两个 spacer').toBe(2)
    const [dTop, dBottom] = loadSpacers(el) as [HTMLElement, HTMLElement]
    const loadSum =
      Number.parseFloat(dTop.style.height) + loads.length * LOAD_ROW_H + Number.parseFloat(dBottom.style.height)
    expect(Math.round(loadSum), '负载区总高 = 500 × 65').toBe(N * LOAD_ROW_H)
  })

  it('② 滚到中部：窗口覆盖可视行（spacerTop > 0）、首末行被窗口化移除、列窗口不随纵向滚动变化', async () => {
    const el = mountMany(500)
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    const colBefore: [number, number] = [internals(el).winColStart, internals(el).winColEnd]
    sc.scrollTop = 200 * LANE_ROW_H
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 视口顶（scrollTop 7400，扣表头偏移 ≈33）落在 r200 附近 → r200 必在窗口内
    const ids = laneRows(el).map((r) => r.dataset['resourceId'])
    expect(ids, '可视行 r200 在窗口内').toContain('r200')
    expect(ids, '首行已随窗口平移移除').not.toContain('r0')
    expect(ids, '末行不在窗口').not.toContain('r499')
    const [lTop] = laneSpacers(el) as [HTMLElement, HTMLElement]
    expect(Number.parseFloat(lTop.style.height), '顶部 spacer 占位 > 0').toBeGreaterThan(0)
    expect(
      internals(el).winLaneEnd - internals(el).winLaneStart,
      '行窗大小有界（vh/行高 + 1 + 双侧 buffer 4）',
    ).toBeLessThanOrEqual(20)
    expect([internals(el).winColStart, internals(el).winColEnd], '列窗口不随纵向滚动变化（行/列正交）').toEqual(
      colBefore,
    )
  })

  it('③ 视口高不可测（clientHeight=0）→ 两区回落全量、无 spacer（与既有非虚拟布局一致）', () => {
    const N = 60
    const resources = Array.from({ length: N }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const task = { id: 't0', name: 'T', start: '2026-03-02', end: '2026-03-02', resources: resources.map((r) => r.id) }
    const el = mount({
      scale: 'day',
      resources: JSON.stringify(resources),
      tasks: JSON.stringify([task]),
    })
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    // 只 stub clientWidth（列虚拟化生效），clientHeight 保持 0 → 行虚拟化回落全量
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    el.requestUpdate()
    expect(laneRows(el).length, '泳道行全量渲染').toBe(N)
    expect(loadRows(el).length, '负载行全量渲染').toBe(N)
    expect(laneSpacers(el).length, '全量模式无 spacer（DOM 与旧实现一致）').toBe(0)
    expect(loadSpacers(el).length, '全量模式无 spacer').toBe(0)
  })

  it('④ 纵向滚动窗口平移：窗口内存活行的条节点被复用（聚焦条不丢焦点）', async () => {
    const el = mountMany(500)
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    const bar = shadowOf(el).querySelector<HTMLElement>('.lane[data-resource-id="r5"] .bar')!
    expect(bar, 'r5 行在初始窗口内').toBeTruthy()
    bar.focus()
    expect(shadowOf(el).activeElement, '前置：条已聚焦').toBe(bar)
    sc.scrollTop = LANE_ROW_H * 3 // 平移 3 行，r5 仍在窗口内（buffer 4 吸收）
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(shadowOf(el).querySelector('.lane[data-resource-id="r5"] .bar'), 'r5 行仍在窗口（行未被重建）').toBeTruthy()
    expect(shadowOf(el).activeElement, '焦点不掉（行与条均被复用，未替换节点）').toBe(bar)
  })

  it('⑤ 滚到中部后窗口内条仍可点（oas-task-click 的 resourceId 定位正确）', async () => {
    const el = mountMany(500)
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    sc.scrollTop = 250 * LANE_ROW_H
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const clicks: Array<{ id: string; resourceId: string }> = []
    el.addEventListener('oas-task-click', ((e: CustomEvent<{ id: string; resourceId: string }>) => {
      clicks.push({ id: e.detail.id, resourceId: e.detail.resourceId })
    }) as EventListener)
    const bar = shadowOf(el).querySelector<HTMLElement>('.lane[data-resource-id="r250"] .bar')!
    expect(bar, 'r250 行在窗口内').toBeTruthy()
    bar.click()
    expect(clicks, '窗口内条点击派发（detail 双定位正确）').toEqual([{ id: 't0', resourceId: 'r250' }])
  })

  it('⑥ 资源 0 个：窗口化路径零异常、无行无 spacer', () => {
    const el = mount({ resources: '[]', tasks: '[]' })
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    expect(() => el.requestUpdate(), '空数据窗口化不抛').not.toThrow()
    expect(laneRows(el).length).toBe(0)
    expect(laneSpacers(el).length).toBe(0)
    expect(loadRows(el).length).toBe(0)
  })

  // 该用例构造 60 资源 × 三年 day 档（1096 列）：行+列虚拟化同时生效，单次渲染/统计较重，
  // 在 CI 并发下贴 5s 默认上限（既有基线同样紧），显式放宽超时避免偶发红
  it('⑦ 行/列窗口正交：纵向滚动不变列窗口，横向滚动不变行窗口', { timeout: 30000 }, async () => {
    const N = 60
    const resources = Array.from({ length: N }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    // 三年 day 档（1096 列）→ 列虚拟化与行虚拟化同时生效
    const task = {
      id: 't0',
      name: 'T',
      start: '2026-01-01',
      end: '2028-12-31',
      resources: resources.map((r) => r.id),
    }
    const el = mount({ scale: 'day', resources: JSON.stringify(resources), tasks: JSON.stringify([task]) })
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    el.requestUpdate()
    expect(internals(el).winColEnd - internals(el).winColStart, '列窗口已窗口化').toBeLessThan(1096)
    expect(internals(el).winLaneEnd - internals(el).winLaneStart, '行窗口已窗口化').toBeLessThan(N)
    const colBefore: [number, number] = [internals(el).winColStart, internals(el).winColEnd]
    sc.scrollTop = 20 * LANE_ROW_H
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect([internals(el).winColStart, internals(el).winColEnd], '纵向滚动不改列窗口').toEqual(colBefore)
    const laneAfterV: [number, number] = [internals(el).winLaneStart, internals(el).winLaneEnd]
    expect(laneAfterV[0], '纵向滚动确实平移了行窗口（断言非平凡）').toBeGreaterThan(0)
    sc.scrollLeft = 3600
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(internals(el).winColStart, '横向滚动平移列窗口').toBeGreaterThan(colBefore[0])
    expect([internals(el).winLaneStart, internals(el).winLaneEnd], '横向滚动不改行窗口').toEqual(laneAfterV)
  })
})

describe('OASResource 服务端窗口（windowed 行窗口 + 宿主托管时间轴范围）', { timeout: 30_000 }, () => {
  // 契约见 packages/ui/src/shared/window-data.ts：
  // - 行窗口：windowed + total + window-start，绝对行号半开区间，未覆盖派发 oas-window-request
  // - 范围：range-start/range-end（ISO，range-end 含当日）托管时间轴，未覆盖派发 oas-range-request
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  /** 冲刷一帧 rAF（scroll handler 的窗口重渲染与请求在下一帧执行） */
  const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))

  /** 内部窗口视图（只读诊断） */
  type WinInternals = {
    winMode: { windowed: boolean; total: number; windowStart: number; loaded: { start: number; end: number } }
    winColStart: number
    winColEnd: number
    winLaneStart: number
    winLaneEnd: number
    winLoadStart: number
    winLoadEnd: number
    periods: Array<{ startMs: number; endMs: number; label: string }>
    canvasW: number
    axisMs: { startMs: number; endMs: number } | null
  }
  const internals = (el: OASResource): WinInternals => el as unknown as WinInternals

  const scrollerOf = (el: OASResource): HTMLElement => shadowOf(el).querySelector<HTMLElement>('.scroller')!
  const laneRows = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.lanes .row.lane'),
  ]
  const loadRows = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.loads .row.load'),
  ]
  const laneSpacers = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.lanes > .row-spacer'),
  ]
  const loadSpacers = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.loads > .row-spacer'),
  ]
  /** 缺省 token 模型高（happy-dom 读不到 token → 回落缺省）：泳道行 36+1px、负载行 64+1px */
  const LANE_ROW_H = 37
  const LOAD_ROW_H = 65

  type RowReq = { start: number; end: number; reason: string }
  type RangeReq = { startMs: number; endMs: number; reason: string }
  const record = (el: OASResource): { rows: RowReq[]; ranges: RangeReq[] } => {
    const rows: RowReq[] = []
    const ranges: RangeReq[] = []
    el.addEventListener('oas-window-request', ((e: CustomEvent<RowReq>) => {
      rows.push(e.detail)
    }) as EventListener)
    el.addEventListener('oas-range-request', ((e: CustomEvent<RangeReq>) => {
      ranges.push(e.detail)
    }) as EventListener)
    return { rows, ranges }
  }

  /** 本地日零点（与组件 parseIsoDayMs 同构，TZ 无关地可复现期望值） */
  const dayMs = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y!, m! - 1, d!).getTime()
  }

  /** 只定时间轴、不产生任务条的任务（resources 空）：保证时间轴来自 2026 整年、泳道行高恒为单段 37px */
  const AXIS_TASKS = JSON.stringify([{ id: 'axis', name: 'A', start: '2026-01-01', end: '2026-12-31', resources: [] }])

  /**
   * windowed fixture：先按非 windowed 挂载（首帧无布局）→ stub 视口 → 逐条设置 windowed 相关属性。
   * 最后一次 setAttribute 触发的 update 即「切入 windowed 的首帧」（reason=init）。
   * 装载 n 行（id r{start}..r{start+n-1}）；tasks 只定轴不产条 → 行高恒 37px（虚拟化窗口推导可复现）。
   */
  const mountWindowed = (opts: {
    total: number | string
    loaded: number
    start?: number
    vw?: number
    vh?: number
    /** 覆盖默认 tasks（AXIS_TASKS：只定轴不产条）——用于需要真实条几何的用例 */
    tasks?: string
    /** 追加到宿主上的属性（如 dir=rtl / range-start / range-end），挂在 mount 之前（首帧即生效） */
    attrs?: Record<string, string>
  }): { el: OASResource; reqs: { rows: RowReq[]; ranges: RangeReq[] } } => {
    const start = opts.start ?? 0
    const resources = Array.from({ length: opts.loaded }, (_, i) => ({ id: `r${start + i}`, name: `R${start + i}` }))
    const el = mount({
      scale: 'day',
      resources: JSON.stringify(resources),
      tasks: opts.tasks ?? AXIS_TASKS,
      ...(opts.attrs ?? {}),
    })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: opts.vw ?? 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: opts.vh ?? 180, configurable: true })
    const reqs = record(el)
    el.setAttribute('total', String(opts.total))
    el.setAttribute('window-start', String(start))
    el.setAttribute('windowed', '')
    return { el, reqs }
  }

  // ===== 行窗口（windowed）=====

  it('⑧ windowed 首帧 init：期望区间 [0,17) 未被已装载 [0,10) 覆盖 → 派发行请求', () => {
    const { reqs } = mountWindowed({ total: 500, loaded: 10 })
    // 可视 [0,9)（180/37 = 4.86 → 5 行 + 两侧 buffer 4）± margin 8 → 期望 [0,17)
    expect(reqs.rows, 'init 请求：绝对行半开区间 + reason').toEqual([{ start: 0, end: 17, reason: 'init' }])
    expect(reqs.ranges, '未提供 range-* → 无范围请求').toEqual([])
  })

  it('⑨ 反证：已装载区间覆盖期望区间 → 不派发行请求；缺 windowed 属性 → 完全不派', () => {
    const covered = mountWindowed({ total: 500, loaded: 20 })
    expect(covered.reqs.rows, '已装载 [0,20) ⊇ 期望 [0,17) → 不派').toEqual([])

    // 反证：windowed 属性缺失时 total / window-start 只是普通属性，回落本地全量口径
    const plain = mount({
      scale: 'day',
      resources: JSON.stringify([{ id: 'r1', name: 'R1' }]),
      tasks: AXIS_TASKS,
      total: '500',
      'window-start': '0',
    })
    const sc = scrollerOf(plain)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const plainReqs = record(plain)
    plain.requestUpdate()
    expect(internals(plain).winMode.windowed, '缺 windowed 属性 → 不生效').toBe(false)
    expect(plainReqs.rows, '非 windowed 不派行请求').toEqual([])
  })

  it('⑩ 滚动 → scroll 请求；宿主回填后按绝对行号渲染且 spacer 总高守恒', async () => {
    const { el, reqs } = mountWindowed({ total: 500, loaded: 20 })
    expect(reqs.rows, '初装已覆盖期望区间（无 init）').toEqual([])
    const sc = scrollerOf(el)

    sc.scrollTop = 400
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    // 可视 [5,19)（floor((400−33)/37)=9 −4）± margin 8 → 期望 [0,27)，已装载 [0,20) 不覆盖
    expect(reqs.rows, 'scroll 请求（reason=scroll，非 init/data）').toEqual([{ start: 0, end: 27, reason: 'scroll' }])

    // 宿主回填绝对行 [100,140) 并滚到该区
    reqs.rows.length = 0
    el.setAttribute(
      'resources',
      JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ id: `r${100 + i}`, name: `R${100 + i}` }))),
    )
    el.setAttribute('window-start', '100')
    sc.scrollTop = 3733 // (100 − 4) × 37 + 33 → 行窗口 [96,109)
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()

    const ids = laneRows(el).map((r) => r.dataset['resourceId'])
    expect(ids[0], '首渲染行 = 绝对行 100（按绝对行号定位，非本地 0）').toBe('r100')
    expect(ids.length, '可视 [96,109) ∩ 装载 [100,140) = 9 行').toBe(9)
    const [top, bottom] = laneSpacers(el) as [HTMLElement, HTMLElement]
    expect(top.style.height, '行 0..99 未装载 → 顶部占位 = 100 × 37').toBe(`${100 * LANE_ROW_H}px`)
    const sum = Number.parseFloat(top.style.height) + ids.length * LANE_ROW_H + Number.parseFloat(bottom.style.height)
    expect(Math.round(sum), '泳道区总高守恒 = 500 × 37（不随窗口位置漂移）').toBe(500 * LANE_ROW_H)
    // 画布宽守恒：轨道宽 = canvasW（365 天 × 36）
    expect(shadowOf(el).querySelector<HTMLElement>('.lane .track')!.style.width).toBe(`${365 * 36}px`)
    // 请求区间只取与视口相交的区（负载区此时远在下方 → 不并入，否则 need 会被拉回行 0）
    expect(reqs.rows.at(-1), '回填/滚动后按需再派（reason=scroll，区间限可视行窗）').toEqual({
      start: 88,
      end: 117,
      reason: 'scroll',
    })
  })

  it('⑪ windowed 但视口高不可测（clientHeight=0）→ 不派请求，已装载行全量渲染且尾部占位守恒', () => {
    const { el, reqs } = mountWindowed({ total: 500, loaded: 30, vh: 0 })
    expect(reqs.rows, '无 virtualization 通道 → 不外扩请求（防请求发散）').toEqual([])
    expect(laneRows(el).length, '已装载 30 行全量渲染（回落）').toBe(30)
    const [top, bottom] = laneSpacers(el) as [HTMLElement, HTMLElement]
    expect(Number.parseFloat(top.style.height), '切片起点 0 → 顶部无未装载占位').toBe(0)
    expect(Number.parseFloat(bottom.style.height), '尾部未装载 470 行 → 占位 470 × 37').toBe(470 * LANE_ROW_H)
  })

  it('⑫ windowed 告警：负载统计基于部分数据 + 缺 range-* 回落（实例级各一次）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { el } = mountWindowed({ total: 500, loaded: 10 })
    const msgs = warn.mock.calls.map((c) => String(c[0]))
    expect(
      msgs.some((m) => m.includes('负载/超载统计仅基于已装载')),
      '负载/超载基于部分数据的告警',
    ).toBe(true)
    expect(
      msgs.some((m) => m.includes('range-start/range-end')),
      '缺轴范围回落告警',
    ).toBe(true)
    const n = warn.mock.calls.length
    el.requestUpdate()
    el.setAttribute('window-start', '0')
    expect(warn.mock.calls.length, '实例级去重：后续 update 不重复告警').toBe(n)

    // 反证：提供**两个**合法 range-* 后不再有「范围不可用」告警（该告警确由范围缺失/非法触发）。
    // 注意属性是逐条设置的：仅 range-start 在场的中间态属「给了其一但不可用」（F4 告警），故在两条
    // 都落定后清一次告警记录，再断言「齐备后不再告警」。
    warn.mockClear()
    el.setAttribute('range-start', '2026-01-01')
    el.setAttribute('range-end', '2026-12-31')
    warn.mockClear()
    el.requestUpdate()
    expect(
      warn.mock.calls.map((c) => String(c[0])).some((m) => m.includes('range-start/range-end')),
      '已提供完整范围 → 不再回落告警',
    ).toBe(false)

    // 反证：非 windowed 缺 range-* 不告警（回落是既有口径，非配置错误）
    warn.mockClear()
    mount({ scale: 'day', resources: JSON.stringify([{ id: 'r1', name: 'R1' }]), tasks: AXIS_TASKS })
    expect(warn.mock.calls.length, '非 windowed 不产生 windowed 告警').toBe(0)
  })

  it('⑬ windowed 负载统计保留「部分数据」口径：负载行/柱只按已装载切片渲染、尾部占位按 total', () => {
    const resources = Array.from({ length: 3 }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const tasks = [{ id: 't0', name: 'T', start: '2026-01-05', end: '2026-01-05', resources: ['r0', 'r1', 'r2'] }]
    const el = mount({ scale: 'day', resources: JSON.stringify(resources), tasks: JSON.stringify(tasks) })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    el.setAttribute('total', '500')
    el.setAttribute('window-start', '0')
    el.setAttribute('windowed', '')
    expect(loadRows(el).length, '负载行仅已装载 3 行（非 total 500）').toBe(3)
    expect(
      shadowOf(el).querySelectorAll('.load .pillar').length,
      '柱只来自已装载任务（部分数据口径由宿主补全量）',
    ).toBeLessThanOrEqual(3)
    const [top, bottom] = loadSpacers(el) as [HTMLElement, HTMLElement]
    expect(Number.parseFloat(top.style.height)).toBe(0)
    expect(Number.parseFloat(bottom.style.height), '负载区尾部占位 (500−3) × 65').toBe(497 * LOAD_ROW_H)
  })

  it('⑭ 非 windowed 行为不变：既有全量口径下窗口化渲染仍无任何请求', () => {
    const resources = Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const el = mount({ scale: 'day', resources: JSON.stringify(resources), tasks: AXIS_TASKS })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const reqs = record(el)
    el.requestUpdate()
    sc.scrollTop = 100 * LANE_ROW_H
    sc.dispatchEvent(new Event('scroll'))
    expect(reqs.rows, '200 行全在本地（装载区间覆盖一切窗口）→ 永不请求').toEqual([])
    expect(reqs.ranges).toEqual([])
    expect(laneRows(el).length, '本地行窗口照常生效（< 200）').toBeLessThan(200)
  })

  it('㉑ windowed 窗口完全落在装载区外：不渲染行但 spacer 总高守恒、请求区间锚定可视行窗', async () => {
    const { el, reqs } = mountWindowed({ total: 500, loaded: 20 })
    expect(reqs.rows, '初装已覆盖期望区间（无 init）').toEqual([])
    const sc = scrollerOf(el)
    // 装载 [0,20)；滚到绝对行 ~300（远超装载区）→ 行窗口 [295,308) 与装载区无交集
    sc.scrollTop = 300 * LANE_ROW_H
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(laneRows(el).length, '窗口与装载区无交集 → 不渲染任何行').toBe(0)
    const [top, bottom] = laneSpacers(el) as [HTMLElement, HTMLElement]
    const sum = Number.parseFloat(top.style.height) + Number.parseFloat(bottom.style.height)
    expect(Math.round(sum), '无行渲染时 spacer 总高仍 = 500 × 37（空交集不虚增）').toBe(500 * LANE_ROW_H)
    // 反证：若把离屏区的夹取窗口（负载区 = [0,9)）并入，need 会被拉回行 0（这里必须是可视行窗 ±8）
    expect(reqs.rows.at(-1), '请求区间锚定可视行窗 [295,308) ± 8').toEqual({
      start: 287,
      end: 316,
      reason: 'scroll',
    })
  })

  it('㉒ windowed 滚入负载区：离屏的泳道区不并入请求区间，负载区行窗独立生效', async () => {
    // 装载 [200,220)；滚到负载区顶（泳道区 500×37 = 18500 之上已离屏、负载区开始可见）
    const { el, reqs } = mountWindowed({ total: 500, loaded: 20, start: 200 })
    expect(reqs.rows, '初装：行窗口 [0,9) 不被装载 [200,220) 覆盖 → init').toEqual([
      { start: 0, end: 17, reason: 'init' },
    ])
    reqs.rows.length = 0
    const sc = scrollerOf(el)
    sc.scrollTop = 18600 // loadTop ≈ 33 + 18500 + 33 = 18566 → 负载区 [0,8) 可见
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(laneRows(el).length, '泳道区已整体离屏 → 不渲染泳道行').toBe(0)
    expect(loadRows(el).length, '负载区窗口 [0,8) 与装载 [200,220) 无交集 → 也不渲染').toBe(0)
    const [top, bottom] = loadSpacers(el) as [HTMLElement, HTMLElement]
    const sum = Number.parseFloat(top.style.height) + Number.parseFloat(bottom.style.height)
    expect(Math.round(sum), '负载区 spacer 总高仍 = 500 × 65（空交集不虚增）').toBe(500 * LOAD_ROW_H)
    // 负载区此时显示绝对行 0..8（它自己的滚动坐标）→ 请求区间即为该窗 ±8（而非被泳道区抬高）
    expect(reqs.rows.at(-1), '请求区间取负载区行窗（泳道区离屏不并入）').toEqual({
      start: 0,
      end: 16,
      reason: 'scroll',
    })
  })

  // ===== 宿主托管时间轴范围（range-start / range-end）=====

  /** 任务远离轴范围：若轴被忽略（回落任务 min/max）则 period 数与刻度完全不同 */
  const FAR_TASKS = JSON.stringify([{ id: 'far', name: 'F', start: '2027-06-01', end: '2027-06-02', resources: [] }])
  const mountAxis = (extra: Record<string, string> = {}): OASResource =>
    mount({ scale: 'day', resources: JSON.stringify([{ id: 'r1', name: 'R1' }]), tasks: FAR_TASKS, ...extra })

  it('⑮ 轴托管：period 由 range-* 生成（非任务 min/max）+ 首帧 init 范围请求', () => {
    const el = mountAxis()
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const ranges: RangeReq[] = []
    el.addEventListener('oas-range-request', ((e: CustomEvent<RangeReq>) => {
      ranges.push(e.detail)
    }) as EventListener)
    el.setAttribute('range-start', '2026-01-01')
    el.setAttribute('range-end', '2026-12-31')
    // 轴 = [2026-01-01, 2027-01-01)（range-end 含当日）→ day 档 365 列
    expect(internals(el).periods.length, 'period 覆盖宿主给定范围（365 天）而非任务 2 天').toBe(365)
    expect(tickTexts(el)[0], '首刻度 = 轴起点').toBe('01-01')
    expect(internals(el).canvasW).toBe(365 * 36)
    // 可视列窗 [0,16)（400/36 = 11.1 → 12 列 + overscan 4）→ 可视时长 16 天 → need 前后各扩 16 天
    expect(ranges, 'need 起点早于轴起点 → 未覆盖 → 派发（半开 ms）').toEqual([
      { startMs: dayMs('2025-12-16'), endMs: dayMs('2026-02-02'), reason: 'init' },
    ])
  })

  it('⑯ 反证：列窗位于轴中部（need ⊆ 轴）→ 不派范围请求', async () => {
    const el = mountAxis({ 'range-start': '2026-01-01', 'range-end': '2026-12-31' })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const ranges: RangeReq[] = []
    el.addEventListener('oas-range-request', ((e: CustomEvent<RangeReq>) => {
      ranges.push(e.detail)
    }) as EventListener)
    el.requestUpdate()
    expect(ranges.length, '前置：轴头部 need 越界 → 已派 1 次（断言非空，防下条恒真）').toBe(1)
    sc.scrollLeft = 6624 // floor(6624/36) = 184 → 列窗 [180,200)，位于轴中部
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(internals(el).winColStart, '列窗已滚到轴中部').toBe(180)
    expect(ranges.length, 'need ⊆ 轴 → 无新请求').toBe(1)
  })

  it('⑰ 范围请求去重与复位：同 need 不重复；被轴覆盖后复位，同一 need 可再派', async () => {
    const el = mountAxis({ 'range-start': '2026-01-01', 'range-end': '2026-12-31' })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const ranges: RangeReq[] = []
    el.addEventListener('oas-range-request', ((e: CustomEvent<RangeReq>) => {
      ranges.push(e.detail)
    }) as EventListener)
    el.requestUpdate()
    expect(ranges.length, '轴头部越界 → 1 次').toBe(1)
    const headNeed = { ...ranges[0]! }

    // 同列窗内微滚（不改窗口）→ need 相同 → 去重
    sc.scrollLeft = 10
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(ranges.length, '同一 need 不重复派发').toBe(1)

    // 滚到轴中部：need ⊆ 轴 → 覆盖 → 去重状态复位（仍不派）
    sc.scrollLeft = 6624 // floor(6624/36) = 184 → 列窗 [180,200)
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(internals(el).winColStart, '列窗已到轴中部').toBe(180)
    expect(ranges.length, 'need ⊆ 轴 → 不派').toBe(1)

    // 滚回轴头部：need 与首次完全相同——若去重未被覆盖复位则应被抑制，故本条即复位证明
    sc.scrollLeft = 0
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(ranges.length, '复位后同一 need 可再派').toBe(2)
    // 区间逐位相同（reason 由触发路径决定：首帧 data / 本次 scroll）——同 need 能再派即复位证明
    expect({ startMs: ranges[1]!.startMs, endMs: ranges[1]!.endMs }).toEqual({
      startMs: headNeed.startMs,
      endMs: headNeed.endMs,
    })

    // 滚到轴尾（列窗夹取到末端）→ need 越界 → 再派
    sc.scrollLeft = 999999
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(ranges.length, '轴尾越界 → 再派').toBe(3)
    expect(ranges[2]!.endMs, '轴尾 need 越过轴末（2027-01-01）').toBeGreaterThan(dayMs('2027-01-01'))
  })

  it('⑱ 轴托管但列虚拟化未生效（画布不溢出视口）→ 不派范围请求', () => {
    const el = mountAxis({ 'range-start': '2026-01-01', 'range-end': '2026-01-05' }) // 5 天 = 180px < 视口
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const ranges: RangeReq[] = []
    el.addEventListener('oas-range-request', ((e: CustomEvent<RangeReq>) => {
      ranges.push(e.detail)
    }) as EventListener)
    el.requestUpdate()
    expect(internals(el).canvasW, '轴 5 天 × 36 = 180px').toBe(180)
    expect(ranges, '全轴可见（列窗 = 全量）→ 无「滚出轴范围」通道 → 不派').toEqual([])
  })

  // ===== 两类窗口并存 / 失效回落 =====

  it('⑲ windowed + 轴托管：行请求与范围请求各自按需派发（互不干扰）', () => {
    const resources = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))
    const el = mount({ scale: 'day', resources: JSON.stringify(resources), tasks: '[]' })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const reqs = record(el)
    el.setAttribute('total', '500')
    el.setAttribute('window-start', '0')
    el.setAttribute('windowed', '')
    el.setAttribute('range-start', '2026-01-01')
    el.setAttribute('range-end', '2026-12-31')
    expect(reqs.rows, '行请求：init 一次，need [0,17)').toEqual([{ start: 0, end: 17, reason: 'init' }])
    expect(reqs.ranges.length, '范围请求：init 一次（轴切换后仍只 init）').toBe(1)
    expect(reqs.ranges[0]!.reason).toBe('init')
    // 轴范围把时间轴撑到 365 天（tasks 为空也成立：轴托管不依赖任务）
    expect(tickTexts(el).length, '刻度按列窗口渲染（非空）').toBeGreaterThan(0)
  })

  it('⑳ total 非法 / 为 0 → windowed 不生效，回落本地全量口径（无行请求、绝对行号被忽略）', () => {
    const resources = JSON.stringify(Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, name: `R${i}` })))
    const el = mount({
      scale: 'day',
      resources,
      tasks: AXIS_TASKS,
      windowed: '',
      total: 'abc',
      'window-start': '0',
    })
    const sc = scrollerOf(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    const reqs = record(el)
    el.requestUpdate()
    expect(internals(el).winMode.windowed, 'total 非法 → windowed 不生效').toBe(false)
    expect(reqs.rows, '非 windowed 不派行请求').toEqual([])
    expect(laneRows(el).length, '本地全量口径：30 行按窗口渲染（< 30）').toBeLessThan(30)
    expect(laneRows(el)[0]!.dataset['resourceId'], 'window-start 被忽略（本地第 0 行即首行）').toBe('r0')

    // total=0 同样不算 windowed（readWindowedMode 契约）
    el.setAttribute('total', '0')
    expect(internals(el).winMode.windowed).toBe(false)
  })

  // ===== F1：a11y 行网格（aria-rowcount / aria-rowindex）=====

  it('㉓ a11y：aria-rowcount = total（全量行空间），aria-rowindex = 绝对行号 1 基（经 window-start 换算）', async () => {
    const { el } = mountWindowed({ total: 500, loaded: 40, start: 100 })
    const sc = scrollerOf(el)
    sc.scrollTop = 3733 // 绝对行窗 [96,109)
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const lanes = shadowOf(el).querySelector<HTMLElement>('.lanes')!
    expect(lanes.getAttribute('role'), '泳道区为行网格（aria-rowcount/rowindex 的合法宿主）').toBe('grid')
    expect(lanes.getAttribute('aria-rowcount'), '全量行数口径 = total（非已装载 40）').toBe('500')
    const rows = laneRows(el)
    expect(rows.map((r) => r.dataset['resourceId'])[0], '首渲染行 = 绝对行 100').toBe('r100')
    // 可视 [96,109) ∩ 装载 [100,140) = 9 行 → 绝对行号 101..109（1 基，含 window-start 偏移）
    expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual([
      '101',
      '102',
      '103',
      '104',
      '105',
      '106',
      '107',
      '108',
      '109',
    ])
    expect(
      rows.map((r) => r.getAttribute('role')),
      '每行 role=row（否则 aria-rowindex 无合法宿主）',
    ).toEqual(new Array(9).fill('row'))
    expect(rows[0]!.querySelector('.name')!.getAttribute('role'), '资源名为 rowheader').toBe('rowheader')
    expect(rows[0]!.querySelector('.track')!.getAttribute('role'), '时间轴单元格为 gridcell').toBe('gridcell')

    // 视口高不可测（回落全量渲染）时同样按绝对行号；aria-rowcount 仍取 total
    const flat = mountWindowed({ total: 500, loaded: 30, start: 10, vh: 0 })
    const flatRows = laneRows(flat.el)
    expect(flatRows.length, '回落全量渲染 30 行').toBe(30)
    expect(flatRows[0]!.getAttribute('aria-rowindex'), '首行 = window-start + 1').toBe('11')
    expect(flatRows.at(-1)!.getAttribute('aria-rowindex'), '末行 = window-start + 装载行数').toBe('40')
    expect(shadowOf(flat.el).querySelector('.lanes')!.getAttribute('aria-rowcount')).toBe('500')
  })

  it('㉔ RTL × windowed：绝对行渲染 / aria-rowindex / spacer 与 LTR 一致；条 left 镜像（left_LTR + left_RTL + w = canvasW）', async () => {
    // 轴任务（resources 空、不产条）+ 每行一条任务（同资源单条 → 段数 1 → 行模型高恒 37px）
    const tasks = JSON.stringify([
      { id: 'axis', name: 'A', start: '2026-01-01', end: '2026-12-31', resources: [] },
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `t${100 + i}`,
        name: `T${100 + i}`,
        start: '2026-01-02',
        end: '2026-01-04',
        resources: [`r${100 + i}`],
      })),
    ])
    const ltr = mountWindowed({ total: 500, loaded: 40, start: 100, tasks })
    const rtl = mountWindowed({ total: 500, loaded: 40, start: 100, tasks, attrs: { dir: 'rtl' } })
    expect(rtl.el.hasAttribute('data-rtl'), 'RTL 生效标记').toBe(true)
    for (const f of [ltr, rtl]) {
      const sc = scrollerOf(f.el)
      sc.scrollTop = 3733 // 绝对行窗 [96,109)
      sc.dispatchEvent(new Event('scroll'))
    }
    await flushRaf()
    const lRows = laneRows(ltr.el)
    const rRows = laneRows(rtl.el)
    expect(
      rRows.map((r) => r.dataset['resourceId']),
      'RTL 同按绝对行号定位',
    ).toEqual(lRows.map((r) => r.dataset['resourceId']))
    expect(
      rRows.map((r) => r.getAttribute('aria-rowindex')),
      'RTL 绝对行号与 LTR 一致',
    ).toEqual(lRows.map((r) => r.getAttribute('aria-rowindex')))
    const [lTop, lBottom] = laneSpacers(ltr.el) as [HTMLElement, HTMLElement]
    const [rTop, rBottom] = laneSpacers(rtl.el) as [HTMLElement, HTMLElement]
    expect(rTop.style.height, 'spacer 与 LTR 同（纵向与方向无关）').toBe(lTop.style.height)
    expect(rBottom.style.height).toBe(lBottom.style.height)
    // 横向镜像：同一 xStart 的条 left_LTR = xStart、left_RTL = canvasW − xStart − w
    const lBar = shadowOf(ltr.el).querySelector<HTMLElement>('.lanes .row.lane .bar')!
    const rBar = shadowOf(rtl.el).querySelector<HTMLElement>('.lanes .row.lane .bar')!
    const lLeft = Number.parseFloat(lBar.style.left)
    const rLeft = Number.parseFloat(rBar.style.left)
    const w = Number.parseFloat(lBar.style.width)
    expect(lLeft, 'LTR 基准 left = 1 天 × 36').toBe(36)
    expect(w, '条宽 = 3 天 × 36').toBe(3 * 36)
    expect(rLeft, 'RTL：left = canvasW − xStart − w').toBe(internals(ltr.el).canvasW - lLeft - w)
  })

  it('㉕ RTL × 轴托管：负值 scrollLeft 模型下列窗口与范围请求机制同 LTR（轴中不派 / 轴头复位再派）', async () => {
    const { el, reqs } = mountWindowed({
      total: 500,
      loaded: 10,
      attrs: { dir: 'rtl', 'range-start': '2026-01-01', 'range-end': '2026-12-31' },
    })
    expect(el.hasAttribute('data-rtl'), 'RTL 生效标记').toBe(true)
    expect(reqs.ranges.length, '首帧 init 范围请求').toBe(1)
    const sc = scrollerOf(el)
    // RTL 负值 scrollLeft：|scrollLeft| = 自初始端滚出距离（与 LTR 正 scrollLeft 同口径）
    sc.scrollLeft = -6624
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(internals(el).winColStart, 'RTL 列窗与 LTR 同（|scrollLeft| 口径）').toBe(180)
    expect(reqs.ranges.length, 'need ⊆ 轴 → 无新范围请求').toBe(1)
    sc.scrollLeft = 0
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    expect(reqs.ranges.length, '回到轴头（去重状态复位）→ 同一 need 可再派').toBe(2)
  })

  // ===== F3：切片越界（window-start + 装载行数 > total）=====

  it('㉖ 切片越界：越界行被丢弃（不渲染）+ devWarn 一次（实例级）', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { el } = mountWindowed({ total: 100, loaded: 40, start: 80 })
      const sliceMsgs = (): string[] =>
        warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('超出全量范围'))
      expect(sliceMsgs().length, '切片越界告警一次').toBe(1)
      expect(sliceMsgs()[0], '告警含窗口起点').toContain('window-start 80')
      expect(sliceMsgs()[0], '告警含全量行数依据').toContain('total 100')

      const sc = scrollerOf(el)
      sc.scrollTop = 95 * LANE_ROW_H // 绝对行窗 [90,100)（夹到 total 100）
      sc.dispatchEvent(new Event('scroll'))
      await flushRaf()
      const ids = laneRows(el).map((r) => r.dataset['resourceId'])
      expect(ids.length, '窗口 ∩ total = 10 行（装载的越界 20 行不渲染）').toBe(10)
      expect(ids.at(-1), '末行 = total − 1 = r99（越界部分丢弃）').toBe('r99')
      expect(ids.length, '远少于装载的 40 行（越界行确未进 DOM）').toBeLessThan(40)
      expect(shadowOf(el).querySelector('.lanes')!.getAttribute('aria-rowcount'), '行数口径 = total').toBe('100')
      const [top, bottom] = laneSpacers(el) as [HTMLElement, HTMLElement]
      const sum = Number.parseFloat(top.style.height) + ids.length * LANE_ROW_H + Number.parseFloat(bottom.style.height)
      expect(Math.round(sum), '滚动总高按 total 守恒（越界行不计入）').toBe(100 * LANE_ROW_H)

      el.requestUpdate()
      expect(sliceMsgs().length, '实例级去重：后续 update 不重复告警').toBe(1)
    } finally {
      warn.mockRestore()
    }
  })

  // ===== F4：range-* 「给了但不可用」（只有其一 / 颠倒）=====

  it('㉗ windowed × 轴非法：忽略轴托管 + devWarn 一次 + 回落数据派生（单测反证 period 数）', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const invalidMsgs = (): string[] => warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('非法'))

      // ① 只有 range-start
      const onlyStart = mountWindowed({ total: 500, loaded: 10, attrs: { 'range-start': '2026-06-01' } })
      expect(internals(onlyStart.el).axisMs, '轴被忽略（axisMs = null）').toBeNull()
      expect(internals(onlyStart.el).periods.length, '回落数据派生：AXIS_TASKS 覆盖 2026 全年 → 365 天').toBe(365)
      expect(invalidMsgs().length, '只有其一时告警一次').toBe(1)
      onlyStart.el.requestUpdate()
      expect(invalidMsgs().length, '实例级去重').toBe(1)

      // ② 颠倒（range-start 晚于 range-end）
      warn.mockClear()
      const reversed = mountWindowed({
        total: 500,
        loaded: 10,
        attrs: { 'range-start': '2026-12-31', 'range-end': '2026-01-01' },
      })
      expect(internals(reversed.el).axisMs).toBeNull()
      expect(internals(reversed.el).periods.length, '颠倒同样回落数据派生（365 天而非 1 天）').toBe(365)
      expect(invalidMsgs().length, '颠倒告警一次').toBe(1)

      // 反证：合法轴 → 不产生「非法」告警
      warn.mockClear()
      mountWindowed({
        total: 500,
        loaded: 10,
        attrs: { 'range-start': '2026-01-01', 'range-end': '2026-12-31' },
      })
      expect(invalidMsgs().length, '合法轴不告警').toBe(0)

      // 反证：两者都不给 → 走「未提供」告警（措辞与「非法」区分，不重复报）
      warn.mockClear()
      mountWindowed({ total: 500, loaded: 10 })
      const msgs = warn.mock.calls.map((c) => String(c[0]))
      expect(
        msgs.some((m) => m.includes('未提供 range-start/range-end')),
        '未提供 → 缺范围告警',
      ).toBe(true)
      expect(invalidMsgs().length, '未提供 ≠ 非法').toBe(0)
    } finally {
      warn.mockRestore()
    }
  })
})

describe('OASResource a11y 行网格（非 windowed 全量口径）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const flushRaf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
  const lanesOf = (el: OASResource): HTMLElement[] => [
    ...shadowOf(el).querySelectorAll<HTMLElement>('.lanes .row.lane'),
  ]
  const scrollerOfLocal = (el: OASResource): HTMLElement => shadowOf(el).querySelector<HTMLElement>('.scroller')!

  it('泳道区 role=grid + aria-rowcount = 已装载行数；每行 role=row + aria-rowindex 连续 1 基；行内单元格角色就位', () => {
    const el = mount({
      resources: JSON.stringify([
        { id: 'r1', name: 'A' },
        { id: 'r2', name: 'B' },
        { id: 'r3', name: 'C' },
      ]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] }]),
    })
    const lanes = shadowOf(el).querySelector<HTMLElement>('.lanes')!
    expect(lanes.getAttribute('role'), '泳道区 role=grid').toBe('grid')
    expect(lanes.getAttribute('aria-rowcount'), '非 windowed：全量 = 已装载行数').toBe('3')
    const rows = lanesOf(el)
    expect(rows.length).toBe(3)
    expect(rows.map((r) => r.getAttribute('role'))).toEqual(['row', 'row', 'row'])
    expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual(['1', '2', '3'])
    expect(rows[0]!.querySelector('.name')!.getAttribute('role')).toBe('rowheader')
    expect(rows[0]!.querySelector('.track')!.getAttribute('role')).toBe('gridcell')
  })

  it('本地行虚拟化（非 windowed）下 aria-rowcount 仍为已装载行数，窗口首行 aria-rowindex 随滚动上移', async () => {
    const el = mount({
      resources: JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ id: `r${i}`, name: `R${i}` }))),
      tasks: JSON.stringify([{ id: 't', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r0'] }]),
    })
    const sc = scrollerOfLocal(el)
    Object.defineProperty(sc, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(sc, 'clientHeight', { value: 180, configurable: true })
    el.requestUpdate()
    expect(shadowOf(el).querySelector('.lanes')!.getAttribute('aria-rowcount'), '全量行数口径').toBe('200')
    const head = lanesOf(el)
    expect(head.length, '有行渲染').toBeGreaterThan(0)
    expect(head.length, '窗口外行不进 DOM').toBeLessThan(200)
    expect(head[0]!.getAttribute('aria-rowindex'), '首行绝对行号 1').toBe('1')
    sc.scrollTop = 100 * 37
    sc.dispatchEvent(new Event('scroll'))
    await flushRaf()
    const mid = lanesOf(el)
    const midFirst = Number(mid[0]!.getAttribute('aria-rowindex'))
    expect(mid[0]!.dataset['resourceId'], '窗口已滚到本地第 95 行附近').not.toBe('r0')
    expect(midFirst, '窗口首行绝对行号 > 1').toBeGreaterThan(1)
    expect(midFirst, '绝对行号不超过全量行数').toBeLessThanOrEqual(200)
  })
})

describe('OASResource 可读性能力（opt-in，默认全关）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })
  afterEach(() => {
    document.body.innerHTML = ''
    setLocale('zh-CN')
  })

  /** r1 必超载（03-02 load 2 > cap 1）；r2 恒正常（cap 5） */
  const RES_OVER = JSON.stringify([
    { id: 'r1', name: '资源甲', capacity: 1 },
    { id: 'r2', name: '资源乙', capacity: 5 },
  ])
  const TASKS_OVER = JSON.stringify([
    { id: 'a', name: '任务A', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
    { id: 'b', name: '任务B', start: '2026-03-02', end: '2026-03-04', resources: ['r1'] },
    { id: 'c', name: '任务C', start: '2026-03-02', end: '2026-03-02', resources: ['r2'] },
  ])

  it('① 默认全关：不渲染 load-value / over-badge / bar-label 任何新增节点（反证：去掉开关判断本组必红）', () => {
    const el = mount({ resources: RES_OVER, tasks: TASKS_OVER })
    expect(shadowOf(el).querySelectorAll('.load-value').length, '无负载值数字').toBe(0)
    expect(shadowOf(el).querySelectorAll('.over-badge').length, '无超载徽标').toBe(0)
    expect(shadowOf(el).querySelectorAll('.bar-label').length, '无条内标签').toBe(0)
    // 泳道名列仍是纯文本路径（无 name-text 结构）
    const laneName = laneOf(el, 'r1').querySelector('.name')!
    expect(laneName.textContent).toBe('资源甲')
    expect(laneName.querySelector('.name-text')).toBeNull()
  })

  it('①-b 三开关各自开启即渲染、互不连带', () => {
    const lv = mount({ resources: RES_OVER, tasks: TASKS_OVER, 'show-load-values': '' })
    expect(shadowOf(lv).querySelectorAll('.load-value').length, '4 个 load>0 的柱都有数字').toBe(4)
    expect(shadowOf(lv).querySelectorAll('.over-badge').length, '未开徽标开关 → 无徽标').toBe(0)
    expect(shadowOf(lv).querySelectorAll('.bar-label').length, '未开条标签开关 → 无标签').toBe(0)

    const ob = mount({ resources: RES_OVER, tasks: TASKS_OVER, 'show-overload-badge': '' })
    expect(shadowOf(ob).querySelectorAll('.over-badge').length, '仅超载的 r1 有徽标').toBe(1)
    expect(shadowOf(ob).querySelectorAll('.load-value').length, '未开数字开关 → 无数字').toBe(0)

    const bl = mount({ resources: RES_OVER, tasks: TASKS_OVER, 'bar-label': '' })
    expect(shadowOf(bl).querySelectorAll('.bar-label').length, '3 条任务条都有标签').toBe(3)
    expect(shadowOf(bl).querySelectorAll('.load-value').length, '未开数字开关 → 无数字').toBe(0)
    expect(shadowOf(bl).querySelectorAll('.over-badge').length, '未开徽标开关 → 无徽标').toBe(0)
  })

  it('② show-load-values：只显示 load>0；数字 aria-hidden；超载数字带 over 类 + danger 色；bottom 按柱高钳制', () => {
    const el = mount({ resources: RES_OVER, tasks: TASKS_OVER, 'show-load-values': '' })
    const r1Cols = [...shadowOf(el).querySelectorAll<HTMLElement>('.load[data-resource-id="r1"] .col')]
    expect(r1Cols.length, 'r1 覆盖 3 个 period').toBe(3)
    const values = r1Cols.map((c) => c.querySelector<HTMLElement>('.load-value'))
    expect(
      values.map((v) => v?.textContent ?? null),
      '逐列数字与负载一致',
    ).toEqual(['2', '1', '1'])
    // 数字为装饰（列 aria-label 已描述负载）：aria-hidden 避免读屏重复播报
    expect(
      values.every((v) => v?.getAttribute('aria-hidden') === 'true'),
      '数字全部 aria-hidden',
    ).toBe(true)
    // 超载（load 2 > cap 1）带 over 类；满载非超载不带
    expect(values[0]!.classList.contains('over'), '超载档 over 类').toBe(true)
    expect(values[1]!.classList.contains('over'), 'load=cap 非超载').toBe(false)
    // bottom 钳制（trackH 回落 token 缺省 64；maxLoad=2）：load 2 → min(64+2, 52) = 52；load 1 → min(32+2, 52) = 34
    expect(values[0]!.style.bottom, '高柱数字钳在轨道内（不被裁）').toBe('52px')
    expect(values[1]!.style.bottom, '半高柱数字贴柱顶上方 2px').toBe('34px')
    // 颜色只走 token（机制断言；对比度/视觉待浏览器复核）
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    const lvStart = css.indexOf('.load-value {')
    expect(lvStart, '存在 .load-value 规则').toBeGreaterThan(-1)
    const lvBlock = css.slice(lvStart, css.indexOf('}', lvStart))
    expect(lvBlock, '水平居中（所在列内）').toContain('text-align: center')
    expect(lvBlock, '普通数字用 text-primary（压浅蓝/暗蓝柱都可读）').toContain('color: var(--oas-color-text-primary)')
    const overStart = css.indexOf('.load-value.over')
    expect(overStart, '存在 .load-value.over 规则').toBeGreaterThan(-1)
    const overBlock = css.slice(overStart, css.indexOf('}', overStart))
    expect(overBlock, '超载数字用 text-on-primary（浅色主题白字/暗色主题深字）').toContain(
      'var(--oas-color-text-on-primary)',
    )
    expect(overBlock, '超载数字加粗').toContain('font-weight: 600')
  })

  it('③ show-overload-badge：仅 overCount>0 渲染；文案随全局 locale 即时切换；多资源/多实例隔离；徽标可见不 aria-hidden', () => {
    const zh = mount({ resources: RES_OVER, tasks: TASKS_OVER, 'show-overload-badge': '' })
    const zhName1 = laneOf(zh, 'r1').querySelector('.name')!
    const zhBadge = zhName1.querySelector<HTMLElement>('.over-badge')!
    expect(zhBadge.textContent, 'zh 文案（overCount=1）').toBe('超载 1 档')
    expect(zhBadge.getAttribute('aria-hidden'), '徽标是可见信息（不 aria-hidden）').toBeNull()
    expect(zhName1.querySelector<HTMLElement>('.name-text')!.textContent, '名字本体在 name-text 内').toBe('资源甲')
    // r2 无超载 → 无徽标、名字仍是纯文本
    const zhName2 = laneOf(zh, 'r2').querySelector('.name')!
    expect(zhName2.querySelector('.over-badge'), '无超载不渲染徽标').toBeNull()
    expect(zhName2.textContent, '正常资源名字保持纯文本').toBe('资源乙')

    // 全局 locale 切到 en：translator 变更触发 update，徽标即时改文案（实例隔离：互不串扰）
    setLocale(en)
    const enBadge = laneOf(zh, 'r1').querySelector<HTMLElement>('.over-badge')!
    expect(enBadge.textContent, 'en 文案').toBe('Overloaded ×1')
    // 独立新实例同样按当前 locale 渲染
    const en2 = mount({ resources: RES_OVER, tasks: TASKS_OVER, 'show-overload-badge': '' })
    expect(laneOf(en2, 'r1').querySelector('.over-badge')!.textContent).toBe('Overloaded ×1')
  })

  it('④ bar-label：条内任务名按纯文本渲染（HTML 注入不解析）；不影响 aria-label 与点击命中；CSS 不截获指针/单行裁切', () => {
    const xss = '<img src=x onerror="window.__pwned=1"><b>加粗</b>'
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: xss, start: '2026-03-02', end: '2026-03-04', resources: ['r1'] }]),
      'bar-label': '',
    })
    const bar = barOf(el, 't1', 'r1')
    const label = bar.querySelector<HTMLElement>('.bar-label')!
    expect(label.textContent, '按纯文本渲染（textContent 赋值，不解析 HTML）').toBe(xss)
    expect(label.children.length, '无任何子元素（防注入）').toBe(0)
    expect(label.getAttribute('aria-hidden'), '标签装饰性（条的 aria-label 已含任务名）').toBe('true')
    expect((bar.getAttribute('aria-label') ?? '').length, '条的 aria-label 不受影响').toBeGreaterThan(0)
    // 点击命中：label 上的 click 冒泡后仍定位到条（标签可选中，点击路径不变）
    const clicks: string[] = []
    el.addEventListener('oas-task-click', ((e: CustomEvent<{ id: string }>) => {
      clicks.push(e.detail.id)
    }) as EventListener)
    label.click()
    expect(clicks, '点击派发不受标签影响').toEqual(['t1'])
    // CSS 机制：标签文字可选中复制 + 单行 ellipsis
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    const blStart = css.indexOf('.bar-label {')
    expect(blStart, '存在 .bar-label 规则').toBeGreaterThan(-1)
    const blBlock = css.slice(blStart, css.indexOf('}', blStart))
    expect(blBlock, '标签文字可选中').toContain('user-select: text')
    expect(blBlock, '条窄时裁切（单行 ellipsis）').toContain('text-overflow: ellipsis')
  })

  it('⑤ 日刻度抽稀（默认生效，无开关）：day 档 36px 列 step=2（全局偶数索引才写文案，blank 元素保留网格线）；week/month step=1 不变', () => {
    // day：6 个 period（03-02..03-07）→ 文案 ceil(6/2)=3 个；tick 元素仍 6 个（网格线不丢）
    const day = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-07', resources: ['r1'] }]),
    })
    const dayTicks = [...shadowOf(day).querySelectorAll<HTMLElement>('.ticks .tick')]
    expect(dayTicks.length, 'tick 元素数不变（抽稀只清文案）').toBe(6)
    expect(
      dayTicks.map((t) => t.textContent),
      '全局偶数索引才有文案',
    ).toEqual(['03-02', '', '03-04', '', '03-06', ''])
    expect(dayTicks.filter((t) => t.classList.contains('blank')).length, '奇数索引加 blank 类').toBe(3)
    expect(dayTicks[0]!.classList.contains('blank'), '首刻度（i=0）恒有文案').toBe(false)
    // blank 刻度保留几何与分隔线宿主（宽 = 列宽 36，画布/容器宽不变）
    expect(dayTicks[1]!.style.width).toBe('36px')
    expect(shadowOf(day).querySelector<HTMLElement>('.ticks')!.style.width).toBe(`${6 * 36}px`)

    // week：列宽 90 → step=1，全文案、无 blank
    const week = mount({
      scale: 'week',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-10', resources: ['r1'] }]),
    })
    const weekTicks = [...shadowOf(week).querySelectorAll<HTMLElement>('.ticks .tick')]
    expect(weekTicks.length).toBe(2)
    expect(
      weekTicks.every((t) => (t.textContent ?? '') !== '' && !t.classList.contains('blank')),
      'week 不抽稀（全文案）',
    ).toBe(true)

    // month：列宽 110 → step=1
    const month = mount({
      scale: 'month',
      resources: JSON.stringify([{ id: 'r1', name: 'A' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-31', resources: ['r1'] }]),
    })
    expect(
      [...shadowOf(month).querySelectorAll<HTMLElement>('.ticks .tick')].every(
        (t) => (t.textContent ?? '') !== '' && !t.classList.contains('blank'),
      ),
      'month 不抽稀',
    ).toBe(true)
  })

  it('⑥ 默认全关时 DOM 形态与旧实现一致：列内只有柱、条内无子节点、名列无子节点', () => {
    const el = mount({ resources: RES_OVER, tasks: TASKS_OVER })
    for (const col of shadowOf(el).querySelectorAll<HTMLElement>('.load .col')) {
      expect(
        [...col.children].every((c) => c.classList.contains('pillar')),
        '列内只允许柱（无数字节点）',
      ).toBe(true)
    }
    for (const bar of shadowOf(el).querySelectorAll<HTMLElement>('.lane .bar')) {
      expect(bar.children.length, '条内无子节点（无 bar-label）').toBe(0)
    }
    for (const name of shadowOf(el).querySelectorAll<HTMLElement>('.lane .name')) {
      expect(name.children.length, '名列无子节点（纯文本）').toBe(0)
    }
  })
})

describe('OASResource 资源颜色（color → 泳道任务条/负载柱着色）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('resources 带 color → 泳道行覆写公开 token（条/悬停）；负载行覆写负载色；缺省移除', () => {
    const el = mount({
      resources: JSON.stringify([
        { id: 'r1', name: '甲', capacity: 1, color: 'var(--oas-color-success)' },
        { id: 'r2', name: '乙', capacity: 1 },
      ]),
      tasks: JSON.stringify([
        { id: 't1', name: 'A', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] },
        { id: 't2', name: 'B', start: '2026-03-02', end: '2026-03-02', resources: ['r2'] },
      ]),
    })
    const l1 = laneOf(el, 'r1')
    const l2 = laneOf(el, 'r2')
    expect(l1.style.getPropertyValue('--oas-resource-bar-bg').trim()).toBe(
      'color-mix(in srgb, var(--oas-color-success) 22%, var(--oas-color-bg))',
    )
    expect(l1.style.getPropertyValue('--oas-resource-bar-hover-bg').trim()).toBe(
      'color-mix(in srgb, var(--oas-color-success) 34%, var(--oas-color-bg))',
    )
    expect(l2.style.getPropertyValue('--oas-resource-bar-bg').trim()).toBe('')
    // 负载行同样按资源色覆写 load token（按资源 id 定位）
    const loads = shadowOf(el).querySelectorAll('[data-resource-id="r1"].row.load')
    expect(loads.length).toBe(1)
    expect((loads[0] as HTMLElement).style.getPropertyValue('--oas-resource-load-bg').trim()).toBe(
      'color-mix(in srgb, var(--oas-color-success) 45%, var(--oas-color-bg))',
    )
    // CSS 默认仍是公开 token + primary 派生（不泄漏内部变量）
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    expect(css).toContain('var(--oas-resource-bar-bg, color-mix(in srgb, var(--oas-color-primary) 22%')
    expect(css).toContain('var(--oas-resource-load-bg, color-mix(in srgb, var(--oas-color-primary) 45%')
    expect(css).not.toContain('--_oas-res-color')
  })

  it('运行时改 resources 的 color → 复用行同步更新（不会残留旧色）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: '甲', capacity: 1, color: 'var(--oas-color-success)' }]),
      tasks: JSON.stringify([{ id: 't1', name: 'A', start: '2026-03-02', end: '2026-03-02', resources: ['r1'] }]),
    })
    expect(laneOf(el, 'r1').style.getPropertyValue('--oas-resource-bar-bg').trim()).toContain('success')
    el.resources = [{ id: 'r1', name: '甲', capacity: 1, color: 'var(--oas-color-danger)' }]
    expect(laneOf(el, 'r1').style.getPropertyValue('--oas-resource-bar-bg').trim()).toContain('danger')
    el.resources = [{ id: 'r1', name: '甲', capacity: 1 }]
    expect(laneOf(el, 'r1').style.getPropertyValue('--oas-resource-bar-bg').trim()).toBe('')
  })
})

describe('OASResource 表头吸顶（泳道周刻度）', () => {
  it('CSS：.row.head 纵向 sticky top 0；角落名列层级高于表头', () => {
    const el = mount({ resources: '[]', tasks: '[]' })
    const css = shadowOf(el).querySelector('style')!.textContent ?? ''
    const start = css.indexOf('.row.head {')
    expect(start, '存在 .row.head 规则').toBeGreaterThan(-1)
    const block = css.slice(start, css.indexOf('}', start)).replace(/\s+/g, ' ')
    expect(block, '纵向吸顶').toContain('position: sticky')
    expect(block, '贴容器顶').toContain('top: 0')
    expect(block, '高于泳道内容').toContain('z-index: 3')
    expect(block, '表头背景遮住下方行').toContain('background: var(--oas-resource-header-bg')
    const nameStart = css.indexOf('.head .name {')
    expect(nameStart, '存在 .head .name 规则').toBeGreaterThan(-1)
    const nameBlock = css.slice(nameStart, css.indexOf('}', nameStart)).replace(/\s+/g, ' ')
    expect(nameBlock, '角落名列高于刻度层').toContain('z-index: 4')
    // 开关：header-sticky="false" 时回到普通流（随内容滚动）
    const offStart = css.indexOf(":host([header-sticky='false']) .row.head")
    expect(offStart, '存在关闭吸顶规则').toBeGreaterThan(-1)
    const offBlock = css.slice(offStart, css.indexOf('}', offStart)).replace(/\s+/g, ' ')
    expect(offBlock, '关闭态非 sticky').toContain('position: static')
  })
})

describe('OASResource 滚动容器键盘可达（axe: scrollable-region-focusable）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const RES_ONE = JSON.stringify([{ id: 'r1', name: 'A' }])
  const TASK_ONE = JSON.stringify([{ id: 't1', name: 'T', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] }])

  /** happy-dom 无布局：伪造滚动容器尺寸（溢出判定读 scrollHeight/clientHeight 等） */
  function stubScroll(
    el: HTMLElement,
    box: { clientHeight?: number; scrollHeight?: number; clientWidth?: number; scrollWidth?: number },
  ): void {
    for (const [k, v] of Object.entries(box)) {
      Object.defineProperty(el, k, { value: v, configurable: true })
    }
  }

  it('内容真实溢出（纵向或横向）才补 tabindex=0；不溢出时移除（无空 Tab 停靠点）', () => {
    const el = mount({ resources: RES_ONE, tasks: TASK_ONE })
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    stubScroll(sc, { clientHeight: 180, scrollHeight: 1000, clientWidth: 400, scrollWidth: 400 })
    el.requestUpdate()
    expect(sc.getAttribute('tabindex'), '纵向溢出时键盘可达').toBe('0')

    stubScroll(sc, { scrollHeight: 180 })
    el.requestUpdate()
    expect(sc.hasAttribute('tabindex'), '不溢出时移除 tabindex').toBe(false)

    // 仅横向溢出同样需要键盘可达（overflow: auto 两轴）
    stubScroll(sc, { scrollWidth: 900 })
    el.requestUpdate()
    expect(sc.getAttribute('tabindex'), '横向溢出时键盘可达').toBe('0')
  })

  it('空态（scroller 隐藏）不补 tabindex', () => {
    const el = mount({ resources: '[]', tasks: '[]' })
    const sc = shadowOf(el).querySelector<HTMLElement>('.scroller')!
    stubScroll(sc, { clientHeight: 180, scrollHeight: 1000, clientWidth: 400, scrollWidth: 400 })
    el.requestUpdate()
    expect(sc.hidden, '空态隐藏 scroller').toBe(true)
    expect(sc.hasAttribute('tabindex'), '隐藏容器不成为 Tab 停靠点').toBe(false)
  })
})

describe('property 通道接受 JSON 字符串（框架把静态 attribute 写成 property）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  it('resources/tasks setter 字符串 → 解析为数组', () => {
    const el = mount({ resources: '[]', tasks: '[]' })
    // @ts-expect-error 以字符串写入：模拟框架把静态 attribute 当 property 传入
    el.resources = JSON.stringify([{ id: 'r1', name: '甲', capacity: 1 }])
    // @ts-expect-error 以字符串写入：模拟框架把静态 attribute 当 property 传入
    el.tasks = JSON.stringify([{ id: 't1', name: 'A', start: '2026-03-02', end: '2026-03-03', resources: ['r1'] }])
    expect(el.resources.length).toBe(1)
    expect(el.tasks.length).toBe(1)
    expect(el.tasks[0]!.resources).toEqual(['r1'])
  })
})
