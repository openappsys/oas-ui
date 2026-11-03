import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { navigationMessages } from '@oas-ui/i18n/slices/navigation'
registerDefaultMessages(navigationMessages)
import { OASCommand, type CommandItem, type CommandLevelContext, type CommandLevelLoader } from './oas-command.js'
import { OASCommandItem } from './oas-command-item.js'

if (!customElements.get('oas-command')) {
  customElements.define('oas-command', OASCommand)
}
if (!customElements.get('oas-command-item')) {
  customElements.define('oas-command-item', OASCommandItem)
}

export { OASCommand, OASCommandItem, type CommandItem, type CommandLevelContext, type CommandLevelLoader }
