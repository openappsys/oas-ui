import { OASAvatar } from './oas-avatar.js'

if (!customElements.get('oas-avatar')) {
  customElements.define('oas-avatar', OASAvatar)
}

export { OASAvatar }
