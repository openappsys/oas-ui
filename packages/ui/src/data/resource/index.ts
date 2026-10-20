import '@oas-ui/i18n'
import { OASResource } from './oas-resource.js'

if (!customElements.get('oas-resource')) {
  customElements.define('oas-resource', OASResource)
}

export { OASResource }
export { levelResources } from './oas-resource.js'
export {
  exportResourceCalendars,
  importResourceCalendars,
  computeUtilization,
  suggestAssignments,
  buildSkillMatrix,
} from './resource-utils.js'
export type {
  ResourceCalendarFile,
  ResourceCalendarEntry,
  UtilizationOptions,
  UtilizationPeriod,
  ResourceUtilization,
  UtilizationReport,
  SkillMatrix,
  AssignmentSuggestion,
} from './resource-utils.js'
export type {
  ResourceItem,
  ResourceTask,
  ResourceScale,
  ResourceTaskClickDetail,
  ResourceTasksChangeDetail,
  ResourceOverloadEntry,
  ResourceOverloadDetail,
  LevelResourcesOptions,
} from './oas-resource.js'
