import { describe, it, expect, afterEach } from 'vitest'
import { isSsrRuntime } from './ssr-runtime.js'

describe('isSsrRuntime', () => {
  afterEach(() => {
    delete (window as Window & { __OAS_SSR__?: boolean }).__OAS_SSR__
  })

  it('浏览器/客户端（happy-dom）返回 false', () => {
    expect(isSsrRuntime()).toBe(false)
  })

  it('渲染器 shim 标记 __OAS_SSR__ 时返回 true（shim 同样有 window）', () => {
    ;(window as Window & { __OAS_SSR__?: boolean }).__OAS_SSR__ = true
    expect(isSsrRuntime()).toBe(true)
  })

  it('标记为 false 时按客户端处理', () => {
    ;(window as Window & { __OAS_SSR__?: boolean }).__OAS_SSR__ = false
    expect(isSsrRuntime()).toBe(false)
  })
})
