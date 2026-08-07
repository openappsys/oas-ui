import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadingBar, destroyAll } from './index.js'

describe('loadingBar 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    destroyAll()
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('start 渲染顶部进度条', async () => {
    loadingBar.start()
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).not.toBeNull()
  })

  it('finish 立即完成并移除', async () => {
    loadingBar.start()
    await Promise.resolve()
    loadingBar.finish()
    vi.advanceTimersByTime(200)
    await Promise.resolve()
    expect(document.body.querySelector('oas-loading-bar')).toBeNull()
  })

  it('重复 start 复用单例', async () => {
    loadingBar.start()
    loadingBar.start()
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-loading-bar').length).toBe(1)
  })
})
