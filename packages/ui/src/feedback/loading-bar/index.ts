import { OASLoadingBar } from './oas-loading-bar.js'
import { loadingBar, destroyAll } from './loading-bar.js'

if (!customElements.get('oas-loading-bar')) {
  customElements.define('oas-loading-bar', OASLoadingBar)
}

export { OASLoadingBar, loadingBar, destroyAll }
