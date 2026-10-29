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
import {
  findConfigProvider,
  subscribeConfigProvider,
  injectDisabled as resolveInjectedDisabled,
  readConfigValue,
} from './config-context.js'

/** SSR（DSD）快照格式版本：`@oas-ui/ssr` 写入 `data-oas-ssr-v`，`tryHydrate()` 严格相等校验（缺失/不等回退 render）。
 *  快照语义变更时递增，并同步 `packages/ssr/src/index.ts`（`src/index.test.ts` 有相等断言）。 */
export const SSR_SNAPSHOT_VERSION = '1'

/**
 * ReactiveController —— 宿主（OASElement）能力注入协议。
 *
 * 能力做成独立 controller 对象：宿主调用其生命周期钩子（hostConnected/hostDisconnected），
 * controller 可在连接时绑定事件/监听、断开时清理。宿主不必知道具体能力实现——
 * 通过 `addController/removeController` 注入，天然支持「能力级按需」（能力模块独立可切）。
 */
export interface ReactiveController {
  /** 宿主完成首渲染并连接时调用（生命周期接入 connectedCallback 末尾） */
  hostConnected?(): void
  /** 宿主断开连接时调用（进入 disconnectedCallback 清理后） */
  hostDisconnected?(): void
  /** 宿主 update 前调用（基类触发的 update 流程） */
  hostUpdate?(): void
  /** 宿主 update 后调用（基类触发的 update 流程） */
  hostUpdated?(): void
}

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
  /** 本次连接是否为 DSD 真水合接管（tryHydrate 成功后置 true，断开连接时复位） */
  private hydrated = false
  /** 注入的能力 controllers（ReactiveController，hostConnected/hostDisconnected 生命周期接入） */
  private controllers: ReactiveController[] = []

  constructor() {
    super()
    // DSD（Declarative Shadow DOM）场景：服务端输出 <template shadowrootmode="open"> 后，
    // 浏览器 upgrade 元素时 shadow root 已存在，需复用而非 attachShadow（后者会抛 NotSupportedError）
    this.shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (!this.rendered) {
      // 真水合优先：DSD 快照指纹命中且子类 hydrate() 接管成功则跳过 render() 重建，
      // 否则回退 render() 全量重建（正确性优先）
      if (!this.tryHydrate()) {
        this.render()
      }
      this.rendered = true
    } else {
      // 断开重连（append/re-parent/路由缓存摘挂）：render 不重建（布局与内部状态保留），
      // 给子类一次「重绑」机会恢复交互——disconnectedCallback 的 cleanup 已摘除 document/observer
      // 级监听，不重绑则永久失效。子类把绑定集中在可幂等重入的方法并挂到本钩子：
      // addEventListener 同 handler 同 target 规范去重，observer 类由子类自行幂等重挂；
      // 不接钩子的组件维持现状（同样不重建，仅交互不恢复——接入按批次渐进迁移）。
      this.onReconnect()
    }
    this.runUpdateAndNotify()
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
    // 能力控制器：宿主连接完成后依次通知（render/update 已就绪，controller 可访问 DOM）
    for (const c of this.controllers) c.hostConnected?.()
  }

  /**
   * 子类可选重连钩子：断开重连（非首次连接）时调用——重建事件/observer 绑定恢复交互。
   * 语义约定：实现必须幂等（addEventListener 同 handler 同 target 规范去重；
   * ResizeObserver/MutationObserver 等先断开再挂或复用实例重 observe）。
   * render() 与内部状态不重建（布局/输入中内容/滚动位置保留）。
   */
  protected onReconnect(): void {}

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    void name
    void oldValue
    void newValue
    if (!this.rendered) return
    this.runUpdateAndNotify()
  }

  /** 触发 update 并通知能力控制器（hostUpdate → update() → hostUpdated）。基类触发的更新走此路径 */
  protected runUpdateAndNotify(): void {
    for (const c of this.controllers) c.hostUpdate?.()
    this.update()
    for (const c of this.controllers) c.hostUpdated?.()
  }

  /** 公共重渲染请求：供外部协调通道触发（如 oas-form 表级尺寸下发——data-form-size 属性不在
   *  各组件 observedAttributes，属性通道不触发重渲染，动态下发由 form 调本方法兜底） */
  requestUpdate(): void {
    if (!this.rendered) return
    this.runUpdateAndNotify()
  }

  /** 是否已完成首次 render（供子类在 attributeChangedCallback 等钩子中判断） */
  protected get hasRendered(): boolean {
    return this.rendered
  }

  disconnectedCallback(): void {
    this.unsubscribeLocale?.()
    this.unsubscribeLocale = null
    this.unsubscribeConfig?.()
    this.unsubscribeConfig = null
    this.hydrated = false
    for (const fn of this.cleanupFns) fn()
    this.cleanupFns.length = 0
    for (const c of this.controllers) c.hostDisconnected?.()
  }

  /** 注册断开连接时执行的清理函数（计时器、全局监听、浮层引用） */
  protected onCleanup(fn: () => void): void {
    this.cleanupFns.push(fn)
  }

  /** 注入一个能力控制器；宿主已连接时立即调 hostConnected，断开时自动调 hostDisconnected */
  addController(controller: ReactiveController): void {
    if (this.controllers.includes(controller)) return
    this.controllers.push(controller)
    if (this.rendered && this.isConnected) controller.hostConnected?.()
  }

  /** 移除能力控制器，并调 hostDisconnected（之后宿主生命周期不再回调它） */
  removeController(controller: ReactiveController): void {
    const idx = this.controllers.indexOf(controller)
    if (idx < 0) return
    this.controllers.splice(idx, 1)
    controller.hostDisconnected?.()
  }

  /** 子类实现：首次连接时构建 shadow DOM（整个生命周期只调用一次） */
  protected abstract render(): void

  /**
   * 子类可选水合钩子：校验 SSR（DSD）快照结构符合预期，并接管交互
   * （缓存节点引用 + 绑定事件，与 render() 后半段等价）。
   *
   * 返回 true 表示接管成功、跳过 render() 的 shadow 重建（真水合）；
   * 返回 false 或抛异常则回退 render() 全量重建。默认返回 false（不支持水合）。
   */
  protected hydrate(): boolean {
    return false
  }

  /**
   * 尝试 DSD 真水合：指纹 `meta[data-oas-ssr]` 的 tag 与自身一致、且 `data-oas-ssr-v` 与
   * `SSR_SNAPSHOT_VERSION` 严格相等才交由子类 `hydrate()` 接管；否则（含版本缺失/不等、
   * hydrate 返回 false 或抛异常）回退 `render()` 重建。成功后移除指纹防二次误判。
   */
  private tryHydrate(): boolean {
    const meta = this.shadow.querySelector('meta[data-oas-ssr]')
    if (!meta) return false
    if (meta.getAttribute('data-oas-ssr') !== this.tagName.toLowerCase()) return false
    if (meta.getAttribute('data-oas-ssr-v') !== SSR_SNAPSHOT_VERSION) return false

    let ok = false
    try {
      ok = this.hydrate()
    } catch {
      ok = false
    }
    if (ok) {
      this.hydrated = true
      meta.remove()
    }
    return ok
  }

  /**
   * 本次连接是否为 DSD 真水合接管（水合成功 true，断开复位；纯 CSR 恒 false）。
   * 测量组件据此把布局写入延到首帧后，避免与快照的差异帧（闪动）。
   */
  protected wasHydrated(): boolean {
    return this.hydrated
  }

  /** 子类实现：属性/状态变化时增量同步 DOM（默认空实现，纯静态组件可不覆写） */
  protected update(): void {}

  /**
   * 派发组件事件。命名统一 `oas-${name}`。
   * @param options.cancelable 置 true 时事件可被 preventDefault；返回 dispatchEvent 结果
   *   （false 表示被宿主 preventDefault），供组件实现「切换前拦截」类 veto 语义
   */
  protected emit(name: string, detail?: unknown, options?: { cancelable?: boolean }): boolean {
    return this.dispatchEvent(
      new CustomEvent(`oas-${name}`, {
        bubbles: true,
        composed: true,
        cancelable: options?.cancelable ?? false,
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
   * 规范「遗留别名」为规范属性名（解决与 DOM 内建只读属性冲突的迁移通道）。
   *
   * 背景：`prefix` 是 DOM Element 内建只读属性（XML 命名空间前缀），Vue 在组件 upgrade 前
   * 对该 attribute 走 property 赋值会撞只读 getter 报错并吞值。为兼容纯 HTML 老用法（`prefix` 仍可用）
   * 与 Vue/新用法（`prefix-text` 等规范名），组件在各自的 update() 首帧把旧名值迁移到规范名：
   * 规范名存在 → 不动；否则旧名有值 → 复制到规范名并移除旧名（旧名不再参与后续读取）。
   *
   * 幂等（规范名已存在即跳过），无需外部 guard；迁移仅改宿主 attribute，不影响 shadow/SSR 检查。
   *
   * 台账：`docs/deprecations.json`（`pnpm deprecations:check` 校验）。移除别名前必须确认 property
   * 访问器仍保留（React/Vue 的 `key in el` 通道），且 removeIn 已由用户定为高于当前版本的 major。
   */
  protected normalizeLegacyAlias(primary: string, legacy: string): void {
    if (this.getAttribute(primary) != null) return
    const legacyVal = this.getAttribute(legacy)
    if (legacyVal == null) return
    this.setAttribute(primary, legacyVal)
    this.removeAttribute(legacy)
  }

  /**
   * 就近读取注入值（config-provider 机制）。
   *
   * 读取顺序：自身属性 > 表单级尺寸通道（仅 key='size'：oas-form 的 size 下发为字段宿主
   * `data-form-size`，P2 表级尺寸立项）> 最近 config-provider 同名属性 > provider `config`
   * JSON（`{"oas-tag":{key:value}}`）> 全局默认值。
   * 沿 DOM 祖先链找最近的 <oas-config-provider>；自身属性优先（自身显式设置了就不读注入值）。
   */
  protected injectValue(key: string, defaultValue: string): string {
    const own = this.getAttribute(key)
    if (own != null && own !== '') return own
    if (key === 'size') {
      const formSize = this.getAttribute('data-form-size')
      if (formSize != null && formSize !== '') return formSize
    }
    const provider = findConfigProvider(this)
    const injected = provider?.getAttribute(key)
    if (injected != null && injected !== '') return injected
    // 统一注入通道：provider 同名 attribute 优先；`config` JSON（{"oas-tag":{key:value}}）兜底
    const fromConfig = readConfigValue(this, this.tagName.toLowerCase(), key)
    if (fromConfig != null && fromConfig !== '') return String(fromConfig)
    return defaultValue
  }

  /**
   * 就近读取「全局禁用」注入（config-provider 机制），返回组件最终生效的禁用态。
   *
   * 优先级：组件显式 `disabled` 属性 > `disabled-skip` 豁免 > config JSON `disabledExempt`
   * 整类豁免 > provider 注入 disabled。组件自身的 `disabled` 属性恒禁（短路）；
   * 无 provider 时返回 false（未接注入的组件行为不变）。
   *
   * 使用约定：组件在「读 disabled 判定点」用它替换 `hasAttr('disabled')`——
   * 传给内部原生元素 / aria / 点击拦截的既有逻辑不动，只改 disabled 从何而来。
   */
  protected injectDisabled(): boolean {
    return resolveInjectedDisabled(this)
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
