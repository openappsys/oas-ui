import { OASCommand, type CommandItem } from './oas-command.js'

if (!customElements.get('oas-command')) {
  customElements.define('oas-command', OASCommand)
}

export { OASCommand, type CommandItem }
