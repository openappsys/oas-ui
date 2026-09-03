import { OASAffix } from './oas-affix.js'

if (!customElements.get('oas-affix')) {
  customElements.define('oas-affix', OASAffix)
}

export { OASAffix }
export type { AffixPosition } from './oas-affix.js'
