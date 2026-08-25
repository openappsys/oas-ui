import '@oas-ui/i18n'
import { OASSidebar } from './oas-sidebar.js'
import { OASSidebarItem } from './oas-sidebar-item.js'
import { OASSidebarDivider } from './oas-sidebar-divider.js'

if (!customElements.get('oas-sidebar')) customElements.define('oas-sidebar', OASSidebar)
if (!customElements.get('oas-sidebar-item')) {
  customElements.define('oas-sidebar-item', OASSidebarItem)
}
if (!customElements.get('oas-sidebar-divider')) {
  customElements.define('oas-sidebar-divider', OASSidebarDivider)
}

export { OASSidebar, OASSidebarItem, OASSidebarDivider }
export type { SidebarItem } from './oas-sidebar.js'
