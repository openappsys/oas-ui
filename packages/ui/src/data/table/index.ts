import '@oas-ui/i18n'
import {
  OASTable,
  type TableColumn,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
} from './oas-table.js'

if (!customElements.get('oas-table')) {
  customElements.define('oas-table', OASTable)
}

export {
  OASTable,
  type TableColumn,
  type SortOrder,
  type SummaryType,
  type SummaryConfig,
  type EditOption,
}
