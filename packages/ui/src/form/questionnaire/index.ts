import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASQuestionnaire, type QuestionnaireStep, type StepGoto } from './oas-questionnaire.js'

if (!customElements.get('oas-questionnaire')) {
  customElements.define('oas-questionnaire', OASQuestionnaire)
}

export { OASQuestionnaire, type QuestionnaireStep, type StepGoto }
