import { OASElement } from '@oas-ui/core'
import { registerAppHost, unregisterAppHost, type AppHostConfig } from './app-host.js'

const STYLE = `
:host {
  display: block;
  position: relative;
}
`

/** message 命令式 API 现有 options 中可作为全局默认的键（duration；group/key 是运行时标识、onClose 是函数，JSON 无法表达默认，不纳入） */
const MESSAGE_CONFIG_KEYS = new Set(['duration'])
/** notification 命令式 API 现有 options 中可作为全局默认的键（title/description 是内容，不纳入） */
const NOTIFICATION_CONFIG_KEYS = new Set(['duration', 'showProgress', 'progressPosition', 'scrollable'])
/** toast 命令式 API 现有 options 中可作为全局默认的键（title/description/action 是内容、id/onClose/container 是运行时，不纳入） */
const TOAST_CONFIG_KEYS = new Set([
  'duration',
  'position',
  'closable',
  'priority',
  'max',
  'politeness',
  'variant',
  'showProgress',
  'progressRing',
  'swipeDirection',
  'grouping',
  'stacked',
  'pauseOnHover',
  'pauseOnFocus',
  'pauseOnWindowBlur',
])

const warnedMessage = new Set<string>()
const warnedNotification = new Set<string>()
const warnedToast = new Set<string>()

/**
 * `<oas-app message notification toast>` —— 消息上下文容器。
 *
 * 作为 message / notification / toast / loadingBar 等命令式 API 的宿主：
 * 连接时注册到 app-host 注册表，命令式 API 的消息栈挂到最近的 app 容器内
 * （无 app 容器时仍挂 document.body）。
 *
 * - `message` / `notification` / `toast`：命令式 API 全局默认配置（JSON）。
 *   命令式函数读取最近 app 的对应配置与调用参数合并，调用参数优先；
 *   键集对齐现有 options 已有键（只支持已有键，不新造）；
 *   非法 JSON / 非对象忽略 + dev 告警（同值去重）。
 *
 * 可与 config-provider 配套：<oas-config-provider><oas-app>...</oas-app></oas-config-provider>
 */
export class OASApp extends OASElement {
  static override get observedAttributes(): string[] {
    return ['message', 'notification', 'toast']
  }

  private messageConfig: Record<string, unknown> | null = null
  private notificationConfig: Record<string, unknown> | null = null
  private toastConfig: Record<string, unknown> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板（消息宿主容器，无自身视觉，仅包裹子树） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
  }

  /** 真水合：slot 骨架存在即接管（宿主注册走 update，与 shadow 无关） */
  protected override hydrate(): boolean {
    return this.shadow.querySelector('slot') !== null
  }

  override connectedCallback(): void {
    super.connectedCallback()
    // update() 已在 super.connectedCallback 内执行（解析 + 注册），此处幂等重注册兜底
    registerAppHost(this, this.appConfig())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    unregisterAppHost(this)
  }

  protected override update(): void {
    // 解析 message/notification/toast 全局默认配置（非法 JSON 告警已内置），配置变化时重注册保持最新
    this.messageConfig = this.parseConfig('message', MESSAGE_CONFIG_KEYS, warnedMessage)
    this.notificationConfig = this.parseConfig(
      'notification',
      NOTIFICATION_CONFIG_KEYS,
      warnedNotification,
    )
    this.toastConfig = this.parseConfig('toast', TOAST_CONFIG_KEYS, warnedToast)
    registerAppHost(this, this.appConfig())
  }

  private appConfig(): AppHostConfig {
    return {
      message: this.messageConfig,
      notification: this.notificationConfig,
      toast: this.toastConfig,
    }
  }

  /**
   * 解析 app 配置 JSON：只拾取现有 options 白名单键（不新造）；
   * 非法 JSON / 非 JSON 对象忽略 + dev 告警（同值去重）；属性为空返回 null。
   */
  private parseConfig(
    attr: string,
    keys: Set<string>,
    warned: Set<string>,
  ): Record<string, unknown> | null {
    const raw = this.getAttr(attr, '').trim()
    if (raw === '') return null
    let obj: unknown
    try {
      obj = JSON.parse(raw)
    } catch {
      if (!warned.has(raw)) {
        warned.add(raw)
        console.warn(`[oas-app] 非法 ${attr} JSON，已忽略：${raw}`)
      }
      return null
    }
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
      if (!warned.has(raw)) {
        warned.add(raw)
        console.warn(`[oas-app] 非法 ${attr} 配置（需 JSON 对象），已忽略：${raw}`)
      }
      return null
    }
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (keys.has(k)) out[k] = v
    }
    return out
  }
}
