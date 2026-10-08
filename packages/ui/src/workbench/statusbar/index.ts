import { OASStatusbar } from './oas-statusbar.js'
import { OASStatusbarItem } from './oas-statusbar-item.js'
import type { StatusbarItemStatus } from './oas-statusbar-item.js'

if (!customElements.get('oas-statusbar')) customElements.define('oas-statusbar', OASStatusbar)
if (!customElements.get('oas-statusbar-item')) customElements.define('oas-statusbar-item', OASStatusbarItem)

export { OASStatusbar, OASStatusbarItem }
export type { StatusbarItemStatus } from './oas-statusbar-item.js'

export interface StatusbarProps {
  /** 可访问名称（缺省走 i18n「状态栏」） */
  label?: string
}

/** oas-item-click 事件 detail */
export interface StatusbarItemClickDetail {
  value: string
  label: string
}

export interface StatusbarItemProps {
  /** 数值/状态值（表格数字体呈现） */
  value?: string
  /** 文本标签 */
  label?: string
  /** 内置图标名（@oas-ui/icons 注册表；未知名不渲染） */
  icon?: string
  /** 渲染为原生 button（可点、键盘可达）；缺省为只读 div 语义 */
  button?: boolean
  /** 语义色档：default / info / warning / error / progress */
  status?: StatusbarItemStatus
  /** 后台活动旋转指示 */
  spinning?: boolean
}

export interface StatusbarItemEventMap {
  'oas-item-click': CustomEvent<StatusbarItemClickDetail>
}
