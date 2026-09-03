import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: inline-block;
  align-self: center;
  flex-shrink: 0;
  width: 1px;
  height: var(--oas-toolbar-separator-length, 16px);
  margin: 0 var(--oas-space-1);
  background: var(--oas-toolbar-separator-color, var(--oas-color-border-strong));
}
:host([hidden]) {
  display: none;
}
/* 纵向工具栏内的分隔符：横向线段（跟随工具栏方向自动切换） */
:host(.vertical) {
  width: var(--oas-toolbar-separator-length, 16px);
  height: 1px;
  margin: var(--oas-space-1) 0;
  align-self: stretch;
}
`

/**
 * oas-toolbar-separator —— 工具栏分隔符部件。
 *
 * 无属性。自动跟随最近 oas-toolbar 的 orientation 切换线段方向：
 * 横向工具栏内为竖线（aria-orientation="vertical"），纵向工具栏内为横线（horizontal）。
 * 自带 `role="separator"` 并自动打 `data-toolbar-ignore`，不参与工具栏 roving 导航。
 */
export class OASToolbarSeparator extends OASElement {
  static override get observedAttributes(): string[] {
    return []
  }

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
    `
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.update()
  }

  /** 无交互，SSR 快照可直接接管（结构仅 style） */
  protected override hydrate(): boolean {
    return this.shadow.querySelector('style') != null
  }

  protected override update(): void {
    this.setAttribute('role', 'separator')
    // 自动排除出工具栏 roving：自身带 data-toolbar-ignore（替代旧的 oas-divider + ignore 组合）
    this.setAttribute('data-toolbar-ignore', '')
    // 方向随最近 oas-toolbar 的 orientation：横向工具栏分隔符是竖线，纵向工具栏是横线
    const tb = this.closest('oas-toolbar')
    const orientation = tb?.getAttribute('orientation') ?? 'horizontal'
    const verticalBar = orientation !== 'vertical'
    this.setAttribute('aria-orientation', verticalBar ? 'vertical' : 'horizontal')
    this.classList.toggle('vertical', !verticalBar)
  }
}
