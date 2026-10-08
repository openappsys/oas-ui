import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  box-sizing: border-box;
  min-width: 0;
}
/* 全空态：宿主整体不显示（无布局足迹——.well 有固定高胶囊底，仅藏内段时空井仍占位） */
:host([data-empty]) {
  display: none;
}
:host([hidden]) {
  display: none;
}
.well {
  display: inline-flex;
  align-items: baseline;
  gap: var(--oas-space-1_5);
  min-width: 0;
  height: var(--oas-action-bar-well-height, 32px);
  align-items: center;
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-action-bar-well-bg, color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent));
  font-variant-numeric: tabular-nums;
}
.well-label {
  flex-shrink: 0;
  font-size: var(--oas-font-size-xs);
  opacity: 0.85;
  white-space: nowrap;
}
.well-label[hidden] {
  display: none;
}
.well-value {
  font-size: var(--oas-font-size-sm);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.well-value[hidden] {
  display: none;
}
.well-detail {
  font-size: var(--oas-font-size-xs);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.well-detail[hidden] {
  display: none;
}
`

/**
 * oas-statistic-well —— 通用统计读数井（label + value + detail）。
 *
 * 属性（kebab-case）：`label`、`value`、`detail`；空段隐藏（无空占位）。
 * 全空态（三段全缺）：宿主打 `data-empty` 反射并整体不显示（无布局足迹，不留固定高胶囊）。
 *
 * a11y：井 `aria-live="polite"`（读数变化可被读屏感知）；数值表格数字体对齐。
 */
export class OASStatisticWell extends OASElement {
  static override get observedAttributes(): string[] {
    return ['label', 'value', 'detail', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="well" part="well" aria-live="polite"><span class="well-label" part="well-label" hidden></span><span class="well-value" part="well-value" hidden></span><span class="well-detail" part="well-detail" hidden></span></div>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（well 部件存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="well"]')) return false
    return true
  }

  protected override update(): void {
    this.toggleAttribute('data-rtl', isRtl(this))
    let hasContent = false
    for (const [part, attr] of [
      ['well-label', 'label'],
      ['well-value', 'value'],
      ['well-detail', 'detail'],
    ] as const) {
      const el = this.shadow.querySelector<HTMLElement>(`[part="${part}"]`)
      if (!el) continue
      const text = this.getAttr(attr, '')
      el.textContent = text
      el.hidden = text === ''
      if (text !== '') hasContent = true
    }
    // 全空态：宿主打 data-empty（:host([data-empty]) display:none 整体退场）——
    // 回归：空井曾留固定高胶囊（32px 圆角底）占布局
    this.toggleAttribute('data-empty', !hasContent)
  }
}
