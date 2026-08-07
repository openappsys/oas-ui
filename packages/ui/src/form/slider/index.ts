import { OASSlider } from './oas-slider.js'

if (!customElements.get('oas-slider')) {
  customElements.define('oas-slider', OASSlider)
}

export { OASSlider }
