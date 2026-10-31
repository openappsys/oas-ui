import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASSlider } from './oas-slider.js'

if (!customElements.get('oas-slider')) {
  customElements.define('oas-slider', OASSlider)
}

export { OASSlider }
