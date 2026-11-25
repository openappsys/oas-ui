import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASMemberCard } from './oas-member-card.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-member-card')) {
  customElements.define('oas-member-card', OASMemberCard)
}

export { OASMemberCard } from './oas-member-card.js'
export type { MemberCardVariant } from './oas-member-card.js'
