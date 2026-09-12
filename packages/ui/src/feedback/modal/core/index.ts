// 纯核入口（core-only）：不含 prompt 能力包（L3），modal.prompt 在此路径下返回 null
// 并在 dev 告警一次（见 modal.ts 的 warnPromptNotImported）。
// 主路径 `@oas-ui/ui/feedback/modal` 已默认内含 prompt 能力——仅需纯核瘦身的消费者
// 显式选本路径，并按需 import './prompt/index.js' 补能力。
import '@oas-ui/i18n'
import {
  OASModal,
  type ModalVariant,
  type ModalCloseSource,
  type ModalTransition,
  type ModalSizePreset,
} from '../oas-modal.js'
import {
  modal,
  destroyAll,
  type ModalHandle,
  type ModalOptions,
  type PromptHandle,
  type PromptOptions,
  type PromptResult,
  type PromptInputType,
  type ModalPromptCapability,
  type OptionsItem,
  type OptionsOptions,
  type OptionsResult,
  type OptionsHandle,
  type OptionsType,
} from '../modal.js'
import { registerModalCapability, registeredModalCapabilities, hasModalCapability } from '../oas-modal-capability.js'

if (!customElements.get('oas-modal')) {
  customElements.define('oas-modal', OASModal)
}

export {
  OASModal,
  type ModalVariant,
  type ModalCloseSource,
  type ModalTransition,
  type ModalSizePreset,
  modal,
  destroyAll,
  registerModalCapability,
  registeredModalCapabilities,
  hasModalCapability,
  type ModalHandle,
  type ModalOptions,
  type PromptHandle,
  type PromptOptions,
  type PromptResult,
  type PromptInputType,
  type ModalPromptCapability,
  type OptionsItem,
  type OptionsOptions,
  type OptionsResult,
  type OptionsHandle,
  type OptionsType,
}
