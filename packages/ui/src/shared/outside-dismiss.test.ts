import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { addOutsideDismiss, removeOutsideDismiss } from './outside-dismiss.js'

/**
 * 外点关闭统一通道：click 通道 + coarse 触屏 pointerup 桥接。
 *
 * 关键口径（WebKit 真机实测驱动）：
 * - pointerType=mouse 不接管（桌面 click 语义：按下不关、拖动不误关）
 * - pointerType=pen 不接管（触控笔是指针设备，浏览器会合成 click；再走 pointerup 会让同一手势
 *   触发两次外点处理）
 * - 其余 pointerType（touch / 空）走 pointerup 桥接
 */
describe('shared/outside-dismiss', () => {
  let handler: ReturnType<typeof vi.fn>

  beforeEach(() => {
    handler = vi.fn()
    addOutsideDismiss(handler as unknown as (e: MouseEvent) => void)
  })

  afterEach(() => {
    removeOutsideDismiss(handler as unknown as (e: MouseEvent) => void)
    vi.restoreAllMocks()
  })

  const pointerUp = (pointerType: string): PointerEvent =>
    new PointerEvent('pointerup', { bubbles: true, composed: true, pointerType })

  it('click 通道：文档任意位置 click 都触发一次', () => {
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('触屏 pointerup 走桥接（touch）', () => {
    document.body.dispatchEvent(pointerUp('touch'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('鼠标与触控笔 pointerup 都不接管（mouse / pen 走合成 click）', () => {
    document.body.dispatchEvent(pointerUp('mouse'))
    document.body.dispatchEvent(pointerUp('pen'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('移除后两条通道都摘干净（幂等、无残留监听）', () => {
    removeOutsideDismiss(handler as unknown as (e: MouseEvent) => void)
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    document.body.dispatchEvent(pointerUp('touch'))
    expect(handler).not.toHaveBeenCalled()
    // 重复移除不抛错
    expect(() => removeOutsideDismiss(handler as unknown as (e: MouseEvent) => void)).not.toThrow()
  })
})
