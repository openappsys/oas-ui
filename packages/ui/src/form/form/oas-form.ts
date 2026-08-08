import { OASElement } from '@oas-ui/core'

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
    return ['rules']
  }

  private form: HTMLFormElement | null = null
  private rules: Rules = {}
  private errors: Record<string, string> = {}

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <form part="form" novalidate>
        <slot></slot>
      </form>
    `
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
    this.update()
  }

  protected override update(): void {
    this.parseRules()
  }

  private parseRules(): void {
    try {
      this.rules = JSON.parse(this.getAttr('rules', '{}'))
    } catch {
      this.rules = {}
    }
  }

  private collectFields(): Array<{ name: string; element: Element }> {
    const fields: Array<{ name: string; element: Element }> = []
    const selector = [
      'oas-input',
      'oas-textarea',
      'oas-select',
      'oas-auto-complete',
      'oas-cascader',
      'oas-tree-select',
      'oas-input-number',
      'oas-checkbox',
      'oas-radio',
    ].join(',')
    for (const element of this.querySelectorAll(selector)) {
      const name = element.getAttribute('name')
      if (name) fields.push({ name, element })
    }
    return fields
  }

  private readValue(element: Element): string {
    const value = element.getAttribute('value')
    if (value === null) return ''
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        return JSON.stringify(JSON.parse(value))
      } catch {
        return value
      }
    }
    return value
  }

  private validateAndSubmit(): void {
    const values: Record<string, string> = {}
    this.errors = {}
    const fields = this.collectFields()
    const allInvalid: Array<{ name: string; element: Element; message: string }> = []

    for (const { name, element } of fields) {
      const value = this.readValue(element)
      values[name] = value
      const rules = this.rules[name] ?? []
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
   * 在字段 host 后同步错误提示元素。字段在 light DOM（form shadow 内仅 <slot> 透传），
   * 阴影内 class 样式不可达，因此错误文本用内联 token 引用（自动跟随暗色/高对比主题）。
   * 校验失败时插入/更新，通过时移除。
   */
  private syncErrorText(element: Element, message: string | null): void {
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
