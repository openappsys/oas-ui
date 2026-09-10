import { OASElement } from '@oas-ui/core'
import '../image/index.js'
import type { OASImage } from '../image/oas-image.js'

const STYLE = `
:host {
  display: block;
  font-family: inherit;
  color: var(--oas-color-text-primary);
}
:host([hidden]) {
  display: none;
}
.group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--oas-image-group-gap, var(--oas-space-3));
  align-items: flex-start;
}
/* 组内子图统一可点开共享预览的手型（子图自身未带 preview 时也有） */
::slotted(oas-image) {
  cursor: zoom-in;
}
/* 内部预览宿主：纯委托节点，永不显示 */
.preview-host {
  display: none !important;
}
`

/**
 * oas-image-group —— 图集容器（声明式图片墙 → 共享预览）。
 *
 * 收集：light DOM 内的 oas-image 子元素（含包裹层级，最近的 oas-image-group
 * 祖先须为自身，嵌套组不重复收集）自动收集为图集列表——子图带合法
 * `preview-src-list`（JSON URL 数组）时展平为多张，否则取 `preview-src`（缺省回落
 * `src`）；无可用地址的子图跳过。子图动态增删（slotchange/MutationObserver，
 * 含子图 src/preview-src/preview-src-list 属性变化）实时同步图集列表。
 *
 * 预览复用（委托而非重写）：容器 shadow 内持有一个隐藏 oas-image 作为共享预览宿主，
 * 点击组内任一子图 → 容器在捕获阶段拦截（子图自身的 preview 点击被接管，不触发单图
 * 预览）→ 以被点图起始索引打开共享浮层；缩放/旋转/翻转/下载/Esc/遮罩/焦点陷阱/
 * portal teleport 全部沿用 oas-image 预览实现。共享宿主事件经容器转译后对外：
 * `oas-preview`（detail `{ src }`）原样转发；图集翻页转为 `oas-change`
 * （detail `{ current, prev }`）；内部 `oas-preview-change` 拦截不外泄。
 *
 * 受控索引：`current` 属性在场时受控——点击按 `current` 起开、外部改属性经
 * `previewGoTo()` 驱动预览跳图，内部翻页反射回 `current`（双向同步）；
 * 缺席时非受控：点击按被点图起开、不造 `current` 属性，仅派发 `oas-change`
 * （宿主可据 detail 自行回写 current 实现受控）。
 * `infinite` 透传共享宿主，翻页首尾循环。
 *
 * a11y：容器 `role="group"` + locale 可访问名称；预览浮层内部页码指示
 * （n/total + aria-label）沿用 oas-image 图集 chrome。
 *
 * 布局：默认 flex 换行 + gap token，间距可经 `--oas-image-group-gap` 覆盖。
 */
export class OASImageGroup extends OASElement {
  static override get observedAttributes(): string[] {
    return ['current', 'infinite']
  }

  /** 收集到的子图元素（与 starts 一一对应） */
  private childrenEls: OASImage[] = []
  /** 展平后的图集地址列表（透传给共享预览宿主） */
  private urls: string[] = []
  /** 每个子图在展平列表中的起始索引 */
  private starts: number[] = []
  /** 当前图集索引（最近一次打开/翻页位置） */
  private lastIndex = 0
  /** 共享预览宿主（shadow 内的隐藏 oas-image） */
  private inner: OASImage | null = null
  /** 子图增删/关键属性变化的观察器（断开连接时清理） */
  private observer: MutationObserver | null = null

  /** 纯函数：SSR 快照与客户端渲染共用同一份模板，保证两路径结构严格一致 */
  private template(): string {
    return `
      <style>${STYLE}</style>
      <div class="group" part="group" role="group" aria-label="">
        <slot></slot>
      </div>
      <oas-image class="preview-host" part="preview-host" hidden preview></oas-image>
    `
  }

  /** 缓存节点引用 + 绑定事件 + 注册清理（render 与水合路径共用） */
  private bind(): void {
    this.inner = this.shadow.querySelector<OASImage>('oas-image')
    this.shadow
      .querySelector('slot')
      ?.addEventListener('slotchange', () => this.syncCollection())

    if (this.inner) {
      // 打开预览：原样转发 detail（src 为当前张地址）
      this.inner.addEventListener('oas-preview', (e: Event) => {
        e.stopPropagation()
        this.emit('preview', (e as CustomEvent).detail)
      })
      // 翻页/跳转 → 受控契约：反射 current + 派发 oas-change {current, prev}
      this.inner.addEventListener('oas-preview-nav', (e: Event) => {
        e.stopPropagation()
        const { index } = (e as CustomEvent).detail as { index: number }
        const prev = this.lastIndex
        this.lastIndex = index
        this.reflectCurrent(index)
        this.emit('change', { current: index, prev })
      })
      // 内部开合事件是宿主实现细节，不向外泄漏（容器只暴露 oas-change）
      this.inner.addEventListener('oas-preview-change', (e: Event) => e.stopPropagation())
    }

    // 捕获阶段拦截组内子图点击：子图自身 preview 被接管，点击走组图集
    this.addEventListener('click', this.onCaptureClick, true)

    // 子图动态增删 + 收集相关属性变化 → 同步图集列表
    this.observer = new MutationObserver(() => this.syncCollection())
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'preview-src', 'preview-src-list'],
    })

    this.onCleanup(() => {
      this.observer?.disconnect()
      this.observer = null
    })
  }

  protected override render(): void {
    this.shadow.innerHTML = this.template()
    this.bind()
    this.update()
  }

  /** 真水合：校验 SSR 快照结构（group 骨架存在）后直接接管，跳过 shadow 重建 */
  protected override hydrate(): boolean {
    if (!this.shadow.querySelector('[part="group"]')) return false
    this.bind()
    return true
  }

  /** 捕获阶段点击拦截：命中已收集子图则接管（阻断其单图预览），从该子图索引起开 */
  private onCaptureClick = (e: MouseEvent): void => {
    const path = e.composedPath()
    const hit = this.childrenEls.findIndex((el) => path.includes(el))
    if (hit === -1) return
    e.stopPropagation()
    e.preventDefault()
    // current 受控：属性在场时以属性为准（与 preview-open 双向反射同构）；缺席按被点图
    if (this.hasAttr('current')) {
      const c = Number(this.getAttr('current'))
      if (Number.isFinite(c)) {
        this.openAt(clampIndex(Math.trunc(c), this.urls.length))
        return
      }
    }
    this.openAt(this.starts[hit] ?? 0)
  }

  /** 单个子图贡献的图集地址：preview-src-list 展平 > preview-src > src */
  private urlsOf(el: OASImage): string[] {
    const raw = el.getAttribute('preview-src-list')?.trim()
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const list = parsed.filter((s): s is string => typeof s === 'string' && s !== '')
          if (list.length > 0) return list
        }
      } catch {
        // 非法 JSON：按无图集处理，回落 preview-src/src
      }
    }
    const single = el.getAttribute('preview-src') || el.getAttribute('src') || ''
    return single ? [single] : []
  }

  /** 收集子图 → 展平图集列表 → 透传共享预览宿主；列表变短时收敛当前索引 */
  private syncCollection(): void {
    const els = Array.from(this.querySelectorAll('oas-image')).filter(
      (el): el is OASImage => el.closest('oas-image-group') === this,
    )
    const urls: string[] = []
    const starts: number[] = []
    for (const el of els) {
      starts.push(urls.length)
      urls.push(...this.urlsOf(el))
    }
    this.childrenEls = els
    this.urls = urls
    this.starts = starts
    if (this.lastIndex > urls.length - 1) this.lastIndex = Math.max(0, urls.length - 1)
    if (this.inner) {
      this.inner.setAttribute('preview-src-list', JSON.stringify(urls))
      if (this.hasAttr('current')) {
        const c = Number(this.getAttr('current'))
        if (Number.isFinite(c)) this.reflectCurrent(clampIndex(Math.trunc(c), urls.length))
      }
    }
  }

  /** 打开共享预览：index 为图集起始索引；current 受控时以属性为准 */
  openPreview(index?: number): void {
    if (this.urls.length === 0) return
    let i =
      typeof index === 'number'
        ? clampIndex(Math.trunc(index), this.urls.length)
        : this.hasAttr('current')
          ? clampIndex(Number(this.getAttr('current')) || 0, this.urls.length)
          : 0
    this.openAt(i)
  }

  /** 关闭共享预览（委托共享宿主） */
  closePreview(): void {
    this.inner?.closePreview()
  }

  private openAt(start: number): void {
    if (!this.inner || this.urls.length === 0) return
    const i = clampIndex(start, this.urls.length)
    this.lastIndex = i
    this.reflectCurrent(i)
    this.inner.openPreview(i)
  }

  /**
   * current 双向反射（仅受控模式）：属性已存在时写回——内部翻页与外部驱动双向一致；
   * 非受控（属性缺席）不造属性：保持「点击哪张从哪张开」的直觉，索引经 oas-change 对外。
   */
  private reflectCurrent(index: number): void {
    if (!this.hasAttr('current')) return
    if (this.getAttribute('current') !== String(index)) {
      this.setAttribute('current', String(index))
    }
  }

  protected override update(): void {
    const box = this.shadow.querySelector<HTMLElement>('[part="group"]')
    if (box) box.setAttribute('aria-label', this.t('imageGroup.group'))

    // infinite 透传共享宿主
    if (this.inner) {
      if (this.hasAttr('infinite')) this.inner.setAttribute('infinite', '')
      else this.inner.removeAttribute('infinite')
    }

    // 受控 current：属性在场且与当前索引不一致时驱动共享宿主跳图
    // （内部翻页先经 preview-nav 同步 lastIndex 再反射 current，回到此处时同值短路；
    //   lastIndex 不在此预写，prev 以 nav 事件里的旧值为准，保证 oas-change 的 prev 正确）
    if (this.hasAttr('current') && this.inner) {
      const c = Number(this.getAttr('current'))
      if (Number.isFinite(c)) {
        const i = clampIndex(Math.trunc(c), Math.max(1, this.urls.length))
        if (i !== this.lastIndex) this.inner.previewGoTo(i)
      }
    }
  }
}

/** 索引收敛：空列表回退 0，否则夹取到 [0, length-1] */
function clampIndex(i: number, length: number): number {
  if (!Number.isFinite(i) || length <= 0) return 0
  return Math.min(length - 1, Math.max(0, i))
}
