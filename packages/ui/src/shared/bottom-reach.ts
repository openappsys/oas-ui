/**
 * 触底协议内核（load-more）：判定 / 状态机 / 可见性守卫 / 监听编排 / 三态渲染。
 *
 * goods-list 与 order-list 原先各持一份同款骨架（checkLoadMore ×2、isHiddenInTree
 * 逐字节同款 ×2、rAF 节流 ×2、加载区三态 ×2），差异只在两处语义：
 * - 「有内容」数据源：goods-list = items 数组 + 捕获的插槽卡，order-list = slot 分配元素
 * - 「解除 pending」信号源：goods-list = `items` attribute 签名，order-list = slot 节点身份序列
 * 内核以回调参数承载这两处（`hasContent` / `release`），其余判定与编排单一真源。
 *
 * 分层：
 * - 纯判定区（零 DOM）：`shouldRequestMore`（唯一真源，column-assign 仅 re-export 兼容）
 * - 只读谓词：`isHiddenInTree`（祖先链 display 判定，无 DOM 变更）
 * - 监听编排：`watchBottomReach`（document capture scroll + resize，rAF 合并）
 * - DOM 写：`renderMoreState`（三态：loading / no-more / 缺省；元素引用由组件传入）
 * 组件侧只保留：元素查询、事件派发（`oas-load-more`）、pending 字段持有。
 *
 * 体积账（gz 实测）：719 B（`dist/shared/bottom-reach.js`，gzipSync 默认档；含判定 / 可见性 /
 * 监听编排 / 三态渲染四区，不含组件侧元素查询与事件派发）。
 */

/** 触底协议三态（宿主应答语义：loading / 到底 / 待应答） */
export interface BottomReachState {
  loading: boolean
  noMore: boolean
  pending: boolean
}

/**
 * 加载更多触底判定：哨兵顶边进入视口（含 240px 提前量）且不在 loading / 到底 / 待应答态。
 *
 * @param sentinelTop 哨兵顶边（视口坐标）
 * @param viewportHeight 视口高度
 * @param state 三态（任一为真即不派发）
 */
export function shouldRequestMore(sentinelTop: number, viewportHeight: number, state: BottomReachState): boolean {
  if (state.loading || state.noMore || state.pending) return false
  if (!Number.isFinite(sentinelTop) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return false
  return sentinelTop <= viewportHeight + 240
}

/**
 * 组件是否处于 display:none 链路。真实浏览器：`getClientRects` 为空即全链不可见（一次调用判全链）；
 * happy-dom 不实现布局（rects 恒 1 / rect 恒 0）：回退爬祖先链查 computed display。
 */
export function isHiddenInTree(el: Element): boolean {
  if (el.getClientRects().length === 0) return true
  let node: Element | null = el
  while (node) {
    if (getComputedStyle(node).display === 'none') return true
    node = node.parentElement
  }
  return false
}

export interface BottomReachOptions {
  /** 哨兵元素（未渲染返回 null → 不判定） */
  sentinel: () => Element | null
  /** 有内容守卫（组件按自己的数据源：items / 插槽卡 / slot 分配） */
  hasContent: () => boolean
  /** 可见性守卫（通常传 `isHiddenInTree(host)`） */
  hidden: () => boolean
  /** 三态读取（pending 由组件持有） */
  state: () => BottomReachState
  /** 解除 pending 的信号源（items 签名 / slot 身份序列），返回 true = 本轮已解除 */
  release?: () => boolean
  /** 写回 pending（组件字段） */
  setPending: (pending: boolean) => void
  /** 派发 oas-load-more（内核已先置 pending） */
  request: () => void
}

/**
 * 创建触底检查器：`check()` 内联判定骨架（守卫链顺序保持：解除 → 哨兵 → 内容 → 可见 → 几何 → 三态）。
 * 监听挂载走 `watchBottomReach(() => reach.check())`，由组件在 onCleanup 里摘。
 */
export function createBottomReach(options: BottomReachOptions): { check: () => void } {
  return {
    check(): void {
      if (options.release?.()) options.setPending(false)
      const sentinel = options.sentinel()
      if (!sentinel) return
      if (!options.hasContent()) return
      if (options.hidden()) return
      const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight
      if (!shouldRequestMore(sentinel.getBoundingClientRect().top, viewportHeight, options.state())) return
      options.setPending(true)
      options.request()
    },
  }
}

/**
 * 滚动 / 尺寸监听编排：document capture（捕获子容器滚动）+ window resize，
 * rAF 合并同帧多事件。返回解绑函数（含待执行 rAF 句柄取消，无孤儿回调）。
 */
export function watchBottomReach(check: () => void): () => void {
  let raf = 0
  const onScrollOrResize = (): void => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      check()
    })
  }
  document.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true })
  window.addEventListener('resize', onScrollOrResize)
  return () => {
    document.removeEventListener('scroll', onScrollOrResize, { capture: true })
    window.removeEventListener('resize', onScrollOrResize)
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }
}

export interface MoreStateRefs {
  /** 加载更多区容器（无内容时整体隐藏） */
  more: HTMLElement | null
  spinner: HTMLElement | null
  text: HTMLElement | null
  labels: { loading: string; noMore: string }
  hasContent: boolean
  loading: boolean
  noMore: boolean
}

/**
 * 加载更多区三态渲染（loading / no-more / 缺省）。
 * 只写传入的元素引用（shadow 查询与文案 i18n 取值留在组件）。
 */
export function renderMoreState(refs: MoreStateRefs): void {
  if (refs.more) refs.more.hidden = !refs.hasContent
  if (refs.spinner) refs.spinner.hidden = !refs.loading
  if (refs.text) {
    refs.text.textContent = refs.loading ? refs.labels.loading : refs.noMore ? refs.labels.noMore : ''
    refs.text.hidden = !refs.loading && !refs.noMore
  }
}
