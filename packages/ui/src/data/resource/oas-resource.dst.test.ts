/**
 * DST（夏令时）时区下的 period 边界回归：固定宿主 TZ = America/New_York（2026-03-08 进入 DST，
 * 当日 23 小时），断言 day 档 period 边界恒为本地午夜——毫秒步进会让边界漂到 01:00，
 * 使 DST 次日的单日任务被计入前一日档，产生幻影负载 / 假超载。
 *
 * Node 运行期改 process.env.TZ 立即生效；本文件独立进程内自设自还原，避免串扰其它用例。
 */
const ORIG_TZ = process.env.TZ
process.env.TZ = 'America/New_York'

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import { OASResource, levelResources } from './index.js'
import type { ResourceItem, ResourceTask } from './index.js'

afterAll(() => {
  if (ORIG_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIG_TZ
})

function mount(attrs: Record<string, string> = {}): OASResource {
  const el = new OASResource()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function pillarsOf(el: OASResource, resourceId: string): HTMLElement[] {
  return [...el.shadowRoot!.querySelectorAll<HTMLElement>(`.load[data-resource-id="${resourceId}"] .pillar`)]
}

describe('OASResource DST 边界（America/New_York）', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    // 断言前置：确认 TZ 生效（否则本文件失去意义，直接失败暴露）
    expect(new Date(2026, 2, 9).getTimezoneOffset()).toBe(240) // EDT = UTC-4
    expect(new Date(2026, 2, 7).getTimezoneOffset()).toBe(300) // EST = UTC-5
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('DST 次日单日任务不被计入前一日档：各 period load=1、无超载（无幻影双计）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A', capacity: 1 }]),
      tasks: JSON.stringify([
        { id: 'd8', name: '八日', start: '2026-03-08', end: '2026-03-08', resources: ['r1'] },
        { id: 'd9', name: '九日', start: '2026-03-09', end: '2026-03-09', resources: ['r1'] },
      ]),
    })
    const pillars = pillarsOf(el, 'r1')
    expect(pillars.map((p) => p.dataset['period'])).toEqual(['2026-03-08', '2026-03-09'])
    expect(pillars.map((p) => p.dataset['load'])).toEqual(['1', '1'])
    expect(pillars.every((p) => !p.classList.contains('over'))).toBe(true)
  })

  it('跨 DST 的 day 档 period 边界恒为本地午夜（连续日、无重无漏、每档 load=1）', () => {
    const el = mount({
      resources: JSON.stringify([{ id: 'r1', name: 'A', capacity: 1 }]),
      tasks: JSON.stringify([{ id: 't1', name: '跨DST', start: '2026-03-06', end: '2026-03-10', resources: ['r1'] }]),
    })
    const pillars = pillarsOf(el, 'r1')
    expect(pillars.map((p) => p.dataset['period'])).toEqual([
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
    ])
    expect(pillars.map((p) => p.dataset['load'])).toEqual(['1', '1', '1', '1', '1'])
  })

  it('levelResources 在含 DST 的区间后移后仍收敛（保工期、无 .over）', () => {
    const RES: ResourceItem[] = [{ id: 'r1', name: 'A', capacity: 1 }]
    const PAIR: ResourceTask[] = [
      { id: 't1', name: 'A1', start: '2026-03-06', end: '2026-03-09', resources: ['r1'] },
      { id: 't2', name: 'A2', start: '2026-03-06', end: '2026-03-09', resources: ['r1'] },
    ]
    const moved = levelResources(RES, PAIR)
    expect(moved.map((t) => t.id)).toEqual(['t2'])
    // 后移 4 天至 03-10，工期 4 天（含端）不变
    expect(moved[0]!.start).toBe('2026-03-10')
    expect(moved[0]!.end).toBe('2026-03-13')
    const leveled = PAIR.map((t) => moved.find((m) => m.id === t.id) ?? t)
    document.body.innerHTML = ''
    const el = mount({ resources: JSON.stringify(RES), tasks: JSON.stringify(leveled) })
    expect(pillarsOf(el, 'r1').every((p) => !p.classList.contains('over'))).toBe(true)
  })
})
