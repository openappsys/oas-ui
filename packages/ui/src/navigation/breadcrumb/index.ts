import '@oas-ui/i18n'
import { OASBreadcrumb, type BreadcrumbItem } from './oas-breadcrumb.js'
import { OASBreadcrumbItem } from './oas-breadcrumb-item.js'
import { OASBreadcrumbSeparator } from './oas-breadcrumb-separator.js'

if (!customElements.get('oas-breadcrumb')) {
  customElements.define('oas-breadcrumb', OASBreadcrumb)
}
if (!customElements.get('oas-breadcrumb-item')) {
  customElements.define('oas-breadcrumb-item', OASBreadcrumbItem)
}
if (!customElements.get('oas-breadcrumb-separator')) {
  customElements.define('oas-breadcrumb-separator', OASBreadcrumbSeparator)
}

export { OASBreadcrumb, OASBreadcrumbItem, OASBreadcrumbSeparator, type BreadcrumbItem }
