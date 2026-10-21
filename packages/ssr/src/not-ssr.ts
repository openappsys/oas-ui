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
 * - pending：SSR 尚未立项，后续可推进；
 * - conversation-pending：conversation 组件尚未补 template()/DSD。
 */
export type NotSsrReason =
  | 'subcomponent'
  | 'imperative'
  | 'dev-tool'
  | 'client-only'
  | 'pending'
  | 'conversation-pending'

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

  // SSR 尚未立项
  { tag: 'oas-image-group', reason: 'pending' },
  { tag: 'oas-index-bar', reason: 'pending' },
  { tag: 'oas-notice-bar', reason: 'pending' },
  { tag: 'oas-picker', reason: 'pending', note: '需先补 template()' },
  { tag: 'oas-pull-refresh', reason: 'pending' },
  { tag: 'oas-swipe-cell', reason: 'pending' },
  { tag: 'oas-swatch', reason: 'pending' },

  // conversation 组件尚未补 template()/DSD
  {
    tag: 'oas-message-actions',
    reason: 'conversation-pending',
    note: '需先补 template()',
  },
  { tag: 'oas-tool-call', reason: 'conversation-pending', note: '需先补 template()' },
]

export const NOT_SSR_TAGS: ReadonlySet<string> = new Set(NOT_SSR.map((entry) => entry.tag))
