import '@oas-ui/i18n'
import { OASPullRefresh } from './oas-pull-refresh.js'

if (!customElements.get('oas-pull-refresh')) {
  customElements.define('oas-pull-refresh', OASPullRefresh)
}

export { OASPullRefresh } from './oas-pull-refresh.js'
