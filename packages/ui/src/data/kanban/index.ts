import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASKanban } from './oas-kanban.js'

if (!customElements.get('oas-kanban')) {
  customElements.define('oas-kanban', OASKanban)
}

export { OASKanban }
export type {
  KanbanCard,
  KanbanCardRenderer,
  KanbanChangeDetail,
  KanbanColumn,
  KanbanColumnReorderDetail,
} from './oas-kanban.js'
