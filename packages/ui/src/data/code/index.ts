import { OASCode, highlightLine } from './oas-code.js'

if (!customElements.get('oas-code')) {
  customElements.define('oas-code', OASCode)
}

export { OASCode, highlightLine }
export type { CodeLanguage } from './oas-code.js'
