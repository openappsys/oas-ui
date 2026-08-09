import '@oas-ui/i18n'
import { OASContainer } from './oas-container.js'

if (!customElements.get('oas-container')) customElements.define('oas-container', OASContainer)

export { OASContainer }
