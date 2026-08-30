import { OASStepper, type StepperStep } from './oas-stepper.js'
import { OASStepperPanel } from './oas-stepper-panel.js'

if (!customElements.get('oas-stepper')) {
  customElements.define('oas-stepper', OASStepper)
}
if (!customElements.get('oas-stepper-panel')) {
  customElements.define('oas-stepper-panel', OASStepperPanel)
}

export { OASStepper, OASStepperPanel, type StepperStep }
