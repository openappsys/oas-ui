import { notifyConfigProviders } from '@oas-ui/core/config-context'
import { OASElement } from '@oas-ui/core/oas-element'
import { devWarn } from '../../shared/dev-warn.js'
import { isSsrRuntime } from '../../shared/ssr-runtime.js'

const STYLE = `
:host {
  display: block;
}
:host([hidden]) {
  display: none;
}
`

const warnedDirection = new Set<string>()
const warnedZIndex = new Set<string>()
const warnedConfig = new Set<string>()

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'
type StoredTheme = 'light' | 'dark' | 'system'

/** 存储协议仅接受 { theme: 'light' | 'dark' | 'system' }；坏 JSON/其他形态一律视为无偏好。 */
function parseStoredTheme(raw: string | null): StoredTheme | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
    const theme = (value as { theme?: unknown }).theme
    return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : null
  } catch {
    return null
  }
}

/**
 * `<oas-config-provider locale size theme theme-storage-key config direction z-index disabled>` —— 全局配置注入入口。
 *
 * - locale：包裹子树就近优先（组件 t() 先查最近 config-provider 的 locale 对应翻译器）
 * - size：包裹组件的 size 未显式设置时走注入值（OASElement.injectValue）
 * - theme：请求主题；system 解析实际 light/dark 并监听系统变化，effective 写入 data-theme，
 *   子树（含 Shadow DOM）继承 token；缺失/空值保持继承，显式主题名不变
 * - theme-storage-key：可选显式偏好存储（light/dark/system JSON），仅 system 首次连接/换 key 恢复；
 *   重选 system 覆盖旧偏好，异常安全降级；SSR 不读 storage、不挂 MQL/storage 监听
 * - config：组件级默认配置 JSON 通道（`{"oas-button":{"variant":"outlined"}}`），
 *   组件经 core `readConfigValue(el, tag, key)` 就近读取；顶层键 `disabledExempt`（tag 数组）
 *   用于整类豁免全局禁用；非法 JSON 忽略 + dev 告警（同值去重）
 * - direction：全局方向注入（ltr/rtl），设置时写入宿主 `dir` 属性（CSS direction
 *   继承穿透 light/shadow 子树）；组件经 CSS/`dir` 感知方向（无 injectValue 消费点）；非法值回落 ltr + dev 告警
 * - z-index：浮层全局起始值，设置时在宿主写 `--oas-z-index-base`（CSS 变量穿透 shadow，
 *   浮层组件 `calc(var(--oas-z-index-base, 0) + var(--oas-z-X, <层默认值>))` 消费——
 *   各层在起始值上按层默认值偏移叠加，层间顺序保持）；非法值（非正整数）忽略 + dev 告警
 * - disabled：全局禁用注入——子树内表单族控件（button/input/select/checkbox 等已接入
 *   `injectDisabled()` 的组件）无显式 disabled 属性时继承禁用；组件级逃逸用 `disabled-skip`
 *   属性，整类逃逸用 config JSON 的 `disabledExempt`（如 `{"disabledExempt":["oas-link"]}`）
 *
 * 属性变化时通过 notifyConfigProviders() 通知已订阅的包裹组件重刷 update()。
 */
export class OASConfigProvider extends OASElement {
  static override get observedAttributes(): string[] {
    return ['locale', 'size', 'theme', 'theme-storage-key', 'config', 'direction', 'z-index', 'disabled']
  }

  private systemMedia: MediaQueryList | null = null
  private listeningStorageKey: string | null = null
  private restoredTheme: StoredTheme | null = null
  private themeConnectionInitialized = false
  private explicitThemeWritePending = false
  private lastStorageKey = ''

  private readonly onSystemThemeChange = (): void => {
    this.requestUpdate()
  }

  private readonly onStoredThemeChange = (event: StorageEvent): void => {
    const key = this.getAttr('theme-storage-key')
    if (!key || (event.key !== key && event.key !== null) || this.getAttr('theme') !== 'system') return
    try {
      // 同键 sessionStorage 与 sessionStorage.clear 不得清除/覆盖 localStorage 恢复偏好。
      if (event.storageArea !== window.localStorage) return
    } catch {
      return
    }
    this.restoredTheme = parseStoredTheme(event.newValue)
    this.requestUpdate()
  }

  override disconnectedCallback(): void {
    // 基类每次断连都会清空 cleanupFns；主题清理必须在每个连接周期直接执行，不能只注册一次。
    this.cleanupTheme()
    super.disconnectedCallback()
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    // 初次连接前的 attribute 写入只声明 SSR/CSR 初值；连接后的每次 theme 写入（含同值 system）
    // 都是宿主显式选择，允许清掉首次恢复的旧存储覆盖。
    if (name === 'theme' && this.hasRendered) this.explicitThemeWritePending = true
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板（上下文注入容器，无自身视觉，仅包裹子树） */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <slot></slot>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
  }

  /** 真水合：slot 骨架存在即接管（无事件绑定，update 处理 data-theme/dir/--oas-z-index-base 与通知） */
  protected override hydrate(): boolean {
    return this.shadow.querySelector('slot') !== null
  }

  /**
   * requested（theme attribute）与 effective（data-theme）分离：
   * 首次连接/换 key 时才恢复存储；之后每次 theme 写入都是显式偏好，重选 system 会覆盖旧值。
   */
  private updateTheme(): void {
    const requested = this.getAttr('theme')
    const storageKey = this.getAttr('theme-storage-key')
    const firstConnection = !this.themeConnectionInitialized
    const storageKeyChanged = this.themeConnectionInitialized && storageKey !== this.lastStorageKey

    if (this.explicitThemeWritePending) {
      this.restoredTheme = null
      this.writeStoredTheme(storageKey, requested)
    } else if (firstConnection || storageKeyChanged) {
      this.restoredTheme = requested === 'system' ? this.readStoredTheme(storageKey) : null
    }
    this.explicitThemeWritePending = false
    this.themeConnectionInitialized = true
    this.lastStorageKey = storageKey

    let effective = requested
    if (requested === 'system') {
      effective =
        this.restoredTheme === 'light' || this.restoredTheme === 'dark'
          ? this.restoredTheme
          : this.systemPrefersDark()
            ? 'dark'
            : 'light'
    }
    if (effective) this.dataset.theme = effective
    else delete this.dataset.theme

    this.syncThemeListeners(requested, storageKey)
  }

  private systemPrefersDark(): boolean {
    if (isSsrRuntime() || typeof window.matchMedia !== 'function') return false
    try {
      return window.matchMedia(SYSTEM_THEME_QUERY).matches
    } catch {
      return false
    }
  }

  private readStoredTheme(key: string): StoredTheme | null {
    if (!key || isSsrRuntime()) return null
    try {
      return parseStoredTheme(window.localStorage.getItem(key))
    } catch {
      return null
    }
  }

  private writeStoredTheme(key: string, theme: string): void {
    if (!key || isSsrRuntime() || (theme !== 'light' && theme !== 'dark' && theme !== 'system')) return
    try {
      window.localStorage.setItem(key, JSON.stringify({ theme }))
    } catch {
      // 隐私模式/配额/安全策略异常只放弃持久化，不阻塞当前主题切换。
    }
  }

  private syncThemeListeners(requested: string, storageKey: string): void {
    if (isSsrRuntime() || !this.isConnected) {
      this.unbindSystemMedia()
      this.unbindStorage()
      return
    }

    const followsSystem = requested === 'system' && this.restoredTheme !== 'light' && this.restoredTheme !== 'dark'
    if (followsSystem && !this.systemMedia && typeof window.matchMedia === 'function') {
      try {
        const media = window.matchMedia(SYSTEM_THEME_QUERY)
        media.addEventListener('change', this.onSystemThemeChange)
        this.systemMedia = media
      } catch {
        this.systemMedia = null
      }
    } else if (!followsSystem) {
      this.unbindSystemMedia()
    }

    if (requested === 'system' && storageKey && this.listeningStorageKey !== storageKey) {
      this.unbindStorage()
      window.addEventListener('storage', this.onStoredThemeChange)
      this.listeningStorageKey = storageKey
    } else if ((requested !== 'system' || !storageKey) && this.listeningStorageKey) {
      this.unbindStorage()
    }
  }

  private cleanupTheme(): void {
    this.unbindSystemMedia()
    this.unbindStorage()
    this.themeConnectionInitialized = false
    this.lastStorageKey = ''
    this.restoredTheme = null
  }

  private unbindSystemMedia(): void {
    if (!this.systemMedia) return
    this.systemMedia.removeEventListener('change', this.onSystemThemeChange)
    this.systemMedia = null
  }

  private unbindStorage(): void {
    if (!this.listeningStorageKey) return
    window.removeEventListener('storage', this.onStoredThemeChange)
    this.listeningStorageKey = null
  }

  protected override update(): void {
    this.updateTheme()

    // direction：合法值写入宿主 dir 属性；非法值回落 ltr + dev 告警（同值去重）；
    // 空值（属性移除）删除 dir，交还祖先/文档方向
    const direction = this.getAttr('direction', '')
    if (direction === 'rtl' || direction === 'ltr') {
      this.setAttribute('dir', direction)
    } else if (direction !== '') {
      this.setAttribute('dir', 'ltr')
      if (!warnedDirection.has(direction)) {
        warnedDirection.add(direction)
        devWarn(`[oas-config-provider] 非法 direction "${direction}"，已回落 ltr；合法值：ltr/rtl`)
      }
    } else {
      this.removeAttribute('dir')
    }

    // z-index：合法正整数写 --oas-z-index-base（浮层起始值）；非法值忽略（不写入） + dev 告警（同值去重）
    const z = this.getAttr('z-index', '')
    if (z !== '') {
      const n = Number(z)
      if (Number.isInteger(n) && n > 0) {
        this.style.setProperty('--oas-z-index-base', String(n))
      } else {
        this.style.removeProperty('--oas-z-index-base')
        if (!warnedZIndex.has(z)) {
          warnedZIndex.add(z)
          devWarn(`[oas-config-provider] 非法 z-index "${z}"，已忽略；合法值：正整数`)
        }
      }
    } else {
      this.style.removeProperty('--oas-z-index-base')
    }

    // config：非法 JSON / 非对象忽略 + dev 告警（同值去重）；合法值由 core readConfigValue 读取
    const config = this.getAttr('config', '')
    if (config !== '') {
      try {
        const v = JSON.parse(config) as unknown
        if (v === null || typeof v !== 'object' || Array.isArray(v)) {
          throw new Error('config 需为 JSON 对象')
        }
      } catch {
        if (!warnedConfig.has(config)) {
          warnedConfig.add(config)
          devWarn(`[oas-config-provider] 非法 config JSON，已忽略：${config}`)
        }
      }
    }

    // 通知包裹组件：locale/size/theme/config/direction/z-index 变化时重刷
    notifyConfigProviders(this)
  }
}
