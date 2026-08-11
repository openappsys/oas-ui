import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: flex;
  height: 100%;
  font-family: inherit;
}
:host([hidden]) {
  display: none;
}
.pane {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
.splitter {
  width: 6px;
  cursor: col-resize;
  background: var(--oas-color-border);
  border-radius: var(--oas-radius-sm);
  flex-shrink: 0;
  touch-action: none;
}
.splitter:hover {
  background: var(--oas-color-primary);
}
:host([dragging]) {
  user-select: none;
}
.splitter:focus-visible {
  outline: 2px solid var(--oas-color-primary);
  outline-offset: 1px;
}
`

export class OASSplitter extends OASElement {
  static override get observedAttributes(): string[] {
    return ['percent', 'min', 'max']
  }

  private leftPane: HTMLElement | null = null
  private rightPane: HTMLElement | null = null
  private dragging = false
  private startX = 0
  private startPercent = 0

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="pane" part="pane-left"><slot name="left"><slot></slot></slot></div>
      <div class="splitter" part="splitter" tabindex="0" role="separator" aria-orientation="vertical"></div>
      <div class="pane" part="pane-right"><slot name="right"></slot></div>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.leftPane = this.shadow.querySelector('.pane:first-of-type') as HTMLElement
    this.rightPane = this.shadow.querySelector('.pane:last-of-type') as HTMLElement
    this.shadow
      .querySelector('.splitter')
      ?.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent))
    this.shadow
      .querySelector('.splitter')
      ?.addEventListener('pointerdown', (e) => this.startDrag(e as PointerEvent))
    // 拖拽期间监听在 document 上，保证指针移出分隔条仍能跟随
    this.onCleanup(() => {
      document.removeEventListener('pointermove', this.onDrag)
      document.removeEventListener('pointerup', this.endDrag)
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（splitter 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.splitter')) return false
    this.bind()
    return true
  }

  private startDrag(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType !== 'touch') return
    e.preventDefault()
    this.dragging = true
    this.startX = e.clientX
    this.startPercent = Number(this.getAttr('percent', '50')) || 50
    this.setAttribute('dragging', '')
    document.addEventListener('pointermove', this.onDrag)
    document.addEventListener('pointerup', this.endDrag)
  }

  private onDrag = (e: PointerEvent): void => {
    if (!this.dragging) return
    const width = this.clientWidth
    if (!width) return
    const delta = e.clientX - this.startX
    const percent = this.startPercent + (delta / width) * 100
    this.setPercent(percent)
  }

  private endDrag = (): void => {
    if (!this.dragging) return
    this.dragging = false
    this.removeAttribute('dragging')
    document.removeEventListener('pointermove', this.onDrag)
    document.removeEventListener('pointerup', this.endDrag)
  }

  private handleKey(e: KeyboardEvent): void {
    let delta = 0
    if (e.key === 'ArrowLeft') delta = -1
    else if (e.key === 'ArrowRight') delta = 1
    else return
    e.preventDefault()
    const percent = Number(this.getAttr('percent', '50')) || 50
    this.setPercent(percent + delta)
  }

  private setPercent(percent: number): void {
    const min = Number(this.getAttr('min', '10')) || 10
    const max = Number(this.getAttr('max', '90')) || 90
    const clamped = Math.min(max, Math.max(min, percent))
    this.setAttribute('percent', String(clamped))
    this.emit('resize', { percent: clamped })
    this.applyPercent()
  }

  protected override update(): void {
    // 分割条 aria-label locale 驱动（setLocale 切换自动重刷）
    this.shadow
      .querySelector<HTMLElement>('[part="splitter"]')
      ?.setAttribute('aria-label', this.t('splitter.adjust'))
    this.applyPercent()
  }

  private applyPercent(): void {
    if (!this.leftPane || !this.rightPane) return
    const percent = Number(this.getAttr('percent', '50')) || 50
    this.leftPane.style.flex = `0 0 ${percent}%`
    this.rightPane.style.flex = `1 1 0%`
  }
}
