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

  constructor() {
    super()
    // DSD（Declarative Shadow DOM）场景：服务端输出 <template shadowrootmode="open"> 后，
    // 浏览器 upgrade 元素时 shadow root 已存在，需复用而非 attachShadow（后者会抛 NotSupportedError）
    this.shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (!this.rendered) {
      this.render()
      this.rendered = true
    }
    this.update()
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
  }

  attributeChangedCallback(): void {
    if (!this.rendered) return
    this.update()
  }

  disconnectedCallback(): void {
    this.unsubscribeLocale?.()
    this.unsubscribeLocale = null
    this.unsubscribeConfig?.()
    this.unsubscribeConfig = null
    for (const fn of this.cleanupFns) fn()
    this.cleanupFns.length = 0
  }

  /** 注册断开连接时执行的清理函数（计时器、全局监听、浮层引用） */
  protected onCleanup(fn: () => void): void {
    this.cleanupFns.push(fn)
  }

  /** 子类实现：首次连接时构建 shadow DOM（整个生命周期只调用一次） */
  protected abstract render(): void

  /** 子类实现：属性/状态变化时增量同步 DOM（默认空实现，纯静态组件可不覆写） */
  protected update(): void {}

  /**
   * 派发组件事件。命名统一 `oas-${name}`。
   */
  protected emit(name: string, detail?: unknown): void {
    this.dispatchEvent(
      new CustomEvent(`oas-${name}`, {
        bubbles: true,
        composed: true,
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
