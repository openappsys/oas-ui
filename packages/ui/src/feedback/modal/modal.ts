import { resolveMessageHost } from '../../framework/app/app-host.js'
import { OASModal, type ModalVariant, type ModalCloseSource } from './oas-modal.js'
import { hasModalCapability } from './oas-modal-capability.js'

export interface ModalOptions {
  /** 标题文案（缺省则不显示标题） */
  title?: string
  /** 正文内容（纯文本，textContent 写入杜绝 HTML 注入） */
  content?: string
  /** 确定按钮文案；缺省走 locale `modal.ok` */
  okText?: string
  /** 取消按钮文案；缺省走 locale `modal.cancel` */
  cancelText?: string
  /**
   * 确定回调：返回 Promise 时 OK 按钮进入 loading（转圈、禁止重复触发），
   * resolve 后关闭对话框；reject 清除 loading、对话框保持打开（可重试或取消）。
   * 同步回调（void）等同无异步，点击确定立即关闭。
   */
  onOk?: () => void | Promise<unknown>
  /** 取消回调：取消按钮 / ✕ / 遮罩点击 / Esc 触发后调用；编程关闭（handle.close / destroyAllModal）不触发 */
  onCancel?: () => void
  /**
   * 遮罩点击回调：仅在点击遮罩时调用，先于 onCancel（P15）。
   * 与 onCancel 的区分：onMaskClick 只在 source === 'mask' 时触发，onCancel 覆盖全部非确定关闭。
   */
  onMaskClick?: () => void
}

/** prompt 输入类型：text（默认）/ password / number / textarea */
export type PromptInputType = 'text' | 'password' | 'number' | 'textarea'

export interface PromptOptions {
  /** 标题文案（缺省则不显示标题） */
  title?: string
  /** 正文内容（纯文本） */
  content?: string
  /** 确定按钮文案；缺省走 locale `modal.ok` */
  okText?: string
  /** 取消按钮文案；缺省走 locale `modal.cancel` */
  cancelText?: string
  /** 输入框初始值（PG1） */
  inputValue?: string
  /** 输入框占位文案（PG2） */
  placeholder?: string
  /** 输入类型（PG3）：text / password / number / textarea */
  inputType?: PromptInputType
  /** 字符串正则（PG6）：不匹配则校验失败（先 pattern 后 validator；非法正则跳过） */
  inputPattern?: string
  /** 校验失败默认错误文案（PG5）：validator 返回 false / pattern 不匹配时显示 */
  inputErrorMessage?: string
  /**
   * 校验函数（PG4）：返回 true 通过 / false（用默认错误文案）/ string（该 string 即错误文案）。
   * 校验失败时对话框保持打开（PB1），输入修正后错误自动清除可再提交。
   */
  validator?: (value: string) => boolean | string
  /** 确定回调：传入当前输入值；返回 Promise 时确定按钮 loading，resolve 后关闭 */
  onOk?: (value: string) => void | Promise<unknown>
  /** 取消回调：取消按钮 / ✕ / 遮罩 / Esc 触发；编程关闭不触发 */
  onCancel?: () => void
  /** 遮罩点击回调：先于 onCancel */
  onMaskClick?: () => void
}

/** prompt 结果：action 区分 'confirm'（确定）与 'cancel'（取消/✕/遮罩/Esc 统一归 cancel，PB2） */
export interface PromptResult {
  value: string
  action: 'confirm' | 'cancel'
}

/** options 选项模式（P34）：radio 单选 / checkbox 多选 / toggle 开关组 */
export type OptionsType = 'radio' | 'checkbox' | 'toggle'

/** options 单个选项 */
export interface OptionsItem {
  /** 展示文案（纯文本） */
  label: string
  /** 选中值（随结果回传） */
  value: string
  /** 初始选中（radio：显式指定/缺省选中首个可选项；checkbox/toggle：缺省全不选） */
  checked?: boolean
  /** 禁用该项（不可选，含键盘/点击） */
  disabled?: boolean
}

/** modal.options 配置（对齐 confirm/prompt 的选项子集） */
export interface OptionsOptions {
  /** 标题文案 */
  title?: string
  /** 正文内容（纯文本，渲染在选项组上方） */
  content?: string
  /** 确定按钮文案；缺省走 locale `modal.ok` */
  okText?: string
  /** 取消按钮文案；缺省走 locale `modal.cancel` */
  cancelText?: string
  /** 选项数据（缺失/空数组渲染空列表，确定仍可点——结果校验交给宿主） */
  items?: OptionsItem[]
  /** 选项模式；非法值回退 radio */
  type?: OptionsType
  /**
   * 确定回调：传入当前选中值（radio 为字符串，checkbox/toggle 为数组）；
   * 返回 Promise 时确定按钮 loading，resolve 后关闭。
   */
  onOk?: (value: string | string[]) => void | Promise<unknown>
  /** 取消回调：取消按钮 / ✕ / 遮罩 / Esc 触发；编程关闭不触发 */
  onCancel?: () => void
  /** 遮罩点击回调：先于 onCancel */
  onMaskClick?: () => void
}

/** options 结果：radio → value 为单个选中值（未选为空串）；checkbox/toggle → 选中值数组 */
export interface OptionsResult {
  value: string | string[]
  action: 'confirm' | 'cancel'
}

/** options 句柄：Promise 结果 + 编程操控（同 prompt 双形态） */
export type OptionsHandle = Promise<OptionsResult> & {
  /** 编程关闭当前对话框（结果 resolve 为当前选中值 + action:'cancel'，不挂起） */
  close: () => void
  /** 运行时更新标题 / 内容 / 按钮文案（增量） */
  update: (partial: Partial<OptionsOptions>) => void
}

export interface ModalHandle {
  /** 编程关闭当前对话框（不触发 onOk / onCancel / onMaskClick） */
  close: () => void
  /** 运行时更新标题 / 内容 / 按钮文案（增量，不影响已绑定回调） */
  update: (partial: Partial<ModalOptions>) => void
}

export interface PromptHandle {
  /** 编程关闭当前输入框（结果 resolve 为 { value, action: 'cancel' }，不挂起） */
  close: () => void
  /** 运行时更新标题 / 内容 / 按钮文案 / 输入框属性（增量） */
  update: (partial: Partial<PromptOptions>) => void
}

/**
 * prompt 能力包（feedback/modal/prompt）controller 对命令式层的服务面。
 *
 * OASModal 构造时经能力注册表（oas-modal-capability.js）注入 controller，核心仅保留
 * 本接口作为委托点：`modal.prompt` 检查能力已注册后，从宿主元素取回本接口并调用
 * openPrompt 执行完整输入确认流程。核心不实现任何 prompt 逻辑——未 import 能力包时
 * prompt 调用静默失效（返回 null）并在 dev 下告警一次（同值去重）。
 */
export interface ModalPromptCapability {
  /** 在当前宿主（命令式 prompt 专属的 oas-modal 实例）上执行完整输入确认流程 */
  openPrompt(options?: PromptOptions): PromptHandle
}

interface ActiveEntry {
  el: OASModal
  dispose: () => void
}

/** 存活命令式对话框登记，destroyAllModal 统一收口 */
const active: ActiveEntry[] = []

/** 非法参数容错：非对象（null / undefined / 原始值 / 数组）一律视为空 options，不抛错 */
export function normalizeOptions<T>(options: T | null | undefined | unknown): T {
  if (options != null && typeof options === 'object' && !Array.isArray(options)) {
    return options as T
  }
  return {} as T
}

export function isPromiseLike(value: unknown): value is Promise<unknown> {
  return value != null && typeof (value as { then?: unknown }).then === 'function'
}

/**
 * 通用 open：创建 oas-modal 并挂载。命令式对话框统一：
 * - role="alertdialog"（P24：命令式确认/语义变体语义升级，声明式保持 dialog）
 * - focus-ok（打开聚焦「确定」按钮，语义变体的唯一按钮）
 * - deferOkClose（确定点击不自动关，由本模块在 onOk resolve/reject 后决定关闭/保持）
 *
 * 导出供 prompt 能力包（feedback/modal/prompt）复用——共享生命周期不重复实现。
 */
export function createCommandModal(extraAttr?: Record<string, string>): OASModal {
  const el = document.createElement('oas-modal') as OASModal
  el.setAttribute('visible', '')
  el.setAttribute('role', 'alertdialog')
  el.setAttribute('focus-ok', '')
  el.deferOkClose = true
  if (extraAttr) {
    for (const [k, v] of Object.entries(extraAttr)) el.setAttribute(k, v)
  }
  // 挂最近 oas-app 容器（与消息族同通道），无则回退 document.body
  resolveMessageHost().appendChild(el)
  return el
}

/**
 * 命令式对话框统一销毁器（P3 destroy 时序）：
 * 先移除 visible 播关闭动画（还原来源焦点、淡出），动画结束（oas-closed）后再移除 DOM
 * 并解除存活登记；从未打开/已完全关闭则直接移除。创建即登记进 `active`（destroyAll 统一收口）。
 *
 * 导出供 prompt 能力包复用——避免能力包重复实现命令式层共享的关闭/销毁生命周期。
 */
export interface CommandModalScope {
  /** 是否已销毁（事件回调/句柄方法据此短路） */
  readonly disposed: boolean
  /** 销毁当前对话框（幂等） */
  dispose: () => void
}

export function trackCommandModal(el: OASModal): CommandModalScope {
  let disposed = false
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    const doRemove = (): void => {
      el.remove()
      const idx = active.findIndex((e) => e.el === el)
      if (idx >= 0) active.splice(idx, 1)
    }
    if (!el.hasAttribute('visible') && !el.opened && !el.closing) {
      doRemove()
      return
    }
    if (el.hasAttribute('visible')) el.removeAttribute('visible')
    el.addEventListener('oas-closed', doRemove, { once: true })
  }
  active.push({ el, dispose })
  return { get disposed(): boolean { return disposed }, dispose }
}

function applyCommonAttrs(el: OASModal, options: ModalOptions): HTMLParagraphElement | null {
  if (options.title !== undefined) el.setAttribute('title', options.title)
  if (options.okText !== undefined) el.setAttribute('ok-text', options.okText)
  if (options.cancelText !== undefined) el.setAttribute('cancel-text', options.cancelText)
  if (options.content !== undefined) {
    const p = document.createElement('p')
    p.textContent = options.content
    el.appendChild(p)
    return p
  }
  return null
}

function open(
  variant: ModalVariant | '',
  rawOptions?: ModalOptions,
): ModalHandle {
  const options = normalizeOptions<ModalOptions>(rawOptions)
  const el = createCommandModal()
  // 语义变体：对应图标 + 单「确定」按钮（取消按钮隐藏）
  if (variant) {
    el.setAttribute('type', variant)
    el.setAttribute('no-cancel', '')
  }
  const contentP = applyCommonAttrs(el, options)

  let disposed = false
  /**
   * 销毁（P3 destroy 时序）：先移除 visible 播关闭动画（还原来源焦点、淡出），
   * 动画结束（oas-closed）后再移除 DOM 与登记；从未打开/已完全关闭则直接移除。
   */
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    const doRemove = (): void => {
      el.remove()
      const idx = active.findIndex((e) => e.el === el)
      if (idx >= 0) active.splice(idx, 1)
    }
    if (!el.hasAttribute('visible') && !el.opened && !el.closing) {
      doRemove()
      return
    }
    if (el.hasAttribute('visible')) el.removeAttribute('visible')
    el.addEventListener('oas-closed', doRemove, { once: true })
  }

  const onOk = (): void => {
    if (disposed) return
    if (el.hasAttribute('loading')) return
    const handler = options.onOk
    if (!handler) {
      dispose()
      return
    }
    el.setAttribute('loading', '')
    const result = handler()
    if (!isPromiseLike(result)) {
      // 同步回调：等同无异步，立即关闭
      dispose()
      return
    }
    result.then(
      () => dispose(),
      () => {
        // 失败：清除 loading 保持打开，可重试或取消
        if (!disposed) el.removeAttribute('loading')
      },
    )
  }

  // 关闭链（A32/P15）：oas-close 带来源；programmatic 不触发回调；
  // 遮罩点击先 onMaskClick 后 onCancel；取消按钮 / ✕ / Esc 触发 onCancel
  const onClose = (e: Event): void => {
    if (disposed) return
    const source = (e as CustomEvent<{ source: ModalCloseSource }>).detail.source
    if (source === 'programmatic') {
      dispose()
      return
    }
    if (source === 'mask') options.onMaskClick?.()
    options.onCancel?.()
    dispose()
  }

  el.addEventListener('oas-ok', onOk)
  el.addEventListener('oas-close', onClose)
  active.push({ el, dispose })

  return {
    close: (): void => {
      if (disposed) return
      // 走组件 close 路径：移除 visible（还原来源焦点）→ 派发 oas-close(source=programmatic) → 清理
      el.close('programmatic')
    },
    update: (partial: Partial<ModalOptions>): void => {
      if (disposed) return
      Object.assign(options, partial)
      if (partial.title !== undefined) el.setAttribute('title', partial.title)
      if (partial.okText !== undefined) el.setAttribute('ok-text', partial.okText)
      if (partial.cancelText !== undefined) el.setAttribute('cancel-text', partial.cancelText)
      if (partial.content !== undefined && contentP) contentP.textContent = partial.content
    },
  }
}

/** prompt 默认错误文案：走 locale（form.validationFailed，中英均有翻译）——定义随 prompt
 *  能力包外置（oas-modal-prompt.ts），核心入口不含 prompt 文案依赖 */

// ===== P34 options 选项组样式（命令式 light DOM，注入一次全局共享；类名前缀隔离） =====
let optionsStyleInjected = false

const OPTIONS_STYLE = `
.oas-modal-opt {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2, 8px);
  padding: var(--oas-space-2, 8px) var(--oas-space-3, 12px);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md, 6px);
  cursor: pointer;
  font-size: var(--oas-font-size-md, 14px);
  color: var(--oas-color-text-primary);
  user-select: none;
}
.oas-modal-opt + .oas-modal-opt {
  margin-top: var(--oas-space-2, 8px);
}
.oas-modal-opt.is-disabled {
  opacity: 0.6;
  cursor: default;
}
.oas-modal-opt .oas-modal-opt-input {
  accent-color: var(--oas-color-primary);
}
.oas-modal-opt .oas-modal-opt-label {
  flex: 1;
  min-width: 0;
}
/* toggle 行：原生 checkbox 视觉隐藏，右侧渲染开关轨道 + 滑块 */
.oas-modal-opt.oas-modal-opt-toggle .oas-modal-opt-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.oas-modal-opt-track {
  position: relative;
  flex: 0 0 auto;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--oas-color-border-strong);
  transition: background var(--oas-transition-fast, 120ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
.oas-modal-opt-track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--oas-color-bg);
  transition: transform var(--oas-transition-fast, 120ms) var(--oas-ease-out, cubic-bezier(0.2, 0, 0.2, 1));
}
.oas-modal-opt.oas-modal-opt-toggle .oas-modal-opt-input:checked + .oas-modal-opt-track {
  background: var(--oas-color-primary);
}
.oas-modal-opt.oas-modal-opt-toggle .oas-modal-opt-input:checked + .oas-modal-opt-track::after {
  transform: translateX(16px);
}
.oas-modal-opt.oas-modal-opt-toggle .oas-modal-opt-input:focus-visible + .oas-modal-opt-track {
  box-shadow: var(--oas-focus-ring);
}
`

function ensureOptionsStyle(): void {
  if (optionsStyleInjected || typeof document === 'undefined') return
  optionsStyleInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-oas-modal-options', '')
  style.textContent = OPTIONS_STYLE
  ;(document.head ?? document.documentElement).appendChild(style)
}

/** options 实例序号（radio 分组 name 唯一性） */
let optionsSeq = 0

/** prompt 能力未 import 的告警文案（按需 ESM 消费者用；全量入口与 CDN 反馈族包已含能力，不会触发） */
const PROMPT_CAPABILITY_HINT = '[oas-modal] prompt 能力未启用：modal.prompt 需 import prompt 能力包后可用，当前调用已返回 null。请按需 import "@oas-ui/ui/feedback/modal/prompt"（全量入口 @oas-ui/ui 与 CDN 反馈族包已内含，无需额外引用）'

/** prompt 能力告警去重（同值去重，同控件惯例：页面级仅告警一次） */
const warnedPromptCapability = new Set<string>()

/** dev 告警：modal.prompt 被调用但 prompt 能力包未注入 */
function warnPromptNotImported(): void {
  if (warnedPromptCapability.has(PROMPT_CAPABILITY_HINT)) return
  warnedPromptCapability.add(PROMPT_CAPABILITY_HINT)
  console.warn(PROMPT_CAPABILITY_HINT)
}

export const modal = {
  /** 确认框：标题 + 内容 + 确定/取消双按钮 */
  confirm: (options?: ModalOptions): ModalHandle => open('', options),
  /** 信息确认框：info 图标 + 单「确定」按钮 */
  info: (options?: ModalOptions): ModalHandle => open('info', options),
  /** 成功确认框：success 图标 + 单「确定」按钮 */
  success: (options?: ModalOptions): ModalHandle => open('success', options),
  /** 警告确认框：warning 图标 + 单「确定」按钮 */
  warning: (options?: ModalOptions): ModalHandle => open('warning', options),
  /** 错误确认框：error 图标 + 单「确定」按钮 */
  error: (options?: ModalOptions): ModalHandle => open('error', options),
  /**
   * 输入框确认（prompt）：依赖 prompt 能力包（`@oas-ui/ui/feedback/modal/prompt`，import 即注册）。
   *
   * 已注册时委托宿主元素注入的 prompt controller 执行完整输入流程（输入控件 + pattern/validator
   * 校验 + 错误态 + `{ value, action }` 返回）；未 import 能力包时返回 `null` 并在 dev 下告警
   * 一次（同值去重，提示按需引入）——确认/提示类消费者不引入能力包则零 prompt machinery。
   */
  prompt: (options?: PromptOptions): PromptHandle => {
    if (!hasModalCapability('prompt')) {
      warnPromptNotImported()
      // 能力未启用：返回 null（类型面保持 PromptHandle；误用会在 dev 告警下即时暴露）
      return null as unknown as PromptHandle
    }
    const el = createCommandModal({
      // PB3：打开自动聚焦输入框（覆盖默认聚焦确定钮）
      'initial-focus': 'input, textarea',
    })
    const cap = el.getModalCapability<ModalPromptCapability>('prompt')
    if (!cap) {
      // 防御：注册表有名但宿主未注入（正常不会发生——能力模块 import 时元素构造即注入）
      warnPromptNotImported()
      trackCommandModal(el).dispose()
      return null as unknown as PromptHandle
    }
    return cap.openPrompt(options)
  },

  /**
   * 选项选择框（P34）：radio / checkbox / toggle 三种选项组内嵌于确认框，
   * 确定后结果 resolve `{ value, action }`（radio → 字符串；checkbox/toggle → 数组）。
   * 与 prompt 同形态：Promise 结果 & 句柄（close/update）双通道。
   */
  options: (rawOptions?: OptionsOptions): OptionsHandle => {
    const opts = normalizeOptions<OptionsOptions>(rawOptions)
    const items = Array.isArray(opts.items) ? opts.items : []
    const mode: OptionsType =
      opts.type === 'checkbox' || opts.type === 'toggle' ? opts.type : 'radio'
    ensureOptionsStyle()
    const el = createCommandModal()
    if (opts.title !== undefined) el.setAttribute('title', opts.title)
    if (opts.okText !== undefined) el.setAttribute('ok-text', opts.okText)
    if (opts.cancelText !== undefined) el.setAttribute('cancel-text', opts.cancelText)
    if (opts.content !== undefined) {
      const p = document.createElement('p')
      p.textContent = opts.content
      el.appendChild(p)
    }

    // 选项组（light DOM；原生 input 语义 + CSS 类走 token 含 dark 变体）
    const group = document.createElement('div')
    group.className = 'oas-modal-options'
    group.setAttribute('role', mode === 'radio' ? 'radiogroup' : 'group')
    if (opts.title !== undefined) group.setAttribute('aria-label', opts.title)
    const groupName = `oas-modal-options-${++optionsSeq}`
    const inputs: HTMLInputElement[] = []
    // 初始选中：显式 checked 优先（禁用项忽略）；radio 无任何显式 checked 时缺省首个可选项
    const explicitChecked = items.some((i) => !i.disabled && i.checked)
    let radioDefaultSet = false
    const wantChecked = (item: OptionsItem): boolean => {
      if (explicitChecked) return !item.disabled && Boolean(item.checked)
      if (mode === 'radio' && !item.disabled && !radioDefaultSet) {
        radioDefaultSet = true
        return true
      }
      return false
    }
    for (const item of items) {
      const label = document.createElement('label')
      label.className =
        'oas-modal-opt' + (mode === 'toggle' ? ' oas-modal-opt-toggle' : '')
      if (item.disabled) label.classList.add('is-disabled')
      const input = document.createElement('input')
      input.className = 'oas-modal-opt-input'
      if (mode === 'radio') {
        input.type = 'radio'
        input.name = groupName
      } else {
        input.type = 'checkbox'
      }
      input.value = item.value
      input.checked = wantChecked(item)
      input.disabled = Boolean(item.disabled)
      input.setAttribute('aria-label', item.label)
      inputs.push(input)
      label.appendChild(input)
      if (mode === 'toggle') {
        const track = document.createElement('span')
        track.className = 'oas-modal-opt-track'
        track.setAttribute('aria-hidden', 'true')
        label.appendChild(track)
      }
      const text = document.createElement('span')
      text.className = 'oas-modal-opt-label'
      text.textContent = item.label
      label.appendChild(text)
      group.appendChild(label)
    }
    el.appendChild(group)

    let disposed = false
    let resolved = false
    let resolveResult!: (result: OptionsResult) => void
    const promise = new Promise<OptionsResult>((res) => {
      resolveResult = res
    })
    const dispose = (): void => {
      if (disposed) return
      disposed = true
      const doRemove = (): void => {
        el.remove()
        const idx = active.findIndex((e) => e.el === el)
        if (idx >= 0) active.splice(idx, 1)
      }
      if (!el.hasAttribute('visible') && !el.opened && !el.closing) {
        doRemove()
        return
      }
      if (el.hasAttribute('visible')) el.removeAttribute('visible')
      el.addEventListener('oas-closed', doRemove, { once: true })
    }
    const settle = (result: OptionsResult): void => {
      if (resolved) return
      resolved = true
      resolveResult(result)
    }
    const readValue = (): string | string[] => {
      const checked = inputs.filter((i) => i.checked)
      if (mode === 'radio') return checked[0]?.value ?? ''
      return checked.map((i) => i.value)
    }

    const onSubmit = (): void => {
      if (disposed) return
      if (el.hasAttribute('loading')) return
      const value = readValue()
      const handler = opts.onOk
      if (!handler) {
        settle({ value, action: 'confirm' })
        dispose()
        return
      }
      el.setAttribute('loading', '')
      const result = handler(value)
      if (!isPromiseLike(result)) {
        settle({ value, action: 'confirm' })
        dispose()
        return
      }
      result.then(
        () => {
          settle({ value, action: 'confirm' })
          dispose()
        },
        () => {
          // 失败：清除 loading 保持打开，可重试或取消（结果不 settle）
          if (!disposed) el.removeAttribute('loading')
        },
      )
    }
    const onClose = (e: Event): void => {
      if (disposed) return
      const source = (e as CustomEvent<{ source: ModalCloseSource }>).detail.source
      if (source === 'mask') opts.onMaskClick?.()
      if (source !== 'programmatic') opts.onCancel?.()
      // 取消路径：返回当前选中值（用户已做出的选择不丢弃），action 归 cancel
      settle({ value: readValue(), action: 'cancel' })
      dispose()
    }
    el.addEventListener('oas-ok', onSubmit)
    el.addEventListener('oas-close', onClose)
    active.push({ el, dispose })

    return Object.assign(promise, {
      close: (): void => {
        if (disposed) return
        el.close('programmatic')
      },
      update: (partial: Partial<OptionsOptions>): void => {
        if (disposed) return
        Object.assign(opts, partial)
        if (partial.title !== undefined) el.setAttribute('title', partial.title)
        if (partial.okText !== undefined) el.setAttribute('ok-text', partial.okText)
        if (partial.cancelText !== undefined) el.setAttribute('cancel-text', partial.cancelText)
        if (partial.content !== undefined) {
          const firstP = el.querySelector('p')
          if (firstP) firstP.textContent = partial.content
        }
      },
    })
  },
}

/** 关闭并销毁全部命令式对话框实例 */
export function destroyAll(): void {
  while (active.length > 0) {
    active.pop()!.dispose()
  }
}
