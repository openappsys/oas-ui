import '@oas-ui/i18n'
import { OASRelativeTime } from './oas-relative-time.js'

if (!customElements.get('oas-relative-time')) {
  customElements.define('oas-relative-time', OASRelativeTime)
}

export { OASRelativeTime }
