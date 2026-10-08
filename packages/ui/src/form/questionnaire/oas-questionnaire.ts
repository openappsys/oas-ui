import { OASElement } from '@oas-ui/core'
import { normalizeSizeStrict, ALL_SIZES } from '../../shared/size.js'

/**
 * 步骤数据契约（v1）：线性门控 + 可选跳过 + oas-before-change 宿主自定跳转。
 * visibleIf 谓词 / 表达式引擎 / 分支跳转延后（hidden 为宿主预算好的可见性扩展位）。
 */
export interface QuestionnaireStep {
  /** 步骤唯一标识：事件回传与面板 slot 名（slot="step-<key>"）；缺省用数组下标 */
  key?: string
  title: string
  description?: string
  /** 可跳过：显示 Skip 按钮，未答亦放行（跳过不触发校验；跳过后该步退出取值/校验口径，重新进入恢复） */
  optional?: boolean
  /** 宿主预算好的可见性：不在流程内（不渲染头部、不计进度、导航跳过；值与校验同不计入） */
  hidden?: boolean
}

/** 非法 size 告警：回落 medium 并在 dev 下 console.warn 一次（同值去重，对齐 oas-steps 惯例） */
const warnedSizes = new Set<string>()
function warnInvalidSize(raw: string): void {
  if (warnedSizes.has(raw)) return
  warnedSizes.add(raw)
  console.warn(`[oas-questionnaire] 非法 size "${raw}"，已回落 medium；合法值：xs/small/medium/large/xl`)
}

const VALID_PROGRESS_VARIANTS = new Set(['text', 'bar', 'both'])

/** 值合并安全：保留键段整块跳过（原型污染防护，与 oas-form parseNamePath 同判据） */
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** 深合并：对象递归合并、数组/原始值覆盖（后者胜）；保留键段跳过 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(source)) {
    if (FORBIDDEN_KEYS.has(k)) continue
    if (isPlainObject(v)) {
      if (!isPlainObject(target[k])) target[k] = {}
      deepMerge(target[k] as Record<string, unknown>, v)
    } else {
      target[k] = v
    }
  }
}

/** 属性 JSON 解析：非法/非对象静默回落 {} */
function parseJsonAttr(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return isPlainObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.header[hidden],
.nav[hidden],
.progress[hidden] {
  display: none;
}
/* —— 步骤头：语义对齐 steps/stepper，视觉独立实现 —— */
.steps {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}
.item {
  flex: 1;
  position: relative;
  min-width: 0;
  text-align: center;
}
.item:not(:last-child)::after {
  content: '';
  position: absolute;
  top: calc(var(--oas-control-height-sm) / 2 + 1px);
  inset-inline-start: 50%;
  width: 100%;
  height: 2px;
  background: var(--oas-color-border);
  z-index: 0;
}
.item[data-status='process']:not(:last-child)::after {
  background: var(--oas-color-primary);
}
.item[data-status='finish']:not(:last-child)::after {
  background: var(--oas-color-success);
}
.icon {
  width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  box-sizing: border-box;
  border-radius: 50%;
  border: 2px solid var(--oas-color-border);
  display: inline-flex;
  vertical-align: top;
  align-items: center;
  justify-content: center;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  background: var(--oas-color-bg);
  position: relative;
  z-index: 1;
}
.item[data-status='process'] .icon {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
  font-weight: 600;
}
.item[data-status='finish'] .icon {
  border-color: var(--oas-color-success);
  color: var(--oas-color-success);
}
.wrap {
  display: block;
}
.text {
  display: block;
  margin-top: var(--oas-space-1);
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.desc {
  display: block;
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.optional {
  margin-inline-start: var(--oas-space-1);
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-disabled);
  font-weight: 400;
}
/* 可点头部项：内层原生 button 保持 li 的 listitem 语义（axe list 规则），图标柔光 + focus-visible 焦点环 */
.item-btn {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: center;
  cursor: pointer;
}
.item[data-clickable='true']:hover .icon {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--oas-color-primary) 18%, transparent);
}
.item-btn:focus-visible {
  outline: none;
  border-radius: var(--oas-radius-sm);
  box-shadow: var(--oas-focus-ring);
}
/* 禁点（linear 未来步）：文字弱化、无按钮语义 */
.item[data-disabled='true'] {
  cursor: not-allowed;
}
.item[data-disabled='true'] .text,
.item[data-disabled='true'] .desc {
  color: var(--oas-color-text-disabled);
}
/* —— 进度：「第 n / m 步」文本 + progressbar（自渲染，不复用 oas-progress） —— */
.progress {
  display: flex;
  align-items: center;
  gap: var(--oas-space-3);
  margin: var(--oas-space-4) 0;
}
.progress-text {
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
}
.progress-track {
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-questionnaire-progress-bg, var(--oas-color-bg-hover));
  overflow: hidden;
}
.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--oas-questionnaire-progress-bar-bg, var(--oas-color-primary));
}
/* —— 内容面板：常驻不卸载（回退值保留），仅切 hidden —— */
.panel[hidden] {
  display: none;
}
/* —— 导航区 —— */
.nav {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--oas-questionnaire-nav-gap, var(--oas-space-2));
  margin-top: var(--oas-space-5);
}
.nav .btn {
  height: var(--oas-control-height-md);
  padding: 0 var(--oas-space-4);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--oas-transition-fast) var(--oas-ease-out),
    border-color var(--oas-transition-fast) var(--oas-ease-out);
}
.nav .btn:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.nav .btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.nav .btn.primary {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.nav .btn.primary:hover:not(:disabled) {
  background: var(--oas-color-primary-hover);
  border-color: var(--oas-color-primary-hover);
  color: var(--oas-color-text-on-primary);
}
.nav .btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
/* 步切换播报（读屏专用，视觉隐藏） */
.live {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
/* ===== size 五档：字号密度（指示器盒几何恒定，对齐 steps 惯例） ===== */
:host(.oas-questionnaire--xs) .text {
  font-size: var(--oas-font-size-xs);
}
:host(.oas-questionnaire--small) .text {
  font-size: var(--oas-font-size-sm);
}
:host(.oas-questionnaire--large) .text {
  font-size: var(--oas-font-size-lg);
}
:host(.oas-questionnaire--large) .desc {
  font-size: var(--oas-font-size-sm);
}
:host(.oas-questionnaire--large) .icon {
  font-size: var(--oas-font-size-sm);
}
:host(.oas-questionnaire--xl) .text {
  font-size: var(--oas-font-size-xl);
}
:host(.oas-questionnaire--xl) .desc {
  font-size: var(--oas-font-size-sm);
}
:host(.oas-questionnaire--xl) .icon {
  font-size: var(--oas-font-size-md);
}
`

export class OASQuestionnaire extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'steps',
      'current',
      'linear',
      'validation',
      'progress',
      'progress-variant',
      'prev-text',
      'next-text',
      'finish-text',
      'skip-text',
      'hide-header',
      'hide-nav',
      // size 五档（字号密度档位，几何恒定）
      'size',
    ]
  }

  private _steps: QuestionnaireStep[] = []

  /** 门控在途标志：next/submit 重入保护（异步 validator 未落地时不重复推进） */
  private busy = false

  /** 每步被跟踪的值快照（内层 oas-form 的 oas-values-change detail.values，嵌套结构） */
  private tracked = new Map<number, Record<string, unknown>>()

  /** 用户跳过的步索引（optional 且点了跳过）：该步退出「参与步」集合——不进取值与校验；重新进入或 reset 即清除 */
  private skipped = new Set<number>()

  /** form → 步索引（值跟踪路由） */
  private formIndex = new WeakMap<Element, number>()

  private headerEl: HTMLElement | null = null
  private listEl: HTMLElement | null = null
  private progressRegion: HTMLElement | null = null
  private liveEl: HTMLElement | null = null
  private bodyEl: HTMLElement | null = null
  private prevBtn: HTMLButtonElement | null = null
  private nextBtn: HTMLButtonElement | null = null
  private skipBtn: HTMLButtonElement | null = null

  /** light DOM 变化 → 重发现面板与内层 form（宿主后挂面板场景） */
  private domObserver: MutationObserver | null = null

  /** Vue/React 把 steps 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get steps(): QuestionnaireStep[] {
    return this._steps
  }
  set steps(value: QuestionnaireStep[] | string) {
    this.setAttribute('steps', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="header" part="header">
        <ol class="steps" part="steps"></ol>
      </div>
      <div class="progress" part="progress" role="progressbar"></div>
      <div class="live" part="live" aria-live="polite"></div>
      <div class="body" part="body"></div>
      <div class="nav" part="nav">
        <button class="btn" part="prev" type="button"></button>
        <button class="btn" part="skip" type="button" hidden></button>
        <button class="btn primary" part="next" type="button"></button>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定导航按钮（render 与水合路径共用） */
  private bind(): void {
    this.headerEl = this.shadow.querySelector('.header')
    this.listEl = this.shadow.querySelector('.steps')
    this.progressRegion = this.shadow.querySelector('.progress')
    this.liveEl = this.shadow.querySelector('.live')
    this.bodyEl = this.shadow.querySelector('.body')
    this.prevBtn = this.shadow.querySelector<HTMLButtonElement>('[part="prev"]')
    this.nextBtn = this.shadow.querySelector<HTMLButtonElement>('[part="next"]')
    this.skipBtn = this.shadow.querySelector<HTMLButtonElement>('[part="skip"]')
    this.prevBtn?.addEventListener('click', () => this.prev())
    this.nextBtn?.addEventListener('click', () => void this.primaryAction())
    this.skipBtn?.addEventListener('click', () => this.skipStep())
    // 面板内容由宿主后挂（slot content 晚于连接）时重发现内层 form
    if (typeof MutationObserver !== 'undefined') {
      this.domObserver = new MutationObserver(() => {
        if (this.hasRendered) this.runUpdateAndNotify()
      })
      this.domObserver.observe(this, { childList: true, subtree: true })
      this.onCleanup(() => this.domObserver?.disconnect())
    }
    // 断开时摘除内层 form 上的值跟踪监听（重连后由 update 重挂，同引用去重）
    this.onCleanup(() => {
      for (const { form } of this.stepForms()) {
        form.removeEventListener('oas-values-change', this.onInnerValues as EventListener)
      }
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（导航区存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.nav')) return false
    this.bind()
    return true
  }

  /** 断开重连：内层 form 值监听重挂 + MutationObserver 重挂（cleanup 断开时已 disconnect） */
  protected override onReconnect(): void {
    this.bindValueListeners()
    this.domObserver?.observe(this, { childList: true, subtree: true })
  }

  protected override update(): void {
    this.parseSteps()
    // size 五档（非法值归一化回落一次 medium）：字号密度档位（几何恒定，对齐 steps 惯例）
    const sizeRaw = this.getAttr('size', 'medium')
    const { value: size, isValid: sizeValid } = normalizeSizeStrict(sizeRaw, ALL_SIZES, 'medium')
    if (!sizeValid) warnInvalidSize(sizeRaw)
    for (const s of ALL_SIZES) this.classList.toggle(`oas-questionnaire--${s}`, s === size)
    const eff = this.effectiveIndex()
    // 重新进入被跳过的步即恢复参与：导航（next/prev/goto）与宿主直接写 current 两条路径
    // 都汇经 update，统一在此清除该步的跳过记录
    this.skipped.delete(eff)
    this.syncHeader(eff)
    this.syncProgress(eff)
    this.syncPanels(eff)
    this.syncNav(eff)
    this.bindValueListeners()
  }

  private parseSteps(): void {
    try {
      const parsed: unknown = JSON.parse(this.getAttr('steps', '[]'))
      this._steps = Array.isArray(parsed)
        ? parsed.filter(
            (s): s is QuestionnaireStep =>
              s !== null && typeof s === 'object' && typeof (s as QuestionnaireStep).title === 'string',
          )
        : []
    } catch {
      this._steps = []
    }
    // steps 配置变更后清理越界的跳过记录（索引不跨配置复用，防误标新步骤）
    for (const i of this.skipped) if (i >= this._steps.length) this.skipped.delete(i)
  }

  // ---------- 索引解析（hidden 步不进流程） ----------

  private isHidden(idx: number): boolean {
    return this._steps[idx]?.hidden === true
  }

  /**
   * 参与步判据（取值与校验同口径）：非 hidden 且未被用户跳过的步才算参与——
   * 只有参与步进 getValues() / oas-submit 载荷 / submit·validate 的重校集合。
   * 跳过记录随重新进入该步（update）与 reset() 清除。
   */
  private participates(idx: number): boolean {
    return !this.isHidden(idx) && !this.skipped.has(idx)
  }

  /** 可见步索引序列 */
  private visibleIndexes(): number[] {
    const out: number[] = []
    for (let i = 0; i < this._steps.length; i++) if (!this.isHidden(i)) out.push(i)
    return out
  }

  /**
   * 当前有效步：current 夹取到 [0, n-1]；落在 hidden 步时向后找下一个可见步，
   * 无则向前回退（全部 hidden 返回原夹取值——头部/导航自然为空）。
   */
  private effectiveIndex(): number {
    const n = this._steps.length
    if (n === 0) return 0
    const raw = Number(this.getAttr('current', '0'))
    const clamp = Math.min(Math.max(Number.isFinite(raw) ? Math.floor(raw) : 0, 0), n - 1)
    if (!this.isHidden(clamp)) return clamp
    for (let i = clamp + 1; i < n; i++) if (!this.isHidden(i)) return i
    for (let i = clamp - 1; i >= 0; i--) if (!this.isHidden(i)) return i
    return clamp
  }

  private nextVisibleIndex(from: number): number {
    for (let i = from + 1; i < this._steps.length; i++) if (!this.isHidden(i)) return i
    return -1
  }

  private prevVisibleIndex(from: number): number {
    for (let i = from - 1; i >= 0; i--) if (!this.isHidden(i)) return i
    return -1
  }

  /** 当前步在可见序列中的序数（进度 now / 头部编号用） */
  private visibleOrdinal(eff: number): number {
    return this.visibleIndexes().filter((i) => i <= eff).length
  }

  // ---------- 开关与文案 ----------

  private linearEnabled(): boolean {
    return this.getAttr('linear', 'true') !== 'false'
  }

  /** 单步校验门控开关（validation="false" 为纯导航；submit() 语义不受此开关影响，始终重校） */
  private validationEnabled(): boolean {
    return this.getAttr('validation', 'true') !== 'false'
  }

  private progressEnabled(): boolean {
    return this.getAttr('progress', 'true') !== 'false'
  }

  /** 文案：属性覆盖优先（prev-text 等），缺省走 i18n */
  private label(attr: string, key: string): string {
    const raw = this.getAttr(attr, '')
    return raw !== '' ? raw : this.t(key)
  }

  private keyOf(idx: number): Record<string, unknown> {
    const key = this._steps[idx]?.key
    return key ? { key } : {}
  }

  // ---------- 渲染同步 ----------

  private syncHeader(eff: number): void {
    if (!this.headerEl || !this.listEl) return
    if (this.hasAttr('hide-header') || this._steps.length === 0) {
      this.headerEl.setAttribute('hidden', '')
      this.listEl.innerHTML = ''
      return
    }
    this.headerEl.removeAttribute('hidden')
    this.listEl.innerHTML = ''
    const linear = this.linearEnabled()
    const ordinalOf = new Map<number, number>()
    let ord = 0
    for (let i = 0; i < this._steps.length; i++) if (!this.isHidden(i)) ordinalOf.set(i, ++ord)
    for (let idx = 0; idx < this._steps.length; idx++) {
      const step = this._steps[idx]!
      if (step.hidden) continue
      const li = document.createElement('li')
      li.className = 'item'
      li.setAttribute('part', 'item')
      li.setAttribute('data-status', idx === eff ? 'process' : idx < eff ? 'finish' : 'wait')
      if (idx === eff) li.setAttribute('aria-current', 'step')
      // 头部导航：当前步无意义（no-op）；linear 下未来步禁点；其余（已过步 / linear=false 的全部他步）可点
      const interactive = idx !== eff && (!linear || idx < eff)
      if (!interactive && linear && idx > eff) {
        li.setAttribute('data-disabled', 'true')
        li.setAttribute('aria-disabled', 'true')
      }
      const icon = document.createElement('span')
      icon.className = 'icon'
      icon.textContent = idx === eff || idx > eff ? String(ordinalOf.get(idx) ?? idx + 1) : '✓'
      // 用 <span> 承载（button 内容模型仅允许 phrasing content；块级显示交给 CSS display:block）
      const wrap = document.createElement('span')
      wrap.className = 'wrap'
      const text = document.createElement('span')
      text.className = 'text'
      text.textContent = step.title
      if (step.optional) {
        const opt = document.createElement('span')
        opt.className = 'optional'
        opt.textContent = this.t('questionnaire.optional')
        text.appendChild(opt)
      }
      wrap.appendChild(text)
      if (step.description) {
        const desc = document.createElement('span')
        desc.className = 'desc'
        desc.textContent = step.description
        wrap.appendChild(desc)
      }
      if (interactive) {
        // 内层原生 <button>：li 保持 listitem 语义（在 <li> 上置 role=button 会让 <ol> 的直接子角色非法，
        // axe list 规则 serious 违规）；Enter/Space 由原生按钮行为覆盖，无需自建键盘处理
        li.setAttribute('data-clickable', 'true')
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'item-btn'
        btn.setAttribute('part', 'item-button')
        btn.appendChild(icon)
        btn.appendChild(wrap)
        btn.addEventListener('click', () => {
          this.goto(idx)
        })
        li.appendChild(btn)
      } else {
        li.appendChild(icon)
        li.appendChild(wrap)
      }
      this.listEl.appendChild(li)
    }
  }

  private syncProgress(eff: number): void {
    const region = this.progressRegion
    if (!region) return
    const visible = this.visibleIndexes()
    if (!this.progressEnabled() || visible.length === 0) {
      region.setAttribute('hidden', '')
      region.innerHTML = ''
      return
    }
    region.removeAttribute('hidden')
    const rawVariant = this.getAttr('progress-variant', 'both')
    const variant = VALID_PROGRESS_VARIANTS.has(rawVariant) ? rawVariant : 'both'
    const ordinal = this.visibleOrdinal(eff)
    const stepLabel = this.t('questionnaire.stepLabel', { current: ordinal, total: visible.length })
    region.innerHTML = ''
    region.setAttribute('aria-valuemin', '1')
    region.setAttribute('aria-valuemax', String(visible.length))
    region.setAttribute('aria-valuenow', String(ordinal))
    region.setAttribute('aria-label', stepLabel)
    if (variant !== 'bar') {
      const txt = document.createElement('span')
      txt.className = 'progress-text'
      txt.textContent = stepLabel
      region.appendChild(txt)
    }
    if (variant !== 'text') {
      const track = document.createElement('span')
      track.className = 'progress-track'
      const fill = document.createElement('span')
      fill.className = 'progress-fill'
      fill.style.width = `${Math.round((ordinal / visible.length) * 100)}%`
      track.appendChild(fill)
      region.appendChild(track)
    }
    // 步切换播报（读屏），复用步骤标签 + 当前步标题
    if (this.liveEl) this.liveEl.textContent = `${stepLabel} ${this._steps[eff]?.title ?? ''}`.trim()
  }

  /** 面板重建：slot 名按 key ?? 原始数组下标（宿主 slot 接线稳定）；仅切 hidden 不卸载 light DOM */
  private syncPanels(eff: number): void {
    if (!this.bodyEl) return
    this.bodyEl.innerHTML = ''
    for (let idx = 0; idx < this._steps.length; idx++) {
      const step = this._steps[idx]!
      const panel = document.createElement('div')
      panel.className = 'panel'
      panel.setAttribute('part', 'panel')
      panel.setAttribute('data-step', String(idx))
      if (idx !== eff || step.hidden) panel.setAttribute('hidden', '')
      const slot = document.createElement('slot')
      slot.setAttribute('name', step.key ? `step-${step.key}` : `step-${idx}`)
      panel.appendChild(slot)
      this.bodyEl.appendChild(panel)
    }
  }

  private syncNav(eff: number): void {
    const nav = this.shadow.querySelector('.nav')
    if (!nav || !this.prevBtn || !this.nextBtn || !this.skipBtn) return
    if (this.hasAttr('hide-nav') || this._steps.length === 0) {
      nav.setAttribute('hidden', '')
      return
    }
    nav.removeAttribute('hidden')
    const prevVisible = this.prevVisibleIndex(eff)
    const nextVisible = this.nextVisibleIndex(eff)
    this.prevBtn.textContent = this.label('prev-text', 'questionnaire.prev')
    this.prevBtn.disabled = prevVisible === -1
    // 末步主按钮 = 完成（finish-text / i18n submit）；点击走 submit()（重校全部步）
    const isLast = nextVisible === -1
    this.nextBtn.textContent = isLast
      ? this.label('finish-text', 'questionnaire.submit')
      : this.label('next-text', 'questionnaire.next')
    this.skipBtn.textContent = this.label('skip-text', 'questionnaire.skip')
    this.skipBtn.hidden = this._steps[eff]?.optional !== true || isLast
  }

  // ---------- 内层 oas-form 发现与值跟踪 ----------

  /** 每步一个 oas-form（宿主面板内）：按 slot 关联发现；每步取第一个 */
  private stepForms(): Array<{ idx: number; form: Element }> {
    const out: Array<{ idx: number; form: Element }> = []
    if (!this.bodyEl) return out
    const slots = Array.from(this.shadow.querySelectorAll('slot'))
    for (let idx = 0; idx < this._steps.length; idx++) {
      const step = this._steps[idx]!
      const name = step.key ? `step-${step.key}` : `step-${idx}`
      const slot = slots.find((s) => s.getAttribute('name') === name)
      if (!slot) continue
      for (const node of slot.assignedElements()) {
        const forms = node.tagName === 'OAS-FORM' ? [node] : Array.from(node.querySelectorAll('oas-form'))
        if (forms.length > 0) {
          out.push({ idx, form: forms[0]! })
          break
        }
      }
    }
    return out
  }

  /** 值跟踪监听重挂（幂等：同函数引用 addEventListener 去重） */
  private bindValueListeners(): void {
    for (const { idx, form } of this.stepForms()) {
      this.formIndex.set(form, idx)
      form.addEventListener('oas-values-change', this.onInnerValues as EventListener)
    }
  }

  /** 内层 form 值变化 → 跟踪该步快照（事件本身 composed 冒泡穿出，宿主可直接收听，不重复派发） */
  private readonly onInnerValues = (e: Event): void => {
    const form = e.currentTarget as Element | null
    if (!form) return
    const idx = this.formIndex.get(form)
    if (idx === undefined) return
    const detail = (e as CustomEvent<{ values?: unknown }>).detail
    if (detail && isPlainObject(detail.values)) this.tracked.set(idx, detail.values)
  }

  // ---------- 导航与门控 ----------

  /** 统一跳转：before-change 拦截点（cancelable）→ 写 current → 派发 oas-change{index,key?} */
  private moveTo(idx: number): boolean {
    const from = this.effectiveIndex()
    if (idx === from) return false
    if (!this.emit('before-change', { index: idx, ...this.keyOf(idx), from }, { cancelable: true })) {
      return false
    }
    this.setAttribute('current', String(idx))
    this.emit('change', { index: idx, ...this.keyOf(idx) })
    return true
  }

  /**
   * 下一步：单步校验门控（当前步 oas-form 未过不放行；无 form / validation="false" 放行）。
   * prev 不校验（回退不应被困，通行惯例）；异步 validator 在途时重入直接拒绝。
   * 竞态防护：prev/goto 不设 busy（回退不应被困），在途窗口内用户可能已离开本步——
   * 校验落地后发现 current 不再是发起步时放弃推进（校验结果只对发起时的那一步有效）。
   */
  async next(): Promise<boolean> {
    if (this.busy) return false
    const from = this.effectiveIndex()
    const target = this.nextVisibleIndex(from)
    if (target === -1) return false
    if (this.validationEnabled()) {
      this.busy = true
      try {
        if (!(await this.validateStep(from))) return false
        if (this.effectiveIndex() !== from) return false
      } finally {
        this.busy = false
      }
    }
    return this.moveTo(target)
  }

  /** 上一步：不校验（对齐「回退不被校验挡住」惯例） */
  prev(): boolean {
    const target = this.prevVisibleIndex(this.effectiveIndex())
    if (target === -1) return false
    return this.moveTo(target)
  }

  /** 直跳任意步：不走单步门控（与 next() 语义分离）；越界夹取、hidden 步向后解析 */
  goto(index: number): boolean {
    const n = this._steps.length
    if (n === 0) return false
    const raw = Number(index)
    const clamp = Math.min(Math.max(Number.isFinite(raw) ? Math.floor(raw) : 0, 0), n - 1)
    let target = clamp
    if (this.isHidden(clamp)) {
      target = this.nextVisibleIndex(clamp)
      if (target === -1) {
        target = this.prevVisibleIndex(clamp)
        if (target === -1) return false
      }
    }
    return this.moveTo(target)
  }

  /**
   * 跳过当前可选步：不校验直接前进（before-change 仍可拦截）。
   * 记录跳过：该步退出参与步集合（值不进 getValues/submit、不再参与重校），
   * 重新进入即恢复参与（update 清记录）。
   */
  skipStep(): boolean {
    const from = this.effectiveIndex()
    if (this._steps[from]?.optional !== true) return false
    const target = this.nextVisibleIndex(from)
    if (target === -1) return false
    if (!this.emit('before-change', { index: target, ...this.keyOf(target), from }, { cancelable: true })) {
      return false
    }
    this.skipped.add(from)
    this.emit('skip', { index: from, ...this.keyOf(from) })
    this.setAttribute('current', String(target))
    this.emit('change', { index: target, ...this.keyOf(target) })
    return true
  }

  /** 单步校验：委托该步 oas-form 的公开 validate()（零侵入复用校验内核）；无 form 默认放行 */
  private async validateStep(idx: number): Promise<boolean> {
    const entry = this.stepForms().find((f) => f.idx === idx)
    if (!entry) return true
    const form = entry.form as unknown as {
      validate?: () => Promise<boolean>
      getErrors?: () => Record<string, string>
    }
    if (typeof form.validate !== 'function') return true
    const ok = await form.validate()
    const errors = typeof form.getErrors === 'function' ? form.getErrors() : {}
    this.emit('step-validate', { index: idx, ...this.keyOf(idx), valid: ok, errors })
    return ok
  }

  /** 全部参与步顺序校验（submit 语义：防前面步被程序改值绕过；hidden / 已跳过步不计入） */
  private async validateAll(): Promise<boolean> {
    for (const { idx } of this.stepForms()) {
      if (!this.participates(idx)) continue
      if (!(await this.validateStep(idx))) return false
    }
    return true
  }

  /**
   * 校验全部参与步（非 hidden 且未跳过，不提交）：每步派发 oas-step-validate，返回是否全部通过。
   * 门控在途时重入直接拒绝。
   */
  async validate(): Promise<boolean> {
    if (this.busy) return false
    this.busy = true
    try {
      return await this.validateAll()
    } finally {
      this.busy = false
    }
  }

  /** 提交：重校全部参与步（含早期步），全过才派发 oas-submit{values}（跨步汇总，仅参与步） */
  async submit(): Promise<boolean> {
    if (this.busy) return false
    this.busy = true
    try {
      if (!(await this.validateAll())) return false
    } finally {
      this.busy = false
    }
    this.emit('submit', { values: this.getValues() })
    return true
  }

  /** 主按钮动作：末步 → submit()；否则 → next()（与内置按钮同一链路） */
  private async primaryAction(): Promise<void> {
    if (this.nextVisibleIndex(this.effectiveIndex()) === -1) await this.submit()
    else await this.next()
  }

  /**
   * 跨步值汇总（参与步口径，与 validateAll 同判据）：各参与步（非 hidden 且未跳过）的
   * oas-form 当前值按步序深合并（与单表 submit 的 detail.values 同口径，
   * 零交互的 value 属性预填同样计入）。优先读 form 公开 `getValues()`（实时取值）；
   * form 未 upgrade / 不提供该方法时回退 initial-values 基线 + oas-values-change 跟踪快照。
   * 需全量数据（含 hidden / 已跳过步）的宿主可直接读取各面板内的 oas-form。
   */
  getValues(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const { idx, form } of this.stepForms()) {
      if (!this.participates(idx)) continue
      const f = form as { getValues?: () => unknown }
      if (typeof f.getValues === 'function') {
        const values = f.getValues()
        if (isPlainObject(values)) deepMerge(out, values)
        continue
      }
      const baseline = (form as { initialValues?: unknown }).initialValues
      deepMerge(out, isPlainObject(baseline) ? baseline : parseJsonAttr(form.getAttribute('initial-values')))
      const trackedValues = this.tracked.get(idx)
      if (trackedValues) deepMerge(out, trackedValues)
    }
    return out
  }

  /**
   * 重置：全部步骤 form reset 回初始值（清错误态）、清值跟踪、清跳过记录、current 回 0。
   * 不派发任何事件（对齐 oas-form reset 语义）。
   */
  reset(): void {
    for (const { form } of this.stepForms()) {
      const f = form as unknown as { reset?: () => void }
      if (typeof f.reset === 'function') f.reset()
    }
    this.tracked.clear()
    this.skipped.clear()
    if (this.getAttr('current', '0') !== '0') this.setAttribute('current', '0')
  }
}
