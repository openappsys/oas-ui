import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASMatrix } from './oas-matrix.js'

if (!customElements.get('oas-matrix')) {
  customElements.define('oas-matrix', OASMatrix)
}

export { OASMatrix }
export type { MatrixRow, MatrixColumn, MatrixMode, MatrixValue } from './oas-matrix.js'
