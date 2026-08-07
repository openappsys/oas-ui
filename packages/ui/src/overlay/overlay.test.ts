import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createOverlay, destroyOverlay } from './index.js'

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

  it('destroyOverlay 清空容器', () => {
    createOverlay(document.createElement('div'))
    destroyOverlay()
    expect(document.querySelector('oas-overlay-container')).toBeNull()
  })
})
