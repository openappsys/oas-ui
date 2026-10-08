import { OASTitlebar } from './oas-titlebar.js'
import type { TitlebarSize, TitlebarWindowAction } from './oas-titlebar.js'

if (!customElements.get('oas-titlebar')) {
  customElements.define('oas-titlebar', OASTitlebar)
}

export { OASTitlebar }
export type { TitlebarSize, TitlebarWindowAction } from './oas-titlebar.js'

export interface TitlebarProps {
  /** 高度档：compact（默认，34px）/ large（68px，控件保持紧凑） */
  size?: TitlebarSize
  /** 容器设为窗口拖动区（交互子件自动 no-drag；纯 Web 下无害空操作） */
  drag?: boolean
  /** 居中标题（title 插槽覆盖；editable 提交后反射回写） */
  title?: string
  /** 副标题 / 文档状态（已编辑时间等） */
  subtitle?: string
  /** 文档井标题可编辑（Enter/blur 提交、Esc 取消） */
  editable?: boolean
  /** 内建窗口操作钮子集（逗号分隔：minimize,maximize,close） */
  'window-actions'?: string
  /** 安全区：leading 端原生控件防压（CSS 长度） */
  'leading-inset'?: string
  /** 安全区：trailing 端原生控件防压（CSS 长度） */
  'trailing-inset'?: string
}

/** oas-title-change 事件 detail */
export interface TitlebarTitleChangeDetail {
  title: string
}

/** oas-window-action 事件 detail（组件只发事件不执行窗口操作，宿主接 Electron/Tauri API） */
export interface TitlebarWindowActionDetail {
  action: TitlebarWindowAction | string
}

export interface TitlebarEventMap {
  'oas-title-change': CustomEvent<TitlebarTitleChangeDetail>
  'oas-window-action': CustomEvent<TitlebarWindowActionDetail>
}
