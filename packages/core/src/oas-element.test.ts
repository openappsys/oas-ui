import { describe, it, expect, afterEach } from 'vitest'
import { OASElement } from './oas-element.js'
import { setTranslator } from './translator.js'

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

  getText(key: string, params?: Record<string, string | number>): string {
    return this.t(key, params)
  }
}

/**
 * DSD（Declarative Shadow DOM）测试夹具。
 *
 * happy-dom 能力缺口（已在本地探测确认）：
 * - 不支持解析 `<template shadowrootmode="open">`（innerHTML 解析不会挂 shadow root）；
 * - `customElements.define` 对已连接元素做"替换"而非 in-place upgrade（新建元素并换掉旧节点，
 *   旧元素上手工挂的 shadow root 会被丢弃），因此构造器永远面对 `shadowRoot === null`，
 *   无法用真实时序复现"upgrade 时已有 shadow root"。
 *
 * 等价模拟方案：用 getter 覆盖令构造时刻 `this.shadowRoot` 已存在（即 DSD 解析后、
 * 浏览器 upgrade 触发构造器时的状态）；并复刻真实浏览器行为——宿主已有 shadow tree 时
 * `attachShadow` 抛 NotSupportedError，用于验证基类防御不会走到 attachShadow。
 */
class DsdFixtureElement extends OASElement {
  /** 模拟服务端输出的 declarative shadow root（`<template shadowrootmode="open">` 解析结果） */
  static dsdRoot: ShadowRoot | null = null

  static override get observedAttributes(): string[] {
    return ['label']
  }

  renderCount = 0
  updateCount = 0
  attachShadowCalls = 0

  override get shadowRoot(): ShadowRoot | null {
    return DsdFixtureElement.dsdRoot
  }

  override attachShadow(init: ShadowRootInit): ShadowRoot {
    this.attachShadowCalls++
    if (this.shadowRoot) {
      throw new DOMException(
        "Failed to execute 'attachShadow' on 'Element': Shadow root cannot be created on a host which already hosts a shadow tree.",
        'NotSupportedError',
      )
    }
    return super.attachShadow(init)
  }

  protected override render(): void {
    this.renderCount++
    this.shadow.innerHTML = '<span id="label"></span>'
  }

  protected override update(): void {
    this.updateCount++
    const span = this.shadow.querySelector('#label')
    if (span) span.textContent = this.getAttr('label', '')
  }

  get shadowRef(): ShadowRoot {
    return this.shadow
  }
}

/** 用于"已带 shadow root 的元素在 define 时 upgrade"时序的夹具（开始时未注册） */
class DsdUpgradeFixture extends OASElement {
  renderCount = 0

  protected override render(): void {
    this.renderCount++
    this.shadow.innerHTML = '<span id="label"></span>'
  }
}

if (!customElements.get('oas-fixture')) {
  customElements.define('oas-fixture', FixtureElement)
}

if (!customElements.get('oas-dsd-fixture')) {
  customElements.define('oas-dsd-fixture', DsdFixtureElement)
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

  it('t() 未注入 translator 时回退返回 key 本身', () => {
    const el = mount()
    expect(el.getText('foo.bar')).toBe('foo.bar')
  })

  it('t() 委托注入的 translator，并透传插值参数', () => {
    const el = mount()
    setTranslator((key: string, params) => `${key}:${params?.['count'] ?? ''}`)
    expect(el.getText('tree.andMore', { count: 5 })).toBe('tree.andMore:5')
    expect(el.getText('plain')).toBe('plain:')
    setTranslator(null)
  })

  it('translator 变化（locale 切换）触发已连接组件 update；断开后不再触发', () => {
    const el = mount()
    const before = el.updateCount
    setTranslator((key: string) => `[${key}]`)
    expect(el.updateCount).toBe(before + 1)
    el.remove()
    const after = el.updateCount
    setTranslator(null)
    setTranslator((key: string) => key)
    expect(el.updateCount).toBe(after)
  })

  describe('Declarative Shadow DOM（DSD）防御', () => {
    it('构造时已有 declarative shadow root：复用已有 root、不调 attachShadow、render 正常', () => {
      // 模拟服务端输出的 DSD root（`<template shadowrootmode="open">` 解析结果）
      const div = document.createElement('div')
      const dsdRoot = div.attachShadow({ mode: 'open' })
      dsdRoot.innerHTML = '<span id="pre">ssr 静态快照</span>'
      DsdFixtureElement.dsdRoot = dsdRoot

      // define 已注册 → createElement 走真实注册表触发构造器，
      // 构造时刻等价于浏览器 upgrade 时刻（this.shadowRoot 已存在）
      const el = document.createElement('oas-dsd-fixture') as DsdFixtureElement

      // 基类防御：this.shadow 复用已有 root，未新建、未走到 attachShadow
      expect(el.shadowRef).toBe(dsdRoot)
      expect(el.attachShadowCalls).toBe(0)

      // connectedCallback 后 render/update 正常执行（写进复用的 DSD root）
      document.body.appendChild(el)
      expect(el.renderCount).toBe(1)
      expect(el.updateCount).toBe(1)
      expect(dsdRoot.querySelector('#label')).not.toBeNull()

      el.setAttribute('label', '水合')
      expect(el.updateCount).toBe(2)
      expect(dsdRoot.querySelector('#label')!.textContent).toBe('水合')

      el.remove()
    })

    it('已带 shadow root 的元素在 define 触发 upgrade 时不抛错、组件可用', () => {
      // happy-dom 限制：define 对已连接元素走"替换"而非 in-place upgrade，
      // 因此这里验证的是"DSD 时序下 define 不抛错 + 最终元素可用"的可观测契约；
      // 「复用已有 root」的精确断言见上一个用例。
      const el = document.createElement('oas-dsd-upgrade')
      el.attachShadow({ mode: 'open' }).innerHTML = '<span>pre</span>'
      document.body.appendChild(el)

      expect(() => customElements.define('oas-dsd-upgrade', DsdUpgradeFixture)).not.toThrow()

      const upgraded = document.querySelector('oas-dsd-upgrade') as DsdUpgradeFixture
      expect(upgraded).toBeInstanceOf(DsdUpgradeFixture)
      expect(upgraded.renderCount).toBe(1)
      expect(upgraded.shadowRoot?.querySelector('#label')).not.toBeNull()

      upgraded.remove()
    })
  })

  afterEach(() => {
    setTranslator(null)
    DsdFixtureElement.dsdRoot = null
  })
})
