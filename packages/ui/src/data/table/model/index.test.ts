// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as publicFace from './index.js'
import * as core from '../model-core/index.js'

/**
 * headless 公开入口壳（`data/table/model/index.ts`）re-export 真实性：
 * 壳是对 `model-core/` 实现本体的纯转发——逐名核对公开面与实现完全一致，
 * 防止实现新增导出后壳漏转发（消费者拿不到）或壳多出实现没有的名字。
 */

describe('公开入口壳 re-export 与实现本体一致', () => {
  it('值导出逐名一致', () => {
    expect(Object.keys(publicFace).sort()).toEqual(Object.keys(core).sort())
  })

  it('管道入口可从公开面直接调用（冒烟）', () => {
    const model = publicFace.computeRowModel({ data: [{ a: 1 }] })
    expect(model.total).toBe(1)
    expect(model.visible).toHaveLength(1)
  })
})
