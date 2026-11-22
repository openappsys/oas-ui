import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASAddress } from './oas-address.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-address')) {
  customElements.define('oas-address', OASAddress)
}

export { OASAddress }
export type { AddressEntry, AddressMode, AddressRegion } from './oas-address.js'
