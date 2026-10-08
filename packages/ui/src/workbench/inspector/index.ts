import { OASInspector } from './oas-inspector.js'
import { OASInspectorTabs } from './oas-inspector-tabs.js'
import type { InspectorTabItem } from './oas-inspector-tabs.js'
import { OASInspectorSection } from './oas-inspector-section.js'
import { OASInspectorRow } from './oas-inspector-row.js'

if (!customElements.get('oas-inspector')) customElements.define('oas-inspector', OASInspector)
if (!customElements.get('oas-inspector-tabs')) customElements.define('oas-inspector-tabs', OASInspectorTabs)
if (!customElements.get('oas-inspector-section')) customElements.define('oas-inspector-section', OASInspectorSection)
if (!customElements.get('oas-inspector-row')) customElements.define('oas-inspector-row', OASInspectorRow)

export { OASInspector, OASInspectorTabs, OASInspectorSection, OASInspectorRow }
export type { InspectorTabItem } from './oas-inspector-tabs.js'

export interface InspectorProps {
  /** 栏位方向：right（默认）/ left（分隔线方向语义钩子，定位由宿主布局决定） */
  side?: 'right' | 'left'
  /** 当前 tab（配 oas-inspector-tabs；属性即状态） */
  'active-tab'?: string
  /** 密度档：default（默认）/ compact（行高/间距收窄，token 通道下发子件） */
  density?: 'default' | 'compact'
  /** 无选中态：默认插槽隐藏、empty 插槽（缺省内置文案）显示 */
  empty?: boolean
  /** 可访问名称（缺省走 i18n「属性面板」） */
  label?: string
}

/** oas-change（tabs）事件 detail */
export interface InspectorTabsChangeDetail {
  value: string
}

/** oas-toggle（section）事件 detail */
export interface InspectorSectionToggleDetail {
  name: string
  open: boolean
}

/** oas-row-reset 事件 detail */
export interface InspectorRowResetDetail {
  label: string
}

export interface InspectorTabsProps {
  /** JSON `[{ label, value, disabled? }]`（attribute 声明式通道） */
  items?: InspectorTabItem[]
  /** 当前 tab（属性即状态） */
  value?: string
}

export interface InspectorSectionProps {
  /** 分节标题 */
  heading?: string
  /** 分节名（oas-toggle detail 携带） */
  name?: string
  /** 启用折叠（缺省纯标题） */
  collapsible?: boolean
  /** 展开状态（属性即状态） */
  open?: boolean
  /** 初始默认展开（非受控便利） */
  'default-open'?: boolean
}

export interface InspectorRowProps {
  /** 标签文本 */
  label?: string
  /** 只读值（键值行） */
  value?: string
  /** 多选混合态（显示「混合值」内置文案，value 让位） */
  mixed?: boolean
  /** 显示行级复位钮 */
  reset?: boolean
}

export interface InspectorEventMap {
  'oas-change': CustomEvent<InspectorTabsChangeDetail>
  'oas-toggle': CustomEvent<InspectorSectionToggleDetail>
  'oas-row-reset': CustomEvent<InspectorRowResetDetail>
}
