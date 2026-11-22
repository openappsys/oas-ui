import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASInvoice } from './oas-invoice.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-invoice')) {
  customElements.define('oas-invoice', OASInvoice)
}

export { OASInvoice }
export type { InvoiceContent, InvoiceSavedTitle, InvoiceType, InvoiceValue } from './oas-invoice.js'
