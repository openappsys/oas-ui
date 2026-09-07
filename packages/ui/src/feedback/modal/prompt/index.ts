import { registerModalCapability } from '../oas-modal-capability.js'
import { OASModal } from '../oas-modal.js'
import {
  PromptController,
  createPromptController,
} from '../oas-modal-prompt.js'

/**
 * modal 输入确认（prompt）能力包入口（ESM 子路径 `@oas-ui/ui/feedback/modal/prompt`）。
 *
 * import 即注册：本模块求值即把 prompt 能力 controller 工厂写入 modal 能力注册表，
 * 后续构造的 <oas-modal>（OASModal 构造遍历注册表注入）自动具备 prompt 委托点，
 * `modal.prompt(...)`（命令式层检查能力注册表后委托宿主 controller）完整可用。
 *
 * 主路径入口（feedback/modal/index）已默认 import 本模块，其消费者无需显式引用；
 * 仅纯核入口（feedback/modal/core）不含 prompt machinery——调用 modal.prompt 返回
 * null 并 dev 告警一次（见 modal.ts 的 warnPromptNotImported），需显式 import 本模块。
 * 全量入口（@oas-ui/ui）与 CDN 反馈族包同样已内含。
 */
registerModalCapability('prompt', (host) => createPromptController(host as OASModal))

export { PromptController, createPromptController }
export type { ModalPromptCapability } from '../modal.js'
export type { PromptOptions, PromptResult, PromptHandle, PromptInputType } from '../modal.js'
