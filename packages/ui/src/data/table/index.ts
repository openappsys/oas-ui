import { OASTable, type TableColumn, type SortOrder } from './oas-table.js'

if (!customElements.get('oas-table')) {
  customElements.define('oas-table', OASTable)
}

export { OASTable, type TableColumn, type SortOrder }
