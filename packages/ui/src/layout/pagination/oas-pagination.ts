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
.btn:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
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
.total {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
}
.size-select {
  height: var(--oas-control-height-sm);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  padding: 0 var(--oas-space-1);
  cursor: pointer;
}
.size-select:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
  border-color: var(--oas-color-primary);
}
.jumper {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-1);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  white-space: nowrap;
}
.jumper-input {
  width: var(--oas-control-height-sm);
  height: var(--oas-control-height-sm);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg);
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  text-align: center;
  padding: 0;
}
.jumper-input:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
  border-color: var(--oas-color-primary);
}
`

export class OASPagination extends OASElement {
  static override get observedAttributes(): string[] {
    return ['total', 'page-size', 'current', 'siblings', 'show-total', 'page-sizes', 'show-jumper']
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

    const btn = (
      label: string,
      part: string,
      ariaLabel: string,
      disabled: boolean,
      onClick: () => void,
    ): HTMLButtonElement => {
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

    // 总条数文案
    if (this.hasAttr('show-total')) {
      const totalSpan = document.createElement('span')
      totalSpan.className = 'total'
      totalSpan.setAttribute('part', 'total')
      totalSpan.textContent = this.t('pagination.total', { total })
      group.appendChild(totalSpan)
    }

    group.appendChild(
      btn('‹', 'prev', this.t('pagination.prev'), current === 1, () => this.goto(current - 1)),
    )

    const pagesToShow = new Set<number>()
    pagesToShow.add(1)
    pagesToShow.add(pageCount)
    for (
      let i = Math.max(2, current - siblings);
      i <= Math.min(pageCount - 1, current + siblings);
      i++
    ) {
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
      const p = btn(String(page), 'page', this.t('pagination.page', { page }), false, () =>
        this.goto(page),
      )
      p.setAttribute('aria-current', String(page === current))
      group.appendChild(p)
      last = page
    }

    group.appendChild(
      btn('›', 'next', this.t('pagination.next'), current === pageCount, () =>
        this.goto(current + 1),
      ),
    )

    // 每页条数下拉
    const sizes = this.parseSizes(this.getAttr('page-sizes', ''))
    if (sizes.length > 0) {
      const options = new Set(sizes)
      options.add(pageSize)
      const select = document.createElement('select')
      select.className = 'size-select'
      select.setAttribute('part', 'size')
      select.setAttribute('aria-label', this.t('pagination.sizes'))
      for (const size of [...options].sort((a, b) => a - b)) {
        const opt = document.createElement('option')
        opt.value = String(size)
        opt.textContent = this.t('pagination.sizePerPage', { size })
        select.appendChild(opt)
      }
      select.value = String(pageSize)
      select.addEventListener('change', () => {
        const next = Number(select.value)
        if (next > 0 && next !== pageSize) this.changePageSize(next)
      })
      group.appendChild(select)
    }

    // 快速跳转
    if (this.hasAttr('show-jumper')) {
      const jumper = document.createElement('span')
      jumper.className = 'jumper'
      jumper.setAttribute('part', 'jumper')
      const pre = document.createElement('span')
      pre.textContent = this.t('pagination.goto')
      const input = document.createElement('input')
      input.className = 'jumper-input'
      input.type = 'text'
      input.inputMode = 'numeric'
      input.autocomplete = 'off'
      input.setAttribute('aria-label', this.t('pagination.jumperInput'))
      const post = document.createElement('span')
      post.textContent = this.t('pagination.pageClassifier')
      jumper.append(pre, input, post)
      input.addEventListener('keydown', (e) => this.onJumperKeydown(e as KeyboardEvent, input))
      group.appendChild(jumper)
    }
  }

  private goto(page: number): void {
    this.setAttribute('current', String(page))
    this.emit('change', { page })
    this.update()
  }

  /** 切换每页条数：回到第 1 页并派发 { page: 1, pageSize } */
  private changePageSize(pageSize: number): void {
    this.setAttribute('page-size', String(pageSize))
    this.setAttribute('current', '1')
    this.emit('change', { page: 1, pageSize })
    this.update()
  }

  /** 快速跳转：越界夹取到 [1, pageCount]，派发 { page, pageSize } */
  private jumpTo(page: number, pageSize: number): void {
    const total = Math.max(1, Number(this.getAttr('total', '0')) || 0)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const target = Math.min(Math.max(page, 1), pageCount)
    this.setAttribute('current', String(target))
    this.emit('change', { page: target, pageSize })
    this.update()
  }

  private onJumperKeydown(e: KeyboardEvent, input: HTMLInputElement): void {
    if (e.key !== 'Enter') return
    const text = input.value.trim()
    if (text === '') return
    const raw = Number(text)
    if (!Number.isFinite(raw)) return
    const pageSize = Math.max(1, Number(this.getAttr('page-size', '10')) || 10)
    input.value = ''
    this.jumpTo(Math.floor(raw), pageSize)
  }

  /** 解析 page-sizes JSON 数组属性，非法/非数组返回空数组 */
  private parseSizes(raw: string): number[] {
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b)
    } catch {
      return []
    }
  }
}
