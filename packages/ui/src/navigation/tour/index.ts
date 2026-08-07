import { OAStour, type TourStep } from './oas-tour.js'

if (!customElements.get('oas-tour')) {
  customElements.define('oas-tour', OAStour)
}

export { OAStour, type TourStep }
