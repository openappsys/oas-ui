import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASFilter } from './oas-filter.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-filter')) {
  customElements.define('oas-filter', OASFilter)
}

export { OASFilter } from './oas-filter.js'
export type {
  FilterChangeDetail,
  FilterConditions,
  FilterGroup,
  FilterGroupOption,
  FilterOpenDetail,
  FilterPanel,
  FilterSortOption,
} from './oas-filter.js'
