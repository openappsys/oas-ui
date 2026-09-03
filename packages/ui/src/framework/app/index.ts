import { OASApp } from './oas-app.js'

if (!customElements.get('oas-app')) {
  customElements.define('oas-app', OASApp)
}

export { OASApp }
export { registerAppHost, unregisterAppHost, getAppHost, resolveMessageHost } from './app-host.js'
