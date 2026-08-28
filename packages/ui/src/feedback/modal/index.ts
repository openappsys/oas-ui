import '@oas-ui/i18n'
import { OASModal, type ModalVariant } from './oas-modal.js'
import { modal, destroyAll, type ModalHandle, type ModalOptions } from './modal.js'

if (!customElements.get('oas-modal')) {
  customElements.define('oas-modal', OASModal)
}

export {
  OASModal,
  type ModalVariant,
  modal,
  destroyAll,
  type ModalHandle,
  type ModalOptions,
}
