import { OASBreadcrumb, type BreadcrumbItem } from './oas-breadcrumb.js'

if (!customElements.get('oas-breadcrumb')) {
  customElements.define('oas-breadcrumb', OASBreadcrumb)
}

export { OASBreadcrumb, type BreadcrumbItem }
