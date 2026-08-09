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
`

/**
 * oas-container —— 定宽居中容器。
 *
 * 属性（kebab-case）：
 * - `size`：xs/sm/md/lg/xl/full，默认 lg，映射 `--oas-container-*` 宽度 token
 * - `center`：默认 true，`center="false"` 时取消居中（margin-inline: 0）
 * - `padding`：内边距 token/值，作用于 padding-inline
 *
 * 边界：无子元素不报错；max-width: min(100%, token) 保证最小 0、不溢出视口。
 */
export class OASContainer extends OASElement {
  static override get observedAttributes(): string[] {
    return ['size', 'center', 'padding']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div part="root"><slot></slot></div>
    `
    this.update()
  }

  protected override update(): void {
    const size = this.getAttr('size', 'lg').toLowerCase()
    const normalized = SIZE_TOKENS[size] ? size : 'lg'
    this.dataset.size = normalized
    this.style.setProperty('--oas-container-max', SIZE_TOKENS[normalized] ?? SIZE_TOKENS.lg!)
    // center 默认 true；仅 center="false" 关闭居中
    this.dataset.center = String(this.getAttr('center', 'true') !== 'false')
    const padding = this.getAttr('padding')
    if (padding) this.style.setProperty('--oas-container-padding', padding)
    else this.style.removeProperty('--oas-container-padding')
  }
}
