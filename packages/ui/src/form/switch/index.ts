import '../../basic/icon/index.js' // 副作用：确保 oas-icon 已注册（checked-icon/unchecked-icon 属性内部渲染 <oas-icon>）
import { OASSwitch } from './oas-switch.js'

if (!customElements.get('oas-switch')) {
  customElements.define('oas-switch', OASSwitch)
}

export { OASSwitch }
