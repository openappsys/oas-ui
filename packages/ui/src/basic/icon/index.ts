import { OASIcon } from './oas-icon.js'

if (!customElements.get('oas-icon')) {
  customElements.define('oas-icon', OASIcon)
}

export { OASIcon, registerIcon, registerIconLibrary } from './oas-icon.js'
export type { IconLibraryOptions } from './oas-icon.js'
