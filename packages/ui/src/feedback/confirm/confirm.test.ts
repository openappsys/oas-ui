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
})
