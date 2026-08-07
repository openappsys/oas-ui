import { OASButton } from './oas-button.js'

if (!customElements.get('oas-button')) {
  customElements.define('oas-button', OASButton)
}

export { OASButton }
export type { ButtonType, ButtonSize } from './oas-button.js'
