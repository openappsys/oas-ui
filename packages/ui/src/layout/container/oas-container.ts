import { OASElement } from '@oas-ui/core'

/**
 * size → `--oas-container-*` 宽度 token 映射。
 * 合法值：xs / sm / md / lg / xl / full；非法按默认 lg 处理。
 */
const SIZE_TOKENS: Record<string, string> = {
  xs: 'var(--oas-container-xs)',
  sm: 'var(--oas-container-sm)',
  md: 'var(--oas-container-md)',
  lg: 'var(--oas-container-lg)',
  xl: 'var(--oas-container-xl)',
  full: 'var(--oas-container-full)',
}

const STYLE = `
:host {
  display: block;
  box-sizing: border-box;
  width: 100%;
  /* 定宽 + 不溢出视口：min(100%, size token) */
  max-width: min(100%, var(--oas-container-max, var(--oas-container-lg, 992px)));
  /* 逻辑属性居中，RTL 自动合规 */
  margin-inline: auto;
  padding-inline: var(--oas-container-padding, 0);
  font-family: inherit;
}
:host([data-center='false']) {
  margin-inline: 0;
}
/* fluid：完全不挂限宽（纯流体 100%），size 的限宽失效；窄屏保护由 width:100% 天然覆盖 */
:host([fluid]) {
  max-width: none;
}
/* breakout：slot 内带 breakout 属性的子元素突破定宽撑满视口宽。
   经典突破公式：width: 100vw + margin-inline: calc(50% - 50vw)。
   50% 相对容器内容盒：容器居中时内容盒中心 = 视口中心，左缘 = 中心 - 50vw = 0，
   恰贴视口左缘（RTL 下 margin-inline 对称值同样成立；容器 padding 不影响突破）。
   注意：100vw 含纵向滚动条宽度，页面出现滚动条时 breakout 元素会横向溢出，
   需在页面顶层包裹层配 overflow-x: clip（或 overflow-x: hidden）抑制。 */
::slotted([breakout]) {
  width: 100vw;
  margin-inline: calc(50% - 50vw);
}
:host([hidden]) {
  display: none;
}
`

/**
 * oas-container —— 定宽居中容器。
 *
 * 属性（kebab-case）：
 * - `size`：xs/sm/md/lg/xl/full，默认 lg，映射 `--oas-container-*` 宽度 token
 * - `center`：默认 true，`center="false"` 时取消居中（margin-inline: 0）
 * - `padding`：内边距 token/值，作用于 padding-inline
 * - `fluid`：布尔，完全不挂 max-width（纯流体 100%）；与 `size` 正交，存在时 size 限宽失效
 * - `breakout`：非容器属性，作用于 slot 内子元素——子元素带 `breakout` 属性即突破定宽
 *   撑满视口宽（纯 CSS `::slotted([breakout])`，见 STYLE 注释）
 *
 * 边界：无子元素不报错；max-width: min(100%, token) 保证最小 0、不溢出视口。
 */
export class OASContainer extends OASElement {
  static override get observedAttributes(): string[] {
    return ['size', 'center', 'padding', 'fluid']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div part="root"><slot></slot></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；container 无事件绑定） */
  private bind(): void {}

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（root 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="root"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // fluid 与 size 正交：fluid 存在时不挂限宽（STYLE :host([fluid]) 关掉 max-width）
    const fluid = this.hasAttr('fluid')
    this.dataset.fluid = String(fluid)
    if (fluid) {
      this.style.removeProperty('--oas-container-max')
    } else {
      const size = this.getAttr('size', 'lg').toLowerCase()
      const normalized = SIZE_TOKENS[size] ? size : 'lg'
      this.dataset.size = normalized
      this.style.setProperty('--oas-container-max', SIZE_TOKENS[normalized] ?? SIZE_TOKENS.lg!)
    }
    // center 默认 true；仅 center="false" 关闭居中
    this.dataset.center = String(this.getAttr('center', 'true') !== 'false')
    const padding = this.getAttr('padding')
    if (padding) this.style.setProperty('--oas-container-padding', padding)
    else this.style.removeProperty('--oas-container-padding')
  }
}
