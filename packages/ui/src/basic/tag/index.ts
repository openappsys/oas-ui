import '@oas-ui/i18n'
import '../icon/index.js' // 副作用：确保 oas-icon 已注册（tag 的 icon 属性内部渲染 <oas-icon>）
import { OASTag } from './oas-tag.js'
import { OASTagGroup } from './oas-tag-group.js'

if (!customElements.get('oas-tag')) {
  customElements.define('oas-tag', OASTag)
}
if (!customElements.get('oas-tag-group')) {
  customElements.define('oas-tag-group', OASTagGroup)
}

export { OASTag, OASTagGroup }
export type { TagType, TagSize, TagVariant, TagPresetColor } from './oas-tag.js'
