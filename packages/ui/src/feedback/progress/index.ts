import { OASProgress } from './oas-progress.js'

if (!customElements.get('oas-progress')) {
  customElements.define('oas-progress', OASProgress)
}

export { OASProgress }
