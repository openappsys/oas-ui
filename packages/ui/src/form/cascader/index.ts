import { OASCascader } from './oas-cascader.js'

if (!customElements.get('oas-cascader')) {
  customElements.define('oas-cascader', OASCascader)
}

export { OASCascader }
