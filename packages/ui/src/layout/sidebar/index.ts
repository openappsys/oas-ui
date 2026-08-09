import '@oas-ui/i18n'
import { OASSidebar } from './oas-sidebar.js'

if (!customElements.get('oas-sidebar')) customElements.define('oas-sidebar', OASSidebar)

export { OASSidebar }
export type { SidebarItem } from './oas-sidebar.js'
