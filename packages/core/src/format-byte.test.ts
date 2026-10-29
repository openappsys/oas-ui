// @vitest-environment node
/**
 * formatByte 纯函数单测：零 DOM 依赖。
 *
 * 本文件刻意跑 Node 环境（无 happy-dom）——helper 只允许使用 `Intl` / `Math` 纯计算。
 * 实现一旦引用 document/window/HTMLElement，此文件会在导入或调用时直接失败。
 */
import { describe, it, expect } from 'vitest'
import { formatByte } from './format-byte.js'

describe('formatByte：默认 IEC（1024 进制）档位与阈值', () => {
  it('B 档：0 与小于 1024 的字节取整输出', () => {
    expect(formatByte(0)).toBe('0 B')
    expect(formatByte(1)).toBe('1 B')
    expect(formatByte(512)).toBe('512 B')
    expect(formatByte(1023)).toBe('1023 B')
    expect(formatByte(512.6)).toBe('513 B')
    expect(formatByte(0.4)).toBe('0 B')
  })

  it('KiB / MiB / GiB 按 1024 进位，默认保留一位小数', () => {
    expect(formatByte(1024)).toBe('1.0 KiB')
    expect(formatByte(1536)).toBe('1.5 KiB')
    expect(formatByte(1024 * 1024)).toBe('1.0 MiB')
    expect(formatByte(1024 * 1024 * 2.5)).toBe('2.5 MiB')
    expect(formatByte(1024 ** 3)).toBe('1.0 GiB')
    expect(formatByte(1024 ** 4)).toBe('1.0 TiB')
    expect(formatByte(1024 ** 5)).toBe('1.0 PiB')
    expect(formatByte(1024 ** 6)).toBe('1.0 EiB')
  })

  it('舍入触顶升档：1023.96 B → 1.0 KiB、1023.96 KiB → 1.0 MiB', () => {
    expect(formatByte(1023.96)).toBe('1.0 KiB')
    expect(formatByte(1023.4)).toBe('1023 B')
    // 1048535.04 B = 1023.96 KiB，一位小数舍入到 1024.0 → 进位 MiB
    expect(formatByte(1024 * 1023.96)).toBe('1.0 MiB')
    expect(formatByte(1024 * 1023.94)).toBe('1023.9 KiB')
  })

  it('档位封顶 EiB：超出最大单位不溢出、不出现 Infinity', () => {
    const huge = formatByte(1024 ** 7)
    expect(huge.endsWith(' EiB')).toBe(true)
    expect(huge).not.toContain('Infinity')
    const max = formatByte(Number.MAX_VALUE)
    expect(max.endsWith(' EiB')).toBe(true)
    expect(max).not.toContain('Infinity')
  })
})

describe('formatByte：unitSystem "si"（1000 进制）', () => {
  it('SI 阈值与单位标签', () => {
    expect(formatByte(999, { unitSystem: 'si' })).toBe('999 B')
    expect(formatByte(1000, { unitSystem: 'si' })).toBe('1.0 KB')
    expect(formatByte(1500, { unitSystem: 'si' })).toBe('1.5 KB')
    expect(formatByte(1000 ** 2, { unitSystem: 'si' })).toBe('1.0 MB')
    expect(formatByte(1000 ** 3, { unitSystem: 'si' })).toBe('1.0 GB')
    expect(formatByte(1000 ** 6, { unitSystem: 'si' })).toBe('1.0 EB')
  })

  it('SI 进位：999.96 KB → 1.0 MB；封顶 EB 不溢出', () => {
    expect(formatByte(999_960, { unitSystem: 'si' })).toBe('1.0 MB')
    expect(formatByte(999_940, { unitSystem: 'si' })).toBe('999.9 KB')
    const max = formatByte(Number.MAX_VALUE, { unitSystem: 'si' })
    expect(max.endsWith(' EB')).toBe(true)
    expect(max).not.toContain('Infinity')
  })

  it('非法 unitSystem 回落 iec', () => {
    expect(formatByte(1024, { unitSystem: 'binary' as never })).toBe('1.0 KiB')
  })
})

describe('formatByte：precision 精度语义', () => {
  it('默认 1 位；0 位取整；多位补零', () => {
    expect(formatByte(1536)).toBe('1.5 KiB')
    expect(formatByte(1536, { precision: 0 })).toBe('2 KiB')
    expect(formatByte(1536, { precision: 2 })).toBe('1.50 KiB')
    expect(formatByte(1024, { precision: 3 })).toBe('1.000 KiB')
  })

  it('非法精度：负数归 0、小数截断、非有限回落默认 1', () => {
    expect(formatByte(1536, { precision: -3 })).toBe('2 KiB')
    expect(formatByte(1536, { precision: 2.7 })).toBe('1.50 KiB')
    expect(formatByte(1536, { precision: Number.NaN })).toBe('1.5 KiB')
    expect(formatByte(1536, { precision: Number.POSITIVE_INFINITY })).toBe('1.5 KiB')
  })

  it('精度上限 20（不会向 Intl 传越界值）', () => {
    expect(() => formatByte(1536, { precision: 999 })).not.toThrow()
    expect(formatByte(1536, { precision: 999 })).toBe(`1.${'5'.padEnd(20, '0')} KiB`)
  })
})

describe('formatByte：locale', () => {
  it('默认 en-US（确定性，SSR 与客户端一致）', () => {
    expect(formatByte(1536)).toBe('1.5 KiB')
    expect(formatByte(1536, { locale: 'en-US' })).toBe('1.5 KiB')
  })

  it('locale 影响小数点写法', () => {
    expect(formatByte(1536, { locale: 'de-DE' })).toBe('1,5 KiB')
  })

  it('非法 / 空 locale 不抛错，回落 en-US', () => {
    expect(formatByte(1536, { locale: 'zh_CN' })).toBe('1.5 KiB')
    expect(formatByte(1536, { locale: '' })).toBe('1.5 KiB')
  })

  it('整数 B 档不出现 locale 小数点噪声', () => {
    expect(formatByte(512, { locale: 'de-DE' })).toBe('512 B')
  })
})

describe('formatByte：0 / 负数 / 非法 / 非有限', () => {
  it('0 与 -0 归一为 0 B', () => {
    expect(formatByte(0)).toBe('0 B')
    expect(formatByte(-0)).toBe('0 B')
    // 负零附近舍入到 0 时不输出 `-0 B`
    expect(formatByte(-0.4)).toBe('0 B')
  })

  it('负数保留符号，按绝对值选档进位', () => {
    expect(formatByte(-512)).toBe('-512 B')
    expect(formatByte(-1536)).toBe('-1.5 KiB')
    expect(formatByte(-(1024 * 1024))).toBe('-1.0 MiB')
  })

  it('NaN / ±Infinity / 非 number 返回空串（不渲染 NaN / Infinity）', () => {
    expect(formatByte(Number.NaN)).toBe('')
    expect(formatByte(Number.POSITIVE_INFINITY)).toBe('')
    expect(formatByte(Number.NEGATIVE_INFINITY)).toBe('')
    expect(formatByte('1024' as never)).toBe('')
    expect(formatByte(null as never)).toBe('')
    expect(formatByte(undefined as never)).toBe('')
  })
})
