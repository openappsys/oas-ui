import '@oas-ui/i18n'
import { OASGantt } from './oas-gantt.js'

if (!customElements.get('oas-gantt')) {
  customElements.define('oas-gantt', OASGantt)
}

export { OASGantt }
export type {
  GanttTask,
  GanttDependency,
  GanttScale,
  GanttTaskClickDetail,
  GanttTaskChangeDetail,
  GanttProgressChangeDetail,
  GanttTasksChangeDetail,
  GanttExpandChangeDetail,
  GanttScaleChangeDetail,
  GanttTaskRenderDetail,
  GanttReparentDetail,
  GanttDependenciesChangeDetail,
  GanttSelectionChangeDetail,
  GanttTaskAddDetail,
  GanttRescheduleDetail,
} from './oas-gantt.js'
