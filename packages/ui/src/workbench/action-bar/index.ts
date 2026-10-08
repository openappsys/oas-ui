import { OASActionBar } from './oas-action-bar.js'
import type { ActionBarTheme } from './oas-action-bar.js'
import { OASActionBarButton } from './oas-action-bar-button.js'
import { OASActionBarWell } from './oas-action-bar-well.js'
import { OASStatisticWell } from './oas-statistic-well.js'
import { OASTaskProgressWell } from './oas-task-progress-well.js'

if (!customElements.get('oas-action-bar')) customElements.define('oas-action-bar', OASActionBar)
if (!customElements.get('oas-action-bar-button')) customElements.define('oas-action-bar-button', OASActionBarButton)
if (!customElements.get('oas-action-bar-well')) customElements.define('oas-action-bar-well', OASActionBarWell)
if (!customElements.get('oas-statistic-well')) customElements.define('oas-statistic-well', OASStatisticWell)
if (!customElements.get('oas-task-progress-well')) customElements.define('oas-task-progress-well', OASTaskProgressWell)

export { OASActionBar, OASActionBarButton, OASActionBarWell, OASStatisticWell, OASTaskProgressWell }
export type { ActionBarTheme } from './oas-action-bar.js'

export interface ActionBarProps {
  /** 表体：charcoal（默认，恒深表面）/ dark（恒深·深档）/ light（主题本色） */
  theme?: ActionBarTheme
}

/** oas-action 事件 detail（active 为点击时刻状态，宿主回写 active 属性实现切换） */
export interface ActionBarActionDetail {
  value: string
  active: boolean
}

/** oas-cancel 事件 detail（组件只发事件不移除自身，宿主决定后续） */
export interface ActionBarCancelDetail {
  label: string
}

export interface ActionBarButtonProps {
  /** 命令标识（oas-action detail 携带） */
  value?: string
  /** 选中态（受控显示，宿主回写） */
  active?: boolean
  /** 选中高亮色：11 预设名或任意 CSS 色值 */
  'active-tint'?: string
  /** 组内无填充（选中只着色） */
  plain?: boolean
  disabled?: boolean
}

export interface ActionBarWellProps {
  /** 井最大宽度（px，默认 320） */
  'max-width'?: number
}

export interface StatisticWellProps {
  label?: string
  value?: string
  detail?: string
}

export interface TaskProgressWellProps {
  label?: string
  /** 0-100（受控显示，宿主驱动） */
  progress?: number
  detail?: string
}

export interface ActionBarEventMap {
  'oas-action': CustomEvent<ActionBarActionDetail>
  'oas-cancel': CustomEvent<ActionBarCancelDetail>
}
