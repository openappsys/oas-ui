import { OASElement, findConfigProvider } from '@oas-ui/core'
import { getLocaleName } from '@oas-ui/i18n/registry'
import {
  formatRelativeTime,
  parseTimestamp,
  resolveNumeric,
  resolveRelativeLocale,
  selectRelativeUnit,
} from './relative-time.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-secondary);
}
:host([hidden]) {
  display: none;
}
[part='time'] {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
[part='time'][hidden] {
  display: none;
}
`

/**
 * 相对时间展示组件：把 epoch 毫秒 / ISO 8601 / Date 渲染为本地化相对时间。
 *
 * - 语义：shadow 内 `<time part="time">`，有效值时 `datetime` 为 UTC ISO 8601
 * - 空态：非法/缺失值清空文本、移除 `datetime`、隐藏节点，不显示 raw key / NaN
 * - locale：显式 `locale` → config-provider → 全局 i18n → en-US（非法值安全回落）
 * - auto-refresh：可选定时刷新；页面隐藏暂停、恢复可见立即重算；断开清理、重连恢复
 * - SSR：未开启 auto-refresh 时渲染路径不访问任何浏览器全局
 */
export class OASRelativeTime extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'locale', 'numeric', 'auto-refresh']
  }

  private timer: ReturnType<typeof setTimeout> | null = null
  /** visibilitychange 是否已挂载（断开清理后复位，重连/开启 auto-refresh 时重挂） */
  private visibilityBound = false

  /** 定时刷新 tick：先清句柄再重算（重算内部会按新单位重排下一次） */
  private readonly onTick = (): void => {
    this.timer = null
    this.renderTime()
  }

  /** 页面可见性变化：隐藏即停表；恢复可见立即重算并续排 */
  private readonly onVisibilityChange = (): void => {
    if (this.isDocumentHidden()) {
      this.clearTimer()
      return
    }
    this.renderTime()
  }

  /** 纯函数模板：SSR 快照与客户端 render 共用同一结构 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <time part="time" aria-live="off"></time>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 time 结构后接管（不重建 shadow），update 随即按当前时钟重算 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="time"]')) return false
    this.bind()
    return true
  }

  /** 断开重连：cleanup 已在断开时执行完，这里重新登记并在 update 中重挂监听/定时器 */
  protected override onReconnect(): void {
    this.bind()
  }

  /** 首次渲染与水合共用：登记清理、按需挂 visibilitychange */
  private bind(): void {
    this.onCleanup(() => this.teardown())
    this.syncVisibilityBinding()
  }

  /**
   * value property 通道：接受 string / number / Date / null。
   * Date 规范化为 ISO attribute（SSR/attribute 通道同源）；null 移除属性走空态。
   * getter 返回当前 attribute 原文（string），便于宿主读回。
   */
  get value(): string {
    return this.getAttribute('value') ?? ''
  }

  /** locale property 通道：与 attribute 同源，读取返回 attribute 原文 */
  get locale(): string {
    return this.getAttribute('locale') ?? ''
  }

  /** @apiProperty 相对时间 locale：写入回写 attribute，`null` 移除属性（回落 provider → 全局 i18n → en-US） */
  set locale(input: string | null) {
    if (input == null) {
      this.removeAttribute('locale')
      return
    }
    this.setAttribute('locale', String(input))
  }

  /** @apiProperty 目标时刻：`number` 为 epoch 毫秒、`Date` 自动写回 ISO attribute、`null` 清空 */
  set value(input: string | number | Date | null) {
    if (input == null) {
      this.removeAttribute('value')
      return
    }
    if (input instanceof Date) {
      const ms = parseTimestamp(input)
      this.setAttribute('value', ms == null ? '' : new Date(ms).toISOString())
      return
    }
    this.setAttribute('value', String(input))
  }

  protected override update(): void {
    this.syncVisibilityBinding()
    this.renderTime()
  }

  /** auto-refresh 布尔语义：在场且不是 "false" 为开启（缺省关闭） */
  private autoRefreshEnabled(): boolean {
    if (!this.hasAttr('auto-refresh')) return false
    return this.getAttr('auto-refresh', '').trim().toLowerCase() !== 'false'
  }

  /** numeric 只认 auto / always；非法按 auto（默认） */
  private numericMode(): 'auto' | 'always' {
    return resolveNumeric(this.getAttr('numeric', 'auto'))
  }

  /** locale 候选链：显式 → 最近 config-provider → 全局 i18n → en-US */
  private effectiveLocale(): string {
    const provider = findConfigProvider(this)?.getAttribute('locale')
    // 显式标注 string：attr 与 property 同名时 api 扫描默认跳过类型推断，这里补回 attribute 类型
    const explicit = this.getAttr('locale') as string
    return resolveRelativeLocale([explicit, provider, getLocaleName()], 'en-US')
  }

  /** 渲染相对时间与机器可读 datetime；空态清定时器 */
  private renderTime(): void {
    const time = this.shadow.querySelector<HTMLTimeElement>('[part="time"]')
    if (!time) return
    // 显式标注 string：attr 与 property 同名时 api 扫描默认跳过类型推断，这里补回 attribute 类型
    const timestamp = parseTimestamp(this.getAttr('value', '') as string)
    const text =
      timestamp == null ? null : formatRelativeTime(timestamp - Date.now(), this.effectiveLocale(), this.numericMode())
    if (timestamp == null || text == null) {
      time.textContent = ''
      time.removeAttribute('datetime')
      time.hidden = true
      this.clearTimer()
      return
    }
    time.textContent = text
    time.dateTime = new Date(timestamp).toISOString()
    time.hidden = false
    this.schedule(timestamp)
  }

  /**
   * 按当前单位节流：秒级 1s，其余 30s（分钟/小时/天/月/年显示不会在 1s 内变化）。
   * 未开启 auto-refresh、未连接或页面隐藏时不排定时器。
   */
  private schedule(timestamp: number): void {
    this.clearTimer()
    if (!this.autoRefreshEnabled() || !this.isConnected || this.isDocumentHidden()) return
    const { unit } = selectRelativeUnit(timestamp - Date.now())
    this.timer = setTimeout(this.onTick, unit === 'second' ? 1000 : 30_000)
  }

  private clearTimer(): void {
    if (this.timer === null) return
    clearTimeout(this.timer)
    this.timer = null
  }

  private syncVisibilityBinding(): void {
    if (!this.autoRefreshEnabled()) {
      this.unbindVisibility()
      return
    }
    // 已渲染但未连接（摘除后改属性）不挂监听：重连时 onReconnect → bind() 统一重挂，
    // 避免给已摘除的实例挂 document 级监听、断开清理白做一轮。
    if (!this.isConnected) return
    if (this.visibilityBound) return
    this.ownerDocument.addEventListener('visibilitychange', this.onVisibilityChange)
    this.visibilityBound = true
  }

  private unbindVisibility(): void {
    if (!this.visibilityBound) return
    this.ownerDocument.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.visibilityBound = false
  }

  private teardown(): void {
    this.clearTimer()
    this.unbindVisibility()
  }

  private isDocumentHidden(): boolean {
    return this.ownerDocument.hidden === true
  }
}
