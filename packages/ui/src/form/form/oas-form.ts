import { OASElement } from '@oas-ui/core'

/** 表单控件读取器：返回该控件的表单值（字符串形态；复杂控件返回 JSON 字符串） */
type FormControlReader = (el: Element) => string

/**
 * 表单控件注册表：collectFields 收集这些 tag 下带 `name` 的元素，并用其读取器取值。
 * 内置常用控件 + 特殊通道（transfer 用 model-value、switch 用 checked 态），可 registerFormControl 扩展。
 */
const FORM_CONTROLS = new Map<string, FormControlReader>()

/** 值安全归一：`[`/`{` 前缀（数组/对象 JSON）重新 stringify，保持合法 JSON */
function normalizeValue(raw: string): string {
  if (raw === '') return ''
  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      return JSON.stringify(JSON.parse(raw))
    } catch {
      return raw
    }
  }
  return raw
}

const defaultReader: FormControlReader = (el) => normalizeValue(el.getAttribute('value') ?? '')

function register(tags: string[], reader?: FormControlReader): void {
  for (const t of tags) FORM_CONTROLS.set(t, reader ?? defaultReader)
}

// 内置常用控件（默认读 value 属性）
register([
  'oas-input',
  'oas-textarea',
  'oas-select',
  'oas-auto-complete',
  'oas-cascader',
  'oas-tree-select',
  'oas-input-number',
  'oas-checkbox',
  'oas-radio',
  'oas-date-picker',
  'oas-slider',
  'oas-rate',
  'oas-pin-input',
  'oas-dynamic-tags',
  'oas-combobox',
])
// 特殊 value 通道
register(['oas-transfer'], (el) => normalizeValue(el.getAttribute('model-value') ?? ''))
register(['oas-switch'], (el) => (el.hasAttribute('checked') ? 'true' : 'false'))

/** 注册额外的表单控件（供自定义/未内置控件被 collectFields 收集）；返回注销函数 */
export function registerFormControl(tagName: string, reader?: (el: Element) => string | null): () => void {
  const tag = tagName.toLowerCase()
  FORM_CONTROLS.set(tag, reader ? (el) => reader(el) ?? '' : defaultReader)
  return () => FORM_CONTROLS.delete(tag)
}

interface Rule {
  required?: boolean
  message?: string
  minLength?: number
  maxLength?: number
  pattern?: string
}

type Rules = Record<string, Rule[]>

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
form {
  display: block;
}
`

export class OASForm extends OASElement {
  static override get observedAttributes(): string[] {
    return ['rules', 'layout', 'gap', 'label-align', 'label-width', 'inline']
  }

  private form: HTMLFormElement | null = null
  private _rules: Rules = {}

  /** Vue/React 会把 rules 识别为实例属性走 property 赋值；setter 反射到 attribute 统一解析链路 */
  get rules(): Rules {
    return this._rules
  }
  set rules(value: Rules | string) {
    this.setAttribute('rules', typeof value === 'string' ? value : JSON.stringify(value))
  }
  private errors: Record<string, string> = {}

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <form part="form" novalidate>
        <slot></slot>
      </form>
    `
  }

  /** 缓存节点引用 + 绑定提交/字段值同步事件（render 与水合路径共用） */
  private bind(): void {
    this.form = this.shadow.querySelector('form')
    this.form?.addEventListener('submit', (e: SubmitEvent) => {
      e.preventDefault()
      this.validateAndSubmit()
    })
    this.addEventListener('oas-input', ((e: CustomEvent<{ value: string }>) => {
      const target = e.composedPath()[0]
      if (target instanceof Element && this.contains(target)) {
        target.setAttribute('value', String(e.detail.value))
      }
    }) as EventListener)
    this.addEventListener('oas-change', ((e: CustomEvent<{ value: unknown }>) => {
      const target = e.composedPath()[0]
      if (target instanceof Element && this.contains(target)) {
        const v = e.detail.value
        target.setAttribute('value', typeof v === 'string' ? v : JSON.stringify(v))
      }
    }) as EventListener)
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（form 元素存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('form')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.parseRules()
    this.applyLayout()
  }

  /**
   * 布局策略（优先级：inline > layout）：
   * - inline：form 元素为可换行 flex 行，项间距取 gap（默认 var(--oas-space-4)），
   *   标签强制左侧、label-width 自动（由 form-item 感知本属性自行适配）；
   * - layout="grid"：form 元素为 24 列 grid（gap 生效）；
   * - 其他值（含非法值）回退 vertical 块级。
   * 布局属性变化时通知各 form-item 重刷感知。
   */
  private applyLayout(): void {
    if (!this.form) return
    if (this.hasAttr('inline')) {
      this.form.style.display = 'flex'
      this.form.style.flexWrap = 'wrap'
      this.form.style.alignItems = 'flex-start'
      this.form.style.gap = this.getAttr('gap', 'var(--oas-space-4)')
      // 行内强制标签左侧；布局以 CSS 变量暴露，供消费者/主题层读取
      this.style.setProperty('--oas-form-layout', 'inline')
      this.style.setProperty('--oas-form-label-align', 'left')
    } else {
      this.style.removeProperty('--oas-form-layout')
      const layout = this.getAttr('layout', 'vertical')
      if (layout === 'grid') {
        this.form.style.display = 'grid'
        this.form.style.gridTemplateColumns = 'repeat(24, 1fr)'
        this.form.style.gap = this.getAttr('gap', '0')
        this.style.setProperty('--oas-form-layout', 'grid')
      } else {
        this.form.style.display = 'block'
        this.form.style.flexWrap = ''
        this.form.style.alignItems = ''
        this.form.style.gridTemplateColumns = ''
        this.form.style.gap = ''
        this.style.setProperty('--oas-form-layout', 'vertical')
      }
      // label-align 以 CSS 变量暴露（默认 top），供消费者/主题层读取；form-item 自身走 closest 读取
      const labelAlign = this.getAttr('label-align', 'top')
      if (labelAlign === 'left' || labelAlign === 'right' || labelAlign === 'top') {
        this.style.setProperty('--oas-form-label-align', labelAlign)
      } else {
        this.style.setProperty('--oas-form-label-align', 'top')
      }
    }
    for (const item of this.querySelectorAll('oas-form-item')) {
      ;(item as unknown as { refreshLayout?: () => void }).refreshLayout?.()
    }
  }

  private parseRules(): void {
    try {
      this._rules = JSON.parse(this.getAttr('rules', '{}'))
    } catch {
      this._rules = {}
    }
  }

  private collectFields(): Array<{ name: string; element: Element }> {
    const fields: Array<{ name: string; element: Element }> = []
    const selector = [...FORM_CONTROLS.keys()].join(',')
    for (const element of this.querySelectorAll(selector)) {
      const name = element.getAttribute('name')
      if (name) fields.push({ name, element })
    }
    return fields
  }

  private readValue(element: Element): string {
    const reader = FORM_CONTROLS.get(element.tagName.toLowerCase()) ?? defaultReader
    return reader(element)
  }

  private validateAndSubmit(): void {
    const values: Record<string, string> = {}
    this.errors = {}
    const fields = this.collectFields()
    const allInvalid: Array<{ name: string; element: Element; message: string }> = []

    for (const { name, element } of fields) {
      const value = this.readValue(element)
      values[name] = value
      const rules = this._rules[name] ?? []
      if (element.hasAttribute('disabled')) continue
      for (const rule of rules) {
        let failed = false
        if (rule.required && value === '') failed = true
        if (rule.minLength !== undefined && value.length < rule.minLength) failed = true
        if (rule.maxLength !== undefined && value.length > rule.maxLength) failed = true
        if (rule.pattern && value !== '') {
          try {
            if (!new RegExp(rule.pattern).test(value)) failed = true
          } catch {
            failed = false
          }
        }
        if (failed) {
          // rule.message 优先，缺省走 locale registry 默认文案（setLocale 切换自动生效）
          this.errors[name] = rule.message ?? this.t('form.validationFailed')
          allInvalid.push({ name, element, message: this.errors[name]! })
          break
        }
      }
    }

    for (const { name, element } of fields) {
      const invalid = name in this.errors
      if (invalid) element.setAttribute('aria-invalid', 'true')
      else element.removeAttribute('aria-invalid')
      this.syncErrorText(element, invalid ? this.errors[name]! : null)
    }

    if (allInvalid.length === 0) {
      this.emit('submit', { values })
    } else {
      this.emit('validate-fail', { errors: this.errors, values })
    }
  }

  /**
   * 同步错误提示。字段被 oas-form-item 包裹时写入 form-item 的错误位（shadow 内更新）；
   * 裸字段保持既有行为——在字段 host 后插入内联 token 样式 div（自动跟随暗色/高对比主题）。
   * 校验失败时插入/更新，通过时移除。
   */
  private syncErrorText(element: Element, message: string | null): void {
    const item = element.closest('oas-form-item') as
      | (Element & { setError?: (m: string | null) => void })
      | null
    if (item?.setError) {
      item.setError(message)
      return
    }
    const next = element.nextElementSibling
    const existing = next && next.classList.contains('error-text') ? (next as HTMLElement) : null
    if (message === null) {
      existing?.remove()
      return
    }
    const el = existing ?? document.createElement('div')
    if (!existing) {
      el.className = 'error-text'
      el.style.color = 'var(--oas-color-danger)'
      el.style.fontSize = 'var(--oas-font-size-sm)'
      el.style.marginTop = 'var(--oas-space-1)'
      element.insertAdjacentElement('afterend', el)
    }
    el.textContent = message
  }

  getErrors(): Record<string, string> {
    return { ...this.errors }
  }
}
