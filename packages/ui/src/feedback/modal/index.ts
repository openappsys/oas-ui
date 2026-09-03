import '@oas-ui/i18n'
import { OASModal, type ModalVariant, type ModalCloseSource, type ModalTransition, type ModalSizePreset } from './oas-modal.js'
import {
  modal,
  destroyAll,
  type ModalHandle,
  type ModalOptions,
  type PromptHandle,
  type PromptOptions,
  type PromptResult,
  type PromptInputType,
  type OptionsItem,
  type OptionsOptions,
  type OptionsResult,
  type OptionsHandle,
  type OptionsType,
} from './modal.js'

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
  type ModalHandle,
  type ModalOptions,
  type PromptHandle,
  type PromptOptions,
  type PromptResult,
  type PromptInputType,
  type OptionsItem,
  type OptionsOptions,
  type OptionsResult,
  type OptionsHandle,
  type OptionsType,
}
