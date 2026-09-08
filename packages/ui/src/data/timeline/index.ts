import '@oas-ui/i18n'
import '../../basic/icon/index.js' // 副作用：确保 oas-icon 已注册（icon 属性内部渲染 <oas-icon>）
import { OASTimeline } from './oas-timeline.js'
import { OASTimelineItem } from './oas-timeline-item.js'

if (!customElements.get('oas-timeline')) {
  customElements.define('oas-timeline', OASTimeline)
}
if (!customElements.get('oas-timeline-item')) {
  customElements.define('oas-timeline-item', OASTimelineItem)
}

export { OASTimeline, OASTimelineItem }
