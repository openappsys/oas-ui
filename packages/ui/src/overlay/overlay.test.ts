import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createOverlay, destroyOverlay, removeOverlay } from './index.js'

describe('overlay 管理器', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyOverlay()
  })

  it('在 body 挂载 overlay 容器并插入浮层', async () => {
    const el = document.createElement('div')
    el.textContent = 'pop'
    const overlay = createOverlay(el)
    await Promise.resolve()
    expect(overlay.isConnected).toBe(true)
    expect(overlay.textContent).toBe('pop')
  })

  it('z-index 递增分配', () => {
    const a = document.createElement('div')
    const b = document.createElement('div')
    const oa = createOverlay(a)
    const ob = createOverlay(b)
    const za = Number(oa.style.zIndex)
    const zb = Number(ob.style.zIndex)
    expect(zb).toBeGreaterThan(za)
  })

  it('外层点击浮层内部不触发 onOutside 回调', async () => {
    let inner = 0
    let outside = 0
    const el = document.createElement('div')
    el.addEventListener('click', () => inner++)
    createOverlay(el, { onOutside: () => outside++ })
    await Promise.resolve()
    el.click()
    expect(inner).toBe(1)
    expect(outside).toBe(0)
  })

  it('二次 removeOverlay 不残留 document 级 outside 监听', async () => {
    let outside = 0
    const el = document.createElement('div')
    createOverlay(el, { onOutside: () => outside++ })
    await Promise.resolve()
    removeOverlay(el)
    removeOverlay(el) // 模拟断连清理重复执行
    document.body.click()
    expect(outside).toBe(0)
  })

  it('触屏同一次 tap 双通道到达：pointerup 后紧跟合成 click 只回调一次', async () => {
    let outside = 0
    const el = document.createElement('div')
    createOverlay(el, { onOutside: () => outside++ })
    await Promise.resolve()
    document.body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, composed: true, pointerType: 'touch' }))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(outside, '同一次 tap 的第二次通道到达被去重').toBe(1)
  })

  it('间隔 >500ms 的两次真实外点各回调一次（去重不吞后续手势）', async () => {
    let outside = 0
    const el = document.createElement('div')
    createOverlay(el, { onOutside: () => outside++ })
    await Promise.resolve()
    document.body.click()
    await new Promise((resolve) => setTimeout(resolve, 520))
    document.body.click()
    expect(outside).toBe(2)
  })

  it('混合输入：触摸点浮层内部后 500ms 内鼠标点外部，外点不被跨通道去重吞掉', async () => {
    let outside = 0
    const el = document.createElement('div')
    createOverlay(el, { onOutside: () => outside++ })
    await Promise.resolve()
    // 触摸落在浮层内部（不关闭，但会占用「上一通道」记录）
    el.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        composed: true,
        pointerType: 'touch',
        pointerId: 2,
        clientX: 100,
        clientY: 100,
      }),
    )
    expect(outside).toBe(0)
    // 紧接着鼠标点外部另一位置：不同设备的不同手势，必须关闭
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 400, clientY: 400 }))
    expect(outside, '跨通道去重只看同一坐标点，不按时间窗口误伤混合输入').toBe(1)
  })

  it('跨通道同坐标仍去重；跨通道不同坐标各算一次（同指针 id 也不合并）', async () => {
    let outside = 0
    const el = document.createElement('div')
    createOverlay(el, { onOutside: () => outside++ })
    await Promise.resolve()
    const touchAt = (x: number, y: number, pointerId = 2): PointerEvent =>
      new PointerEvent('pointerup', {
        bubbles: true,
        composed: true,
        pointerType: 'touch',
        pointerId,
        clientX: x,
        clientY: y,
      })
    // 同一 tap 的双通道（坐标逐像素一致）→ 一次
    document.body.dispatchEvent(touchAt(10, 10))
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 12, clientY: 9 }))
    expect(outside, '5px 内视为同一手势的合成 click').toBe(1)
    // 另一位置的触摸抬手（pointerId 与首次相同）→ 新的一次外点
    document.body.dispatchEvent(touchAt(300, 300))
    expect(outside, '不同坐标是真手势，按时序去重不得吞').toBe(2)
  })

  it('destroyOverlay 清空容器', () => {
    createOverlay(document.createElement('div'))
    destroyOverlay()
    expect(document.querySelector('oas-overlay-container')).toBeNull()
  })
})
