import '../../basic/icon/index.js' // 副作用：确保 oas-icon 已注册（icon 选项字段内部渲染 <oas-icon>）
import { OASSegmented, type SegmentedOption } from './oas-segmented.js'

if (!customElements.get('oas-segmented')) {
  customElements.define('oas-segmented', OASSegmented)
}

export { OASSegmented }
export type { SegmentedOption }
