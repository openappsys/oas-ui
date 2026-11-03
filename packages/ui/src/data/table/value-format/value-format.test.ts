import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFormatter } from './index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('table/value-format number', () => {
  it('缺省保留原精度，不加千分位', () => {
    const format = createFormatter({ type: 'number' })
    expect(format(1234.5678)).toBe('1234.5678')
    expect(format(-42)).toBe('-42')
    expect(format(0)).toBe('0')
  })

  it('precision 四舍五入到指定小数位', () => {
    const format = createFormatter({ type: 'number', precision: 2 })
    expect(format(1234.5678)).toBe('1234.57')
    expect(format(1)).toBe('1.00')
    expect(format(-0.004)).toBe('0.00')
  })

  it('group 千分位分组，负数保留符号', () => {
    const format = createFormatter({ type: 'number', group: true, precision: 1 })
    expect(format(1234567.891)).toBe('1,234,567.9')
    expect(format(-9876.5)).toBe('-9,876.5')
    expect(format(999)).toBe('999.0')
  })

  it('percent 乘以 100 并追加 %（可配精度）', () => {
    expect(createFormatter({ type: 'number', percent: true })(0.125)).toBe('12.5%')
    expect(createFormatter({ type: 'number', percent: true, precision: 1 })(0.125)).toBe('12.5%')
    expect(createFormatter({ type: 'number', percent: true, precision: 0 })(0.125)).toBe('13%')
  })

  it('prefix / suffix 拼接（percent 时 suffix 覆盖默认 %）', () => {
    const format = createFormatter({ type: 'number', prefix: '¥', suffix: ' 元', group: true })
    expect(format(1200)).toBe('¥1,200 元')
    const percent = createFormatter({ type: 'number', percent: true, suffix: ' pct' })
    expect(percent(0.5)).toBe('50 pct')
  })

  it('null / undefined / 空串输出空串，非数值回落 String', () => {
    const format = createFormatter({ type: 'number', group: true })
    expect(format(null)).toBe('')
    expect(format(undefined)).toBe('')
    expect(format('')).toBe('')
    expect(format('abc')).toBe('abc')
    expect(format(Number.NaN)).toBe('NaN')
    expect(format('42.5')).toBe('42.5')
  })

  it('指数形态（≥ 1e21）不被千分位误分组', () => {
    const format = createFormatter({ type: 'number', group: true })
    expect(format(1e21)).toBe('1e+21')
  })
})

describe('table/value-format date', () => {
  it('缺省 YYYY-MM-DD，支持 Date / ISO 字符串 / epoch', () => {
    const format = createFormatter({ type: 'date' })
    expect(format(new Date(2026, 2, 5, 9, 8, 7))).toBe('2026-03-05')
    expect(format('2026-03-05')).toBe('2026-03-05')
    expect(format('2026-03-05 09:08:07')).toBe('2026-03-05')
    expect(format(new Date(2026, 2, 5).getTime())).toBe('2026-03-05')
  })

  it('预设 datetime / time', () => {
    const date = new Date(2026, 2, 5, 9, 8, 7)
    expect(createFormatter({ type: 'date', pattern: 'datetime' })(date)).toBe('2026-03-05 09:08:07')
    expect(createFormatter({ type: 'date', pattern: 'time' })(date)).toBe('09:08:07')
  })

  it('自定义 token 模板（YYYY/YY/MM/DD/HH/mm/ss 与 date-grid 小写别名）', () => {
    const date = new Date(2026, 2, 5, 9, 8, 7)
    expect(createFormatter({ type: 'date', pattern: 'YYYY/MM/DD' })(date)).toBe('2026/03/05')
    expect(createFormatter({ type: 'date', pattern: 'YY-MM-DD HH:mm' })(date)).toBe('26-03-05 09:08')
    expect(createFormatter({ type: 'date', pattern: 'yyyy年MM月dd日' })(date)).toBe('2026年03月05日')
  })

  it('非法日期回落 String，null 输出空串', () => {
    const format = createFormatter({ type: 'date' })
    expect(format('not-a-date')).toBe('not-a-date')
    expect(format(null)).toBe('')
    expect(format(Number.POSITIVE_INFINITY)).toBe('Infinity')
  })

  it('越界日期字段不回绕（2026-02-30 / 2026-13-01 / 25:00 等原样回落 String）', () => {
    // 回归：Date 构造对越界字段静默进位（2 月 30 日 → 3 月 2 日），格式化器必须先做字段回读校验
    const format = createFormatter({ type: 'date' })
    expect(format('2026-02-30')).toBe('2026-02-30')
    expect(format('2026-02-29')).toBe('2026-02-29') // 2026 非闰年：同样不得进位成 3-01
    expect(format('2026-04-31')).toBe('2026-04-31')
    expect(format('2026-13-01')).toBe('2026-13-01')
    expect(format('2026-00-10')).toBe('2026-00-10')
    // 时间越界（合法日期 + 非法时刻）同样不回绕
    expect(format('2026-03-05 25:00:00')).toBe('2026-03-05 25:00:00')
    // 合法闰日正常格式化，证明上面对照不是把日期全判非法
    expect(format('2028-02-29')).toBe('2028-02-29')
  })
})

describe('table/value-format text', () => {
  it('ellipsis 截断并追加省略号，短文本不变', () => {
    const format = createFormatter({ type: 'text', ellipsis: 4 })
    expect(format('abcdef')).toBe('abcd…')
    expect(format('abcd')).toBe('abcd')
    expect(format('')).toBe('')
    expect(format(null)).toBe('')
  })

  it('ellipsis 按码点计数（不切断代理对）', () => {
    const format = createFormatter({ type: 'text', ellipsis: 2 })
    expect(format('😀😀😀')).toBe('😀😀…')
  })

  it('无 ellipsis 时原样字符串化', () => {
    const format = createFormatter({ type: 'text' })
    expect(format(1200)).toBe('1200')
    expect(format(undefined)).toBe('')
  })
})

describe('table/value-format custom 与非法 spec', () => {
  it('custom 拿到 value 与整行数据', () => {
    const format = createFormatter({
      type: 'custom',
      format: (value, row) => `${String(value)}/${String(row?.unit ?? '-')}`,
    })
    expect(format(3, { unit: 'kg' })).toBe('3/kg')
    expect(format(3)).toBe('3/-')
  })

  it('非法 spec 回落 String(value) 并只告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const format = createFormatter({ type: 'nope' } as never)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('createFormatter')
    expect(format(42)).toBe('42')
    expect(format(null)).toBe('')
  })

  it('custom 缺少 format 函数、非法精度与非法 pattern 同样回落', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(createFormatter({ type: 'custom' } as never)(7)).toBe('7')
    expect(createFormatter({ type: 'number', precision: -1 } as never)(7)).toBe('7')
    expect(createFormatter({ type: 'date', pattern: 123 } as never)(7)).toBe('7')
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('custom 抛错时回落 String(value) 且实例内只告警一次', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const format = createFormatter({
      type: 'custom',
      format: () => {
        throw new Error('boom')
      },
    })
    expect(format(5)).toBe('5')
    expect(format(6)).toBe('6')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('spec 为 null 时回落', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const format = createFormatter(null as never)
    expect(format('x')).toBe('x')
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
