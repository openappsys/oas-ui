import { OASAppBar } from './oas-app-bar.js'

if (!customElements.get('oas-app-bar')) {
  customElements.define('oas-app-bar', OASAppBar)
}

export { OASAppBar }
export type { AppBarPosition } from './oas-app-bar.js'
