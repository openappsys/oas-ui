import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
}
.group {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
}
.btn {
  min-width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  font-size: var(--oas-font-size-sm);
  cursor: pointer;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  padding: 0 var(--oas-space-1);
}
.btn:hover:not(:disabled) {
  border-color: var(--oas-color-primary);
  color: var(--oas-color-primary);
}
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.page[aria-current='true'] {
  background: var(--oas-color-primary);
  border-color: var(--oas-color-primary);
  color: #fff;
}
.ellipsis {
  color: var(--oas-color-text-secondary);
  padding: 0 var(--oas-space-1);
  font-size: var(--oas-font-size-sm);
}
`

export class OASPagination extends OASElement {
  static override get observedAttributes(): string[] {
    return ['total', 'page-size', 'current', 'siblings']
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="group" part="group" role="navigation" aria-label=""></div>
    `
    this.update()
  }

  protected override update(): void {
    const group = this.shadow.querySelector('.group')
    if (!group) return
    // 内置文案走 locale registry（setLocale 切换自动刷新）
    group.setAttribute('aria-label', this.t('pagination.nav'))
    group.innerHTML = ''
    const total = Math.max(1, Number(this.getAttr('total', '0')) || 0)
    const pageSize = Math.max(1, Number(this.getAttr('page-size', '10')) || 10)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const current = Math.min(Math.max(Number(this.getAttr('current', '1')) || 1, 1), pageCount)
    const siblings = Number(this.getAttr('siblings', '1')) || 1

    const btn = (label: string, part: string, ariaLabel: string, disabled: boolean, onClick: () => void): HTMLButtonElement => {
      const b = document.createElement('button')
      b.className = 'btn'
      b.setAttribute('part', part)
      b.type = 'button'
      b.textContent = label
      b.setAttribute('aria-label', ariaLabel)
      b.disabled = disabled
      b.addEventListener('click', onClick)
      return b
    }

    group.appendChild(btn('‹', 'prev', this.t('pagination.prev'), current === 1, () => this.goto(current - 1)))

    const pagesToShow = new Set<number>()
    pagesToShow.add(1)
    pagesToShow.add(pageCount)
    for (let i = Math.max(2, current - siblings); i <= Math.min(pageCount - 1, current + siblings); i++) {
      pagesToShow.add(i)
    }
    const sorted = [...pagesToShow].sort((a, b) => a - b)
    let last = 0
    for (const page of sorted) {
      if (page - last > 1) {
        const ell = document.createElement('span')
        ell.className = 'ellipsis'
        ell.textContent = '…'
        group.appendChild(ell)
      }
      const p = btn(String(page), 'page', this.t('pagination.page', { page }), false, () => this.goto(page))
      p.setAttribute('aria-current', String(page === current))
      group.appendChild(p)
      last = page
    }

    group.appendChild(btn('›', 'next', this.t('pagination.next'), current === pageCount, () => this.goto(current + 1)))
  }

  private goto(page: number): void {
    this.setAttribute('current', String(page))
    this.emit('change', { page })
    this.update()
  }
}
