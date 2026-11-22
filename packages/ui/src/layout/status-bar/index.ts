import { OASStatusBar } from './oas-status-bar.js'

if (!customElements.get('oas-status-bar')) {
  customElements.define('oas-status-bar', OASStatusBar)
}

export { OASStatusBar }
