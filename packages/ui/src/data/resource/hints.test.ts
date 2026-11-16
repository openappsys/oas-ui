import { describe, expect, it } from 'vitest'
import { PERIODS_TRUNCATED_WARNING } from './hints.js'
import { MAX_PERIODS } from './model.js'

describe('resource 告警文案', () => {
  it('period 截断提示与上限常量保持同步，且带组件前缀', () => {
    expect(PERIODS_TRUNCATED_WARNING).toBe(
      `[oas-resource] period 数超过 ${MAX_PERIODS}，已截断（任务日期跨度可能异常）`,
    )
  })
})
