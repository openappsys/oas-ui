import { OASElement } from '@oas-ui/core'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  width: 100%;
}
.block {
  width: 100%;
}
.block.active :is([part='avatar'], [part='title'], [part='line']) {
  background: linear-gradient(90deg, var(--oas-color-bg-hover) 25%, var(--oas-color-border) 50%, var(--oas-color-bg-hover) 75%);
  background-size: 200% 100%;
  animation: oas-skeleton-shimmer 1.5s infinite;
}
[part='avatar'] {
  display: block;
  width: var(--oas-control-height-lg);
  height: var(--oas-control-height-lg);
  border-radius: 50%;
  background: var(--oas-color-bg-hover);
  margin-bottom: var(--oas-space-2);
}
[part='title'] {
  display: block;
  height: var(--oas-control-height-sm);
  width: 40%;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  margin-bottom: var(--oas-space-3);
}
[part='line'] {
  display: block;
  height: var(--oas-control-height-sm);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-color-bg-hover);
  margin-bottom: var(--oas-space-2);
}
[part='line']:nth-child(odd) {
  width: 92%;
}
[part='line']:nth-child(even) {
  width: 76%;
}
@keyframes oas-skeleton-shimmer {
  to { background-position: -200% 0; }
}
`

export class OASSkeleton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['rows', 'title', 'avatar', 'active']
  }

  private block: HTMLElement | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="block" part="block"></div>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；无事件绑定） */
  private bind(): void {
    this.block = this.shadow.querySelector<HTMLElement>('[part="block"]')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
  }

  /** 真水合：校验 SSR 快照结构（block 容器存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="block"]')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    // 行/头像/标题由 update 全量重建（先清空再追加）：SSR 快照已有子节点在水合时
    // 会被同构重建为完全一致的行序列，不会重复叠加（与 rate 等追加式组件不同）。
    if (!this.block) return
    this.block.classList.toggle('active', this.hasAttr('active'))
    const rows = Math.max(1, Number(this.getAttr('rows', '3')) || 3)
    this.block.innerHTML = ''
    if (this.hasAttr('avatar')) {
      const a = document.createElement('span')
      a.setAttribute('part', 'avatar')
      this.block.appendChild(a)
    }
    if (this.hasAttr('title')) {
      const t = document.createElement('span')
      t.setAttribute('part', 'title')
      this.block.appendChild(t)
    }
    for (let i = 0; i < rows; i++) {
      const l = document.createElement('span')
      l.setAttribute('part', 'line')
      this.block.appendChild(l)
    }
  }
}
