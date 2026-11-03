import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASGantt, computeVariance } from './oas-gantt.js'

if (!customElements.get('oas-gantt')) {
  customElements.define('oas-gantt', OASGantt)
}

export { OASGantt, computeVariance }
export { computeResourceConflicts } from './oas-gantt.js'
export type {
  GanttTask,
  GanttResource,
  GanttBaseline,
  GanttBaselineVariance,
  GanttDependency,
  GanttScale,
  GanttTaskClickDetail,
  GanttTaskChangeDetail,
  GanttProgressChangeDetail,
  GanttTasksChangeDetail,
  GanttExpandChangeDetail,
  GanttHistoryChangeDetail,
  GanttScaleChangeDetail,
  GanttTaskRenderDetail,
  GanttReparentDetail,
  GanttDependenciesChangeDetail,
  GanttSelectionChangeDetail,
  GanttTaskAddDetail,
  GanttRescheduleDetail,
  GanttResourceConflict,
  GanttResourceConflictDetail,
} from './oas-gantt.js'
