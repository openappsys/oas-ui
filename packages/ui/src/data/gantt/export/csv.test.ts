import { describe, expect, it } from 'vitest'
import { toCsv } from './index.js'
import type { GanttTask } from '../oas-gantt.js'

describe('gantt/export toCsv', () => {
  it('默认列按 id,name,start,end,type,progress,parent,project 输出，表头在前、末尾换行', () => {
    const tasks: GanttTask[] = [
      { id: 't1', name: '需求', start: '2026-03-02', end: '2026-03-06', progress: 40 },
      { id: 't2', name: '开发', start: '2026-03-09', end: '2026-03-13', progress: 20, project: 'p1' },
    ]
    const csv = toCsv(tasks)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('id,name,start,end,type,progress,parent,project')
    expect(lines[1]).toBe('t1,需求,2026-03-02,2026-03-06,task,40,,')
    expect(lines[2]).toBe('t2,开发,2026-03-09,2026-03-13,task,20,,p1')
    expect(csv.endsWith('\n')).toBe(true)
    expect(lines[3]).toBe('')
  })

  it('type 缺省推导：无 end = milestone（end 回退 start）；有 children = summary', () => {
    const tasks: GanttTask[] = [
      { id: 'm1', name: '上线', start: '2026-03-20' },
      {
        id: 's1',
        name: '阶段一',
        start: '2026-03-02',
        end: '2026-03-13',
        children: [{ id: 'c1', name: '子任务', start: '2026-03-02', end: '2026-03-06' }],
      },
    ]
    const csv = toCsv(tasks)
    const rows = csv.trim().split('\n').slice(1)
    // 里程碑：end 列回退 start；父在前子在后（DFS 前序）
    expect(rows[0]).toBe('m1,上线,2026-03-20,2026-03-20,milestone,0,,')
    expect(rows[1]).toBe('s1,阶段一,2026-03-02,2026-03-13,summary,0,,')
    expect(rows[2]).toBe('c1,子任务,2026-03-02,2026-03-06,task,0,s1,')
  })

  it('嵌套拍平的 parent 取最近带 id 祖先；顶层显式 parent 字段透传', () => {
    const tasks: GanttTask[] = [
      {
        id: 'root',
        name: '根',
        start: '2026-03-02',
        end: '2026-03-06',
        children: [
          { id: 'leaf', name: '叶', start: '2026-03-02', end: '2026-03-03' },
          {
            id: 'mid',
            name: '中层',
            start: '2026-03-03',
            end: '2026-03-04',
            children: [{ id: 'deep', name: '深层', start: '2026-03-04', end: '2026-03-05' }],
          },
        ],
      },
      { id: 'flat', name: '顶层', start: '2026-03-02', end: '2026-03-03', parent: 'ghost' },
    ]
    const rows = toCsv(tasks).trim().split('\n').slice(1)
    expect(rows[1]?.split(',')[6]).toBe('root')
    expect(rows[3]?.split(',')[6]).toBe('mid')
    expect(rows[4]?.split(',')[6]).toBe('ghost')
  })

  it('milestone 显式 type 带 end 时 end 原样输出（回退只发生在缺失时）', () => {
    const csv = toCsv([{ id: 'm', name: '节点', start: '2026-03-02', end: '2026-03-03', type: 'milestone' }])
    expect(csv.trim().split('\n')[1]).toBe('m,节点,2026-03-02,2026-03-03,milestone,0,,')
  })

  it('progress clamp 0-100 取整，缺省回 0', () => {
    const csv = toCsv([
      { id: 'a', name: '超上界', start: '2026-03-02', end: '2026-03-03', progress: 150 },
      { id: 'b', name: '负值', start: '2026-03-02', end: '2026-03-03', progress: -5 },
      { id: 'c', name: '缺省', start: '2026-03-02', end: '2026-03-03' },
    ])
    const rows = csv.trim().split('\n').slice(1)
    expect(rows[0]?.split(',')[5]).toBe('100')
    expect(rows[1]?.split(',')[5]).toBe('0')
    expect(rows[2]?.split(',')[5]).toBe('0')
  })

  it('CSV 转义：含逗号/引号/换行的单元格加引号、引号翻倍', () => {
    const csv = toCsv([
      { id: 'a', name: '含,逗号', start: '2026-03-02' },
      { id: 'b', name: '含"引号', start: '2026-03-02' },
      { id: 'c', name: '含\n换行', start: '2026-03-02' },
    ])
    expect(csv).toBe(
      [
        'id,name,start,end,type,progress,parent,project',
        'a,"含,逗号",2026-03-02,2026-03-02,milestone,0,,',
        'b,"含""引号",2026-03-02,2026-03-02,milestone,0,,',
        'c,"含\n换行",2026-03-02,2026-03-02,milestone,0,,',
        '',
      ].join('\n'),
    )
  })

  it('空输入只输出表头 + 换行', () => {
    expect(toCsv([])).toBe('id,name,start,end,type,progress,parent,project\n')
  })

  it('自定义分隔符与列：resources/dependencies 数组以 | 拼 id；label 作表头；字符串列等价对象列', () => {
    const csv = toCsv(
      [
        {
          id: 't1',
          name: '开发',
          start: '2026-03-02',
          end: '2026-03-06',
          resources: ['zhang', 'li'],
          dependencies: [{ id: 't0' }],
        },
      ],
      {
        delimiter: ';',
        columns: [{ key: 'name', label: '任务名' }, 'resources', 'dependencies', 'unknownField'],
      },
    )
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('任务名;resources;dependencies;unknownField')
    expect(lines[1]).toBe('开发;zhang|li;t0;')
  })

  it('bom: true 在头部插入 U+FEFF', () => {
    const withBom = toCsv([{ id: 'a', name: 'x', start: '2026-03-02' }], { bom: true })
    expect(withBom.charCodeAt(0)).toBe(0xfeff)
    expect(toCsv([{ id: 'a', name: 'x', start: '2026-03-02' }]).charCodeAt(0)).not.toBe(0xfeff)
  })

  it('非 object 项跳过；缺 id 的行 id 列为空', () => {
    const csv = toCsv([null, { name: '无id', start: '2026-03-02' }] as unknown as GanttTask[])
    const rows = csv.trim().split('\n')
    expect(rows.length).toBe(2)
    expect(rows[1]).toBe(',无id,2026-03-02,2026-03-02,milestone,0,,')
  })
})
