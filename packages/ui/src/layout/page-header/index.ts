import { OASPageHeader } from './oas-page-header.js'

if (!customElements.get('oas-page-header')) {
  customElements.define('oas-page-header', OASPageHeader)
}

export { OASPageHeader }
