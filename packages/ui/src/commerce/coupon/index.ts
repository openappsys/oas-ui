import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { commerceMessages } from '@oas-ui/i18n/slices/commerce'
import { OASCoupon } from './oas-coupon.js'

registerDefaultMessages(commerceMessages)

if (!customElements.get('oas-coupon')) {
  customElements.define('oas-coupon', OASCoupon)
}

export { OASCoupon }
export type {
  CouponData,
  CouponOpenChangeDetail,
  CouponSelectDetail,
  CouponStatus,
} from './oas-coupon.js'
