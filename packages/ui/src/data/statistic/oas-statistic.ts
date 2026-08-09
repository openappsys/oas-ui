import { OASElement } from '@oas-ui/core'
import { resolveLocale } from '../../form/calendar/date-grid.js'

const STYLE = `
:host {
  display: inline-block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-lg);
  font-variant-numeric: tabular-nums;
}
[part='statistic'] {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1);
}
[part='prefix'] {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
[part='suffix'] {
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-md);
}
[part='value'] {
  font-weight: 600;
}
.skeleton {
  width: 120px;
}
`

export class OASStatistic extends OASElement {
  static override get observedAttributes(): string[] {
    return ['value', 'precision', 'prefix', 'suffix', 'group-separator', 'loading']
  }

  /** Element 内建只读 getter prefix 会让 Vue 走 property 赋值；访问器遮蔽并反射到 attribute */
  override get prefix(): string {
    return this.getAttr('prefix', '')
  }
  override set prefix(value: string) {
    this.setAttribute('prefix', value)
  }

  protected override render(): void {
    this.shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="statistic" part="statistic">
        <span class="prefix" part="prefix"></span>
        <span class="value" part="value"></span>
        <span class="suffix" part="suffix"></span>
      </div>
    `
    this.update()
  }

  protected override update(): void {
    const stat = this.shadow.querySelector<HTMLElement>('[part="statistic"]')
    if (!stat) return
    const prefixEl = this.shadow.querySelector<HTMLElement>('[part="prefix"]')
    const valueEl = this.shadow.querySelector<HTMLElement>('[part="value"]')
    const suffixEl = this.shadow.querySelector<HTMLElement>('[part="suffix"]')
    if (!prefixEl || !valueEl || !suffixEl) return

    // 增量更新前缀/后缀文本（不重建骨架占位外的结构）
    prefixEl.textContent = this.getAttr('prefix', '')
    suffixEl.textContent = this.getAttr('suffix', '')

    if (this.hasAttr('loading')) {
      valueEl.replaceChildren(this.buildSkeleton())
      return
    }
    valueEl.replaceChildren()
    valueEl.textContent = this.formatNumber()
  }

  private buildSkeleton(): HTMLElement {
    // 复用 skeleton 组件做 loading 占位（无内联文字，避免屏幕阅读器误读）
    const skeleton = document.createElement('oas-skeleton')
    skeleton.setAttribute('active', '')
    skeleton.setAttribute('title', '')
    skeleton.setAttribute('rows', '0')
    skeleton.className = 'skeleton'
    return skeleton
  }

  private formatNumber(): string {
    const numeric = Number(this.getAttr('value', '0'))
    const precision = Math.max(0, Number(this.getAttr('precision', '0')) || 0)
    const useGrouping = this.getAttr('group-separator', 'true') !== 'false'
    const locale = resolveLocale(this)
    return new Intl.NumberFormat(locale, {
      useGrouping,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(numeric)
  }
}
