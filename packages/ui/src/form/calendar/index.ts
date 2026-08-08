import '@oas-ui/i18n'
import { OASCalendar } from './oas-calendar.js'

if (!customElements.get('oas-calendar')) {
  customElements.define('oas-calendar', OASCalendar)
}

export { OASCalendar }
