import '@oas-ui/i18n'
import { OASGantt, computeVariance } from './oas-gantt.js'

if (!customElements.get('oas-gantt')) {
  customElements.define('oas-gantt', OASGantt)
}

export { OASGantt, computeVariance }
export type {
  GanttTask,
  GanttResource,
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
} from './oas-gantt.js'
