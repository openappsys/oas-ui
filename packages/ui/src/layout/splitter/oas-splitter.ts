import { OASElement } from '@oas-ui/core'
import { chevronDownPath } from '@oas-ui/icons/icons/chevron-down'
import { chevronLeftPath } from '@oas-ui/icons/icons/chevron-left'
import { chevronRightPath } from '@oas-ui/icons/icons/chevron-right'
import { chevronUpPath } from '@oas-ui/icons/icons/chevron-up'
import { isRtl } from '../../shared/direction.js'
import { parseJsonArray } from '../../shared/json-array.js'
import { devWarn } from '../../shared/dev-warn.js'
import { isSsrRuntime } from '../../shared/ssr-runtime.js'

const STYLE = `
:host {
  display: flex;
  height: 100%;
  width: 100%;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
:host([vertical]) {
  flex-direction: column;
}
.pane {
  flex: 1 1 0%;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
/* .sep：分隔条 + 折叠按钮的同级容器（按钮不嵌在 separator 内，避免交互元素嵌套） */
.sep {
  flex-shrink: 0;
  width: 6px;
  position: relative;
}
:host([vertical]) .sep {
  width: 100%;
  height: 6px;
}
.splitter {
  width: 100%;
  height: 100%;
  cursor: col-resize;
  background: var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
:host([vertical]) .splitter {
  cursor: row-resize;
  flex-direction: column;
}
.splitter:hover,
.splitter.is-active {
  background: var(--oas-color-primary);
}
/* disabled：调整冻结——光标常态 + hover/拖拽高亮回落底色（data-disabled 镜像注入禁用，
   宿主 disabled 与 config-provider 全局禁用共用同一消费点） */
:host([data-disabled]) .splitter {
  cursor: default;
}
:host([data-disabled]) .splitter:hover,
:host([data-disabled]) .splitter.is-active {
  background: var(--oas-color-border);
}
:host([dragging]) {
  user-select: none;
}
.splitter:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
.grip {
  width: 2px;
  height: 16px;
  border-radius: 1px;
  background: var(--oas-color-bg);
  opacity: 0.85;
}
:host([vertical]) .grip {
  width: 16px;
  height: 2px;
}
/* collapsible 时收起默认 grip，让位折叠按钮 */
.splitter.is-collapsible .grip {
  display: none;
}
.collapse-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--oas-color-border);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 10px;
  z-index: 1;
  transition:
    color var(--oas-transition-base) var(--oas-ease-out),
    border-color var(--oas-transition-base) var(--oas-ease-out),
    background var(--oas-transition-base) var(--oas-ease-out);
}
.collapse-btn:hover {
  color: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  background: var(--oas-color-bg-hover);
}
/* 键盘聚焦环：对齐全库 focus-ring（无规则时落回 UA 默认黑环，与 --oas-focus-ring 不一致） */
.collapse-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.collapse-btn svg {
  display: block;
}
/* 高对比模式（forced-colors: active）兜底：拖拽手柄只凭 --oas-color-border 底色表达，
   强制色覆盖 background 后 6px 手柄带整体消失（无边框、无文本）→ 内缩 1px outline 找回
   手柄轮廓（outline 不参与布局，面板宽度与拖拽命中区零漂移） */
@media (forced-colors: active) {
  .splitter {
    outline: 1px solid;
    outline-offset: -1px;
  }
}
`

type SplitterMode = 'legacy' | 'multi'

/** 尺寸持久化快照版本（结构变更时递增，旧版本整体忽略） */
const STORAGE_VERSION = 1
/** 写入合并延迟：拖拽/连击期间多次变更合并为一次同步写（pointerup 会立即 flush） */
const PERSIST_DELAY = 120

/** 版本化快照：legacy 存 percent，multi 存 sizes；折叠态附折叠索引与折叠前尺寸 */
type SplitterSnapshot = {
  v: number
  mode: SplitterMode
  percent?: number
  sizes?: number[]
  collapsed?: number[]
  prev?: Record<string, number>
}

/** SSR（服务端渲染）环境判定统一走 shared/ssr-runtime：本地不再保留第二份实现 */

export class OASSplitter extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'percent',
      'min',
      'max',
      'vertical',
      'collapsible',
      'collapsed',
      'lazy',
      'sizes',
      'disabled',
      'snap',
      'storage-key',
    ]
  }

  /** 布局模式：legacy（slot=left/right 两面板）/ multi（直接子元素即面板） */
  private mode: SplitterMode = 'legacy'

  /** 面板包装节点与分隔条（legacy 固定 2+1；multi 按子元素数动态维护）。
   *  `splitters` 存内层 separator（拖拽/键盘/aria 用），`seps` 存外层 .sep 容器（
   *  重建时两者都要摘除，否则 .sep 会作为孤儿残留） */
  private panes: HTMLElement[] = []
  private splitters: HTMLElement[] = []
  private seps: HTMLElement[] = []
  private observer: MutationObserver | null = null

  /** 拖拽状态 */
  private dragging = false
  private dragIndex = 0
  private startPos = 0
  private startPercent = 0
  private dragPercent = 0

  /** 布局状态（sizes property 的内部真值，避免与原型访问器同名遮蔽） */
  private sizesData: number[] = []
  private sizesInitialized = false
  /** 上次因非法 sizes property 告警的原值（同值去重） */
  private lastInvalidSizes = ''
  private initialPercent = 50
  private initialSizes: number[] = []
  /** 折叠到 0 的面板索引集合（受控语义：写回 collapsed 属性） */
  private collapsedPanels = new Set<number>()
  /** 折叠前尺寸（展开还原用） */
  private collapsedPrev = new Map<number, number>()
  /** 最近一次变更的属性（受控折叠同步的 gate：仅首渲染/直接改 collapsed 时响应） */
  private lastAttr = ''
  private renderedOnce = false

  /** 存储恢复只在首次连接尝试一次（改 key 不自动重载；同 key 在线实例不 live sync） */
  private storageRestoreScheduled = false
  /** 首连恢复微任务是否仍在途/是否在 microtask 前断开（断开重连不再尝试恢复） */
  private storageRestorePending = false
  private storageRestoreAborted = false
  /** 首次连接前的显式初始属性快照（内部折叠/布局会写回属性，之后不能再据此判断“显式”） */
  private explicitInitialCaptured = false
  private explicitPercent = false
  private explicitSizes: number[] | null = null
  private explicitCollapsed = false
  /** 首连恢复完成前抑制持久化：mount 期显式折叠 / own sizes 回收是零交互，不得覆盖已有快照 */
  private persistSuppressed = false
  /** 写入合并定时器、待写标记与调度时捕获的 key（窗口内改 key 本次仍写旧 key） */
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private persistPending = false
  private persistKey: string | null = null
  /** 上次成功写入的快照字符串与 key（相同快照不重复 setItem） */
  private lastWrittenSnapshot: string | null = null
  private lastWrittenKey: string | null = null

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    this.lastAttr = name
    super.attributeChangedCallback(name, oldValue, newValue)
  }

  /**
   * 连接前被写成 own property 的 `sizes` 回收：框架（Vue 对自定义元素按「key in el」判定）
   * 可能在元素升级/连接前把静态 `sizes` attribute 直接赋成实例字段。own 数据属性会遮蔽原型
   * accessor，setter 不再执行、attribute 也没写入 → 连接后布局丢失。删除 own 并回收到 setter。
   */
  override connectedCallback(): void {
    const firstConnect = !this.storageRestoreScheduled
    // 首连恢复完成前抑制持久化：mount 期显式 collapsed / own sizes 回收会写回属性并触发
    // schedulePersist，但那是零交互，不得覆盖已有快照。
    if (firstConnect) this.persistSuppressed = true
    // 必须在 super（首渲染）前采集：multi 首渲染折叠会把内部 sizes 写回属性，
    // 之后再读属性会误把组件自写值当成“显式初始属性”而压过存储。
    if (!this.explicitInitialCaptured) {
      this.explicitInitialCaptured = true
      this.explicitPercent = this.hasAttribute('percent')
      this.explicitSizes = this.parseSizes(this.getAttr('sizes', ''))
      this.explicitCollapsed = this.hasAttribute('collapsed')
    }
    super.connectedCallback()
    if (Object.prototype.hasOwnProperty.call(this, 'sizes')) {
      const own = (this as unknown as { sizes?: unknown }).sizes
      if (Array.isArray(own) || typeof own === 'string') {
        delete (this as unknown as Record<string, unknown>).sizes
        // 连接前 own 预设的尺寸才是双击复位的「初始基线」：super.connectedCallback 期间 sizes
        // attribute 尚未落盘，initialSizes 已被固化为均分；先重置基线标志，让下方 setter 写
        // attribute 触发的 update → ensureSizes 用回收值重新采集，双击复位回预设比例而非均分
        this.sizesInitialized = false
        const parsedOwn = this.parseSizes(own as unknown)
        if (parsedOwn) this.explicitSizes = parsedOwn
        this.sizes = own as number[] | string
      }
    }
    // 延迟到微任务恢复：SSR/DSD 水合的同步首帧与快照零差异，hydrate() 内不访问存储；
    // 只在首次连接尝试（改 key 不自动重载）。
    if (!firstConnect) return
    this.storageRestoreScheduled = true
    const key = this.storageKeyValue()
    if (key === '' || isSsrRuntime()) {
      // 无 key / SSR：没有恢复微任务，本帧结束即可正常持久化
      this.persistSuppressed = false
      return
    }
    this.storageRestorePending = true
    queueMicrotask(() => {
      try {
        // microtask 前曾断开（即使同任务重连）不恢复；恢复只尝试一次
        if (this.storageRestoreAborted) return
        if (!this.isConnected) return
        if (this.storageKeyValue() !== key) return
        this.restoreSnapshot(key)
      } finally {
        this.storageRestorePending = false
        this.persistSuppressed = false
      }
    })
  }

  override disconnectedCallback(): void {
    // microtask 前断开：本次首连恢复作废（重连不再尝试）
    if (this.storageRestorePending) this.storageRestoreAborted = true
    // 未到合并窗口的用户变更在断开前落盘（SSR/首连恢复抑制期内部会跳过）
    this.flushPersist()
    this.persistPending = false
    this.persistKey = null
    super.disconnectedCallback()
  }

  /**
   * 面板尺寸（百分比，归一后总和≈100）property 通道。
   *
   * 读：优先按 `sizes` 属性归一解析（attribute 是受控真源，避免面板数不匹配时返回与 attribute
   * 矛盾的陈旧均分值）；无合法属性时返回内部尺寸副本。
   * 写：运行时接受百分比数组、逗号分隔百分比（文档写法 `30,40,30`）或 JSON 字符串——Vue 等
   * 框架按「key in el」会把静态 `sizes` attribute 直接写成 property（SPA 跳转后元素已升级）。
   * 合法值归一后写回 JSON attribute；非法/空值保留既有 attribute（受控值不被破坏）+ devWarn 一次。
   */
  get sizes(): number[] {
    const parsed = this.parseSizes(this.getAttr('sizes', ''))
    if (parsed) return parsed
    return this.sizesData.slice()
  }

  set sizes(v: number[] | string) {
    const parsed = this.parseSizes(v as unknown)
    if (!parsed) {
      this.warnInvalidSizes(v as unknown)
      return
    }
    this.setAttribute('sizes', JSON.stringify(parsed.map((s) => Math.round(s * 100) / 100)))
    if (this.hasRendered) this.update()
    this.schedulePersist()
  }

  /** 非法 sizes property 告警（同实例同值只告警一次，避免受控重试刷屏） */
  private warnInvalidSizes(v: unknown): void {
    const key = typeof v === 'string' ? v : typeof v
    if (this.lastInvalidSizes === key) return
    this.lastInvalidSizes = key
    devWarn(
      '[oas-splitter] sizes property 收到非法/空数据（应为百分比数组、逗号分隔百分比或其 JSON 字符串），已忽略并保留既有 sizes 属性',
    )
  }

  // ---------- 尺寸持久化（storage-key，opt-in） ----------

  /** 当前持久化键（空串 = 不启用） */
  private storageKeyValue(): string {
    return this.getAttr('storage-key', '')
  }

  /**
   * 调度合并写入：拖拽/连续键盘变更只在延迟窗口末尾同步写一次；
   * pointerup 通过 flushPersist 立即落盘，避免每个 pointermove 都触发 localStorage 同步写。
   */
  private schedulePersist(): void {
    if (this.persistSuppressed || !this.isConnected || isSsrRuntime()) return
    const key = this.storageKeyValue()
    if (key === '') return
    // 窗口内改 key：先把在途写入按捕获的旧 key flush，再为新 key 重新调度
    if (this.persistTimer != null && this.persistKey !== key) this.flushPersist()
    this.persistPending = true
    this.persistKey = key
    if (this.persistTimer != null) return
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      this.flushPersist()
    }, PERSIST_DELAY)
  }

  /** 立即落盘待写快照（无待写/无 key/SSR/恢复抑制期 no-op；get/set 异常静默降级） */
  private flushPersist(): void {
    if (this.persistSuppressed) return
    if (this.persistTimer != null) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    if (!this.persistPending) return
    this.persistPending = false
    // 本次写入使用调度时捕获的 key（改 key 后本次仍写旧 key）；key 被移除则视为退出持久化
    const key = this.persistKey
    this.persistKey = null
    if (!key || this.storageKeyValue() === '' || isSsrRuntime()) return
    const raw = JSON.stringify(this.buildSnapshot())
    if (raw === this.lastWrittenSnapshot && key === this.lastWrittenKey) return
    try {
      window.localStorage.setItem(key, raw)
      this.lastWrittenSnapshot = raw
      this.lastWrittenKey = key
    } catch {
      /* 隐私模式/配额/存储不可用：静默降级，内存布局仍有效 */
    }
  }

  /** 版本化快照：legacy 存 percent；multi 存 sizes；折叠态附折叠索引与折叠前尺寸 */
  private buildSnapshot(): SplitterSnapshot {
    const round = (n: number): number => Math.round(n * 100) / 100
    const collapsed = [...this.collapsedPanels].sort((a, b) => a - b)
    const prev: Record<string, number> = {}
    for (const index of collapsed) {
      const value = this.collapsedPrev.get(index)
      if (value != null) prev[String(index)] = round(value)
    }
    if (this.mode === 'legacy') {
      const percent = Number(this.getAttr('percent', '50')) || 50
      return { v: STORAGE_VERSION, mode: 'legacy', percent: round(percent), collapsed, prev }
    }
    return { v: STORAGE_VERSION, mode: 'multi', sizes: this.sizesData.map(round), collapsed, prev }
  }

  /** 解析/校验快照：版本、模式、形状任一不符整体忽略（安全降级） */
  private parseSnapshot(raw: unknown): SplitterSnapshot | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
    const data = raw as Record<string, unknown>
    if (data.v !== STORAGE_VERSION || data.mode !== this.mode) return null
    const collapsed = this.parseSnapshotCollapsed(data.collapsed)
    if (collapsed === null) return null
    const prev = this.parseSnapshotPrev(data.prev)
    if (prev === null) return null
    // 折叠态必须带折叠前尺寸（展开还原依据），缺失视为形状不符整体忽略
    if (collapsed.some((index) => prev[String(index)] === undefined)) return null
    if (this.mode === 'legacy') {
      const percent = data.percent
      // percent:0 与组件语义不一致（0 在 legacy 会回落 50），直接拒绝避免“存 0 显 50”
      if (typeof percent !== 'number' || !Number.isFinite(percent) || percent <= 0 || percent > 100) return null
      return { v: STORAGE_VERSION, mode: 'legacy', percent, collapsed, prev }
    }
    const sizes = data.sizes
    if (!Array.isArray(sizes) || sizes.length !== this.panes.length || sizes.length < 2) return null
    if (sizes.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) return null
    if (sizes.reduce((a, b) => a + (b as number), 0) <= 0) return null
    return { v: STORAGE_VERSION, mode: 'multi', sizes: (sizes as number[]).slice(), collapsed, prev }
  }

  /** 折叠索引校验：越界/非整数整体拒绝（面板数变化后不半套应用） */
  private parseSnapshotCollapsed(raw: unknown): number[] | null {
    if (raw === undefined) return []
    if (!Array.isArray(raw)) return null
    const limit = this.mode === 'legacy' ? 1 : Math.max(0, this.panes.length - 1)
    const out: number[] = []
    for (const n of raw) {
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n >= limit) return null
      if (!out.includes(n)) out.push(n)
    }
    return out
  }

  /** 折叠前尺寸表校验：键为非负整数、值为有限非负数 */
  private parseSnapshotPrev(raw: unknown): Record<string, number> | null {
    if (raw === undefined) return {}
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
    const out: Record<string, number> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (!/^\d+$/.test(key)) return null
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
      out[key] = value
    }
    return out
  }

  /** 读取并应用合法快照；任何读取/解析异常安全降级 */
  private restoreSnapshot(key: string): void {
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(key)
    } catch {
      return
    }
    if (raw == null) return
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }
    const snapshot = this.parseSnapshot(data)
    if (!snapshot) return
    // 恢复成功的原始快照即“已写内容”：之后用户操作回到同一状态无需重复 setItem
    this.lastWrittenSnapshot = raw
    this.lastWrittenKey = key
    this.applySnapshot(snapshot)
  }

  /** 显式初始 sizes 是否有效（连接前采集；数量与当前面板数一致才视为受控初值） */
  private hasExplicitSizes(): boolean {
    return this.explicitSizes !== null && this.explicitSizes.length === this.panes.length
  }

  /**
   * 应用快照（恢复零事件）：显式初始属性 > 合法存储 > 默认值；
   * 只写属性/内部态并同步视觉与 aria，不派发 oas-resize / oas-collapse。
   */
  private applySnapshot(snapshot: SplitterSnapshot): void {
    let layoutRestored = false
    if (snapshot.mode === 'legacy') {
      if (!this.explicitPercent && snapshot.percent != null) {
        this.setAttribute('percent', String(Math.round(snapshot.percent * 100) / 100))
        layoutRestored = true
      }
    } else if (snapshot.sizes && !this.hasExplicitSizes()) {
      this.sizesData = snapshot.sizes.slice()
      this.writeBackSizes()
      layoutRestored = true
    }

    const collapsed = snapshot.collapsed ?? []
    const applyCollapsed = collapsed.length > 0 && !this.explicitCollapsed
    if (applyCollapsed) {
      // 布局未采用存储（显式 sizes/percent 胜出）时，折叠前尺寸取当前显式布局；采用存储时取快照 prev
      this.collapsedPanels = new Set(collapsed)
      this.collapsedPrev = new Map(
        collapsed.map((index) => [index, layoutRestored ? snapshot.prev![String(index)]! : this.panelSize(index)]),
      )
    } else if (this.mode === 'multi' && layoutRestored) {
      // 显式 collapsed 属性胜出但布局来自存储：折叠前尺寸跟随恢复后的布局（存储为折叠态时用其 prev）
      for (const index of this.collapsedPanels) {
        const current = this.sizesData[index] ?? 0
        const restored = current > 0 ? current : snapshot.prev?.[String(index)]
        if (restored != null) this.collapsedPrev.set(index, restored)
      }
    }
    // 折叠面板尺寸归零并让给右邻（显式 collapsed 属性与存储折叠共用同一归一化，
    // 避免恢复的非折叠 sizes 覆盖初始折叠时已转给右邻的尺寸）
    if (this.mode === 'multi' && this.collapsedPanels.size > 0) {
      let changed = false
      for (const index of this.collapsedPanels) {
        const size = this.sizesData[index] ?? 0
        if (size > 0) {
          this.sizesData[index + 1] = (this.sizesData[index + 1] ?? 0) + size
          this.sizesData[index] = 0
          changed = true
        }
      }
      if (changed) this.writeBackSizes()
    }
    if (applyCollapsed) this.setAttribute('collapsed', '')

    this.applyPercent()
    this.syncCollapseButtons()
    this.syncAria()
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    if (this.detectMode() === 'multi') return `<style>${STYLE}</style>`
    return `
      <style>${STYLE}</style>
      <div class="pane" part="pane-left"><slot name="left"><slot></slot></slot></div>
      <div class="sep" part="sep">
        <div class="splitter" part="splitter" tabindex="0" role="separator" aria-orientation="vertical">
          <slot name="handle"><span class="grip"></span></slot>
        </div>
      </div>
      <div class="pane" part="pane-right"><slot name="right"></slot></div>
    `
  }

  /** 旧两面板模式判定：存在 slot=left/right 子元素走 legacy */
  private hasLegacySlots(): boolean {
    return this.querySelector('[slot="left"], [slot="right"]') !== null
  }

  /**
   * 模式检测：
   * - 有 slot=left/right 子元素 → legacy（旧用法完全不变）；
   * - ≥2 个直接子元素（面板）→ multi（子元素即面板，分隔条自动插在相邻面板间）；
   * - 0/1 个子元素回落 legacy（空态/单面板保持分隔条骨架，aria 与既有测试契约不变）。
   */
  private detectMode(): SplitterMode {
    if (this.hasLegacySlots()) return 'legacy'
    return this.panelChildren().length >= 2 ? 'multi' : 'legacy'
  }

  /** multi 面板集合：直接子元素（排除 slot=left/right/handle 与 style/script/template；
   *  组件托管的 slot=pane-N 视为面板） */
  private panelChildren(): HTMLElement[] {
    return Array.from(this.children).filter((el) => {
      const slot = el.getAttribute('slot')
      if (slot === 'left' || slot === 'right' || slot === 'handle') return false
      return el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT' && el.tagName !== 'TEMPLATE'
    }) as HTMLElement[]
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.mode = this.detectMode()
    this.initialPercent = Number(this.getAttr('percent', '50')) || 50
    if (this.mode === 'legacy') {
      this.panes = Array.from(this.shadow.querySelectorAll<HTMLElement>('.pane'))
      this.splitters = Array.from(this.shadow.querySelectorAll<HTMLElement>('[part="splitter"]'))
    }
    // 事件委托：分隔条/折叠按钮动态增删时无需重绑（light DOM 事件不穿透 shadow 监听，面板内按键不影响）
    this.shadow.addEventListener('pointerdown', (e) => this.onPointerDown(e as PointerEvent))
    this.shadow.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.shadow.addEventListener('dblclick', (e) => this.handleDblClick(e as MouseEvent))
    this.shadow.addEventListener('click', (e) => this.onClick(e as MouseEvent))
    // 拖拽期间监听在 document 上，保证指针移出分隔条仍能跟随
    this.onCleanup(() => {
      document.removeEventListener('pointermove', this.onDrag)
      document.removeEventListener('pointerup', this.endDrag)
      this.observer?.disconnect()
      this.observer = null
    })
    if (this.mode === 'multi') {
      // 子元素增删 → 同步面板/分隔条骨架（slot 赋值走属性，不会触发 childList 回环）
      this.observer = new MutationObserver(() => this.syncPanels())
      this.observer.observe(this, { childList: true })
    }
  }

  /** 真水合：校验 SSR 快照结构（splitter 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.splitter')) return false
    this.bind()
    return true
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  protected override update(): void {
    if (this.mode === 'multi') this.syncPanels()
    // 受控折叠同步：仅首渲染（render 内 update）或外部直接改 collapsed 属性时响应；
    // 内部折叠写回触发的 update（lastAttr=sizes 等中间态）不重复展开/收起
    const isInitial = !this.renderedOnce
    this.renderedOnce = true
    if (isInitial || this.lastAttr === 'collapsed') this.syncCollapsedFromAttr()
    this.syncCollapseButtons()
    this.syncAria()
    this.applyPercent()
  }

  // ---------- 多面板结构同步 ----------

  private syncPanels(): void {
    const children = this.panelChildren()
    const n = children.length
    // 每个子元素按索引分配到专属 slot（多面板模式下组件托管 slot 属性）
    children.forEach((child, i) => {
      if (child.getAttribute('slot') !== `pane-${i}`) child.setAttribute('slot', `pane-${i}`)
    })
    if (this.panes.length !== n) {
      this.rebuildStructure(n)
      this.pruneCollapsed()
      // 尺寸归一必须先于布局应用：面板数变化后旧 sizesData 长度不符（含折叠的 0），
      // 用旧值渲染新面板数会得到 DOM/模型/属性三方不一致（M9 fix round 2）
      this.ensureSizes(n)
      // 重建出的新分隔条需要补折叠按钮与 aria：MutationObserver 路径只走 syncPanels()，不走 update()
      // 重建 + 收敛折叠索引后必须立即重应用布局：否则 inline flex 为空（面板零宽/塌缩不可见），
      // 直到下一次 update() 才恢复（M9 回归）
      this.syncCollapseButtons()
      this.syncAria()
      this.applyPercent()
      // 归一后的模型值回写属性（受控语义同折叠回写），并落盘新快照——
      // 否则 storage 里残留越界折叠/旧长度 sizes，下次按新面板数挂载会整份拒收、用户布局被重置。
      // 首连恢复/抑制期不回写：坏快照拒收回落均分属于「降级」，不得把自写值伪装成宿主输入
      if (!this.persistSuppressed) {
        this.writeBackSizes()
        this.schedulePersist()
      }
    }
    this.ensureSizes(n)
  }

  /** 按面板数重建 pane/splitter 骨架（不动 style，不重建 shadow 整棵） */
  private rebuildStructure(n: number): void {
    for (const el of this.panes) el.remove()
    for (const el of this.seps) el.remove()
    for (const el of this.splitters) el.remove()
    this.panes = []
    this.splitters = []
    this.seps = []
    if (n < 1) return
    const frag = this.ownerDocument.createDocumentFragment()
    for (let i = 0; i < n; i++) {
      const pane = this.ownerDocument.createElement('div')
      pane.className = 'pane'
      pane.setAttribute('part', 'pane')
      pane.innerHTML = `<slot name="pane-${i}"></slot>`
      frag.appendChild(pane)
      this.panes.push(pane)
      if (i < n - 1) frag.appendChild(this.makeSplitter())
    }
    this.shadow.appendChild(frag)
  }

  private makeSplitter(): HTMLElement {
    // 外层 .sep 同时承载分隔条与折叠按钮（同级），按钮不嵌进 separator 交互元素内
    const wrap = this.ownerDocument.createElement('div')
    wrap.className = 'sep'
    wrap.setAttribute('part', 'sep')
    const s = this.ownerDocument.createElement('div')
    s.className = 'splitter'
    s.setAttribute('part', 'splitter')
    s.setAttribute('tabindex', '0')
    s.setAttribute('role', 'separator')
    s.setAttribute('aria-orientation', 'vertical')
    s.innerHTML = `<slot name="handle"><span class="grip"></span></slot>`
    wrap.appendChild(s)
    this.splitters.push(s)
    this.seps.push(wrap)
    return wrap
  }

  /**
   * 面板数变化 → 清空全部折叠态（含折叠前尺寸）。light DOM 子元素无稳定身份（无 key），
   * 结构变更后无法知道删的是哪一块；按索引保留会把折叠态错配到存活的相邻面板
   * （零宽症状在另一种删除顺序下复发）。语义定为「结构变更重置派生状态」——无 key 列表的
   * 通行做法（类比受控列表 key 变化时重置内部状态）：全部收敛 + collapsed 属性移除，
   * 布局回写与快照落盘由调用方（syncPanels 重建分支）收口，宿主可按需重新折叠。
   */
  private pruneCollapsed(): void {
    if (this.collapsedPanels.size === 0) return
    this.collapsedPanels.clear()
    this.collapsedPrev.clear()
    this.removeAttribute('collapsed')
  }

  /**
   * sizes 输入 → 归一化数组。兼容三种书写：
   * - 百分比数组（property 直接赋值）：`[30, 40, 30]`
   * - 逗号分隔百分比（文档 attribute 写法）：`30,40,30`
   * - JSON 数组字符串（property setter 写回 / 框架静态 attribute）：`[30,40,30]`
   * 非法/空/负值/总和为 0 返回 null（调用方决定保留受控值还是回落均分）。
   */
  private parseSizes(raw: unknown): number[] | null {
    let parts: number[]
    if (Array.isArray(raw)) {
      if (raw.length === 0) return null
      parts = raw.map((n) => (typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN))
    } else {
      if (typeof raw !== 'string') return null
      const trimmed = raw.trim()
      if (trimmed === '') return null
      if (trimmed.startsWith('[')) {
        const parsed = parseJsonArray<unknown>(trimmed)
        if (parsed.length === 0) return null
        parts = parsed.map((n) => (typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN))
      } else {
        parts = trimmed.split(',').map((s) => parseFloat(s.trim()))
      }
    }
    if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null
    const sum = parts.reduce((a, b) => a + b, 0)
    if (sum <= 0) return null
    return parts.map((p) => (p / sum) * 100)
  }

  private equalSizes(n: number): number[] {
    return Array.from({ length: n }, () => 100 / n)
  }

  private ensureSizes(n: number): void {
    if (n <= 0) {
      this.sizesData = []
      return
    }
    const parsed = this.parseSizes(this.getAttr('sizes', ''))
    if (parsed && parsed.length === n) {
      this.sizesData = parsed
    } else if (parsed || this.sizesData.length !== n) {
      // sizes 属性存在但数量不匹配（或面板数变化）→ 回落均分
      this.sizesData = this.equalSizes(n)
    }
    if (!this.sizesInitialized) {
      this.initialSizes = [...this.sizesData]
      this.sizesInitialized = true
    }
  }

  private writeBackSizes(): void {
    this.setAttribute('sizes', this.sizesData.map((s) => Math.round(s * 100) / 100).join(','))
  }

  // ---------- 事件（委托） ----------

  private onPointerDown(e: PointerEvent): void {
    const splitter = (e.target as HTMLElement).closest('[part="splitter"]')
    if (!splitter || !this.shadow.contains(splitter)) return
    if ((e.target as HTMLElement).closest('.collapse-btn')) return
    const index = this.splitters.indexOf(splitter as HTMLElement)
    if (index < 0) return
    if (this.injectDisabled()) return
    this.startDrag(e, index)
  }

  private handleKey(e: KeyboardEvent): void {
    const splitter = (e.target as HTMLElement).closest('[part="splitter"]')
    if (!splitter || !this.shadow.contains(splitter)) return
    if ((e.target as HTMLElement).closest('.collapse-btn')) return
    const index = this.splitters.indexOf(splitter as HTMLElement)
    if (index < 0) return
    if (this.injectDisabled()) return
    let delta = 0
    if (this.hasAttr('vertical')) {
      // 垂直：ArrowUp 缩小上一面板（前侧），ArrowDown 放大
      if (e.key === 'ArrowUp') delta = -1
      else if (e.key === 'ArrowDown') delta = 1
    } else {
      // 水平：ArrowLeft 缩小上一面板；RTL 镜像翻转（逻辑方向）
      if (e.key === 'ArrowLeft') delta = isRtl(this) ? 1 : -1
      else if (e.key === 'ArrowRight') delta = isRtl(this) ? -1 : 1
    }
    if (delta === 0) return
    e.preventDefault()
    this.adjust(delta, index)
  }

  private onClick(e: MouseEvent): void {
    const btn = (e.target as HTMLElement).closest('.collapse-btn')
    if (!btn) return
    // 按钮与 separator 同级（不嵌在内），索引由 data-splitter-index 携带，不再靠 DOM 祖先定位
    const index = Number((btn as HTMLElement).dataset.splitterIndex)
    if (!Number.isInteger(index) || index < 0 || index >= this.splitters.length) return
    this.setCollapsed(index, !this.collapsedPanels.has(index))
  }

  private handleDblClick(e: MouseEvent): void {
    const splitter = (e.target as HTMLElement).closest('[part="splitter"]')
    if (!splitter || !this.shadow.contains(splitter)) return
    if ((e.target as HTMLElement).closest('.collapse-btn')) return
    if (this.injectDisabled()) return
    const index = this.splitters.indexOf(splitter as HTMLElement)
    if (index < 0) return
    this.resetPair(index)
  }

  // ---------- 拖拽 ----------

  private startDrag(e: PointerEvent, index: number): void {
    if (e.button !== 0 && e.pointerType !== 'touch') return
    e.preventDefault()
    this.dragging = true
    this.dragIndex = index
    this.startPos = this.hasAttr('vertical') ? e.clientY : e.clientX
    this.startPercent =
      this.mode === 'legacy' ? Number(this.getAttr('percent', '50')) || 50 : (this.sizesData[index] ?? 50)
    this.dragPercent = this.startPercent
    this.setAttribute('dragging', '')
    this.splitters[index]?.classList.add('is-active')
    // 拖拽会把折叠面板重新打开（手动调整尺寸后折叠态失效）
    if (this.collapsedPanels.has(index)) this.setCollapsed(index, false)
    document.addEventListener('pointermove', this.onDrag)
    document.addEventListener('pointerup', this.endDrag)
  }

  private onDrag = (e: PointerEvent): void => {
    if (!this.dragging) return
    const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
    if (!size) return
    const raw = this.hasAttr('vertical')
      ? e.clientY - this.startPos
      : (e.clientX - this.startPos) * (isRtl(this) ? -1 : 1)
    const p = this.startPercent + (raw / size) * 100
    // 统一按 min/max（multi 含配对和约束）夹取，再吸附到 snap 档位（档位越界不吸附），
    // ghost 与最终落盘一致（lazy 路径共用 dragPercent）
    const pairSum =
      this.mode === 'multi' ? (this.sizesData[this.dragIndex] ?? 0) + (this.sizesData[this.dragIndex + 1] ?? 0) : null
    this.dragPercent = this.snapPercent(this.clampPercent(p, pairSum), pairSum)
    if (this.hasAttr('lazy')) {
      // lazy：拖拽中只动分隔条视觉位置，不写 percent/重渲面板
      this.moveGhost(this.dragPercent)
    } else if (this.mode === 'legacy') {
      this.setPercent(this.dragPercent)
    } else {
      this.setSizes(this.dragIndex, this.dragPercent)
    }
  }

  /** lazy 幽灵分隔条：仅视觉位移（transform），松手才落盘 */
  private moveGhost(p: number): void {
    const splitter = this.splitters[this.dragIndex]
    if (!splitter) return
    const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
    const px = size ? ((p - this.startPercent) / 100) * size : 0
    splitter.style.transform = this.hasAttr('vertical')
      ? `translate(0, ${px}px)`
      : `translate(${px * (isRtl(this) ? -1 : 1)}px, 0)`
  }

  private endDrag = (): void => {
    if (!this.dragging) return
    this.dragging = false
    const splitter = this.splitters[this.dragIndex]
    if (splitter) {
      splitter.classList.remove('is-active')
      splitter.style.transform = ''
    }
    // lazy：松手才写 percent/sizes + 派发一次 resize（纯点击无位移不派发）
    if (this.hasAttr('lazy') && this.dragPercent !== this.startPercent) {
      if (this.mode === 'legacy') this.setPercent(this.dragPercent)
      else this.setSizes(this.dragIndex, this.dragPercent)
    }
    this.removeAttribute('dragging')
    document.removeEventListener('pointermove', this.onDrag)
    document.removeEventListener('pointerup', this.endDrag)
    // 松手立即落盘（拖拽期间只合并调度，pointerup 前不产生逐帧同步写）
    this.flushPersist()
  }

  // ---------- 调整落盘 ----------

  private adjust(delta: number, index: number): void {
    if (this.mode === 'legacy') {
      const p = Number(this.getAttr('percent', '50')) || 50
      this.setPercent(this.snapStep(p, delta))
    } else {
      const p = this.sizesData[index] ?? 50
      this.setSizes(index, this.snapStep(p, delta))
    }
  }

  // ---------- snap 吸附档位（PRD D18） ----------

  /**
   * snap 档位解析：逗号分隔的百分比（`25,50,75`）或像素值（`200px` 后缀按容器宽高换算，
   * 与 min/max 同一协议）；非法 token 静默忽略（与 min/max 非法回落语义一致）。
   * 返回升序去重后的档位数组（百分比 0–100）。
   */
  private snapGears(): number[] {
    const raw = this.getAttr('snap', '')
    if (raw.trim() === '') return []
    const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
    const gears: number[] = []
    for (const token of raw.split(',')) {
      const t = token.trim()
      if (t === '') continue
      const m = t.match(/^(-?\d+(?:\.\d+)?)px$/)
      let v: number
      if (m) {
        if (!(size > 0)) continue
        v = (parseFloat(m[1]!) / size) * 100
      } else {
        v = Number(t)
        if (!Number.isFinite(v)) continue
      }
      if (v >= 0 && v <= 100) gears.push(v)
    }
    return [...new Set(gears)].sort((a, b) => a - b)
  }

  /**
   * 拖拽吸附：候选值与某档位的距离在 ±8px 阈值内（按容器宽高换算为百分比阈值）时吸附到该档位；
   * 档位自身超出 min/max（含 multi 配对约束）夹取范围时不吸附（min/max 优先于档位）。
   */
  private snapPercent(p: number, pairSum: number | null): number {
    const gears = this.snapGears()
    if (gears.length === 0) return p
    const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
    if (!(size > 0)) return p
    const threshold = (8 / size) * 100
    const lo = this.boundPercent(this.getAttr('min', '10'), 10)
    let hi = this.boundPercent(this.getAttr('max', '90'), 90)
    if (pairSum != null) hi = Math.min(hi, pairSum - lo)
    for (const g of gears) {
      if (g < lo || g > hi) continue
      if (Math.abs(g - p) <= threshold) return g
    }
    return p
  }

  /**
   * 键盘微调落档：snap 存在时方向键在相邻档位间移动（当前档位的上/下一档）；
   * 该方向已无档可落时回落既有 ±1% 微调。setPercent/setSizes 内部仍按 min/max 夹取。
   */
  private snapStep(p: number, delta: number): number {
    const gears = this.snapGears()
    if (gears.length === 0) return p + delta
    const eps = 1e-6
    const next = delta > 0 ? gears.find((g) => g > p + eps) : [...gears].reverse().find((g) => g < p - eps)
    return next ?? p + delta
  }

  /** legacy：写 percent 属性 + 派发 oas-resize（契约不变：detail { percent }） */
  private setPercent(p: number): void {
    const clamped = this.clampPercent(p, null)
    this.setAttribute('percent', String(clamped))
    this.emit('resize', { percent: clamped })
    this.applyPercent()
    this.schedulePersist()
  }

  /** multi：相邻两面板此消彼长（配对和守恒），写回 sizes 属性 */
  private setSizes(index: number, p: number): void {
    const pairSum = (this.sizesData[index] ?? 0) + (this.sizesData[index + 1] ?? 0)
    const clamped = this.clampPercent(p, pairSum)
    this.sizesData[index] = clamped
    this.sizesData[index + 1] = Math.max(0, pairSum - clamped)
    this.writeBackSizes()
    const sizes = this.sizes.slice()
    this.emit('resize', { percent: sizes[index], index, sizes })
    this.applyPercent()
    this.schedulePersist()
  }

  /** 双击复位：回初始 percent / 初始相邻两面板比例（折叠态一并展开） */
  private resetPair(index: number): void {
    if (this.collapsedPanels.has(index)) this.setCollapsed(index, false)
    if (this.mode === 'legacy') {
      this.setPercent(this.initialPercent)
      return
    }
    const a = this.initialSizes[index] ?? 50
    const b = this.initialSizes[index + 1] ?? 50
    const total = a + b
    if (total <= 0) return
    const pairSum = (this.sizesData[index] ?? 0) + (this.sizesData[index + 1] ?? 0)
    this.sizesData[index] = (a / total) * pairSum
    this.sizesData[index + 1] = pairSum - this.sizesData[index]
    this.writeBackSizes()
    const sizes = this.sizes.slice()
    this.emit('resize', { percent: sizes[index], index, sizes })
    this.applyPercent()
    this.schedulePersist()
  }

  /** min/max 夹取：pairSum 非空时保证相邻另一面板不小于 min */
  private clampPercent(p: number, pairSum: number | null): number {
    const lo = this.boundPercent(this.getAttr('min', '10'), 10)
    let hi = this.boundPercent(this.getAttr('max', '90'), 90)
    if (pairSum != null) {
      hi = Math.min(hi, pairSum - lo)
      if (lo <= hi) return Math.min(hi, Math.max(lo, p))
      return Math.max(0, Math.min(pairSum, p))
    }
    return Math.min(hi, Math.max(lo, p))
  }

  /**
   * 边界值解析：`200px` 后缀按像素夹取（换算成容器宽高占比），
   * 纯数字按百分比；非法（非数字/空串/0）回落 fallback（与既有语义一致）。
   */
  private boundPercent(raw: string, fallback: number): number {
    const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)px$/)
    if (m) {
      const size = this.hasAttr('vertical') ? this.clientHeight : this.clientWidth
      return size > 0 ? (parseFloat(m[1]!) / size) * 100 : 0
    }
    if (raw.trim() === '') return fallback
    const n = Number(raw)
    return Number.isFinite(n) && n !== 0 ? n : fallback
  }

  // ---------- 布局应用 ----------

  private applyPercent(): void {
    if (this.mode === 'multi') this.applyMulti()
    else this.applyLegacy()
  }

  private applyLegacy(): void {
    const left = this.panes[0]
    const right = this.panes[1]
    if (!left || !right) return
    if (this.collapsedPanels.has(0)) {
      // 折叠面板 0 尺寸：禁用滚动（0 尺寸滚动区不可用，且触发 axe: scrollable-region-focusable）
      left.style.overflow = 'hidden'
      left.style.flex = '0 0 0%'
      right.style.flex = '1 1 100%'
      return
    }
    left.style.overflow = ''
    const percent = Number(this.getAttr('percent', '50')) || 50
    left.style.flex = `0 0 ${percent}%`
    right.style.flex = '1 1 0%'
  }

  private applyMulti(): void {
    const n = this.panes.length
    if (!n) return
    this.panes.forEach((pane, i) => {
      const collapsed = this.collapsedPanels.has(i)
      // 折叠面板 0 尺寸：禁用滚动（同上，scrollable-region-focusable）
      pane.style.overflow = collapsed ? 'hidden' : ''
      if (collapsed) {
        pane.style.flex = '0 0 0%'
      } else if (i === n - 1) {
        // 末面板吸收剩余空间（sizes 归一化 sum≈100，余量即末面板尺寸）
        pane.style.flex = '1 1 0%'
      } else {
        pane.style.flex = `0 0 ${this.sizesData[i] ?? 100 / n}%`
      }
    })
  }

  // ---------- 折叠 ----------

  /**
   * 折叠/展开面板 index（分隔条前一侧）。受控语义：
   * - 折叠状态写回 `collapsed` 属性（宿主可见/可外部控制）；
   * - 派发 `oas-collapse`，detail: { collapsed, side: 'left' }（side=left 指分隔条前一侧）。
   */
  private setCollapsed(index: number, collapsed: boolean): void {
    if (collapsed === this.collapsedPanels.has(index)) return
    const sizeBefore = this.panelSize(index)
    if (collapsed) {
      // 收起：尺寸并给右邻面板（此消彼长）
      if (this.mode === 'multi') {
        this.sizesData[index + 1] = (this.sizesData[index + 1] ?? 0) + sizeBefore
        this.sizesData[index] = 0
      }
      this.collapsedPanels.add(index)
      this.collapsedPrev.set(index, sizeBefore)
    } else {
      // 展开：把折叠前尺寸从右邻面板挪回
      const prev = this.collapsedPrev.get(index) ?? sizeBefore
      if (this.mode === 'multi') {
        const give = Math.min(prev, this.sizesData[index + 1] ?? prev)
        this.sizesData[index] = give
        this.sizesData[index + 1] = Math.max(0, (this.sizesData[index + 1] ?? 0) - give)
      }
      this.collapsedPanels.delete(index)
      this.collapsedPrev.delete(index)
    }
    // 先写回 sizes 再同步 collapsed 属性：属性变更会触发 update() → ensureSizes 重新采纳 sizes，
    // 顺序颠倒会把内部刚改的尺寸被陈旧属性值覆盖
    if (this.mode === 'multi') this.writeBackSizes()
    if (this.collapsedPanels.size > 0) this.setAttribute('collapsed', '')
    else this.removeAttribute('collapsed')
    this.emit('collapse', { collapsed, side: 'left' })
    this.applyPercent()
    this.syncCollapseButtons()
    this.syncAria()
    this.schedulePersist()
  }

  /** 外部 `collapsed` 属性同步：属性存在→折叠首条分隔条面板；移除→全部展开 */
  private syncCollapsedFromAttr(): void {
    const hostCollapsed = this.hasAttr('collapsed')
    if (hostCollapsed && this.collapsedPanels.size === 0) {
      if (this.splitters.length > 0) this.setCollapsed(0, true)
    } else if (!hostCollapsed && this.collapsedPanels.size > 0) {
      for (const i of [...this.collapsedPanels]) this.setCollapsed(i, false)
    }
  }

  /** 分隔条旁的折叠按钮（collapsible 时）：aria-label 走 locale，箭头随折叠态翻转。
   *  按钮挂在 .sep 容器里与 separator 同级，锚点靠容器定位、索引靠 data 属性 */
  private syncCollapseButtons(): void {
    const collapsible = this.hasAttr('collapsible')
    this.splitters.forEach((splitter, i) => {
      splitter.classList.toggle('is-collapsible', collapsible)
      const wrap = splitter.parentElement ?? splitter
      let btn = wrap.querySelector<HTMLButtonElement>(':scope > .collapse-btn')
      if (!collapsible) {
        btn?.remove()
        return
      }
      if (!btn) {
        btn = this.ownerDocument.createElement('button')
        btn.className = 'collapse-btn'
        btn.type = 'button'
        wrap.appendChild(btn)
      }
      btn.dataset.splitterIndex = String(i)
      const collapsed = this.collapsedPanels.has(i)
      btn.setAttribute('aria-label', collapsed ? this.t('splitter.expand') : this.t('splitter.collapse'))
      btn.innerHTML = `<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false">${this.collapseIcon(collapsed)}</svg>`
    })
  }

  private collapseIcon(collapsed: boolean): string {
    if (this.hasAttr('vertical')) {
      return collapsed ? chevronDownPath : chevronUpPath
    }
    const rtl = isRtl(this)
    // 收起方向：水平布局下折叠箭头指向将收拢的一侧（RTL 镜像）
    if (collapsed) return rtl ? chevronLeftPath : chevronRightPath
    return rtl ? chevronRightPath : chevronLeftPath
  }

  private panelSize(index: number): number {
    if (this.mode === 'legacy') return Number(this.getAttr('percent', '50')) || 50
    return this.sizesData[index] ?? (this.sizesData.length ? 100 / this.sizesData.length : 50)
  }

  // ---------- aria ----------

  private syncAria(): void {
    // separator 的 aria-orientation 指分隔条自身方向：水平条（vertical 布局）为 horizontal
    const orientation = this.hasAttr('vertical') ? 'horizontal' : 'vertical'
    const min = this.boundPercent(this.getAttr('min', '10'), 10)
    const max = this.boundPercent(this.getAttr('max', '90'), 90)
    const disabled = this.injectDisabled()
    // 禁用态镜像到宿主 data-disabled（覆盖注入场景，供 :host([data-disabled]) 样式消费）
    this.toggleAttribute('data-disabled', disabled)
    this.splitters.forEach((splitter, i) => {
      splitter.setAttribute('aria-orientation', orientation)
      splitter.setAttribute('aria-label', this.t('splitter.adjust'))
      splitter.setAttribute('aria-disabled', String(disabled))
      const p = this.mode === 'legacy' ? Number(this.getAttr('percent', '50')) || 50 : (this.sizesData[i] ?? 50)
      splitter.setAttribute('aria-valuenow', String(Math.round(p * 100) / 100))
      splitter.setAttribute('aria-valuemin', String(min))
      splitter.setAttribute('aria-valuemax', String(max))
    })
  }
}
