import '@oas-ui/i18n'
import { OASKanban } from './oas-kanban.js'

if (!customElements.get('oas-kanban')) {
  customElements.define('oas-kanban', OASKanban)
}

export { OASKanban }
export type { KanbanCard, KanbanCardRenderer, KanbanChangeDetail, KanbanColumn } from './oas-kanban.js'
