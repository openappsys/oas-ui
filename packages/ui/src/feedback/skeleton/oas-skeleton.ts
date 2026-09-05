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
.block[hidden] {
  display: none;
}
slot[hidden] {
  display: none;
}
.group + .group {
  margin-top: var(--oas-space-4);
}
[part='avatar'] {
  display: block;
  width: var(--oas-control-height-lg);
  height: var(--oas-control-height-lg);
  border-radius: 50%;
  background: var(--oas-skeleton-color, var(--oas-color-bg-hover));
  margin-bottom: var(--oas-space-2);
}
[part='title'] {
  display: block;
  height: var(--oas-control-height-sm);
  width: 40%;
  border-radius: var(--oas-radius-sm);
  background: var(--oas-skeleton-color, var(--oas-color-bg-hover));
  margin-bottom: var(--oas-space-3);
}
[part='line'] {
  display: block;
  height: var(--oas-control-height-sm);
  border-radius: var(--oas-radius-sm);
  background: var(--oas-skeleton-color, var(--oas-color-bg-hover));
  margin-bottom: var(--oas-space-2);
}
[part='line']:nth-child(odd) {
  width: 92%;
}
[part='line']:nth-child(even) {
  width: 76%;
}
.block[data-effect='sheen'] :is([part='avatar'], [part='title'], [part='line']) {
  background: linear-gradient(90deg, var(--oas-skeleton-color, var(--oas-color-bg-hover)) 25%, var(--oas-skeleton-sheen, var(--oas-color-border)) 50%, var(--oas-skeleton-color, var(--oas-color-bg-hover)) 75%);
  background-size: 200% 100%;
  animation: oas-skeleton-shimmer var(--oas-skeleton-duration, 1.5s) infinite;
}
.block[data-effect='pulse'] :is([part='avatar'], [part='title'], [part='line']) {
  animation: oas-skeleton-pulse var(--oas-skeleton-duration, 1.5s) ease-in-out infinite;
}
@keyframes oas-skeleton-shimmer {
  to { background-position: -200% 0; }
}
@keyframes oas-skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`

export class OASSkeleton extends OASElement {
  static override get observedAttributes(): string[] {
    return ['rows', 'title', 'avatar', 'active', 'loading', 'effect', 'count', 'widths', 'delay']
  }

  private block: HTMLElement | null = null
  private contentSlot: HTMLSlotElement | null = null
  /** title 吸收缓存：宿主原生 title 被移除后的「标题形骨架块开关」真值。
   *  skeleton 的 title 是存在性开关（值本身不渲染），空串属性同样表示开关在场，
   *  故缓存以「非 null 哨兵」保留存在语义；null=开关缺席 */
  private titleCache: string | null = null
  /** 上次 update 时的 loading 属性值（null=尚未经历过任何 update，首帧视为状态迁移） */
  private lastLoading: boolean | null = null
  /** 骨架当前是否展示。loading=true 但处于 delay 延迟窗口内时为 false（延迟期骨架与内容都不渲染） */
  private skeletonOn = true
  /** delay 延迟窗口计时器（loading 变 true 后延迟展示骨架，防快请求闪烁） */
  private delayTimer: ReturnType<typeof setTimeout> | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致。
   *  骨架块（aria-hidden 装饰）与默认 slot（真实内容出口）常驻 DOM，由 update 按 loading 显隐切换 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="block" part="block" aria-hidden="true"></div>
      <slot part="content"></slot>
    `
  }

  /** 缓存节点引用（render 与水合路径共用；无事件绑定） */
  private bind(): void {
    this.block = this.shadow.querySelector<HTMLElement>('[part="block"]')
    this.contentSlot = this.shadow.querySelector<HTMLSlotElement>('slot')
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.onCleanup(() => this.clearDelayTimer())
  }

  /** 真水合：校验 SSR 快照结构（骨架块 + 内容出口都存在）后直接接管，跳过 shadow 重建。
   *  title 吸收下宿主无 title 属性（SSR 快照同此）——快照含标题形骨架块即恢复
   *  非 null 哨兵（值不渲染，仅存在性），防水合后首次 update 丢掉标题块 */
  protected override hydrate(): boolean {
    // 缺内容出口（旧版快照）不部分接管：拒绝水合走 render 全量重建，保证 loading 切换可用
    if (!this.shadow.querySelector('[part="block"]')) return false
    if (!this.shadow.querySelector('slot')) return false
    if (this.shadow.querySelector('[part="title"]')) this.titleCache = '1'
    this.bind()
    return true
  }

  /** loading 属性解析：缺省 true（兼容「只放骨架不放内容」的既有用法）；
   *  显式 "false" 关闭（宿主框架受控绑定 :loading="false" 走 setAttribute 字符串路径） */
  private isLoadingAttr(): boolean {
    return this.getAttr('loading', 'true') !== 'false'
  }

  private clearDelayTimer(): void {
    if (this.delayTimer !== null) {
      clearTimeout(this.delayTimer)
      this.delayTimer = null
    }
  }

  /** 骨架/内容出口可见性同步（受控切换 + delay 延迟窗口共用）。
   *  骨架展示与否看 skeletonOn（受 delay 推迟）；内容出口只在非加载态显示——
   *  延迟窗口内（loading=true 但骨架未出）两者都隐藏，快请求场景零渲染闪烁 */
  private syncVisibility(): void {
    this.block?.toggleAttribute('hidden', !this.skeletonOn)
    this.contentSlot?.toggleAttribute('hidden', this.isLoadingAttr())
  }

  /** 生效动效：effect 枚举三档（sheen/pulse/none），优先级高于 active；
   *  active 保留为流光快捷开关（兼容），非法 effect 值回落 active 判定 */
  private syncEffect(): void {
    if (!this.block) return
    const raw = this.getAttr('effect', '')
    let eff = 'none'
    if (raw === 'sheen' || raw === 'pulse') eff = raw
    else if (raw !== 'none' && this.hasAttr('active')) eff = 'sheen'
    this.block.setAttribute('data-effect', eff)
  }

  /** 骨架内容全量重建（组 × 头像/标题/行）：SSR 快照已有子节点在水合时
   *  会被同构重建为完全一致的序列，不会重复叠加（与 rate 等追加式组件不同）。
   *  count 份整组重复用 DocumentFragment 批量构建；widths 逐行宽覆盖奇偶默认 */
  private buildSkeleton(): void {
    if (!this.block) return
    const rows = Math.max(1, Number(this.getAttr('rows', '3')) || 3)
    const count = Math.max(1, Number(this.getAttr('count', '1')) || 1)
    const widths = this.getAttr('widths', '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
    const frag = document.createDocumentFragment()
    for (let g = 0; g < count; g++) {
      const group = document.createElement('div')
      group.className = 'group'
      group.setAttribute('part', 'group')
      if (this.hasAttr('avatar')) {
        const a = document.createElement('span')
        a.setAttribute('part', 'avatar')
        group.appendChild(a)
      }
      if (this.titleCache !== null) {
        const t = document.createElement('span')
        t.setAttribute('part', 'title')
        group.appendChild(t)
      }
      for (let i = 0; i < rows; i++) {
        const l = document.createElement('span')
        l.setAttribute('part', 'line')
        const w = widths[i]
        if (w) l.style.width = w
        group.appendChild(l)
      }
      frag.appendChild(group)
    }
    this.block.innerHTML = ''
    this.block.appendChild(frag)
  }

  protected override update(): void {
    if (!this.block) return
    // title 吸收：title 只决定是否渲染标题形骨架块（值不渲染），吸收后宿主不再残留
    // 原始文本与原生悬浮提示。状态机：属性在场 = 宿主意图（开关在场，含空串）→
    // 更新缓存（非 null 哨兵）并移除；属性缺席 = 吸收后常态，缓存驱动重建幂等。
    if (this.hasAttribute('title')) {
      const raw = this.getAttr('title', '')
      this.titleCache = raw === '' ? '1' : raw
      this.removeAttribute('title')
    }
    // loading 状态机 + delay 延迟窗口：
    // - 状态迁移（含首帧）时重新评估——loading=true 且 delay>0 进入延迟窗口
    //   （窗口内骨架与内容都不渲染，快请求不闪骨架）；否则立即生效
    // - 「loading=true + 骨架未展示 + 无计时器」也视为需重新起窗：覆盖延迟期内断开
    //   重连（计时器已被清理）的场景，防止重连后永远卡在空窗
    // - 延迟期内其他属性更新（rows 等）不重置窗口（loading 未迁移、计时器在场即跳过）
    const loading = this.isLoadingAttr()
    if (loading !== this.lastLoading || (loading && !this.skeletonOn && this.delayTimer === null)) {
      this.clearDelayTimer()
      const delay = Math.max(0, Number(this.getAttr('delay', '')) || 0)
      if (loading && delay > 0) {
        this.skeletonOn = false
        this.delayTimer = setTimeout(() => {
          this.delayTimer = null
          // 窗口到期：loading 可能已被宿主翻回 false（快速完成），以当下属性为准
          if (this.isLoadingAttr()) {
            this.skeletonOn = true
            this.syncVisibility()
          }
        }, delay)
      } else {
        this.skeletonOn = loading
      }
      this.lastLoading = loading
    }
    this.syncVisibility()
    this.syncEffect()
    this.buildSkeleton()
  }
}
