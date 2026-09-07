// 主路径默认含 contextmenu 能力（能力包 import 即注册，与全量入口/族包行为一致）；
// 纯核瘦身走 `@oas-ui/ui/feedback/popover/core` 子路径（不含能力，见 ./core/index.ts）。
import './contextmenu/index.js'
import { OASPopover } from './oas-popover.js'

if (!customElements.get('oas-popover')) {
  customElements.define('oas-popover', OASPopover)
}

export { OASPopover }
