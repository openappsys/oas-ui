import { describe, expect, it } from 'vitest'
import { cloneSlotContent, slotContentSignature } from './slot-template'

/**
 * 双形态模板：happy-dom 的 HTMLTemplateElement 会把 insertBefore 重定向到 content，
 * 无法用真实 DOM 造出「子节点直插元素 childNodes」的 CSR 形态；这里用最小替身
 * （只有 content / childNodes 两个被工具读取的成员）直接覆盖回落分支。
 */
function fakeTemplate(contentNodes: Node[], ownNodes: Node[]): HTMLTemplateElement {
  const content = document.createDocumentFragment()
  for (const n of contentNodes) content.appendChild(n)
  return { content, childNodes: ownNodes } as unknown as HTMLTemplateElement
}

const span = (text: string) => {
  const el = document.createElement('span')
  el.textContent = text
  return el
}

describe('shared/slot-template 双形态插槽克隆', () => {
  it('content 有子节点时优先克隆 content（静态 HTML / SSR 快照形态）', () => {
    const tpl = fakeTemplate([span('content')], [span('own')])
    const frag = cloneSlotContent(tpl)
    expect(frag.childNodes.length).toBe(1)
    expect(frag.textContent).toBe('content')
  })

  it('content 为空时回落元素自身 childNodes（框架 CSR 直插形态）', () => {
    const tpl = fakeTemplate([], [span('own-1'), span('own-2')])
    const frag = cloneSlotContent(tpl)
    expect(frag.childNodes.length).toBe(2)
    expect(frag.textContent).toBe('own-1own-2')
    // 非破坏性：源节点保留
    expect(tpl.childNodes.length).toBe(2)
  })

  it('两形态皆空时返回空片段（不抛）', () => {
    expect(cloneSlotContent(fakeTemplate([], [])).childNodes.length).toBe(0)
  })

  it('slotContentSignature 反映 CSR 直插形态的内容变化（innerHTML 恒空不可用作签名）', () => {
    const a = fakeTemplate([], [span('a')])
    const b = fakeTemplate([], [span('b')])
    expect(slotContentSignature(a)).not.toBe(slotContentSignature(b))
    expect(slotContentSignature(a)).toContain('a')
    // 与 content 形态同内容时签名一致（跨形态稳定）
    expect(slotContentSignature(fakeTemplate([], [span('a')]))).toBe(slotContentSignature(a))
  })
})
