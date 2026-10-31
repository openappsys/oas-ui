// 主路径默认含 designer 能力（能力包 import 即注册，与全量入口/族包行为一致）；
// 纯核瘦身走 `@oas-ui/ui/form/color-picker/core` 子路径（不含能力，见 ./core/index.ts）。
import './designer/index.js'
import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASColorPicker } from './oas-color-picker.js'

if (!customElements.get('oas-color-picker')) {
  customElements.define('oas-color-picker', OASColorPicker)
}

export { OASColorPicker }
