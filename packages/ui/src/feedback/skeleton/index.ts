import { OASSkeleton } from './oas-skeleton.js'
import { OASSkeletonItem } from './oas-skeleton-item.js'

if (!customElements.get('oas-skeleton')) {
  customElements.define('oas-skeleton', OASSkeleton)
}
if (!customElements.get('oas-skeleton-item')) {
  customElements.define('oas-skeleton-item', OASSkeletonItem)
}

export { OASSkeleton, OASSkeletonItem }
