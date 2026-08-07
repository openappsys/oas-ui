import { describe, it, expect } from 'vitest'
import { OASElement } from './oas-element.js'

class FixtureElement extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label']
  }

  renderCount = 0
  updateCount = 0

  protected override render(): void {
    this.renderCount++
    this.shadow.innerHTML = '<span id="label"></span>'
  }

  protected override update(): void {
    this.updateCount++
    const span = this.shadow.querySelector('#label')
    if (span) span.textContent = this.getAttr('label', '')
  }

  registerCleanup(fn: () => void): void {
    this.onCleanup(fn)
  }
}

if (!customElements.get('oas-fixture')) {
  customElements.define('oas-fixture', FixtureElement)
}

function mount(attrs: Record<string, string> = {}): FixtureElement {
  const el = new FixtureElement()
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('OASElement', () => {
  it('首次连接只 render 一次，随后执行 update', () => {
    const el = mount({ label: '你好' })
    expect(el.renderCount).toBe(1)
    expect(el.updateCount).toBe(1)
    expect(el.shadowRoot!.querySelector('#label')!.textContent).toBe('你好')
  })

  it('属性变化只触发 update，不重建 shadow DOM', () => {
    const el = mount()
    const span = el.shadowRoot!.querySelector('#label')
    el.setAttribute('label', '变更')
    expect(el.renderCount).toBe(1)
    expect(el.shadowRoot!.querySelector('#label')).toBe(span)
    expect(span!.textContent).toBe('变更')
  })

  it('连接前设置的属性不触发 update（由首次 render 统一消费）', () => {
    const el = new FixtureElement()
    el.setAttribute('label', '预设')
    expect(el.updateCount).toBe(0)
    document.body.appendChild(el)
    expect(el.updateCount).toBe(1)
  })

  it('断开连接时执行注册的清理函数', () => {
    const el = mount()
    let cleaned = 0
    el.registerCleanup(() => cleaned++)
    el.registerCleanup(() => cleaned++)
    el.remove()
    expect(cleaned).toBe(2)
  })
})
