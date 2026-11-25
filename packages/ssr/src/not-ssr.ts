/**
 * 有意不纳入 SSR 白名单的组件清单（唯一结构化来源）。
 *
 * 与 WHITELIST 的关系：
 * - WHITELIST ∪ NOT_SSR = 全部 ui 组件 tag；
 * - 两个集合不得重叠、不得重复；
 * - 新增组件必须二选一，否则 whitelist-coverage 守卫红灯。
 *
 * reason 取值：
 * - subcomponent：由父组件承载渲染，无独立 SSR 语义；
 * - imperative：命令式 API 动态创建，初始 DOM 中不存在实例；
 * - dev-tool：开发期工具，SSR 价值低；
 * - client-only：宿主受控的客户端浮层/容器；
 * - pending：SSR 尚未立项，后续可推进（scaffold 新建组件的默认登记原因）。
 *
 * 注：conversation 组件已全部收口到 WHITELIST，历史上的 `conversation-pending`
 * 原因已删除（不再保留无引用的死类型）。
 */
export type NotSsrReason = 'subcomponent' | 'imperative' | 'dev-tool' | 'client-only' | 'pending'

export interface NotSsrEntry {
  /** 组件 tag，例如 oas-menu-item */
  readonly tag: string
  readonly reason: NotSsrReason
  /** 子件所属父件（可选，仅用于矩阵展示） */
  readonly parent?: string
  /** 补充说明（可选） */
  readonly note?: string
}

export const NOT_SSR: readonly NotSsrEntry[] = [
  // 子件：由父组件承载渲染
  { tag: 'oas-anchor-item', reason: 'subcomponent', parent: 'oas-anchor' },
  { tag: 'oas-anchor-target', reason: 'subcomponent', parent: 'oas-anchor' },
  {
    tag: 'oas-bottom-navigation-item',
    reason: 'subcomponent',
    parent: 'oas-bottom-navigation',
  },
  { tag: 'oas-breadcrumb-item', reason: 'subcomponent', parent: 'oas-breadcrumb' },
  { tag: 'oas-breadcrumb-separator', reason: 'subcomponent', parent: 'oas-breadcrumb' },
  {
    tag: 'oas-button-group-separator',
    reason: 'subcomponent',
    parent: 'oas-button-group',
  },
  { tag: 'oas-command-item', reason: 'subcomponent', parent: 'oas-command' },
  {
    tag: 'oas-context-menu-divider',
    reason: 'subcomponent',
    parent: 'oas-context-menu',
  },
  {
    tag: 'oas-context-menu-group',
    reason: 'subcomponent',
    parent: 'oas-context-menu',
  },
  {
    tag: 'oas-context-menu-item',
    reason: 'subcomponent',
    parent: 'oas-context-menu',
  },
  { tag: 'oas-dropdown-divider', reason: 'subcomponent', parent: 'oas-dropdown' },
  { tag: 'oas-dropdown-group', reason: 'subcomponent', parent: 'oas-dropdown' },
  { tag: 'oas-dropdown-item', reason: 'subcomponent', parent: 'oas-dropdown' },
  { tag: 'oas-menu-divider', reason: 'subcomponent', parent: 'oas-menu' },
  { tag: 'oas-menu-group', reason: 'subcomponent', parent: 'oas-menu' },
  { tag: 'oas-menu-item', reason: 'subcomponent', parent: 'oas-menu' },
  { tag: 'oas-menubar-divider', reason: 'subcomponent', parent: 'oas-menubar' },
  { tag: 'oas-menubar-group', reason: 'subcomponent', parent: 'oas-menubar' },
  { tag: 'oas-menubar-item', reason: 'subcomponent', parent: 'oas-menubar' },
  {
    tag: 'oas-navigation-menu-group',
    reason: 'subcomponent',
    parent: 'oas-navigation-menu',
  },
  {
    tag: 'oas-navigation-menu-item',
    reason: 'subcomponent',
    parent: 'oas-navigation-menu',
  },
  { tag: 'oas-option', reason: 'subcomponent', parent: 'oas-select' },
  { tag: 'oas-sidebar-divider', reason: 'subcomponent', parent: 'oas-sidebar' },
  { tag: 'oas-sidebar-item', reason: 'subcomponent', parent: 'oas-sidebar' },
  { tag: 'oas-swatch-group', reason: 'subcomponent', parent: 'oas-swatch' },
  { tag: 'oas-table-column', reason: 'subcomponent', parent: 'oas-table' },
  { tag: 'oas-toggle-item', reason: 'subcomponent', parent: 'oas-toggle-group' },
  { tag: 'oas-toolbar-input', reason: 'subcomponent', parent: 'oas-toolbar' },
  { tag: 'oas-toolbar-separator', reason: 'subcomponent', parent: 'oas-toolbar' },
  {
    tag: 'oas-toolbar-toggle-item',
    reason: 'subcomponent',
    parent: 'oas-toolbar-toggle',
  },
  { tag: 'oas-toolbar-toggle', reason: 'subcomponent', parent: 'oas-toolbar' },

  // 命令式组件：无初始 DOM
  { tag: 'oas-message', reason: 'imperative' },
  { tag: 'oas-notification', reason: 'imperative' },
  { tag: 'oas-toast', reason: 'imperative' },
  { tag: 'oas-snackbar', reason: 'imperative' },
  { tag: 'oas-loading-bar', reason: 'imperative' },

  // 客户端专属容器
  {
    tag: 'oas-bottom-sheet',
    reason: 'client-only',
    note: '宿主受控浮层容器，服务端直出展开态无意义',
  },
  { tag: 'oas-theme-editor', reason: 'dev-tool', note: '开发期主题编辑面板' },
  { tag: 'oas-chips-input', reason: 'pending', note: 'SSR 白名单化未立项（P1/P2 批新组件，先登记 pending）' },
  { tag: 'oas-scanner', reason: 'client-only', note: 'getUserMedia 相机能力仅客户端可用' },
  { tag: 'oas-signature', reason: 'client-only', note: 'canvas 笔迹绘制仅客户端可用' },
  { tag: 'oas-password-strength', reason: 'pending', note: 'SSR 白名单化未立项（v2.6.8 新组件，先登记 pending）' },
  { tag: 'oas-price', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-submit-bar', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-goods-action', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-coupon', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-sku', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-address', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-invoice', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-ecard', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-category', reason: 'pending', note: 'SSR 白名单化未立项（commerce 族新组件，先登记 pending）' },
  { tag: 'oas-time-select', reason: 'pending', note: 'SSR 白名单化未立项（电商可捞件批新组件，先登记 pending）' },
  { tag: 'oas-cart', reason: 'pending', note: 'SSR 白名单化未立项（交易链路批新组件，先登记 pending）' },
  { tag: 'oas-order-card', reason: 'pending', note: 'SSR 白名单化未立项（交易链路批新组件，先登记 pending）' },
  { tag: 'oas-product-card', reason: 'pending', note: 'SSR 白名单化未立项（交易链路批新组件，先登记 pending）' },
  { tag: 'oas-filter', reason: 'pending', note: 'SSR 白名单化未立项（电商扩容批新组件，先登记 pending）' },
  { tag: 'oas-number-keyboard', reason: 'pending', note: 'SSR 白名单化未立项（未发布批新组件，先登记 pending）' },
  { tag: 'oas-code-button', reason: 'pending', note: 'SSR 白名单化未立项（未发布批新组件，先登记 pending）' },
  { tag: 'oas-image-picker', reason: 'client-only', note: 'File / objectURL 选图仅客户端可用' },
  { tag: 'oas-image-cropper', reason: 'client-only', note: 'canvas 裁剪与舞台测量仅客户端可用' },
  { tag: 'oas-matrix', reason: 'pending', note: 'SSR 白名单化未立项（问卷填写端缺口批新组件，先登记 pending）' },
  { tag: 'oas-rank', reason: 'pending', note: 'SSR 白名单化未立项（问卷填写端缺口批新组件，先登记 pending）' },
  { tag: 'oas-share-sheet', reason: 'client-only', note: '受控浮层与焦点管理依赖客户端交互' },
  { tag: 'oas-curtain', reason: 'client-only', note: '首次弹出判定依赖 localStorage' },
  {
    tag: 'oas-drag',
    reason: 'client-only',
    note: '拖拽依赖指针事件与元素几何测量；位置记忆依赖 localStorage',
  },
  { tag: 'oas-offline', reason: 'client-only', note: '依赖 navigator.onLine 与 online/offline 事件' },
  { tag: 'oas-page-loading', reason: 'pending', note: 'SSR 白名单化未立项（移动端与工具组件批先登记 pending）' },
  { tag: 'oas-rolling-text', reason: 'pending', note: 'SSR 白名单化未立项（移动端与工具组件批先登记 pending）' },
  { tag: 'oas-barrage', reason: 'client-only', note: '轨道排期依赖 DOM 测量与计时器' },
  { tag: 'oas-safe-area', reason: 'pending', note: 'SSR 白名单化未立项（移动端与工具组件批先登记 pending）' },
  { tag: 'oas-status-bar', reason: 'pending', note: 'SSR 白名单化未立项（移动端与工具组件批先登记 pending）' },
]

export const NOT_SSR_TAGS: ReadonlySet<string> = new Set(NOT_SSR.map((entry) => entry.tag))
