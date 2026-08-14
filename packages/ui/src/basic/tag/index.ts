import '@oas-ui/i18n'
import '../icon/index.js' // 副作用：确保 oas-icon 已注册（tag 的 icon 属性内部渲染 <oas-icon>）
import { OASTag } from './oas-tag.js'

if (!customElements.get('oas-tag')) {
  customElements.define('oas-tag', OASTag)
}

export { OASTag }
export type { TagType, TagSize, TagVariant } from './oas-tag.js'
