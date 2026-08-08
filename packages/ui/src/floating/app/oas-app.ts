import { OASElement } from '@oas-ui/core'
import { registerAppHost, unregisterAppHost } from './app-host.js'

const STYLE = `
:host {
  display: block;
  position: relative;
}
`

/**
 * `<oas-app>` —— 消息上下文容器。
 *
 * 作为 message / notification / loadingBar 等命令式 API 的宿主：
 * 连接时注册到 app-host 注册表，命令式 API 的消息栈挂到最近的 app 容器内
 * （无 app 容器时仍挂 document.body）。
 *
 * 可与 config-provider 配套：<oas-config-provider><oas-app>...</oas-app></oas-config-provider>
 */
export class OASApp extends OASElement {
  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  override connectedCallback(): void {
    super.connectedCallback()
    registerAppHost(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    unregisterAppHost(this)
  }
}
