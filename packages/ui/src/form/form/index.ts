import { OASForm } from './oas-form.js'

if (!customElements.get('oas-form')) {
  customElements.define('oas-form', OASForm)
}

export { OASForm }
