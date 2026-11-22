import { OASRollingText, formatRollingValue } from './oas-rolling-text.js'

if (!customElements.get('oas-rolling-text')) {
  customElements.define('oas-rolling-text', OASRollingText)
}

export { OASRollingText, formatRollingValue }
export type { RollingTextColumn } from './oas-rolling-text.js'
