import { OASMenubar, type MenubarItem } from './oas-menubar.js'
import { OASMenubarItem } from './oas-menubar-item.js'
import { OASMenubarGroup } from './oas-menubar-group.js'
import { OASMenubarDivider } from './oas-menubar-divider.js'

if (!customElements.get('oas-menubar')) {
  customElements.define('oas-menubar', OASMenubar)
}
if (!customElements.get('oas-menubar-item')) {
  customElements.define('oas-menubar-item', OASMenubarItem)
}
if (!customElements.get('oas-menubar-group')) {
  customElements.define('oas-menubar-group', OASMenubarGroup)
}
if (!customElements.get('oas-menubar-divider')) {
  customElements.define('oas-menubar-divider', OASMenubarDivider)
}

export { OASMenubar, OASMenubarItem, OASMenubarGroup, OASMenubarDivider, type MenubarItem }
