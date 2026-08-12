import '@oas-ui/i18n'
import { OASTour, type TourStep } from './oas-tour.js'

if (!customElements.get('oas-tour')) {
  customElements.define('oas-tour', OASTour)
}

export { OASTour, type TourStep }
