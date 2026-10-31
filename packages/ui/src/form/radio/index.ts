import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASRadio } from './oas-radio.js'
import { OASRadioGroup } from './oas-radio-group.js'

if (!customElements.get('oas-radio')) {
  customElements.define('oas-radio', OASRadio)
}
if (!customElements.get('oas-radio-group')) {
  customElements.define('oas-radio-group', OASRadioGroup)
}

export { OASRadio, OASRadioGroup }
export type { RadioOption } from './oas-radio-group.js'
