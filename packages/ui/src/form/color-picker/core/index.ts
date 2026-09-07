// 纯核入口（core-only）：不含 designer 能力包（L3），mode=gradient 配置在此路径下
// 静默失效并在 dev 告警一次（见 oas-color-picker.ts 的 warnDesignerNotImported）。
// 主路径 `@oas-ui/ui/form/color-picker` 已默认内含 designer 能力——仅需纯核瘦身的
// 消费者显式选本路径，并按需 import './designer/index.js' 补能力。
import '@oas-ui/i18n'
import { OASColorPicker } from '../oas-color-picker.js'

if (!customElements.get('oas-color-picker')) {
  customElements.define('oas-color-picker', OASColorPicker)
}

export { OASColorPicker }
