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
 */
export abstract class OASElement extends HTMLElement {
  /** 子类声明需要观察的属性（kebab-case） */
  static get observedAttributes(): string[] {
    return []
  }

  protected shadow: ShadowRoot

  private rendered = false
  private cleanupFns: Array<() => void> = []

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (!this.rendered) {
      this.render()
      this.rendered = true
    }
    this.update()
  }

  attributeChangedCallback(): void {
    if (!this.rendered) return
    this.update()
  }

  disconnectedCallback(): void {
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

  /** 读取 kebab-case 属性对应的布尔值（存在即 true） */
  protected hasAttr(name: string): boolean {
    return this.hasAttribute(name)
  }

  /** 读取属性值，无则回退 */
  protected getAttr(name: string, fallback = ''): string {
    return this.getAttribute(name) ?? fallback
  }
}
