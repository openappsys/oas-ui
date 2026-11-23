import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASRank } from './oas-rank.js'

if (!customElements.get('oas-rank')) {
  customElements.define('oas-rank', OASRank)
}

export { OASRank }
export type { RankOption, RankAction } from './oas-rank.js'
