import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { modal, destroyAll, type ModalOptions } from './index.js'
import { registerAppHost, unregisterAppHost } from '../../floating/app/app-host.js'
import { iconRegistry } from '@oas-ui/icons'

function okButton(el: Element): HTMLButtonElement {
  return el.shadowRoot!.querySelector('[part="ok"]') as HTMLButtonElement
}

function cancelButton(el: Element): HTMLElement {
  return el.shadowRoot!.querySelector('[part="cancel"]') as HTMLElement
}

function esc(): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

describe('modal 命令式 API', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    destroyAll()
    document.body.innerHTML = ''
  })

  it('confirm 创建并挂载到 body（无 oas-app 时）', async () => {
    modal.confirm({ title: '确认删除' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    expect(el).not.toBeNull()
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('有 oas-app 容器时挂到最近容器内（与消息族同通道）', async () => {
    const app = document.createElement('div')
    document.body.appendChild(app)
    registerAppHost(app)
    try {
      modal.confirm({ title: '挂载到 app' })
      await Promise.resolve()
      expect(app.querySelector('oas-modal')).not.toBeNull()
      expect(document.body.querySelectorAll('oas-modal').length).toBe(1)
    } finally {
      unregisterAppHost(app)
    }
  })

  it('title/content/okText/cancelText 渲染', async () => {
    modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复',
      okText: '狠心删除',
      cancelText: '再想想',
    })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    expect(el.getAttribute('title')).toBe('确认删除')
    expect(el.getAttribute('ok-text')).toBe('狠心删除')
    expect(el.getAttribute('cancel-text')).toBe('再想想')
    expect(el.textContent).toContain('删除后不可恢复')
    expect(okButton(el).textContent).toContain('狠心删除')
    expect(cancelButton(el).textContent).toContain('再想想')
  })

  it('点确定：onOk 调用 + 关闭销毁', async () => {
    const onOk = vi.fn()
    modal.confirm({ title: '测试', onOk })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(onOk).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('无 onOk 点确定直接关闭', async () => {
    modal.confirm({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('异步 onOk：pending 时 ok loading（disabled），resolve 后关闭', async () => {
    let release!: () => void
    modal.confirm({ title: '测试', onOk: () => new Promise<void>((r) => (release = r)) })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(el.hasAttribute('visible')).toBe(true)
    expect(el.hasAttribute('loading')).toBe(true)
    expect(okButton(el).disabled).toBe(true)
    // loading 期间重复点确定不重复触发（按钮 disabled + 模块双保险）
    okButton(el).click()
    release()
    await Promise.resolve()
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('异步 onOk reject：loading 停止、对话框保持打开可重试', async () => {
    modal.confirm({ title: '测试', onOk: () => Promise.reject(new Error('boom')) })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    await Promise.resolve()
    expect(el.hasAttribute('loading')).toBe(false)
    expect(okButton(el).disabled).toBe(false)
    expect(el.hasAttribute('visible')).toBe(true)
  })

  it('点取消：onCancel 调用 + 关闭；Esc 同为 cancel 语义', async () => {
    const onCancel = vi.fn()
    modal.confirm({ title: '测试', onCancel })
    await Promise.resolve()
    cancelButton(document.body.querySelector('oas-modal')!).click()
    await Promise.resolve()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('oas-modal')).toBeNull()
    // Esc 关闭
    modal.confirm({ title: '测试2', onCancel })
    await Promise.resolve()
    esc()
    await Promise.resolve()
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('loading 中取消：关闭 + onCancel，迟到的 resolve 不再生效', async () => {
    let release!: () => void
    const onCancel = vi.fn()
    modal.confirm({ title: '测试', onOk: () => new Promise<void>((r) => (release = r)), onCancel })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    okButton(el).click()
    await Promise.resolve()
    expect(el.hasAttribute('loading')).toBe(true)
    cancelButton(el).click()
    await Promise.resolve()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('oas-modal')).toBeNull()
    release()
    await Promise.resolve()
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
  })

  it('info/success/warning/error 变体：语义图标 + 单确定按钮', async () => {
    modal.info({ title: '信息', content: '提示' })
    modal.success({ title: '成功', content: '完成' })
    modal.warning({ title: '警告', content: '注意' })
    modal.error({ title: '错误', content: '出错' })
    await Promise.resolve()
    const els = document.body.querySelectorAll('oas-modal')
    expect(els.length).toBe(4)
    const expectTypes = ['info', 'success', 'warning', 'error']
    const expectIcons = ['info', 'check-circle', 'warning', 'error']
    els.forEach((el, i) => {
      expect(el.getAttribute('type')).toBe(expectTypes[i])
      const icon = el.shadowRoot!.querySelector('[part="semantic-icon"]')!
      expect(icon.hasAttribute('hidden')).toBe(false)
      // happy-dom 会把自闭合 SVG 标签序列化为显式闭合，用同源解析的参考元素比对
      const ref = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      ref.innerHTML = iconRegistry[expectIcons[i] as keyof typeof iconRegistry]
      expect(icon.querySelector('svg')!.innerHTML).toBe(ref.innerHTML)
      // 单确定按钮：取消按钮隐藏
      expect(cancelButton(el).hidden).toBe(true)
      expect(okButton(el).hidden).toBe(false)
    })
  })

  it('多例并存 + destroyAll 全销毁（无孤儿）', async () => {
    modal.confirm({ title: '1' })
    modal.confirm({ title: '2' })
    modal.info({ title: '3' })
    await Promise.resolve()
    expect(document.body.querySelectorAll('oas-modal').length).toBe(3)
    destroyAll()
    expect(document.body.querySelectorAll('oas-modal').length).toBe(0)
    expect(document.body.innerHTML).toBe('')
  })

  it('close() 句柄编程关闭（不触发 onCancel）', async () => {
    const onCancel = vi.fn()
    const handle = modal.confirm({ title: '测试', onCancel })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    handle.close()
    await Promise.resolve()
    expect(document.body.querySelector('oas-modal')).toBeNull()
    expect(onCancel).not.toHaveBeenCalled()
    expect(el.isConnected).toBe(false)
  })

  it('close() 还原来源焦点', async () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    const handle = modal.confirm({ title: '测试' })
    await Promise.resolve()
    const el = document.body.querySelector('oas-modal')!
    // 命令式确认框打开聚焦「确定」按钮（focus-ok）
    expect(el.shadowRoot!.activeElement).toBe(okButton(el))
    handle.close()
    await Promise.resolve()
    expect(document.activeElement).toBe(outside)
  })

  it('非法参数容错：非对象 / 空 title+content 不抛错', async () => {
    expect(() => modal.confirm(null as unknown as ModalOptions)).not.toThrow()
    expect(() => modal.confirm(123 as unknown as ModalOptions)).not.toThrow()
    expect(() => modal.confirm('xxx' as unknown as ModalOptions)).not.toThrow()
    expect(() => modal.confirm()).not.toThrow()
    await Promise.resolve()
    // 全部渲染为确认框（空 title/content 容错）
    expect(document.body.querySelectorAll('oas-modal').length).toBe(4)
  })
})
