import { t } from '@oas-ui/i18n'
import { resolveMessageHost } from '../../floating/app/app-host.js'
import { OASModal, type ModalVariant, type ModalCloseSource } from './oas-modal.js'

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

interface ActiveEntry {
  el: OASModal
  dispose: () => void
}

/** 存活命令式对话框登记，destroyAllModal 统一收口 */
const active: ActiveEntry[] = []

/** 非法参数容错：非对象（null / undefined / 原始值 / 数组）一律视为空 options，不抛错 */
function normalizeOptions<T>(options: T | null | undefined | unknown): T {
  if (options != null && typeof options === 'object' && !Array.isArray(options)) {
    return options as T
  }
  return {} as T
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return value != null && typeof (value as { then?: unknown }).then === 'function'
}

/**
 * 通用 open：创建 oas-modal 并挂载。命令式对话框统一：
 * - role="alertdialog"（P24：命令式确认/语义变体语义升级，声明式保持 dialog）
 * - focus-ok（打开聚焦「确定」按钮，语义变体的唯一按钮）
 * - deferOkClose（确定点击不自动关，由本模块在 onOk resolve/reject 后决定关闭/保持）
 */
function createModal(extraAttr?: Record<string, string>): OASModal {
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
  const el = createModal()
  // 语义变体：对应图标 + 单「确定」按钮（取消按钮隐藏）
  if (variant) {
    el.setAttribute('type', variant)
    el.setAttribute('no-cancel', '')
  }
  const contentP = applyCommonAttrs(el, options)

  let disposed = false
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    // 仍可见时先移除 visible：触发组件 update() 还原来源焦点，再销毁 DOM
    if (el.hasAttribute('visible')) el.removeAttribute('visible')
    el.remove()
    const idx = active.findIndex((e) => e.el === el)
    if (idx >= 0) active.splice(idx, 1)
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

/** prompt 默认错误文案：走 locale（form.validationFailed，中英均有翻译） */
const PROMPT_DEFAULT_ERROR = 'form.validationFailed'

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
   * 输入框确认（prompt）：带输入控件的对话框，结果 resolve `{ value, action }`。
   * 校验失败（pattern / validator）时保持打开并显示错误；输入修正后自动清除可再提交。
   */
  prompt: (options?: PromptOptions): PromptHandle => {
    const opts = normalizeOptions<PromptOptions>(options)
    const el = createModal({
      // PB3：打开自动聚焦输入框（覆盖默认聚焦确定钮）
      'initial-focus': 'input, textarea',
    })
    if (opts.title !== undefined) el.setAttribute('title', opts.title)
    if (opts.okText !== undefined) el.setAttribute('ok-text', opts.okText)
    if (opts.cancelText !== undefined) el.setAttribute('cancel-text', opts.cancelText)
    if (opts.content !== undefined) {
      const p = document.createElement('p')
      p.textContent = opts.content
      el.appendChild(p)
    }

    // 输入控件 + 错误提示（light DOM；错误文案颜色/边框走 CSS 变量 token，含 dark 变体）
    const isTextarea = opts.inputType === 'textarea'
    const input = document.createElement(isTextarea ? 'textarea' : 'input') as HTMLInputElement &
      HTMLTextAreaElement
    if (!isTextarea) input.type = (opts.inputType ?? 'text') as HTMLInputElement['type']
    input.value = opts.inputValue ?? ''
    input.setAttribute('aria-invalid', 'false')
    if (opts.placeholder !== undefined) input.placeholder = opts.placeholder
    // 屏幕阅读器可读名：优先标题，其次占位文案
    const ariaLabel = opts.title ?? opts.placeholder ?? ''
    if (ariaLabel !== '') input.setAttribute('aria-label', ariaLabel)
    input.style.cssText =
      'width: 100%; box-sizing: border-box; padding: 6px 10px; font: inherit; ' +
      'border: 1px solid var(--oas-color-border-strong); border-radius: var(--oas-radius-md); ' +
      'background: var(--oas-color-bg); color: var(--oas-color-text-primary);'
    const err = document.createElement('div')
    err.className = 'oas-modal-prompt-error'
    err.id = 'oas-modal-prompt-error'
    err.hidden = true
    err.setAttribute('role', 'alert')
    err.style.cssText =
      'color: var(--oas-color-danger); font-size: var(--oas-font-size-sm); ' +
      'line-height: 1.5; min-height: 1.2em;'
    const wrap = document.createElement('div')
    wrap.className = 'oas-modal-prompt'
    wrap.style.cssText = 'margin-top: 12px; display: flex; flex-direction: column; gap: 4px;'
    wrap.append(input, err)
    el.appendChild(wrap)

    const showError = (message: string): void => {
      err.textContent = message
      err.hidden = false
      input.setAttribute('aria-invalid', 'true')
      input.setAttribute('aria-describedby', 'oas-modal-prompt-error')
      // danger 边框（错误态视觉）；走 token 含 dark 变体
      input.style.borderColor = 'var(--oas-color-danger)'
    }
    const hideError = (): void => {
      err.hidden = true
      input.setAttribute('aria-invalid', 'false')
      input.removeAttribute('aria-describedby')
      input.style.borderColor = ''
    }
    // PB1：输入修正后错误自动清除，可再提交
    input.addEventListener('input', hideError)

    // PB3：light DOM 输入控件在组件首 update 之后才挂载（组件聚焦判定时未见输入框），
    // 手动接管焦点覆盖默认聚焦确定钮
    input.focus()

    /** 校验：先 pattern（PG6）后 validator（PG4）；返回错误文案或 null（通过） */
    const validate = (value: string): string | null => {
      const pattern = opts.inputPattern
      if (pattern) {
        try {
          if (!new RegExp(pattern).test(value)) {
            return opts.inputErrorMessage ?? t(PROMPT_DEFAULT_ERROR)
          }
        } catch {
          // 非法正则跳过（容错，不阻断提交）
        }
      }
      const check = opts.validator
      if (!check) return null
      const result = check(value)
      if (result === true) return null
      if (result === false) return opts.inputErrorMessage ?? t(PROMPT_DEFAULT_ERROR)
      if (typeof result === 'string' && result !== '') return result
      return null
    }

    let disposed = false
    let resolved = false
    let resolveResult!: (result: PromptResult) => void
    // prompt 返回形态：Promise<PromptResult> & PromptHandle（既可 await 结果，也可句柄操控）
    const promise = new Promise<PromptResult>((res) => {
      resolveResult = res
    })
    const dispose = (): void => {
      if (disposed) return
      disposed = true
      if (el.hasAttribute('visible')) el.removeAttribute('visible')
      el.remove()
      const idx = active.findIndex((e) => e.el === el)
      if (idx >= 0) active.splice(idx, 1)
    }
    const settle = (result: PromptResult): void => {
      if (resolved) return
      resolved = true
      resolveResult(result)
    }

    const onSubmit = (): void => {
      if (disposed) return
      if (el.hasAttribute('loading')) return
      const invalid = validate(input.value)
      if (invalid !== null) {
        showError(invalid)
        return
      }
      hideError()
      const value = input.value
      const handler = opts.onOk
      if (!handler) {
        settle({ value, action: 'confirm' })
        dispose()
        return
      }
      // PB4：异步提交时确定按钮 loading（复用 deferOkClose 机制，loading 由模块设置）
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
      // PB2/A32：取消/✕/遮罩/Esc/编程关闭统一 resolve { value, action: 'cancel' }（不挂起）
      settle({ value: input.value, action: 'cancel' })
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
      update: (partial: Partial<PromptOptions>): void => {
        if (disposed) return
        Object.assign(opts, partial)
        if (partial.title !== undefined) el.setAttribute('title', partial.title)
        if (partial.okText !== undefined) el.setAttribute('ok-text', partial.okText)
        if (partial.cancelText !== undefined) el.setAttribute('cancel-text', partial.cancelText)
        if (partial.content !== undefined) {
          // content 更新：替换首个 p 的文本或重建
          const firstP = el.querySelector('p')
          if (firstP) firstP.textContent = partial.content
        }
        if (partial.inputValue !== undefined) input.value = partial.inputValue
        if (partial.placeholder !== undefined) input.placeholder = partial.placeholder
        if (partial.inputErrorMessage !== undefined && !err.hidden) {
          // 错误文案更新：已显示错误时刷新为默认（新配置）文案
          err.textContent = partial.inputErrorMessage
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
