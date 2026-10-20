import { describe, expect, it } from 'vitest'
import type { ResourceItem, ResourceTask } from './oas-resource.js'
import {
  buildSkillMatrix,
  computeUtilization,
  exportResourceCalendars,
  importResourceCalendars,
  suggestAssignments,
} from './resource-utils.js'

const RESOURCES: ResourceItem[] = [
  {
    id: 'a',
    name: 'Alice',
    capacity: 2,
    workdays: [1, 2, 3, 4, 5],
    holidays: ['2026-08-11'],
    capacityOverrides: { '2026-08-12': 0.5 },
    skills: ['frontend', 'design'],
  },
  { id: 'b', name: 'Bob', capacity: 1, skills: ['backend'] },
]

const TASKS: ResourceTask[] = [
  { id: 't1', name: 'T1', start: '2026-08-10', end: '2026-08-12', resources: ['a'], requiredSkills: ['frontend'] },
  { id: 't2', name: 'T2', start: '2026-08-10', end: '2026-08-10', resources: ['a'], requiredSkills: ['frontend'] },
]

describe('resource-utils', () => {
  it('computeUtilization 按资源日历逐日汇总容量与负载', () => {
    const report = computeUtilization(RESOURCES, TASKS)
    expect(report.rangeStart).toBe('2026-08-10')
    expect(report.rangeEnd).toBe('2026-08-12')
    const alice = report.resources.find((r) => r.resourceId === 'a')!
    // 8/10 2 负载 + 8/11 假期 0 容量但仍有 1 负载 + 8/12 override 0.5
    expect(alice.load).toBe(4)
    expect(alice.capacity).toBe(2.5)
    expect(alice.utilization).toBeCloseTo(1.6)
    expect(alice.periods.map((p) => p.capacity)).toEqual([2, 0, 0.5])
    const bob = report.resources.find((r) => r.resourceId === 'b')!
    expect(bob.load).toBe(0)
    expect(bob.capacity).toBe(3)
    expect(report.totalLoad).toBe(4)
    expect(report.totalCapacity).toBe(5.5)
  })

  it('computeUtilization 支持 week / month 汇总与空数据', () => {
    const week = computeUtilization(RESOURCES, TASKS, { scale: 'week' })
    const alice = week.resources.find((r) => r.resourceId === 'a')!
    expect(alice.periods).toHaveLength(1)
    expect(alice.periods[0]!.start).toBe('2026-08-10')
    expect(alice.periods[0]!.end).toBe('2026-08-16')
    expect(alice.periods[0]!.load).toBe(4)
    const month = computeUtilization(RESOURCES, TASKS, { scale: 'month' })
    expect(month.resources[0]!.periods[0]!.start).toBe('2026-08-01')
    const empty = computeUtilization([], [])
    expect(empty).toMatchObject({ rangeStart: '', rangeEnd: '', totalLoad: 0, totalCapacity: 0 })
  })

  it('exportResourceCalendars / importResourceCalendars 往返并清洗非法字段', () => {
    const json = exportResourceCalendars(RESOURCES)
    const parsed = importResourceCalendars(json)
    expect(parsed.version).toBe(1)
    expect(parsed.resources[0]).toMatchObject({
      id: 'a',
      name: 'Alice',
      capacity: 2,
      workdays: [1, 2, 3, 4, 5],
      holidays: ['2026-08-11'],
      capacityOverrides: { '2026-08-12': 0.5 },
      skills: ['frontend', 'design'],
    })
    const dirty = importResourceCalendars(
      JSON.stringify({
        version: 1,
        resources: [
          {
            id: 'x',
            name: 'X',
            capacity: -1,
            workdays: [1, 7, '2'],
            holidays: ['2026-02-30', '2026-02-03'],
            capacityOverrides: { bad: 1, '2026-02-03': -2, '2026-02-04': 0 },
            skills: [' a ', 'a', ''],
          },
        ],
      }),
    )
    expect(dirty.resources[0]).toMatchObject({
      id: 'x',
      name: 'X',
      workdays: [1],
      holidays: ['2026-02-03'],
      capacityOverrides: { '2026-02-04': 0 },
      skills: ['a'],
    })
    expect(() => importResourceCalendars('{"version":2,"resources":[]}')).toThrow('unsupported version')
    expect(() => importResourceCalendars('[]')).toThrow('root must be an object')
  })

  it('buildSkillMatrix 汇总技能并集与每资源具备情况', () => {
    const matrix = buildSkillMatrix(RESOURCES)
    expect(matrix.skills).toEqual(['backend', 'design', 'frontend'])
    expect(matrix.resources[0]).toMatchObject({ resourceId: 'a', name: 'Alice' })
    expect(matrix.resources[0]!.has).toEqual({ backend: false, design: true, frontend: true })
    expect(matrix.resources[1]!.has).toEqual({ backend: true, design: false, frontend: false })
  })

  it('suggestAssignments 先按技能缺口、再按利用率排序', () => {
    const suggestions = suggestAssignments(TASKS[0]!, RESOURCES, TASKS)
    expect(suggestions.map((s) => s.resourceId)).toEqual(['a', 'b'])
    expect(suggestions[0]!.missingSkills).toEqual([])
    expect(suggestions[1]!.missingSkills).toEqual(['frontend'])
    expect(suggestions[0]!.score).toBeLessThan(suggestions[1]!.score)
    expect(suggestAssignments({ id: 'bad', name: 'Bad', start: 'nope', end: 'nope' }, RESOURCES)).toEqual([])
  })
})
