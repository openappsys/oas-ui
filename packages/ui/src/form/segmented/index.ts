import { OASSegmented, type SegmentedOption } from './oas-segmented.js'

if (!customElements.get('oas-segmented')) {
  customElements.define('oas-segmented', OASSegmented)
}

export { OASSegmented, type SegmentedOption }
