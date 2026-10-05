import '@oas-ui/i18n'
// scrollable 模式内嵌 <oas-marquee>：先注册 marquee，保证 notice-bar 单独引入即可用
import '../../data/marquee/index.js'
import { OASNoticeBar } from './oas-notice-bar.js'

if (!customElements.get('oas-notice-bar')) {
  customElements.define('oas-notice-bar', OASNoticeBar)
}

export { OASNoticeBar }
