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
  /** title 吸收缓存：宿主原生 title 被移除后的「标题形骨架块开关」真值。
   *  skeleton 的 title 是存在性开关（值本身不渲染），空串属性同样表示开关在场，
   *  故缓存以「非 null 哨兵」保留存在语义；null=开关缺席 */
  private titleCache: string | null = null

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

  /** 真水合：校验 SSR 快照结构（block 容器存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——快照含标题形骨架块即恢复
   *  非 null 哨兵（值不渲染，仅存在性），防水合后首次 update 丢掉标题块 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="block"]')) return false
    if (this.shadow.querySelector('[part="title"]')) this.titleCache = '1'
    this.bind()
    return true
  }

  protected override update(): void {
    // 行/头像/标题由 update 全量重建（先清空再追加）：SSR 快照已有子节点在水合时
    // 会被同构重建为完全一致的行序列，不会重复叠加（与 rate 等追加式组件不同）。
    if (!this.block) return
    // title 吸收：title 只决定是否渲染标题形骨架块（值不渲染），吸收后宿主不再残留
    // 原始文本与原生悬浮提示。状态机：属性在场 = 宿主意图（开关在场，含空串）→
    // 更新缓存（非 null 哨兵）并移除；属性缺席 = 吸收后常态，缓存驱动重建幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttribute('title') ?? ''
      this.titleCache = raw === '' ? '1' : raw
      this.removeAttribute('title')
    }
    this.block.classList.toggle('active', this.hasAttr('active'))
    const rows = Math.max(1, Number(this.getAttr('rows', '3')) || 3)
    this.block.innerHTML = ''
    if (this.hasAttr('avatar')) {
      const a = document.createElement('span')
      a.setAttribute('part', 'avatar')
      this.block.appendChild(a)
    }
    if (this.titleCache !== null) {
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
