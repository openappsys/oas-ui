import { OASEquation } from './oas-equation.js'

if (!customElements.get('oas-equation')) {
  customElements.define('oas-equation', OASEquation)
}

export { OASEquation, renderLatex } from './oas-equation.js'
