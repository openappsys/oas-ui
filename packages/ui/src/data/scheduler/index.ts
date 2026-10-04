import '@oas-ui/i18n'
import { OASScheduler } from './oas-scheduler.js'

if (!customElements.get('oas-scheduler')) {
  customElements.define('oas-scheduler', OASScheduler)
}

export { OASScheduler }
export type {
  SchedulerDayClickDetail,
  SchedulerEvent,
  SchedulerEventClickDetail,
  SchedulerEventsChangeDetail,
  SchedulerRemindDetail,
  SchedulerRepeat,
  SchedulerView,
} from './oas-scheduler.js'
