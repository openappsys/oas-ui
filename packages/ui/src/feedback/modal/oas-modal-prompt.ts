import type { ReactiveController } from '@oas-ui/core'
import { t } from '@oas-ui/i18n'
import type { OASModal, ModalCloseSource } from './oas-modal.js'
import {
  normalizeOptions,
  trackCommandModal,
  isPromiseLike,
  type ModalPromptCapability,
  type PromptOptions,
  type PromptResult,
  type PromptHandle,
} from './modal.js'

/**
 * 输入确认（prompt）能力包：把 prompt machinery（输入控件构建 + validator/inputPattern 校验 +
 * 错误态 + `{ value, action }` 返回）从 modal 命令式层外置为 ReactiveController，经能力注册表
 * （oas-modal-capability.js）注入宿主 OASModal。
 *
 * 与 table 行内编辑（data/table/edit）同构的能力分包：本模块只被 prompt 子路径入口
 * （feedback/modal/prompt，import 即注册）引用——未 import 时核心入口（feedback/modal）
 * 不含本模块任何代码路径，modal.prompt 静默失效并 dev 告警。
 *
 * 差异点：prompt 是命令式一次性会话——宿主元素由命令式层（modal.ts 的 createCommandModal）
 * 按次创建并连接，本 controller 在宿主构造时注入、绑定该元素执行完整输入流程。
 * 与 confirm 共用的生命周期（元素创建/挂载/loading/关闭销毁/焦点、destroyAll 收口）不在此
 * 重复实现：经 modal.js 导出的 createCommandModal / trackCommandModal / isPromiseLike 复用。
 */

/** prompt 默认错误文案：走 locale（form.validationFailed，中英均有翻译） */
const PROMPT_DEFAULT_ERROR = 'form.validationFailed'

export class PromptController implements ReactiveController, ModalPromptCapability {
  constructor(private readonly host: OASModal) {}

  /** 宿主断开连接：prompt 会话状态在 openPrompt 闭包内、随宿主销毁回收，无跨会话残留需清理 */
  hostDisconnected(): void {
    // no-op：对齐 ReactiveController 注入协议的生命周期钩子
  }

  /**
   * 完整输入确认流程（由 modal.prompt 经能力接口委托）：
   * - 标题/按钮文案/正文内容写入宿主；输入控件 + 错误提示构建于 light DOM（body slot）
   * - PB3 打开自动聚焦输入框；PB1 输入修正自动清除错误可再提交
   * - 校验先 pattern（PG6）后 validator（PG4），失败保持打开并显示错误（danger 边框 + aria-invalid）
   * - 提交成功 / 取消路径统一 settle `{ value, action }`（PB2/A32，取消不挂起）
   * - 异步 onOk 确定按钮 loading（PB4，复用宿主 loading 属性 + deferOkClose 机制）
   */
  openPrompt(rawOptions?: PromptOptions): PromptHandle {
    const opts = normalizeOptions<PromptOptions>(rawOptions)
    const el = this.host

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

    // 生命周期/销毁与 destroyAll 收口复用命令式层（不重复实现 P3 destroy 时序）
    const scope = trackCommandModal(el)
    let resolved = false
    let resolveResult!: (result: PromptResult) => void
    // prompt 返回形态：Promise<PromptResult> & PromptHandle（既可 await 结果，也可句柄操控）
    const promise = new Promise<PromptResult>((res) => {
      resolveResult = res
    })
    const settle = (result: PromptResult): void => {
      if (resolved) return
      resolved = true
      resolveResult(result)
    }

    const onSubmit = (): void => {
      if (scope.disposed) return
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
        scope.dispose()
        return
      }
      // PB4：异步提交时确定按钮 loading（复用 deferOkClose 机制，loading 由本模块设置）
      el.setAttribute('loading', '')
      const result = handler(value)
      if (!isPromiseLike(result)) {
        settle({ value, action: 'confirm' })
        scope.dispose()
        return
      }
      result.then(
        () => {
          settle({ value, action: 'confirm' })
          scope.dispose()
        },
        () => {
          // 失败：清除 loading 保持打开，可重试或取消（结果不 settle）
          if (!scope.disposed) el.removeAttribute('loading')
        },
      )
    }

    const onClose = (e: Event): void => {
      if (scope.disposed) return
      const source = (e as CustomEvent<{ source: ModalCloseSource }>).detail.source
      if (source === 'mask') opts.onMaskClick?.()
      if (source !== 'programmatic') opts.onCancel?.()
      // PB2/A32：取消/✕/遮罩/Esc/编程关闭统一 resolve { value, action: 'cancel' }（不挂起）
      settle({ value: input.value, action: 'cancel' })
      scope.dispose()
    }

    el.addEventListener('oas-ok', onSubmit)
    el.addEventListener('oas-close', onClose)

    return Object.assign(promise, {
      close: (): void => {
        if (scope.disposed) return
        el.close('programmatic')
      },
      update: (partial: Partial<PromptOptions>): void => {
        if (scope.disposed) return
        Object.assign(opts, partial)
        if (partial.title !== undefined) el.setAttribute('title', partial.title)
        if (partial.okText !== undefined) el.setAttribute('ok-text', partial.okText)
        if (partial.cancelText !== undefined) el.setAttribute('cancel-text', partial.cancelText)
        if (partial.content !== undefined) {
          // content 更新：替换首个 p 的文本（prompt 正文段落始终是首个 p）
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
  }
}

/** 便捷：构造 prompt 能力 controller（供能力注册表注入用） */
export function createPromptController(host: OASModal): PromptController {
  return new PromptController(host)
}
