// 纯核入口（core-only）：不含 contextmenu 能力包（L3），右键光标定位 / 触屏长按 /
// 断点简写在此路径下静默失效并在 dev 告警一次（见 oas-popover.ts 的 warnContextmenuNotImported）。
// 主路径 `@oas-ui/ui/feedback/popover` 已默认内含 contextmenu 能力——仅需纯核瘦身的
// 消费者显式选本路径，并按需 import './contextmenu/index.js' 补能力。
import { OASPopover } from '../oas-popover.js'

if (!customElements.get('oas-popover')) {
  customElements.define('oas-popover', OASPopover)
}

export { OASPopover }
