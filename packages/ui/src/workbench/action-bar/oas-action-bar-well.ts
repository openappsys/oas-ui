import { OASElement } from '@oas-ui/core'
import { isRtl } from '../../shared/direction.js'

const STYLE = `
:host {
  display: inline-flex;
  font-family: inherit;
  box-sizing: border-box;
  min-width: 0;
  max-width: var(--oas-action-bar-well-max-width, 320px);
}
:host([hidden]) {
  display: none;
}
.well {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  height: var(--oas-action-bar-well-height, 32px);
  padding: 0 var(--oas-space-2);
  border-radius: var(--oas-radius-full, 999px);
  background: var(--oas-action-bar-well-bg, color-mix(in srgb, var(--oas-color-on-ink) 10%, transparent));
}
/* 井内读数：表格数字体（时间码/统计对齐惯例；具体内容由子件/宿主填充） */
.well ::slotted(*) {
  font-variant-numeric: tabular-nums;
  flex-shrink: 1;
  min-width: 0;
}
`

/**
 * oas-action-bar-well —— 读数井容器（等宽、圆角胶囊、max-width 开口）。
 *
 * 属性（kebab-case）：
 * - `max-width`：井最大宽度（number，px；默认 320，非法值忽略，负值 clamp 到 0）
 *
 * 内容：默认插槽（oas-statistic-well / oas-task-progress-well 或宿主自定义读数）。
 */
export class OASActionBarWell extends OASElement {
  static override get observedAttributes(): string[] {
    return ['max-width', 'dir']
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="well" part="well"><slot></slot></div>
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
    // max-width 属性通道：合法非负数写入内联变量；非法忽略；负值 clamp 0
    const raw = this.getAttr('max-width', '').trim()
    const n = Number(raw)
    if (raw !== '' && Number.isFinite(n)) {
      this.style.setProperty('--oas-action-bar-well-max-width', `${Math.max(0, n)}px`)
    } else {
      this.style.removeProperty('--oas-action-bar-well-max-width')
    }
  }
}
