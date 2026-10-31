import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASAvatarGroup } from './oas-avatar-group.js'

if (!customElements.get('oas-avatar-group')) {
  customElements.define('oas-avatar-group', OASAvatarGroup)
}

export { OASAvatarGroup }
