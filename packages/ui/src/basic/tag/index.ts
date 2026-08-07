import { OASTag } from './oas-tag.js'

if (!customElements.get('oas-tag')) {
  customElements.define('oas-tag', OASTag)
}

export { OASTag }
export type { TagType, TagSize } from './oas-tag.js'
