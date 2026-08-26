/**
 * OASElement —— 所有组件的基类。
 *
 * 约定：
 * - 每个组件挂载 open Shadow DOM，样式隔离，部件通过 ::part() 暴露
 * - render() 只在首次连接时调用一次，构建 shadow DOM 骨架
 * - 属性变化走 update() 增量同步（class/aria/文本/节点显隐），禁止 innerHTML 整体重建
 * - 对外通信一律派发 oas-* 前缀 CustomEvent（bubbles + composed，可穿出 Shadow DOM）
 * - 属性用 kebab-case，observedAttributes 声明后自动同步
 * - 计时器/全局监听/浮层引用必须经 onCleanup 注册，断开连接时统一清理
 * - 内置文案一律 this.t('xxx.yyy') 走注入的 translator，禁止硬编码；locale 切换自动重刷 update()
 * - 就近读取 config-provider 注入值：injectValue(key, default) / t() 优先查最近 config-provider
 */
import { getTranslator, getLocaleTranslator, onTranslatorChange } from './translator.js'
import { findConfigProvider, subscribeConfigProvider } from './config-context.js'

/**
 * ReactiveController —— 宿主（OASElement）能力注入协议。
 *
 * 能力做成独立 controller 对象：宿主调用其生命周期钩子（hostConnected/hostDisconnected），
 * controller 可在连接时绑定事件/监听、断开时清理。宿主不必知道具体能力实现——
 * 通过 `addController/removeController` 注入，天然支持「能力级按需」（能力模块独立可切）。
 */
export interface ReactiveController {
  /** 宿主完成首渲染并连接时调用（生命周期接入 connectedCallback 末尾） */
  hostConnected?(): void
  /** 宿主断开连接时调用（进入 disconnectedCallback 清理后） */
  hostDisconnected?(): void
  /** 宿主 update 前调用（基类触发的 update 流程） */
  hostUpdate?(): void
  /** 宿主 update 后调用（基类触发的 update 流程） */
  hostUpdated?(): void
}

export abstract class OASElement extends HTMLElement {
  /** 子类声明需要观察的属性（kebab-case） */
  static get observedAttributes(): string[] {
    return []
  }

  protected shadow: ShadowRoot

  private rendered = false
  private cleanupFns: Array<() => void> = []
  private unsubscribeLocale: (() => void) | null = null
  private unsubscribeConfig: (() => void) | null = null
  /** 本次连接是否为 DSD 真水合接管（tryHydrate 成功后置 true，断开连接时复位） */
  private hydrated = false
  /** 注入的能力 controllers（ReactiveController，hostConnected/hostDisconnected 生命周期接入） */
  private controllers: ReactiveController[] = []

  constructor() {
    super()
    // DSD（Declarative Shadow DOM）场景：服务端输出 <template shadowrootmode="open"> 后，
    // 浏览器 upgrade 元素时 shadow root 已存在，需复用而非 attachShadow（后者会抛 NotSupportedError）
    this.shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (!this.rendered) {
      // 真水合优先：DSD 快照指纹命中且子类 hydrate() 接管成功则跳过 render() 重建，
      // 否则回退 render() 全量重建（正确性优先）
      if (!this.tryHydrate()) {
        this.render()
      }
      this.rendered = true
    }
    this.runUpdateAndNotify()
    // locale 切换（translator 变化）时自动重刷文案，断开连接时取消订阅
    if (!this.unsubscribeLocale) {
      this.unsubscribeLocale = onTranslatorChange(() => this.update())
    }
    // 订阅最近的 config-provider：注入值变化时重刷自身
    if (!this.unsubscribeConfig) {
      const provider = findConfigProvider(this)
      if (provider) {
        this.unsubscribeConfig = subscribeConfigProvider(provider, () => this.update())
      }
    }
    // 能力控制器：宿主连接完成后依次通知（render/update 已就绪，controller 可访问 DOM）
    for (const c of this.controllers) c.hostConnected?.()
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    void name
    void oldValue
    void newValue
    if (!this.rendered) return
    this.runUpdateAndNotify()
  }

  /** 触发 update 并通知能力控制器（hostUpdate → update() → hostUpdated）。基类触发的更新走此路径 */
  protected runUpdateAndNotify(): void {
    for (const c of this.controllers) c.hostUpdate?.()
    this.update()
    for (const c of this.controllers) c.hostUpdated?.()
  }

  /** 是否已完成首次 render（供子类在 attributeChangedCallback 等钩子中判断） */
  protected get hasRendered(): boolean {
    return this.rendered
  }

  disconnectedCallback(): void {
    this.unsubscribeLocale?.()
    this.unsubscribeLocale = null
    this.unsubscribeConfig?.()
    this.unsubscribeConfig = null
    this.hydrated = false
    for (const fn of this.cleanupFns) fn()
    this.cleanupFns.length = 0
    for (const c of this.controllers) c.hostDisconnected?.()
  }

  /** 注册断开连接时执行的清理函数（计时器、全局监听、浮层引用） */
  protected onCleanup(fn: () => void): void {
    this.cleanupFns.push(fn)
  }

  /** 注入一个能力控制器；宿主已连接时立即调 hostConnected，断开时自动调 hostDisconnected */
  addController(controller: ReactiveController): void {
    if (this.controllers.includes(controller)) return
    this.controllers.push(controller)
    if (this.rendered && this.isConnected) controller.hostConnected?.()
  }

  /** 移除能力控制器，并调 hostDisconnected（之后宿主生命周期不再回调它） */
  removeController(controller: ReactiveController): void {
    const idx = this.controllers.indexOf(controller)
    if (idx < 0) return
    this.controllers.splice(idx, 1)
    controller.hostDisconnected?.()
  }

  /** 子类实现：首次连接时构建 shadow DOM（整个生命周期只调用一次） */
  protected abstract render(): void

  /**
   * 子类可选水合钩子：校验 SSR（DSD）快照结构符合预期，并接管交互
   * （缓存节点引用 + 绑定事件，与 render() 后半段等价）。
   *
   * 返回 true 表示接管成功、跳过 render() 的 shadow 重建（真水合）；
   * 返回 false 或抛异常则回退 render() 全量重建。默认返回 false（不支持水合）。
   */
  protected hydrate(): boolean {
    return false
  }

  /**
   * 尝试 DSD 真水合。判定依据：shadow 内存在 SSR 指纹 `meta[data-oas-ssr]`，
   * 且其值与自身 tag（小写）一致 → 视为有效快照，交由子类 hydrate() 接管。
   *
   * 误判防御：指纹缺失/不匹配、hydrate() 返回 false 或抛异常，一律回退 false，
   * 由调用方走 render() 重建。指纹 meta 仅在水合成功后移除（防止二次误判）；
   * 回退 render() 时 innerHTML 重建会自然清掉指纹。
   */
  private tryHydrate(): boolean {
    const meta = this.shadow.querySelector('meta[data-oas-ssr]')
    if (!meta) return false
    if (meta.getAttribute('data-oas-ssr') !== this.tagName.toLowerCase()) return false

    let ok = false
    try {
      ok = this.hydrate()
    } catch {
      ok = false
    }
    if (ok) {
      this.hydrated = true
      meta.remove()
    }
    return ok
  }

  /**
   * 本次连接是否为 DSD 真水合接管。
   *
   * 供子类 update() 查询"本次连接是否是水合场景"：水合接管成功后（hydrate() 返回 true）
   * 返回 true，断开连接时复位。纯 CSR（无 DSD 快照指纹或回退 render()）始终返回 false。
   *
   * 用途：测量组件（affix/ellipsis/scroll-area 等）在 update() 里同步测量并立即写布局态，
   * SSR 快照无法预知这些运行时状态；水合首帧若照常同步写入会产生与快照的差异帧（闪动），
   * 子类可在 wasHydrated() 时把布局相关写入延迟到首帧后（requestAnimationFrame）。
   */
  protected wasHydrated(): boolean {
    return this.hydrated
  }

  /** 子类实现：属性/状态变化时增量同步 DOM（默认空实现，纯静态组件可不覆写） */
  protected update(): void {}

  /**
   * 派发组件事件。命名统一 `oas-${name}`。
   * @param options.cancelable 置 true 时事件可被 preventDefault；返回 dispatchEvent 结果
   *   （false 表示被宿主 preventDefault），供组件实现「切换前拦截」类 veto 语义
   */
  protected emit(name: string, detail?: unknown, options?: { cancelable?: boolean }): boolean {
    return this.dispatchEvent(
      new CustomEvent(`oas-${name}`, {
        bubbles: true,
        composed: true,
        cancelable: options?.cancelable ?? false,
        detail,
      }),
    )
  }

  /**
   * 读取 kebab-case 属性对应的布尔值（存在即 true）
   */
  protected hasAttr(name: string): boolean {
    return this.hasAttribute(name)
  }

  /** 读取属性值，无则回退 */
  protected getAttr(name: string, fallback = ''): string {
    return this.getAttribute(name) ?? fallback
  }

  /**
   * 就近读取注入值（config-provider 机制）。
   *
   * 读取顺序：自身属性 > 最近 config-provider 属性 > 全局默认值。
   * 沿 DOM 祖先链找最近的 <oas-config-provider>，读取其同名属性；
   * 自身属性优先（自身显式设置了就不读注入值），无注入则回退 defaultValue。
   */
  protected injectValue(key: string, defaultValue: string): string {
    const own = this.getAttribute(key)
    if (own != null && own !== '') return own
    const provider = findConfigProvider(this)
    const injected = provider?.getAttribute(key)
    if (injected != null && injected !== '') return injected
    return defaultValue
  }

  /**
   * 就近读取注入的 locale（config-provider 机制），无注入返回 null。
   * 仅用于 t() 内部按 locale 选择翻译器，不暴露给子类（子类用 t() 即可）。
   */
  private injectLocale(): string | null {
    const provider = findConfigProvider(this)
    const locale = provider?.getAttribute('locale')
    return locale != null && locale !== '' ? locale : null
  }

  /**
   * 翻译内置文案。委托给注入的 translator（@oas-ui/i18n 在 setLocale 时注入），
   * 未注入时回退返回 key 本身。
   *
   * 优先就近读取 config-provider 注入的 locale：若存在且该 locale 已注册
   * （config-provider 设置了 locale 时），用它的翻译器；否则用全局 translator。
   */
  protected t(key: string, params?: Record<string, string | number>): string {
    const locale = this.injectLocale()
    if (locale) {
      const localTranslator = getLocaleTranslator(locale)
      if (localTranslator) return localTranslator(key, params)
    }
    return getTranslator()?.(key, params) ?? key
  }
}
