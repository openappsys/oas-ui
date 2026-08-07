import { OASText } from './oas-typography.js'
import { OASTitle } from './oas-typography.js'
import { OASParagraph } from './oas-typography.js'

if (!customElements.get('oas-text')) {
  customElements.define('oas-text', OASText)
}
if (!customElements.get('oas-title')) {
  customElements.define('oas-title', OASTitle)
}
if (!customElements.get('oas-paragraph')) {
  customElements.define('oas-paragraph', OASParagraph)
}

export { OASText, OASTitle, OASParagraph }
export type { TextType } from './oas-typography.js'
