import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { confirm, destroyAll } from './index.js'

describe('confirm 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyAll()
    document.body.innerHTML = ''
  })

  it('渲染对话框，含标题与内容', async () => {
    confirm({ title: '确认删除', content: '删除后不可恢复' })
    await Promise.resolve()
    const modal = document.body.querySelector('oas-modal')!
    expect(modal).not.toBeNull()
    expect(modal.getAttribute('title')).toBe('确认删除')
    expect(modal.textContent).toContain('删除后不可恢复')
  })

  it('点击确定 resolve', async () => {
    let result: 'ok' | 'cancel' | 'pending' = 'pending'
    confirm({ title: '测试' }).then(() => (result = 'ok'))
    await Promise.resolve()
    const modal = document.body.querySelector('oas-modal')!
    modal.dispatchEvent(new CustomEvent('oas-ok'))
    await Promise.resolve()
    expect(result).toBe('ok')
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('Esc（oas-cancel）reject 并关闭', async () => {
    let result: 'ok' | 'cancel' | 'pending' = 'pending'
    confirm({ title: '测试' }).catch(() => (result = 'cancel'))
    await Promise.resolve()
    const modal = document.body.querySelector('oas-modal')!
    modal.dispatchEvent(new CustomEvent('oas-cancel'))
    await Promise.resolve()
    expect(result).toBe('cancel')
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  // —— onOk 异步（loading 态确认）——
  it('onOk 异步：确定后对话框保持打开并进入 loading，resolve 后关闭并 resolve 外层', async () => {
    let result: 'ok' | 'cancel' | 'pending' = 'pending'
    let release!: () => void
    confirm({ title: '测试', onOk: () => new Promise<void>((r) => (release = r)) }).then(
      () => (result = 'ok'),
    )
    await Promise.resolve()
    const modal = document.body.querySelector('oas-modal')!
    modal.dispatchEvent(new CustomEvent('oas-ok'))
    await Promise.resolve()
    expect(modal.hasAttribute('visible')).toBe(true) // 未关闭：loading 可见
    expect(modal.hasAttribute('loading')).toBe(true)
    // loading 期间重复 oas-ok 不重复触发
    modal.dispatchEvent(new CustomEvent('oas-ok'))
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-modal').length).toBe(1)
    release()
    await Promise.resolve()
    await Promise.resolve()
    expect(result).toBe('ok')
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('onOk 异步失败：loading 清除、对话框保持打开可重试、外层不 settle', async () => {
    let result: 'ok' | 'cancel' | 'pending' = 'pending'
    confirm({ title: '测试', onOk: () => Promise.reject(new Error('boom')) }).then(
      () => (result = 'ok'),
      () => (result = 'cancel'),
    )
    await Promise.resolve()
    const modal = document.body.querySelector('oas-modal')!
    modal.dispatchEvent(new CustomEvent('oas-ok'))
    await Promise.resolve()
    await Promise.resolve()
    expect(modal.hasAttribute('loading')).toBe(false) // loading 已清除
    expect(modal.hasAttribute('visible')).toBe(true) // 保持打开
    expect(result).toBe('pending')
    // 取消仍可关闭
    modal.dispatchEvent(new CustomEvent('oas-cancel'))
    await Promise.resolve()
    expect(result).toBe('cancel')
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('loading 中取消（oas-cancel）：reject 并关闭，迟到的 resolve 不再生效', async () => {
    let result: 'ok' | 'cancel' | 'pending' = 'pending'
    let release!: () => void
    confirm({ title: '测试', onOk: () => new Promise<void>((r) => (release = r)) }).then(
      () => (result = 'ok'),
      () => (result = 'cancel'),
    )
    await Promise.resolve()
    const modal = document.body.querySelector('oas-modal')!
    modal.dispatchEvent(new CustomEvent('oas-ok'))
    await Promise.resolve()
    expect(modal.hasAttribute('loading')).toBe(true)
    modal.dispatchEvent(new CustomEvent('oas-cancel'))
    await Promise.resolve()
    expect(result).toBe('cancel')
    expect(document.body.querySelector('oas-modal')).toBeNull()
    release()
    await Promise.resolve()
    expect(result).toBe('cancel')
  })

  it('onOk 同步回调：不等 Promise，立即关闭并 resolve', async () => {
    let result: 'ok' | 'cancel' | 'pending' = 'pending'
    let called = 0
    confirm({ title: '测试', onOk: () => void called++ }).then(() => (result = 'ok'))
    await Promise.resolve()
    const modal = document.body.querySelector('oas-modal')!
    modal.dispatchEvent(new CustomEvent('oas-ok'))
    await Promise.resolve()
    expect(called).toBe(1)
    expect(result).toBe('ok')
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })
})
