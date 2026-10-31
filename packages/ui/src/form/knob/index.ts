import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASKnob } from './oas-knob.js'

if (!customElements.get('oas-knob')) {
  customElements.define('oas-knob', OASKnob)
}

export { OASKnob }
