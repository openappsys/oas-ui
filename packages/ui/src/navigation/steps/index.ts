import { OASSteps, type StepItem } from './oas-steps.js'

if (!customElements.get('oas-steps')) {
  customElements.define('oas-steps', OASSteps)
}

export { OASSteps, type StepItem }
