import { OASAvatarGroup } from './oas-avatar-group.js'

if (!customElements.get('oas-avatar-group')) {
  customElements.define('oas-avatar-group', OASAvatarGroup)
}

export { OASAvatarGroup }
