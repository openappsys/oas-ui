import { OASElement } from '@oas-ui/core'
import { computePosition, type Placement } from '../../overlay/floating/index.js'

export interface Option {
  label: string
  value: string
  /** 可见不可选：菜单渲染但跳过（键盘导航/点击均忽略） */
  disabled?: boolean
  /** 扩展字段透传：宿主自定义展示数据（头像 url 等）随 oas-select/oas-option-render 回查 */
  [key: string]: unknown
}

const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_STATUSES = ['error', 'warning', 'success'] as const
const VALID_VARIANTS = ['outlined', 'filled', 'borderless'] as const
const VALID_TYPES = ['textarea', 'input'] as const

/** 枚举归一化：合法值原样返回，空/非法值静默回落默认 */
function normalizeChoice(raw: string, fallback: string, valid: readonly string[]): string {
  if (raw === '') return fallback
  return (valid as readonly string[]).includes(raw) ? raw : fallback
}

/**
 * size 档位 → 上下内边距合计（px）。
 * 与 CSS token 对应：small=--oas-space-1(4px)×2、medium=--oas-space-2(8px)×2、large=--oas-space-3(12px)×2。
 * 仅作为 getComputedStyle 读不到时的回退（happy-dom/SSR 环境不解析 var()）。
 */
const PADDING_V_BY_SIZE: Record<string, number> = { small: 8, medium: 16, large: 24 }

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.wrapper {
  position: relative;
}
textarea {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--oas-control-height-md);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  transition: border-color var(--oas-transition-fast) var(--oas-ease-out),
    box-shadow var(--oas-transition-fast) var(--oas-ease-out);
}
textarea:hover {
  border-color: var(--oas-color-primary);
}
textarea:focus {
  outline: none;
  border-color: var(--oas-color-primary);
  box-shadow: var(--oas-focus-ring);
}
textarea:disabled {
  cursor: not-allowed;
  background: var(--oas-color-bg-disabled);
  color: var(--oas-color-text-disabled);
}
textarea:disabled:hover {
  border-color: var(--oas-color-border);
}
/* ---- size 尺寸档：字号/内边距/最小高度联动（默认 medium 走基础样式） ---- */
:host([data-size='small']) textarea {
  min-height: var(--oas-control-height-sm);
  padding: var(--oas-space-1) var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
}
:host([data-size='large']) textarea {
  min-height: var(--oas-control-height-lg);
  padding: var(--oas-space-3) var(--oas-space-4);
  font-size: var(--oas-font-size-lg);
}
/* ---- variant 形态（outlined 默认走基础样式） ---- */
:host([data-variant='filled']) textarea {
  background: var(--oas-color-bg-hover);
  border-color: transparent;
}
:host([data-variant='filled']) textarea:hover {
  border-color: var(--oas-color-primary);
}
:host([data-variant='filled']) textarea:disabled {
  background: var(--oas-color-bg-disabled);
}
:host([data-variant='borderless']) textarea {
  background: transparent;
  border-color: transparent;
}
:host([data-variant='borderless']) textarea:hover {
  border-color: transparent;
}
:host([data-variant='borderless']) textarea:disabled:hover {
  border-color: transparent;
}
/* ---- status 校验态：success / warning / error（宿主自设 aria-invalid 等效 error 视觉） ---- */
:host([data-status='success']) textarea {
  border-color: var(--oas-color-success);
}
:host([data-status='success']) textarea:focus {
  border-color: var(--oas-color-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-success) 30%, transparent);
}
:host([data-status='warning']) textarea {
  border-color: var(--oas-color-warning);
}
:host([data-status='warning']) textarea:focus {
  border-color: var(--oas-color-warning);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-warning) 30%, transparent);
}
:host([data-status='error']) textarea {
  border-color: var(--oas-color-danger);
}
:host([data-status='error']) textarea:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
:host([aria-invalid='true']) textarea {
  border-color: var(--oas-color-danger);
}
:host([aria-invalid='true']) textarea:focus {
  border-color: var(--oas-color-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--oas-color-danger) 30%, transparent);
}
/* clearable 时给右上角清空按钮让位 */
:host([clearable]) textarea {
  padding-right: var(--oas-space-8, 40px);
}
.clear-btn {
  position: absolute;
  top: var(--oas-space-2);
  right: var(--oas-space-2);
  appearance: none;
  border: none;
  background: transparent;
  padding: 2px;
  cursor: pointer;
  color: var(--oas-color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 2;
}
.clear-btn:hover {
  color: var(--oas-color-text-primary);
}
.clear-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.clear-btn[hidden] {
  display: none;
}
.clear-btn svg {
  width: 12px;
  height: 12px;
  display: block;
}
/* ---- type=input 单行形态：textarea 视觉压单行（保留 textarea 语义，复用全部扫描/IME/autosize 逻辑） ---- */
:host([type='input']) textarea {
  line-height: var(--oas-control-height-md);
  height: var(--oas-control-height-md);
  min-height: var(--oas-control-height-md);
  white-space: pre;
  overflow-x: auto;
  overflow-y: hidden;
  resize: none;
}
:host([type='input'][data-size='small']) textarea {
  height: var(--oas-control-height-sm);
  min-height: var(--oas-control-height-sm);
  line-height: var(--oas-control-height-sm);
}
:host([type='input'][data-size='large']) textarea {
  height: var(--oas-control-height-lg);
  min-height: var(--oas-control-height-lg);
  line-height: var(--oas-control-height-lg);
}
/* ---- 建议面板（fixed + computePosition：锚定 textarea，空间不足自动翻转/避让） ---- */
.panel {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-dropdown, 1000));
  background: var(--oas-color-bg);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--oas-color-overlay) 24%, transparent);
  padding: var(--oas-space-1);
  min-width: 160px;
  display: none;
}
.panel.open {
  display: block;
}
.panel-header {
  padding: var(--oas-space-2) var(--oas-space-3) var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.panel-footer {
  padding: var(--oas-space-1) var(--oas-space-3) var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.listbox {
  max-height: 240px;
  overflow-y: auto;
}
.option {
  padding: var(--oas-space-2) var(--oas-space-3);
  border-radius: var(--oas-radius-sm);
  cursor: pointer;
  font-size: var(--oas-font-size-md);
  color: var(--oas-color-text-primary);
}
.option:hover,
.option.active {
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
}
.option-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}
/* disabled 项：置灰不可选；hover/active 不高亮（键盘与 mousemove 已跳过，此处置顶兜底） */
.option[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.5;
}
.option[aria-disabled='true']:hover,
.option[aria-disabled='true'].active {
  background: transparent;
  color: var(--oas-color-text-primary);
}
.empty {
  padding: var(--oas-space-3);
  text-align: center;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
}
`

export class OASMentions extends OASElement {
  static override get observedAttributes(): string[] {
    return [
      'value',
      'options',
      'trigger',
      'placeholder',
      'disabled',
      'disabled-skip',
      'label',
      'readonly',
      'clearable',
      'loading',
      'split',
      'autosize',
      'min-rows',
      'max-rows',
      'placement',
      'size',
      'status',
      'variant',
      'type',
      'whole',
    ]
  }

  private ta: HTMLTextAreaElement | null = null
  private panel: HTMLElement | null = null
  private listbox: HTMLElement | null = null
  private clearBtn: HTMLButtonElement | null = null
  private _options: Option[] = []

  /** Vue/React 会把 options 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get options(): Option[] {
    return this._options
  }
  set options(value: Option[] | string) {
    this.setAttribute('options', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 触发符 property 通道（JS 传数组如 `el.trigger = ['@','#']`，JSON 反射到 attribute；trigger 与 DOM 无冲突）。
   *  Vue/React 传数组会走 property 通道；统一反射到 attribute 供 prefixes() 解析。 */
  get trigger(): string {
    return this.getAttr('trigger', '@')
  }
  set trigger(value: string | string[]) {
    this.setAttribute('trigger', typeof value === 'string' ? value : JSON.stringify(value))
  }

  /** 自定义本地过滤函数（JS property 通道，attribute 传不了函数）：
   *  `(query, option) => boolean`，query 为触发符后光标前的原始文本；置 null 回落默认 label‖value 小写 includes */
  filterOption: ((query: string, option: Option) => boolean) | null = null

  private activeIndex = -1
  private openState = false
  /** 当前触发符（prefix 数组中命中的那一项），null 表示无触发 */
  private activeTrigger: string | null = null
  /** 当前提及片段的起始下标（prefix 字符位置），-1 表示无触发 */
  private queryStart = -1
  /** prefix 之后、光标之前的关键词（原始大小写，未 trim） */
  private queryText = ''
  /** 已派发 oas-search 的指纹（prefix+query）：命中/变化才派发，光标重扫同段不重复 */
  private lastSearchKey: string | null = null
  /** IME 组合态：composition 期间不扫描不派发不键盘选择（中文输入刚需） */
  private composing = false
  /** 用户已编辑草稿：受控 value 属性变化时保护草稿不被陈旧 attribute 覆盖 */
  private draft = false
  /** 水合首帧的测量写入是否已延迟登记（autosize 高度依据 scrollHeight，SSR 无法预知真实内容高度） */
  private resizeRafScheduled = false
  private hydratedFirstFrameApplied = false
  /** aria-invalid 由 status=error 设置的所有权标志（清理时只移除自己设置的，不动宿主自设值） */
  private invalidByStatus = false

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="wrapper" part="wrapper">
        <textarea part="textarea" role="combobox" aria-autocomplete="list"
          aria-haspopup="listbox" aria-expanded="false" aria-controls="mention-list"></textarea>
        <button class="clear-btn" part="clear" type="button" hidden aria-label="">
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 4 L12 12 M12 4 L4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="panel" part="panel" aria-hidden="true">
          <div class="panel-header" part="header" hidden><slot name="header"></slot></div>
          <div class="listbox" part="listbox" role="listbox" id="mention-list"></div>
          <div class="panel-footer" part="footer" hidden><slot name="footer"></slot></div>
        </div>
      </div>
    `
  }

  /** 缓存节点引用 + 绑定输入/组合态/键盘/光标/焦点/清空/面板事件（render 与水合路径共用） */
  private bind(): void {
    this.ta = this.shadow.querySelector('textarea')
    this.panel = this.shadow.querySelector('.panel')
    this.listbox = this.shadow.querySelector('.listbox')
    this.clearBtn = this.shadow.querySelector('.clear-btn')

    this.ta?.addEventListener('input', () => this.handleInput())
    this.ta?.addEventListener('compositionstart', () => {
      this.composing = true
    })
    this.ta?.addEventListener('compositionend', () => {
      this.composing = false
      if (!this.ta) return
      // 组合确认后以最终文本补派发一次 input 并重扫（组合期间 input 为拼音中间态不派发）
      this.emit('input', { value: this.ta.value })
      this.scanMention()
    })
    this.ta?.addEventListener('keydown', (e: KeyboardEvent) => this.handleKey(e))
    this.ta?.addEventListener('keyup', (e: KeyboardEvent) => this.handleKeyUp(e))
    // 光标移动/落点重扫：箭头键移动（keyup 时 caret 已就位）与鼠标点击/拖放后按新 caret 重算开/关
    this.ta?.addEventListener('mouseup', () => {
      if (!this.injectDisabled() && !this.hasAttr('readonly')) this.scanMention()
    })
    this.ta?.addEventListener('focus', () => this.handleFocus())
    this.ta?.addEventListener('blur', () => this.handleBlur())
    // 面板/清空按钮 mousedown 阻止默认失焦：选项点击不收起输入焦点
    this.panel?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.panel?.addEventListener('click', (e: MouseEvent) => this.handlePanelClick(e))
    this.clearBtn?.addEventListener('mousedown', (e: MouseEvent) => e.preventDefault())
    this.clearBtn?.addEventListener('click', () => this.clearValue())
    this.onCleanup(() => document.removeEventListener('click', this.handleOutsideClick, true))
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（textarea/panel/listbox 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('textarea')) return false
    if (!this.shadow.querySelector('.panel')) return false
    if (!this.shadow.querySelector('.listbox')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 遗留属性名规范：旧 prefix（与 DOM 内建只读冲突，Vue 走 property 会吞数组值）迁移到 trigger
    this.normalizeLegacyAlias('trigger', 'prefix')
    this.parseOptions()
    const t = this.ta
    if (!t) return
    // 尺寸/形态/校验态镜像（size 就近读取 config-provider 注入，与全局密度联动）
    const size = normalizeChoice(this.injectValue('size', 'medium'), 'medium', VALID_SIZES)
    this.setAttribute('data-size', size)
    const variant = normalizeChoice(this.getAttr('variant', 'outlined'), 'outlined', VALID_VARIANTS)
    this.setAttribute('data-variant', variant)
    const type = normalizeChoice(this.getAttr('type', 'textarea'), 'textarea', VALID_TYPES)
    this.setAttribute('data-type', type)
    const status = normalizeChoice(this.getAttr('status', ''), '', VALID_STATUSES)
    if (status) this.setAttribute('data-status', status)
    else this.removeAttribute('data-status')
    // status=error 联动宿主 aria-invalid（所有权标志：清理时不动宿主自设的 aria-invalid）
    if (status === 'error') {
      if (!this.hasAttribute('aria-invalid')) this.invalidByStatus = true
      this.setAttribute('aria-invalid', 'true')
    } else if (this.invalidByStatus) {
      this.invalidByStatus = false
      this.removeAttribute('aria-invalid')
    }
    // aria-invalid 镜像到 combobox 承载元素（textarea）：读屏在可聚焦元素上播报无效态；
    // 表单族 oas-form 在宿主写 aria-invalid 时同样被镜像（CSS 宿主红边 + SR 双通道）
    if (this.hasAttribute('aria-invalid')) t.setAttribute('aria-invalid', 'true')
    else t.removeAttribute('aria-invalid')

    const value = this.getAttr('value', '')
    const placeholder = this.getAttr('placeholder', '')
    const disabled = this.injectDisabled()
    const readonly = this.hasAttr('readonly')
    // 受控同步：外部 value 与草稿一致视为宿主已确认（清草稿）；
    // 用户有未确认草稿时跳过覆盖（防 loading/options 等无关属性变化清掉正在输入的内容）
    if (t.value === value) this.draft = false
    else if (!this.draft) {
      t.value = value
      if (this.autosizeEnabled()) this.autoResize()
    }
    t.placeholder = placeholder
    t.disabled = disabled
    t.readOnly = readonly
    if (readonly) t.setAttribute('aria-readonly', 'true')
    else t.removeAttribute('aria-readonly')
    // 内置文案走 locale registry（label/placeholder 属性优先，setLocale 切换自动刷新）
    t.setAttribute('aria-label', this.getAttr('label', placeholder) || this.t('mentions.defaultLabel'))

    // autosize：高度由 min-rows/max-rows 约束；关闭时清内联高度还交 CSS。
    // 单行形态（type=input）恒锁高，autosize 对单行无意义——单行时 rows 固定 1，
    // 关闭 autosize 的动态增高（高度已由 :host([type='input']) CSS 锁单行）。
    if (type === 'input') {
      t.rows = 1
      this.resetHeight()
    } else {
      if (this.autosizeEnabled()) {
        t.rows = this.minRows()
        t.style.resize = 'none'
        this.maybeAutoResize()
      } else {
        this.resetHeight()
      }
    }
    this.syncClear()
    // 浮层开着时，options/loading/locale/插槽变化即时刷新列表
    if (this.openState) this.renderPanel()
  }

  // ---- 前缀/分隔符/尺寸解析 ----

  /** 触发符解析：trigger 支持单字符串或 JSON 数组（@/# 多触发符并存）；旧 prefix（与 DOM 内建冲突）经 update 迁移 */
  private prefixes(): string[] {
    const raw = this.getAttr('trigger', '@')
    if (raw === '') return []
    if (raw.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const arr = parsed.filter((p): p is string => typeof p === 'string' && p !== '')
          if (arr.length > 0) return arr
        }
      } catch {
        // 非 JSON 的原始字符串走单触发符
      }
    }
    return [raw]
  }

  /** 分隔符（默认空格；显式空属性视为默认）。选中插入/扫描断界/重复分隔判断共用 */
  private splitStr(): string {
    const s = this.getAttr('split', ' ')
    return s === '' ? ' ' : s
  }

  /** 单行形态（type=input）；textarea 视觉压单行，复用全部扫描/IME 逻辑 */
  private isSingleLine(): boolean {
    return this.getAttr('type', 'textarea') === 'input'
  }

  // ---- 触发扫描（naive/EP 模型：从光标倒走至分隔符/\n/\r 即停，命中 prefix 数组即开，不要求 prefix 前空白） ----

  private scanMention(): void {
    if (this.composing) return
    const t = this.ta
    if (!t) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const prefixes = this.prefixes()
    if (prefixes.length === 0) {
      this.close()
      return
    }
    const pos = t.selectionStart ?? t.value.length
    const head = t.value.slice(0, pos)
    // 断界：最后出现的 split /\n /\r 之后即当前「词」起点
    const split = this.splitStr()
    const delims = split.includes('\n') || split.includes('\r') ? [split] : [split, '\n', '\r']
    let chunkStart = 0
    let cut = -1
    for (const d of delims) {
      const i = head.lastIndexOf(d)
      if (i !== -1) cut = Math.max(cut, i + d.length)
    }
    if (cut !== -1) chunkStart = cut
    const chunk = head.slice(chunkStart)
    // 取离光标最近的命中 prefix（多触发符按出现位置取最后者）
    let bestStart = -1
    let bestPrefix = ''
    for (const p of prefixes) {
      let from = 0
      for (;;) {
        const idx = chunk.indexOf(p, from)
        if (idx === -1) break
        if (idx > bestStart) {
          bestStart = chunkStart + idx
          bestPrefix = p
        }
        from = idx + p.length
      }
    }
    if (bestStart === -1) {
      this.close()
      return
    }
    this.applyTrigger(bestStart, bestPrefix, t.value.slice(bestStart + bestPrefix.length, pos))
  }

  /** 触发落地：状态变化时重建列表；同段光标重扫（query/prefix 未变）只保持不重复渲染 */
  private applyTrigger(start: number, prefix: string, query: string): void {
    const changed = start !== this.queryStart || prefix !== this.activeTrigger || query !== this.queryText
    this.queryStart = start
    this.activeTrigger = prefix
    this.queryText = query
    if (!this.openState || changed) this.open()
    this.emitSearch()
  }

  /** oas-search：detail { query, prefix }；触发/关键词变化才派发（宿主自防抖） */
  private emitSearch(): void {
    const key = `${this.activeTrigger ?? ''}\u0001${this.queryText}`
    if (key === this.lastSearchKey) return
    this.lastSearchKey = key
    this.emit('search', { query: this.queryText, prefix: this.activeTrigger })
  }

  private open(): void {
    if (!this.openState) {
      this.openState = true
      document.addEventListener('click', this.handleOutsideClick, true)
    }
    this.renderPanel()
  }

  private close(): void {
    if (!this.openState) return
    this.openState = false
    this.syncOpen()
    document.removeEventListener('click', this.handleOutsideClick, true)
    this.activeTrigger = null
    this.queryStart = -1
    this.queryText = ''
    this.activeIndex = -1
    this.lastSearchKey = null
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    if (!path.includes(this) && !path.some((n) => n instanceof Node && this.shadow.contains(n))) {
      this.close()
    }
  }

  // ---- 输入 / 焦点 ----

  private handleInput(): void {
    const t = this.ta
    if (!t) return
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.draft = true
    if (this.autosizeEnabled()) this.autoResize()
    this.syncClear()
    if (this.composing) return
    this.emit('input', { value: t.value })
    this.scanMention()
  }

  private handleFocus(): void {
    const t = this.ta
    if (!t) return
    this.emit('focus', { value: t.value })
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    this.scanMention()
  }

  private handleBlur(): void {
    if (!this.ta) return
    this.emit('blur', { value: this.ta.value })
    this.close()
  }

  // ---- 键盘（IME 守卫 + disabled 跳过 + Home/End） ----

  private handleKey(e: KeyboardEvent): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    // IME 组合期：Enter/方向键交给输入法（确认候选/移动候选光标），不触发选中与导航
    if (this.composing || e.isComposing) return
    // whole 整段删除：浮层开启与否均需生效（删除一个已插入的提及项通常浮层已关闭），
    // 命中才拦截防止默认逐字符删；未命中交还原生行为。
    if (this.hasAttr('whole') && e.key === 'Backspace' && this.wholeBackspace()) {
      e.preventDefault()
      return
    }
    // 单行形态（type=input）：浮层关闭时 Enter 不换行（拦截；浮层开启时 Enter 已在下面选中逻辑处理）
    if (this.isSingleLine() && !this.openState && e.key === 'Enter') {
      e.preventDefault()
      return
    }
    if (!this.openState) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveActive(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveActive(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.jumpActive('start')
    } else if (e.key === 'End') {
      e.preventDefault()
      this.jumpActive('end')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const list = this.filtered()
      const option = list[this.activeIndex]
      if (option && !option.disabled) this.select(option)
      else this.close() // 无可用项 Enter 关浮层不误插
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.close()
    }
  }

  /** 光标移动重扫：左右键移动后按新 caret 重算（keyup 时 caret 已就位） */
  private handleKeyUp(e: KeyboardEvent): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    if (this.composing || e.isComposing) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.scanMention()
    // Home/End 仅在未拦截（浮层关闭时原生跳行首/尾）才需要重扫
    else if ((e.key === 'Home' || e.key === 'End') && !this.openState) this.scanMention()
  }

  /** ↑↓ 移动高亮：跳过 disabled 项循环找最近可用 */
  private moveActive(dir: 1 | -1): void {
    const list = this.filtered()
    const n = list.length
    if (n === 0) return
    if (!list.some((o) => !o.disabled)) return
    let idx = this.activeIndex
    for (let step = 0; step < n; step++) {
      idx = (idx + dir + n) % n
      if (!list[idx]!.disabled) break
    }
    this.activeIndex = idx
    this.syncActive()
    this.scrollActiveIntoView()
  }

  /** Home/End：跳首/尾可用项（全部 disabled 时不移动） */
  private jumpActive(edge: 'start' | 'end'): void {
    const list = this.filtered()
    if (list.length === 0) return
    const target =
      edge === 'start'
        ? list.findIndex((o) => !o.disabled)
        : list.length - 1 - [...list].reverse().findIndex((o) => !o.disabled)
    if (target < 0 || target >= list.length) return
    this.activeIndex = target
    this.syncActive()
    this.scrollActiveIntoView()
  }

  private scrollActiveIntoView(): void {
    const listbox = this.listbox
    if (!listbox) return
    const row = listbox.querySelector<HTMLElement>(`#opt-${this.activeIndex}`)
    if (!row) return
    const top = row.offsetTop
    const bottom = row.offsetTop + row.offsetHeight
    const vh = listbox.clientHeight
    const cur = listbox.scrollTop
    if (top < cur) listbox.scrollTop = Math.max(0, top)
    else if (bottom > cur + vh) listbox.scrollTop = Math.max(0, bottom - vh)
  }

  // ---- 过滤（默认 label‖value 小写 includes；el.filterOption 自定义） ----

  private filtered(): Option[] {
    if (typeof this.filterOption === 'function') {
      const q = this.queryText.trim()
      if (q === '') return this._options
      return this._options.filter((o) => this.filterOption?.(q, o) === true)
    }
    const q = this.queryText.trim().toLowerCase()
    if (!q) return this._options
    return this._options.filter(
      (o) =>
        String(o.label ?? '')
          .toLowerCase()
          .includes(q) || String(o.value).toLowerCase().includes(q),
    )
  }

  // ---- 面板渲染（loading 占位 / 空态插槽 / 富选项行；mousemove 增量不同步重建） ----

  /** header/footer 插槽可见性：light DOM 提供 [slot=...] 内容时显示（每次展开时同步） */
  private syncPanelSlots(): void {
    const header = this.shadow.querySelector<HTMLElement>('.panel-header')
    const footer = this.shadow.querySelector<HTMLElement>('.panel-footer')
    if (header) header.hidden = !this.querySelector('[slot="header"]')
    if (footer) footer.hidden = !this.querySelector('[slot="footer"]')
  }

  private renderPanel(): void {
    const listbox = this.listbox
    const panel = this.panel
    if (!listbox || !panel || !this.ta) return
    this.syncPanelSlots()
    listbox.innerHTML = ''
    this.activeIndex = -1

    // loading 占位态：宿主请求远端建议期间显示加载文案（role=status 播报）
    if (this.hasAttr('loading')) {
      const st = document.createElement('div')
      st.className = 'empty'
      st.setAttribute('role', 'status')
      st.textContent = this.t('loading.loading')
      listbox.appendChild(st)
      this.finishOpen()
      return
    }

    const list = this.filtered()
    // 空态：自定义 [slot="empty"] 优先，缺省回落 locale 文案
    if (list.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'empty'
      empty.setAttribute('role', 'status')
      const slot = document.createElement('slot')
      slot.setAttribute('name', 'empty')
      const def = document.createElement('span')
      def.className = 'empty-default'
      def.textContent = this.t('mentions.noMatch')
      if (this.querySelector('[slot="empty"]')) def.hidden = true
      empty.append(slot, def)
      listbox.appendChild(empty)
      this.finishOpen()
      return
    }
    const firstEnabled = list.findIndex((o) => !o.disabled)
    this.activeIndex = firstEnabled
    for (const [idx, option] of list.entries()) this.createOptionRow(option, idx)
    this.finishOpen()
  }

  /** 展开收尾：面板显隐 / aria / 高亮 / 定位（open 分支共用） */
  private finishOpen(): void {
    this.syncOpen()
    this.syncActive()
    this.positionPanel()
  }

  private syncOpen(): void {
    if (!this.panel || !this.ta) return
    this.panel.classList.toggle('open', this.openState)
    this.panel.setAttribute('aria-hidden', String(!this.openState))
    this.ta.setAttribute('aria-expanded', String(this.openState))
  }

  /** 高亮/aria 增量同步（不重建 DOM）：mousemove 与键盘移动共用 */
  private syncActive(): void {
    const listbox = this.listbox
    if (!listbox || !this.ta) return
    for (const row of listbox.querySelectorAll<HTMLElement>('.option[data-index]')) {
      row.classList.toggle('active', Number(row.getAttribute('data-index')) === this.activeIndex)
    }
    if (this.openState && this.activeIndex >= 0) {
      this.ta.setAttribute('aria-activedescendant', `opt-${this.activeIndex}`)
    } else {
      this.ta.removeAttribute('aria-activedescendant')
    }
  }

  /** 复用浮层定位引擎：锚定 textarea 下方，placement auto=下方优先 + 空间不足自动翻转；
   *  top/bottom=强制方向不翻转不避让（对齐 select 批 placement 契约） */
  private positionPanel(): void {
    if (!this.panel || !this.ta || !this.openState) return
    const anchorRect = this.ta.getBoundingClientRect()
    const panelRect = this.panel.getBoundingClientRect()
    const raw = this.getAttr('placement', 'auto')
    const forced = raw === 'top' || raw === 'bottom'
    const base = forced ? raw : 'bottom'
    const { top, left } = computePosition(
      anchorRect,
      panelRect,
      `${base}-start` as Placement,
      { width: window.innerWidth, height: window.innerHeight },
      8,
      !forced,
    )
    this.panel.style.top = `${top}px`
    this.panel.style.left = `${left}px`
  }

  /** 构建选项行：角色/aria-disabled/高亮/富 label 模板；点击走面板委托，mousemove 走增量同步 */
  private createOptionRow(option: Option, idx: number): void {
    const row = document.createElement('div')
    row.className = 'option'
    row.setAttribute('part', 'option')
    row.setAttribute('role', 'option')
    row.setAttribute('aria-disabled', String(option.disabled === true))
    row.id = `opt-${idx}` // aria-activedescendant 锚点（shadow 内 id 作用域隔离，无宿主冲突）
    row.setAttribute('data-index', String(idx))
    if (idx === this.activeIndex) row.classList.add('active')
    const label = document.createElement('span')
    label.className = 'option-label'
    this.fillOptionLabel(label, option)
    row.appendChild(label)
    // disabled 项 hover 不高亮：mousemove 跳过（键盘导航同语义）
    row.addEventListener('mousemove', () => {
      if (option.disabled || this.activeIndex === idx) return
      this.activeIndex = idx
      this.syncActive()
    })
    this.listbox!.appendChild(row)
    // 自定义选项渲染：宿主可监听改写 element（头像/富文本），机制与 select/auto-complete 一致
    this.emit('option-render', { index: idx, option, element: label })
  }

  /** 选项 label 渲染：template[slot="option"] 克隆 + [data-option-label] 绑定，缺省回落纯文本 */
  private fillOptionLabel(labelEl: HTMLElement, option: Option): void {
    const tpl = this.querySelector('template[slot="option"]')
    if (tpl instanceof HTMLTemplateElement) {
      labelEl.appendChild(tpl.content.cloneNode(true))
      const binder = labelEl.querySelector('[data-option-label]')
      if (binder) binder.textContent = String(option.label ?? '')
    } else {
      labelEl.textContent = String(option.label ?? '')
    }
  }

  /** 面板点击委托：命中选项行且未禁用才选中（header/footer/empty 插槽内容自然忽略） */
  private handlePanelClick(e: MouseEvent): void {
    const target = e.target as Element | null
    if (!target) return
    const row = target.closest<HTMLElement>('.option[data-index]')
    if (!row) return
    const idx = Number(row.getAttribute('data-index'))
    const option = this.filtered()[idx]
    if (option && !option.disabled) this.select(option)
  }

  /**
   * whole 整段删除（Backspace）：光标无选区时，检测光标前文本末尾是否命中「prefix+label」
   * 的完整提及段（label 与 options 项 label 判等，最长匹配——长成员名含空格也能一次删）。
   * 命中移除该提及段并派发 oas-whole-remove（detail { value, option, prefix }）。
   * 未命中返回 false 交还原生逐字符删除。分隔符（split）不动，交用户二次删除（避免误删正文）。
   */
  private wholeBackspace(): boolean {
    const t = this.ta
    if (!t || t.selectionStart !== t.selectionEnd) return false
    const pos = t.selectionStart ?? 0
    if (pos <= 0) return false
    const head = t.value.slice(0, pos)
    const prefixes = this.prefixes()
    let best: { start: number; label: string; option: Option; prefix: string } | null = null
    for (const prefix of prefixes) {
      for (const option of this._options) {
        const label = String(option.label ?? '')
        if (!label) continue
        const text = prefix + label
        if (head.length < text.length) continue
        if (head.slice(pos - text.length, pos) !== text) continue
        const start = pos - text.length
        // 最长匹配优先：优先删更长的提及段（防止「@aab」被 label="a" 误删成「@ab」）
        if (!best || start < best.start) best = { start, label, option, prefix }
      }
    }
    if (!best) return false
    const next = t.value.slice(0, best.start) + t.value.slice(pos)
    t.value = next
    this.draft = false
    this.setAttribute('value', next)
    const caret = best.start
    t.setSelectionRange(caret, caret)
    this.emit('whole-remove', {
      value: next,
      option: { ...best.option },
      prefix: best.prefix,
    })
    this.emit('change', { value: next })
    this.scanMention()
    t.focus()
    return true
  }

  /** 选中项并入文本：替换 prefix+关键词片段为 prefix+label，后文已以 split 开头则不再补分隔符 */
  private select(option: Option): void {
    const t = this.ta
    if (!t || this.queryStart === -1) return
    const prefix = this.activeTrigger ?? this.prefixes()[0] ?? '@'
    const start = this.queryStart
    const end = start + prefix.length + this.queryText.length
    const split = this.splitStr()
    const tail = t.value.slice(end)
    const spacer = tail.startsWith(split) ? '' : split
    const next = t.value.slice(0, start) + prefix + String(option.label ?? '') + spacer + tail
    t.value = next
    this.draft = false
    this.setAttribute('value', next)
    const caret = start + prefix.length + String(option.label ?? '').length + spacer.length
    t.setSelectionRange(caret, caret)
    // detail 带完整 option 原对象（含扩展字段）与触发符 prefix，宿主免反查
    this.emit('select', {
      value: option.value,
      label: option.label,
      option: { ...option },
      prefix,
    })
    this.emit('change', { value: next })
    this.close()
    t.focus()
  }

  /** clearable：清空文本与 value 并派发 oas-clear（detail 为清空前的值）+ oas-change（空值） */
  private clearValue(): void {
    if (this.injectDisabled() || this.hasAttr('readonly')) return
    const t = this.ta
    if (!t) return
    const prev = t.value
    this.draft = false
    t.value = ''
    this.removeAttribute('value')
    this.close()
    if (this.autosizeEnabled()) this.autoResize()
    this.syncClear()
    this.emit('clear', { value: prev })
    this.emit('change', { value: '' })
    t.focus()
  }

  /** 清空按钮可见性：clearable && 未禁用 && 非只读 && 文本非空（自由文本组件以可见文本为准） */
  private syncClear(): void {
    if (!this.clearBtn || !this.ta) return
    this.clearBtn.setAttribute('aria-label', this.t('input.clear'))
    this.clearBtn.hidden = !(
      this.hasAttr('clearable') &&
      !this.injectDisabled() &&
      !this.hasAttr('readonly') &&
      this.ta.value !== ''
    )
  }

  private parseOptions(): void {
    try {
      const parsed: unknown = JSON.parse(this.getAttr('options', '[]'))
      this._options = Array.isArray(parsed) ? parsed.filter((o): o is Option => o && typeof o.value === 'string') : []
    } catch {
      this._options = []
    }
  }

  // ---- autosize（对齐 textarea 批实现：min/max-rows 范围 clamp，max-rows="0" 不封顶） ----

  /** autosize 开启判定：规范命名 autosize */
  private autosizeEnabled(): boolean {
    return this.hasAttr('autosize')
  }

  private minRows(): number {
    const n = Number(this.getAttr('min-rows', '1'))
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
  }

  private maxRows(): number {
    const n = Number(this.getAttr('max-rows', '6'))
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 6
  }

  /** max-rows 显式 "0" = 不封顶 */
  private maxRowsUnlimited(): boolean {
    const raw = this.getAttr('max-rows', '')
    return raw !== '' && Number(raw) === 0
  }

  /** 行高估算：优先读计算样式，读不到走 font-size-md(14) × 1.5 默认 */
  private lineHeight(): number {
    const t = this.ta
    if (!t) return 21
    const cs = getComputedStyle(t)
    const lh = parseFloat(cs.lineHeight)
    const fs = parseFloat(cs.fontSize)
    if (Number.isFinite(lh) && lh > 0) {
      if (cs.lineHeight.endsWith('px')) return lh
      if (Number.isFinite(fs) && fs > 0) return lh * fs
      return lh * 14
    }
    if (Number.isFinite(fs) && fs > 0) return fs * 1.5
    return 21
  }

  /** 上下内边距合计：优先读计算样式（真实浏览器解析 token），读不到回退 size 档位映射 */
  private paddingV(): number {
    const t = this.ta
    if (t) {
      const cs = getComputedStyle(t)
      const pt = parseFloat(cs.paddingTop)
      const pb = parseFloat(cs.paddingBottom)
      if (Number.isFinite(pt) && Number.isFinite(pb) && pt + pb > 0) return pt + pb
    }
    const size = this.getAttribute('data-size') || this.getAttr('size', 'medium')
    return PADDING_V_BY_SIZE[size] ?? 16
  }

  /** autosize 测量写入的 DSD 水合适配：水合首帧延迟到 rAF 校正 */
  private maybeAutoResize(): void {
    if (this.wasHydrated() && !this.hydratedFirstFrameApplied) {
      this.scheduleHydratedResize()
      return
    }
    this.autoResize()
  }

  private scheduleHydratedResize(): void {
    if (this.resizeRafScheduled) return
    this.resizeRafScheduled = true
    const raf = requestAnimationFrame(() => {
      this.hydratedFirstFrameApplied = true
      this.autoResize()
    })
    this.onCleanup(() => cancelAnimationFrame(raf))
  }

  /**
   * 高度自适应（增量渲染：只改 style.height，不重建 DOM）。
   * 范围 clamp 到 [min-rows, max-rows]，超出 max-rows 出滚动条，空态回 min-rows；
   * max-rows="0" 显式无上限。
   */
  private autoResize(): void {
    const t = this.ta
    if (!t || !this.autosizeEnabled()) return
    const lh = this.lineHeight()
    const minRows = this.minRows()
    const minH = Math.round(lh * minRows + this.paddingV())
    t.style.minHeight = `${minH}px`
    if (this.maxRowsUnlimited()) {
      t.style.maxHeight = ''
      t.style.height = 'auto'
      t.style.height = `${Math.max(t.scrollHeight, minH)}px`
      t.style.overflowY = 'hidden'
      return
    }
    const maxRows = Math.max(this.maxRows(), minRows)
    const maxH = Math.round(lh * maxRows + this.paddingV())
    t.style.maxHeight = `${maxH}px`
    t.style.height = 'auto'
    const target = Math.min(Math.max(t.scrollHeight, minH), maxH)
    t.style.height = `${target}px`
    t.style.overflowY = t.scrollHeight > maxH ? 'auto' : 'hidden'
  }

  /** 退出 autosize 时清掉内联高度，交还给 CSS 控制 */
  private resetHeight(): void {
    const t = this.ta
    if (!t) return
    t.style.height = ''
    t.style.minHeight = ''
    t.style.maxHeight = ''
    t.style.overflowY = ''
  }

  /** label 点击聚焦委托：把焦点交给 shadow 内主输入（配合 oas-form-item 的 label 点击代理） */
  override focus(options?: FocusOptions): void {
    this.shadow.querySelector<HTMLTextAreaElement>('textarea')?.focus(options)
  }

  override blur(): void {
    this.shadow.querySelector<HTMLTextAreaElement>('textarea')?.blur()
  }
}
