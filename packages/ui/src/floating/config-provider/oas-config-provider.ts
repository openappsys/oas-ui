import { OASElement, notifyConfigProviders } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
}
`

/**
 * `<oas-config-provider locale size theme>` —— 全局配置注入入口。
 *
 * - locale：包裹子树就近优先（组件 t() 先查最近 config-provider 的 locale 对应翻译器）
 * - size：包裹组件的 size 未显式设置时走注入值（OASElement.injectValue）
 * - theme：设置 data-theme 到自身，子树（含 Shadow DOM）继承对应主题 token
 *
 * 属性变化时通过 notifyConfigProviders() 通知已订阅的包裹组件重刷 update()。
 */
export class OASConfigProvider extends OASElement {
  static override get observedAttributes(): string[] {
    return ['locale', 'size', 'theme']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  protected override update(): void {
    const theme = this.getAttr('theme')
    if (theme) {
      this.dataset.theme = theme
    } else {
      delete this.dataset.theme
    }
    // 通知包裹组件：locale/size/theme 变化时重刷
    notifyConfigProviders(this)
  }
}
