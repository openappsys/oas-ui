// 主路径默认含 prompt 能力（能力包 import 即注册，与全量入口/族包行为一致）；
// 纯核瘦身走 `@oas-ui/ui/feedback/modal/core` 子路径（不含能力，见 ./core/index.ts）。
import './prompt/index.js'
import '@oas-ui/i18n'
import {
  OASModal,
  type ModalVariant,
  type ModalCloseSource,
  type ModalTransition,
  type ModalSizePreset,
} from './oas-modal.js'
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
} from './modal.js'
import { registerModalCapability, registeredModalCapabilities, hasModalCapability } from './oas-modal-capability.js'

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
