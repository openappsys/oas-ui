import '@oas-ui/i18n'
import { OASScheduler, eventsToIcs } from './oas-scheduler.js'

if (!customElements.get('oas-scheduler')) {
  customElements.define('oas-scheduler', OASScheduler)
}

export { OASScheduler, eventsToIcs }
export type {
  IcsExportOptions,
  SchedulerCreateDetail,
  SchedulerDayClickDetail,
  SchedulerEvent,
  SchedulerEventClickDetail,
  SchedulerEventsChangeDetail,
  SchedulerRemindDetail,
  SchedulerRepeat,
  SchedulerResource,
  SchedulerView,
} from './oas-scheduler.js'
