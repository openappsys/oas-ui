import '@oas-ui/i18n'
import { OASSnackbar } from './oas-snackbar.js'

if (!customElements.get('oas-snackbar')) {
  customElements.define('oas-snackbar', OASSnackbar)
}

export { OASSnackbar }
export type { SnackbarCloseReason, SnackbarCloseDetail } from './oas-snackbar.js'
