// @vitest-environment node
import { describe, expect, it } from 'vitest'
import * as range from './range/index.js'
import * as history from './history/index.js'
import * as detail from './detail/index.js'
import * as view from './view/index.js'
import * as advanced from './advanced/index.js'

describe('Pro 子路径 SSR 导入安全', () => {
  it('Node 环境无 window/document 时可导入并保留纯函数', () => {
    expect(typeof globalThis.window).toBe('undefined')
    expect(range.enableRangeSelection).toBeTypeOf('function')
    expect(range.copyRange).toBeTypeOf('function')
    expect(range.applyRangePaste).toBeTypeOf('function')
    expect(range.fillRange).toBeTypeOf('function')
    expect(history.enableHistory).toBeTypeOf('function')
    expect(history.recordHistory).toBeTypeOf('function')
    expect(history.withHistoryBatch).toBeTypeOf('function')
    expect(detail.createMasterDetail).toBeTypeOf('function')
    expect(view.captureViewState).toBeTypeOf('function')
    expect(view.saveViewState).toBeTypeOf('function')
    expect(advanced.createHistory).toBeTypeOf('function')
    expect(advanced.createWindowedSource).toBeTypeOf('function')
    expect(advanced.pivot).toBeTypeOf('function')
  })
})
