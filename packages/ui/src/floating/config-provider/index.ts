import { OASConfigProvider } from './oas-config-provider.js'

if (!customElements.get('oas-config-provider')) {
  customElements.define('oas-config-provider', OASConfigProvider)
}

export { OASConfigProvider }
