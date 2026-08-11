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

/**
 * 真水合（DSD 接管）测试夹具：shadowRoot getter 指向静态 DSD root（同 DsdFixtureElement 技巧，
 * 模拟浏览器 upgrade 时构造时刻已有服务端快照 root），带 hydrate() 实现与可开关的异常路径。
 */
class DsdHydrateFixture extends OASElement {
  static dsdRoot: ShadowRoot | null = null

  static override get observedAttributes(): string[] {
    return ['label']
  }

  renderCount = 0
  updateCount = 0
  hydrateCalls = 0
  hydrateThrows = false

  override get shadowRoot(): ShadowRoot | null {
    return DsdHydrateFixture.dsdRoot
  }

  protected override render(): void {
    this.renderCount++
    this.shadow.innerHTML = '<span id="label"></span>'
  }

  protected override hydrate(): boolean {
    this.hydrateCalls++
    if (this.hydrateThrows) throw new Error('hydrate 模拟异常')
    return this.shadow.querySelector('#label') !== null
  }

  protected override update(): void {
    this.updateCount++
    const span = this.shadow.querySelector('#label')
    if (span) span.textContent = this.getAttr('label', '')
  }

  get shadowRef(): ShadowRoot {
    return this.shadow
  }

  /** 公开 wasHydrated() 供测试断言（生产子类直接使用 protected 方法） */
  get hydratedNow(): boolean {
    return this.wasHydrated()
  }
}

if (!customElements.get('oas-fixture')) {
  customElements.define('oas-fixture', FixtureElement)
}

if (!customElements.get('oas-dsd-fixture')) {
  customElements.define('oas-dsd-fixture', DsdFixtureElement)
}

if (!customElements.get('oas-dsd-hydrate')) {
  customElements.define('oas-dsd-hydrate', DsdHydrateFixture)
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

  describe('真水合：SSR 指纹命中时跳过 shadow 重建接管', () => {
    /** 构造一个带指纹的 DSD root（模拟服务端快照解析结果） */
    function makeDsdRoot(inner: string): { dsdRoot: ShadowRoot; preSpan: Element | null } {
      const div = document.createElement('div')
      const dsdRoot = div.attachShadow({ mode: 'open' })
      dsdRoot.innerHTML = inner
      return { dsdRoot, preSpan: dsdRoot.querySelector('#label') }
    }

    it('指纹匹配 + hydrate 成功：跳过 render()、shadow 未重建（DOM 引用保持）、指纹移除、update 照常', () => {
      const { dsdRoot, preSpan } = makeDsdRoot(
        '<meta data-oas-ssr="oas-dsd-hydrate" data-oas-ssr-v="1"><span id="label">ssr 快照</span>',
      )
      DsdHydrateFixture.dsdRoot = dsdRoot

      const el = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      expect(el.shadowRef).toBe(dsdRoot)

      document.body.appendChild(el)

      // 真水合接管：render() 未执行，hydrate() 恰好执行一次
      expect(el.renderCount).toBe(0)
      expect(el.hydrateCalls).toBe(1)
      // 决定性证据：shadow 内容未被 innerHTML 重建，upgrade 前后 #label 是同一对象
      expect(dsdRoot.querySelector('#label')).toBe(preSpan)
      // 指纹 meta 已被移除（防二次误判）
      expect(dsdRoot.querySelector('meta[data-oas-ssr]')).toBeNull()
      // update() 照常执行，属性同步不缺失
      expect(el.updateCount).toBe(1)
      el.setAttribute('label', '水合')
      expect(dsdRoot.querySelector('#label')!.textContent).toBe('水合')

      el.remove()
    })

    it('指纹 tag 不匹配（快照属于别的组件）：回退 render() 重建', () => {
      const { dsdRoot, preSpan } = makeDsdRoot(
        '<meta data-oas-ssr="oas-button" data-oas-ssr-v="1"><span id="label">ssr 快照</span>',
      )
      DsdHydrateFixture.dsdRoot = dsdRoot

      const el = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      document.body.appendChild(el)

      expect(el.hydrateCalls).toBe(0)
      expect(el.renderCount).toBe(1)
      // 重建：原快照节点被替换为新节点，指纹被 innerHTML 清掉
      expect(dsdRoot.querySelector('#label')).not.toBe(preSpan)
      expect(dsdRoot.querySelector('meta[data-oas-ssr]')).toBeNull()

      el.remove()
    })

    it('无指纹（普通 CSR）：正常 render()，行为与既有组件一致', () => {
      const { dsdRoot } = makeDsdRoot('<span id="label">普通 CSR</span>')
      DsdHydrateFixture.dsdRoot = dsdRoot

      const el = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      document.body.appendChild(el)

      expect(el.renderCount).toBe(1)
      expect(el.hydrateCalls).toBe(0)
      expect(dsdRoot.querySelector('#label')).not.toBeNull()

      el.remove()
    })

    it('指纹匹配但快照被篡改（缺关键节点）：hydrate 结构校验失败回退重建', () => {
      const { dsdRoot, preSpan } = makeDsdRoot(
        '<meta data-oas-ssr="oas-dsd-hydrate" data-oas-ssr-v="1"><div>结构不对</div>',
      )
      DsdHydrateFixture.dsdRoot = dsdRoot

      const el = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      document.body.appendChild(el)

      // hydrate() 被尝试过一次但校验失败 → 回退 render() 全量重建
      expect(el.hydrateCalls).toBe(1)
      expect(el.renderCount).toBe(1)
      expect(dsdRoot.querySelector('#label')).not.toBeNull()
      expect(dsdRoot.querySelector('#label')).not.toBe(preSpan)
      expect(dsdRoot.querySelector('meta[data-oas-ssr]')).toBeNull()

      el.remove()
    })

    it('hydrate 抛异常：回退 render()，正确性优先', () => {
      const { dsdRoot } = makeDsdRoot(
        '<meta data-oas-ssr="oas-dsd-hydrate" data-oas-ssr-v="1"><span id="label"></span>',
      )
      DsdHydrateFixture.dsdRoot = dsdRoot

      const el = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      el.hydrateThrows = true
      document.body.appendChild(el)

      expect(el.hydrateCalls).toBe(1)
      expect(el.renderCount).toBe(1)
      expect(dsdRoot.querySelector('#label')).not.toBeNull()
      expect(dsdRoot.querySelector('meta[data-oas-ssr]')).toBeNull()

      el.remove()
    })

    it('wasHydrated：水合接管成功为 true，普通 CSR 为 false，断开连接复位', () => {
      // 纯 CSR：无 DSD 指纹 → wasHydrated 恒为 false
      const csr = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      document.body.appendChild(csr)
      expect(csr.hydratedNow).toBe(false)
      csr.remove()

      // 指纹匹配 + hydrate 成功 → wasHydrated 为 true（水合场景判定）
      const { dsdRoot } = makeDsdRoot(
        '<meta data-oas-ssr="oas-dsd-hydrate" data-oas-ssr-v="1"><span id="label"></span>',
      )
      DsdHydrateFixture.dsdRoot = dsdRoot
      const el = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      document.body.appendChild(el)
      expect(el.hydrateCalls).toBe(1)
      expect(el.hydratedNow).toBe(true)
      // 断开连接 → 水合状态复位（本次连接语义）
      el.remove()
      expect(el.hydratedNow).toBe(false)
    })

    it('wasHydrated：回退 render（指纹不匹配 / 结构校验失败）时为 false', () => {
      const { dsdRoot } = makeDsdRoot(
        '<meta data-oas-ssr="oas-button" data-oas-ssr-v="1"><span id="label"></span>',
      )
      DsdHydrateFixture.dsdRoot = dsdRoot
      const el = document.createElement('oas-dsd-hydrate') as DsdHydrateFixture
      document.body.appendChild(el)
      expect(el.renderCount).toBe(1)
      expect(el.hydratedNow).toBe(false)
      el.remove()
    })
  })

  afterEach(() => {
    setTranslator(null)
    DsdFixtureElement.dsdRoot = null
    DsdHydrateFixture.dsdRoot = null
  })
})
