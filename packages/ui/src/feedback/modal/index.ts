import '@oas-ui/i18n'
import { OASModal, type ModalVariant, type ModalCloseSource } from './oas-modal.js'
import {
  modal,
  destroyAll,
  type ModalHandle,
  type ModalOptions,
  type PromptHandle,
  type PromptOptions,
  type PromptResult,
  type PromptInputType,
} from './modal.js'

if (!customElements.get('oas-modal')) {
  customElements.define('oas-modal', OASModal)
}

export {
  OASModal,
  type ModalVariant,
  type ModalCloseSource,
  modal,
  destroyAll,
  type ModalHandle,
  type ModalOptions,
  type PromptHandle,
  type PromptOptions,
  type PromptResult,
  type PromptInputType,
}
