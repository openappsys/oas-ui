import { OASCommand, type CommandItem } from './oas-command.js'
import { OASCommandItem } from './oas-command-item.js'

if (!customElements.get('oas-command')) {
  customElements.define('oas-command', OASCommand)
}
if (!customElements.get('oas-command-item')) {
  customElements.define('oas-command-item', OASCommandItem)
}

export { OASCommand, OASCommandItem, type CommandItem }
