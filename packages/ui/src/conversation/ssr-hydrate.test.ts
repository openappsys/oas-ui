import { describe, it, expect, beforeEach } from 'vitest'
import type { OASElement } from '@oas-ui/core'
import { OASMessageActions } from './message-actions/index.js'
import { OASToolCall } from './tool-call/index.js'

/**
 * conversation 组件 DSD 真水合单测（对应 SSR 白名单收口：message-actions / tool-call）。
 *
 * 验证四件事：
 * 1. 真水合接管：注入「真实 render 产出的快照 + 指纹 meta」后 upgrade，hydrate() 直接接管——
 *    style DOM 引用保持同一对象（shadow 未重建）、指纹移除、关键结构仍在。
 * 2. 回退：快照缺关键结构时 hydrate 返回 false → render 全量重建，功能仍正常。
 * 3. update 不重建快照结构：属性变化只做增量同步，快照里的按钮/头部节点引用保持。
 * 4. 事件只绑一次：水合后单次点击只派发一次 oas-action / oas-toggle（不得双绑）。
 *
 * 快照用「先渲染参照实例再取其 shadow.innerHTML」的方式构造，保证与组件 render() 严格一致。
 */

type Fixture = {
  name: string
  cls: new () => OASElement
  setup: (el: OASElement) => void
  /** 水合接管后应存在的关键结构选择器 */
  probe: string
}

const ACTIONS = JSON.stringify([
  { key: 'copy', label: '复制' },
  { key: 'retry', label: '重试', title: '重新请求' },
])

const FIXTURES: Fixture[] = [
  {
    name: 'message-actions',
    cls: OASMessageActions,
    setup: (el) => {
      el.setAttribute('actions', ACTIONS)
      el.setAttribute('message-id', 'm1')
    },
    probe: '[part="actions"]',
  },
  {
    name: 'tool-call',
    cls: OASToolCall,
    setup: (el) => {
      el.setAttribute('name', 'search_docs')
      el.setAttribute('summary', '搜索 API 文档')
      el.setAttribute('status', 'success')
      el.setAttribute('args', '{"query":"scheduler"}')
      el.setAttribute('result', '["scheduler"]')
      el.setAttribute('open', '')
    },
    probe: '[part="head"]',
  },
]

/** 渲染一个参照实例并返回其 shadow 快照（SSR 场景等价物） */
function captureSnapshot(cls: new () => OASElement, setup: (el: OASElement) => void): string {
  const el = new cls()
  setup(el)
  document.body.appendChild(el)
  const html = el.shadowRoot!.innerHTML
  el.remove()
  return html
}

/** 注入快照 + 指纹后升级（模拟浏览器 DSD upgrade） */
function upgradeFromSnapshot(
  cls: new () => OASElement,
  shadowHtml: string,
  setup: (el: OASElement) => void,
): { el: OASElement; styleRef: Element | null } {
  const el = new cls()
  const tag = el.tagName.toLowerCase()
  el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1">${shadowHtml}`
  setup(el)
  const styleRef = el.shadowRoot!.querySelector('style')
  document.body.appendChild(el)
  return { el, styleRef }
}

describe('conversation 组件 DSD 真水合', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  for (const f of FIXTURES) {
    it(`真水合接管：${f.name} hydrate 成功、shadow 不重建（style 引用保持）、指纹移除、关键结构保持`, () => {
      const snap = captureSnapshot(f.cls, f.setup)
      const { el, styleRef } = upgradeFromSnapshot(f.cls, snap, f.setup)

      expect(el.shadowRoot!.querySelector('style')).toBe(styleRef)
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
      expect(el.shadowRoot!.querySelector(f.probe)).not.toBeNull()
      expect(snap).toContain('<style>')
      expect(snap).not.toContain('data-oas-ssr')
    })

    it(`回退：${f.name} 快照缺关键结构时 render 全量重建`, () => {
      const el = new f.cls()
      const tag = el.tagName.toLowerCase()
      el.shadowRoot!.innerHTML = `<meta data-oas-ssr="${tag}" data-oas-ssr-v="1"><span>broken</span>`
      f.setup(el)
      document.body.appendChild(el)
      expect(el.shadowRoot!.querySelector(f.probe)).not.toBeNull()
      expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()
    })
  }

  it('message-actions：水合采纳快照按钮（不重建），属性更新不重建，单次点击只派发一次 oas-action', () => {
    const snap = captureSnapshot(OASMessageActions, FIXTURES[0]!.setup)
    const el = new OASMessageActions()
    el.shadowRoot!.innerHTML = `<meta data-oas-ssr="oas-message-actions" data-oas-ssr-v="1">${snap}`
    FIXTURES[0]!.setup(el)
    const snapshotButtons = [...el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action')]
    expect(snapshotButtons.length).toBe(2)
    document.body.appendChild(el)

    const first = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action')[0]!
    // 水合即采纳快照按钮节点（update 不得 innerHTML 重建）
    expect(first).toBe(snapshotButtons[0])

    // 属性更新 → update 增量同步；快照按钮节点不得被 innerHTML 重建
    el.setAttribute('message-id', 'm2')
    const buttons = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action')
    expect(buttons.length).toBe(2)
    expect(buttons[0]).toBe(first)
    expect(buttons[0]!.textContent).toBe('复制')

    const seen: Array<{ key: string; messageId?: string }> = []
    el.addEventListener('oas-action', (event) => seen.push((event as CustomEvent).detail))
    first.click()
    expect(seen).toEqual([{ key: 'copy', messageId: 'm2' }])
  })

  it('tool-call：水合后属性更新不重建头部，单次点击只派发一次 oas-toggle', () => {
    const snap = captureSnapshot(OASToolCall, FIXTURES[1]!.setup)
    const { el } = upgradeFromSnapshot(OASToolCall, snap, FIXTURES[1]!.setup)
    const head = el.shadowRoot!.querySelector<HTMLButtonElement>('[part="head"]')!
    const body = el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!

    el.setAttribute('summary', '新的摘要')
    expect(el.shadowRoot!.querySelector('[part="head"]')).toBe(head)
    expect(el.shadowRoot!.querySelector('[part="body"]')).toBe(body)
    expect(el.shadowRoot!.querySelector('[part="summary"]')!.textContent).toBe('新的摘要')

    const seen: Array<{ open: boolean; name: string }> = []
    el.addEventListener('oas-toggle', (event) => seen.push((event as CustomEvent).detail))
    head.click()
    expect(seen).toEqual([{ open: false, name: 'search_docs' }])
    expect(body.hidden).toBe(true)
  })

  it('message-actions：水合后 disconnected/reconnected 交互仍恰好一次（监听不重复绑定）', () => {
    const snap = captureSnapshot(OASMessageActions, FIXTURES[0]!.setup)
    const { el } = upgradeFromSnapshot(OASMessageActions, snap, FIXTURES[0]!.setup)
    const button = el.shadowRoot!.querySelector<HTMLButtonElement>('.action')!
    el.remove()
    document.body.appendChild(el)

    let n = 0
    el.addEventListener('oas-action', () => n++)
    button.click()
    expect(n).toBe(1)
  })

  // —— fix round 2：tool-call 关键子结构校验（只验 head 会接管缺 body/args/result 的残破快照） ——

  it('tool-call：快照只有 tool/head（缺 body 与 args/result 两段）时回退 render，展开可用', () => {
    const el = new OASToolCall()
    el.setAttribute('name', 'search_docs')
    el.setAttribute('args', '{"query":"scheduler"}')
    el.setAttribute('result', '["scheduler"]')
    el.setAttribute('open', '')
    el.shadowRoot!.innerHTML =
      '<meta data-oas-ssr="oas-tool-call" data-oas-ssr-v="1"><style></style><div part="tool"><button part="head" type="button"></button></div>'
    document.body.appendChild(el)

    expect(el.shadowRoot!.querySelector('[part="body"]'), '回退后应有 body').not.toBeNull()
    expect(el.shadowRoot!.querySelectorAll('.section').length).toBe(2)
    expect(el.shadowRoot!.querySelector('[part="args"]')!.textContent).toContain('scheduler')
    expect(el.shadowRoot!.querySelector('[part="result"]')!.textContent).toContain('scheduler')
    expect(el.shadowRoot!.querySelector('meta[data-oas-ssr]')).toBeNull()

    const seen: Array<{ open: boolean; name: string }> = []
    el.addEventListener('oas-toggle', (event) => seen.push((event as CustomEvent).detail))
    el.shadowRoot!.querySelector<HTMLButtonElement>('[part="head"]')!.click()
    expect(seen).toEqual([{ open: false, name: 'search_docs' }])
    expect(el.shadowRoot!.querySelector<HTMLElement>('[part="body"]')!.hidden).toBe(true)
  })
})
