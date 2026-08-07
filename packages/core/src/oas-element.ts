/**
 * OASElement —— 所有组件的基类。
 *
 * 约定：
 * - 每个组件挂载 open Shadow DOM，样式隔离，部件通过 ::part() 暴露
 * - 对外通信一律派发 oas-* 前缀 CustomEvent（bubbles + composed，可穿出 Shadow DOM）
 * - 属性用 kebab-case，observedAttributes 声明后自动同步
 */
export abstract class OASElement extends HTMLElement {
  /** 子类声明需要观察的属性（kebab-case） */
  static get observedAttributes(): string[] {
    return []
  }

  protected shadow: ShadowRoot

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.render()
  }

  attributeChangedCallback(): void {
    this.render()
  }

  /** 子类实现：产出 shadow 内部 DOM */
  protected abstract render(): void

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
