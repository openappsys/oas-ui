import { OASElement } from '@oas-ui/core'

export type AffixPosition = 'top' | 'bottom'

const VALID_POSITIONS: readonly AffixPosition[] = ['top', 'bottom']

const STYLE = `
:host {
  display: block;
  font-family: inherit;
}
.placeholder {
  display: block;
}
.wrap {
  display: inline-block;
}
.wrap.fixed {
  position: fixed;
  z-index: calc(var(--oas-z-index-base, 0) + var(--oas-z-sticky, 1020));
}
`

const warnedPositions = new Set<string>()
const warnedTargets = new Set<string>()
const warnedAppendTargets = new Set<string>()

/** 非法 position 归一化：回落 top 并在 dev 下 console.warn 一次（同值去重） */
function normalizePosition(raw: string): AffixPosition {
  if ((VALID_POSITIONS as readonly string[]).includes(raw)) return raw as AffixPosition
  if (!warnedPositions.has(raw)) {
    warnedPositions.add(raw)
    console.warn(`[oas-affix] 非法 position "${raw}"，已回落 top；合法值：top/bottom`)
  }
  return 'top'
}

export class OASAffix extends OASElement {
  static override get observedAttributes(): string[] {
    return ['offset', 'position', 'target', 'append-to']
  }

  private wrap: HTMLElement | null = null
  private placeholder: HTMLElement | null = null
  private lastTop: number | null = null
  /** 当前绑定的滚动监听源（window 或 target 容器）；用于去抖取值与清理 */
  private scrollSource: Window | HTMLElement | null = null
  /** 当前吸附状态（null=未初始化，首帧判定后与真实翻转对比派发 oas-change） */
  private stuckState: boolean | null = null
  /** 水合首帧的布局写入是否已延迟登记（抑制直至 rAF 校正完成，含 RO 首回调等同期写入） */
  private layoutRafScheduled = false
  private hydratedFirstFrameApplied = false

  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="placeholder"><div class="wrap" part="wrap"><slot></slot></div></div>
    `
  }

  /** 缓存节点引用 + 绑定滚动/resize 监听（render 与水合路径共用） */
  private bind(): void {
    this.placeholder = this.shadow.querySelector('.placeholder')
    this.wrap = this.shadow.querySelector('.wrap')
    window.addEventListener('resize', this.handleResize)
    this.onCleanup(() => window.removeEventListener('resize', this.handleResize))
    this.onCleanup(() => this.unbindScroll())
    // 断开连接时把已传送的 wrap 归位回 placeholder（shadow 随组件整体回收，不遗留孤儿节点）
    this.bindScroll()
  }

  /** 绑定当前生效的滚动监听源（target 容器优先，无 target/无效回落 window） */
  private bindScroll(): void {
    this.unbindScroll()
    const source: Window | HTMLElement = this.resolveContainer() ?? window
    source.addEventListener('scroll', this.handleScroll, { passive: true })
    this.scrollSource = source
    this.lastTop = null // 切换监听源后重置去抖基线
  }

  private unbindScroll(): void {
    if (this.scrollSource) {
      this.scrollSource.removeEventListener('scroll', this.handleScroll)
      this.scrollSource = null
    }
  }

  /**
   * 惰性重解析 target 容器并校正监听源（元素可能后挂载——滚动/resize/属性变化时
   * 用 document.querySelector 现查即可，不必 MutationObserver）。
   */
  private rebindIfNeeded(): void {
    const sel = this.getAttr('target', '')
    let desired: HTMLElement | null = null
    if (sel) desired = document.querySelector<HTMLElement>(sel)
    const source: Window | HTMLElement = desired ?? window
    if (source !== this.scrollSource) this.bindScroll()
  }

  /** 解析 target 选择器；无匹配时告警一次并回落 null（走 window 行为） */
  private resolveContainer(): HTMLElement | null {
    const sel = this.getAttr('target', '')
    if (!sel) return null
    const el = document.querySelector<HTMLElement>(sel)
    if (!el) {
      if (!warnedTargets.has(sel)) {
        warnedTargets.add(sel)
        console.warn(`[oas-affix] target "${sel}" 未匹配到元素，已回落 window 滚动监听`)
      }
      return null
    }
    return el
  }

  /** 解析 append-to 选择器；无匹配时告警一次并回落 null（不传送，wrap 保持原位） */
  private resolveAppendTarget(sel: string): HTMLElement | null {
    if (!sel) return null
    const el = document.querySelector<HTMLElement>(sel)
    if (!el) {
      if (!warnedAppendTargets.has(sel)) {
        warnedAppendTargets.add(sel)
        console.warn(`[oas-affix] append-to "${sel}" 未匹配到元素，已回落不传送（wrap 保持原位）`)
      }
      return null
    }
    return el
  }

  /**
   * teleport 传送：吸附且存在有效 append-to 目标容器时，把 `.wrap` 节点（连同搬运进来的
   * light DOM 实体内容）append 到目标容器——**移动前先把 host 的 light DOM 子节点搬入
   * wrap**（slot 投影随 wrap 移出 shadow 而断开，实体内容必须实体化随行）；解除吸附时
   * 内容搬回 host（light DOM 原位）、wrap 归位 placeholder（slot 投影恢复）。
   * 不移动 host 本身——host 移动会触发 disconnect/connect 循环（基类 onCleanup 全清 +
   * shadow 重建）。局限：传送期间事件冒泡沿新祖先树（不经过 host），文档需注明。
   */
  private syncTeleport(stuck: boolean): void {
    if (!this.wrap || !this.placeholder) return
    const destSel = this.getAttr('append-to', '')
    const dest = destSel ? this.resolveAppendTarget(destSel) : null
    if (stuck && dest) {
      if (this.wrap.parentNode !== dest) {
        // light DOM 实体内容搬入 wrap（slot 投影断开，内容实体随行）
        for (const kid of [...this.childNodes]) this.wrap.appendChild(kid)
        dest.appendChild(this.wrap)
      }
      return
    }
    // 解除/目标失效：内容搬回 host（light DOM 原位）、wrap 归位 placeholder
    if (this.wrap.parentNode !== this.placeholder) {
      for (const kid of [...this.wrap.childNodes]) {
        if ((kid as Element).localName === 'slot') continue
        this.appendChild(kid)
      }
      this.placeholder.appendChild(this.wrap)
    }
  }

  /** 当前滚动监听源的滚动位置（window scrollY / 容器 scrollTop） */
  private currentScrollTop(): number {
    if (this.scrollSource && this.scrollSource !== window) {
      // 排除 window 后必为容器元素（Window 无 scrollTop，显式断言避免联合类型窄化歧义）
      return (this.scrollSource as HTMLElement).scrollTop
    }
    return window.scrollY
  }

  private handleScroll = (): void => {
    // 惰性重解析 target：元素可能后挂载（首次无匹配 → window 监听；挂载后切回容器监听）
    this.rebindIfNeeded()
    const now = Math.round(this.currentScrollTop())
    if (this.lastTop === null) {
      this.lastTop = now
      this.apply()
      return
    }
    if (Math.abs(now - this.lastTop) < 4) return
    this.lastTop = now
    this.apply()
  }

  private handleResize = (): void => {
    this.rebindIfNeeded()
    this.apply()
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（wrap 存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('.wrap')) return false
    this.bind()
    return true
  }

  protected override update(): void {
    this.rebindIfNeeded()
    // DSD 水合首帧：吸顶态写入延迟到首帧后（快照首帧与 hydrate 后一致，第二帧校正）。
    // 纯 CSR 或水合后的后续 update 一律同步写入（行为不变）。
    if (this.wasHydrated() && !this.hydratedFirstFrameApplied) {
      this.scheduleHydratedApply()
      return
    }
    this.apply()
  }

  /** 水合首帧：布局写入统一延迟到 rAF 校正；期间（含 rAF 前其他 update/RO 回调）一律抑制 */
  private scheduleHydratedApply(): void {
    if (this.layoutRafScheduled) return
    this.layoutRafScheduled = true
    const raf = requestAnimationFrame(() => {
      this.hydratedFirstFrameApplied = true
      this.apply()
    })
    this.onCleanup(() => cancelAnimationFrame(raf))
  }

  /**
   * 吸附判定 + 布局写入 + 状态翻转派发。
   * 判定基准是 `.placeholder`（永远留在文档流中，无 fixed 自反馈）；吸附时 `.wrap`
   * 转 fixed 脱流，placeholder 同步占位高度防页面跳动。
   * 判定统一为视口系（fixed 定位本就相对视口）：容器（target）只决定监听哪个滚动源，
   * 并在容器完全滚出视口后解除吸附（元素随文档流走，不「凭空钉在视口上」）。
   * - top：占位顶缘到达视口吸附线（距顶 offset）时吸附，fixed top: offset px
   * - bottom：占位底缘越过视口底部吸附线（距底 offset）时吸附，fixed bottom: offset px
   * - oas-change：仅状态真实翻转时派发，detail { fixed, top }（top 吸附 = offset；
   *   bottom 吸附 = 吸附后元素 top 的计算值）
   */
  private apply(): void {
    if (!this.wrap || !this.placeholder) return
    // SSR 渲染端不做吸顶预判：无法得知真实布局（渲染环境 rect 恒 0），快照恒为未校正态；
    // 浏览器端水合后 rAF 校正时「脱流与占位同帧」，文档流高度不变、后续元素不闪动
    if ((window as unknown as Record<string, unknown>).__OAS_SSR__) return
    const offset = Number(this.getAttr('offset', '0')) || 0
    const position = normalizePosition(this.getAttr('position', 'top') as AffixPosition)
    const container = this.resolveContainer()
    const prect = this.placeholder.getBoundingClientRect()
    // 容器完全滚出视口（上方已过/下方未到）→ 不吸附，元素随文档流走
    let containerVisible = true
    if (container) {
      const crect = container.getBoundingClientRect()
      containerVisible = crect.bottom > 0 && crect.top < window.innerHeight
    }

    let stuck: boolean
    let fixedTop: number
    if (position === 'bottom') {
      stuck = containerVisible && prect.bottom <= window.innerHeight - offset && prect.top < window.innerHeight - offset
      fixedTop = Math.round(window.innerHeight - offset - prect.height)
    } else {
      stuck = containerVisible && prect.top <= offset
      fixedTop = offset
    }

    // 先按目标态写入，再读 wrap 实际高度同步占位（wrap fixed 与否高度一致，占位始终兜住文档流）
    this.wrap.classList.toggle('fixed', stuck)
    this.wrap.style.top = ''
    this.wrap.style.bottom = ''
    if (stuck) {
      if (position === 'bottom') this.wrap.style.bottom = `${offset}px`
      else this.wrap.style.top = `${offset}px`
    }
    if (stuck) {
      const h = this.wrap.offsetHeight
      this.placeholder.style.height = `${h}px`
    } else {
      this.placeholder.style.height = ''
    }
    if (stuck !== this.stuckState) {
      this.stuckState = stuck
      this.emit('change', { fixed: stuck, top: fixedTop })
    }
    // teleport 传送与归位（吸附判定之后、状态同步之后执行；属性变化重入 apply 时即时归位/重传）
    this.syncTeleport(stuck)
  }
}
