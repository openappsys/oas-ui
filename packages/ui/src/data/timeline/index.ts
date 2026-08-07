import { OASTimeline } from './oas-timeline.js'
import { OASTimelineItem } from './oas-timeline-item.js'

if (!customElements.get('oas-timeline')) {
  customElements.define('oas-timeline', OASTimeline)
}
if (!customElements.get('oas-timeline-item')) {
  customElements.define('oas-timeline-item', OASTimelineItem)
}

export { OASTimeline, OASTimelineItem }
