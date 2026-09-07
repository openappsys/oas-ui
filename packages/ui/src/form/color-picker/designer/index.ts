import { registerColorPickerCapability } from '../oas-color-picker-capability.js'
import {
  ColorPickerDesignerController,
  createDesignerController,
  type ColorPickerDesignerHost,
} from '../oas-color-picker-designer.js'

/**
 * color-picker designer 能力包入口（ESM 子路径 `@oas-ui/ui/form/color-picker/designer`）。
 *
 * import 即注册：本模块求值即把 2D 色域 + gradient 设计器 controller 工厂写入
 * color-picker 能力注册表，后续构造的 <oas-color-picker>（OASColorPicker 构造时遍历注册表
 * 注入）自动获得设计器能力。
 *
 * 主路径入口（form/color-picker/index）已默认 import 本模块，其消费者无需显式引用；
 * 仅纯核入口（form/color-picker/core）不含本能力——`mode=gradient` 配置静默失效并
 * dev 告警一次（见 oas-color-picker.ts 的 warnDesignerNotImported），需显式 import 本模块。
 * 全量入口（@oas-ui/ui）与 CDN 表单族包同样已内含。
 */
registerColorPickerCapability('designer', (host) =>
  createDesignerController(host as HTMLElement & ColorPickerDesignerHost),
)

export { ColorPickerDesignerController, createDesignerController }
export type { ColorPickerDesignerHost }
export type { ColorPickerDesignerCapability } from '../oas-color-picker.js'
export type { GradientStop, RGBA, FormatOptions } from '../color.js'
