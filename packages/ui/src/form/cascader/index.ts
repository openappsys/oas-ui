import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { formMessages } from '@oas-ui/i18n/slices/form'
registerDefaultMessages(formMessages)
import { OASCascader } from './oas-cascader.js'

if (!customElements.get('oas-cascader')) {
  customElements.define('oas-cascader', OASCascader)
}

export { OASCascader }
export type { CascaderOption, CascaderLoadFn, CascaderFilterFn } from './oas-cascader.js'
