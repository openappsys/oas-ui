import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  max-width: 100%;
  font-family: inherit;
}
label {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-md);
  line-height: 1.5;
  /* 长文本换行不溢出 */
  overflow-wrap: anywhere;
  white-space: normal;
}
label.clickable {
  cursor: pointer;
}
/* position="before"：星号显示在文本前 */
label.reverse {
  flex-direction: row-reverse;
}
.required {
  color: var(--oas-color-danger);
  line-height: 1;
  font-weight: 500;
}
.required[hidden] {
  display: none;
}
`

export class OASLabel extends OASElement {
  static override get observedAttributes(): string[] {
    return ['for', 'required', 'position']
  }

  private labelEl: HTMLElement | null = null
  private requiredEl: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <label part="label">
        <span part="text"><slot></slot></span>
        <span part="required" class="required" aria-hidden="true" hidden>*</span>
      </label>
    `
  }

  /** 缓存节点引用 + 绑定点击代理聚焦（render 与水合路径共用） */
  private bind(): void {
    this.labelEl = this.shadow.querySelector<HTMLElement>('[part="label"]')
    this.requiredEl = this.shadow.querySelector<HTMLElement>('[part="required"]')

    // 点击代理聚焦 for 指向的目标控件（跨 Shadow DOM 原生 label 关联不可用，手动代理）
    this.labelEl?.addEventListener('click', (e: MouseEvent) => {
      const forId = this.getAttr('for', '')
      if (!forId) return
      e.preventDefault()
      const target = document.getElementById(forId)
      if (target && typeof (target as HTMLElement).focus === 'function') {
        ;(target as HTMLElement).focus()
      }
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（label 元素存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="label"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    if (!this.labelEl) return
    const forId = this.getAttr('for', '')
    const required = this.hasAttr('required')
    const position = this.getAttr('position', 'after')

    if (forId) {
      this.labelEl.setAttribute('for', forId)
    } else {
      this.labelEl.removeAttribute('for')
    }
    this.labelEl.classList.toggle('clickable', forId !== '')
    this.labelEl.classList.toggle('reverse', position === 'before')
    this.labelEl.classList.add('wrap')
    if (this.requiredEl) this.requiredEl.hidden = !required
  }
}
