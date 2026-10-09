import { OASActionBar } from './oas-action-bar.js'
import type { ActionBarTheme } from './oas-action-bar.js'
import { OASActionBarButton } from './oas-action-bar-button.js'
import { OASActionBarWell } from './oas-action-bar-well.js'
import { OASStatisticWell } from './oas-statistic-well.js'
import { OASTaskProgressWell } from './oas-task-progress-well.js'
import { OASTransportWell } from './oas-transport-well.js'
import { OASMusicWell } from './oas-music-well.js'

if (!customElements.get('oas-action-bar')) customElements.define('oas-action-bar', OASActionBar)
if (!customElements.get('oas-action-bar-button')) customElements.define('oas-action-bar-button', OASActionBarButton)
if (!customElements.get('oas-action-bar-well')) customElements.define('oas-action-bar-well', OASActionBarWell)
if (!customElements.get('oas-statistic-well')) customElements.define('oas-statistic-well', OASStatisticWell)
if (!customElements.get('oas-task-progress-well')) customElements.define('oas-task-progress-well', OASTaskProgressWell)
if (!customElements.get('oas-transport-well')) customElements.define('oas-transport-well', OASTransportWell)
if (!customElements.get('oas-music-well')) customElements.define('oas-music-well', OASMusicWell)

export {
  OASActionBar,
  OASActionBarButton,
  OASActionBarWell,
  OASStatisticWell,
  OASTaskProgressWell,
  OASTransportWell,
  OASMusicWell,
}
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

export interface TransportWellProps {
  label?: string
  /** 当前帧（受控显示——键盘 seek 发事件，宿主回写） */
  frames?: number
  /** 帧率 fps（时间码换算基准；缺省/非法时退化为原始帧数显示） */
  'frame-rate'?: number
  /** 总帧数（可选——决定 /总时长 段与 seek 上界） */
  duration?: number
  detail?: string
}

/** oas-seek 事件 detail（提议帧号已 clamp [0, duration]；受控——宿主回写 frames） */
export interface TransportSeekDetail {
  frames: number
}

export interface MusicWellProps {
  label?: string
  /** 当前小节（1 起，与 beats 共同决定小节.节拍位置段） */
  bars?: number
  /** 当前节拍（1 起，与 bars 共同决定小节.节拍位置段） */
  beats?: number
  /** 速度 BPM */
  tempo?: number
  /** 拍号（如 4/4，原样显示） */
  meter?: string
  detail?: string
}

export interface ActionBarEventMap {
  'oas-action': CustomEvent<ActionBarActionDetail>
  'oas-cancel': CustomEvent<ActionBarCancelDetail>
  'oas-seek': CustomEvent<TransportSeekDetail>
}
