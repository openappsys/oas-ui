import { OASThemeEditor } from './oas-theme-editor.js'

if (!customElements.get('oas-theme-editor')) {
  customElements.define('oas-theme-editor', OASThemeEditor)
}

export { OASThemeEditor }
