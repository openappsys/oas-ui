import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { frameworkMessages } from '@oas-ui/i18n/slices/framework'
registerDefaultMessages(frameworkMessages)
import { OASThemeEditor } from './oas-theme-editor.js'

if (!customElements.get('oas-theme-editor')) {
  customElements.define('oas-theme-editor', OASThemeEditor)
}

export { OASThemeEditor }
