import '@oas-ui/i18n'
import { OASKnob } from './oas-knob.js'

if (!customElements.get('oas-knob')) {
  customElements.define('oas-knob', OASKnob)
}

export { OASKnob }
