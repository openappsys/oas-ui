import '@oas-ui/i18n'
import '../../feedback/skeleton/index.js'
import { OASStatistic } from './oas-statistic.js'

if (!customElements.get('oas-statistic')) {
  customElements.define('oas-statistic', OASStatistic)
}

export { OASStatistic }
