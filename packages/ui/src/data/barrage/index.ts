import { OASBarrage } from './oas-barrage.js'

if (!customElements.get('oas-barrage')) {
  customElements.define('oas-barrage', OASBarrage)
}

export {
  OASBarrage,
  estimateBarrageWidth,
  resolveBarrageGap,
  resolveBarrageMaxActive,
  resolveBarrageSpeed,
  resolveBarrageTracks,
} from './oas-barrage.js'
export type { BarrageItemDetail, BarrageItemInput, BarrageItemOptions } from './oas-barrage.js'
