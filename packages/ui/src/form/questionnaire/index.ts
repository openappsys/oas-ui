import { OASQuestionnaire, type QuestionnaireStep } from './oas-questionnaire.js'

if (!customElements.get('oas-questionnaire')) {
  customElements.define('oas-questionnaire', OASQuestionnaire)
}

export { OASQuestionnaire, type QuestionnaireStep }
