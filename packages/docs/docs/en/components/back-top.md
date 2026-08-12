# BackTop

A back-to-top button fixed to a corner of the viewport; clicking it smooth-scrolls back to the top of the page.

## Basic usage

The button is fixed to the bottom-right corner of the viewport by default (`bottom: 32px; right: 32px`); scroll the page then click to go back to the top.

<DemoBlock title="Basic usage">
  <oas-back-top visible></oas-back-top>
</DemoBlock>

## Custom position

<DemoBlock title="Custom position">
  <oas-back-top visible bottom="96px"></oas-back-top>
  <oas-back-top visible right="96px" bottom="32px"></oas-back-top>
</DemoBlock>

## Show / hide control

<DemoBlock title="Show / hide control">
  <oas-button onclick="document.getElementById('bt-ctrl').toggleAttribute('visible')">Show / Hide</oas-button>
  <oas-back-top id="bt-ctrl" bottom="180px"></oas-back-top>
</DemoBlock>

## Click event

<DemoBlock title="Click event">
  <oas-button onclick="document.getElementById('bt-event').setAttribute('visible','')">Show button</oas-button>
  <oas-back-top id="bt-event" visible bottom="240px" onoas-click="message.info('About to smooth-scroll back to top')"></oas-back-top>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

### Attributes

| Attribute | Description                           | Type      | Default |
| --------- | ------------------------------------- | --------- | ------- |
| `bottom`  | Distance from the viewport bottom     | `string`  | `32px`  |
| `right`   | Distance from the viewport right edge | `string`  | `32px`  |
| `visible` | Whether the button is shown           | `boolean` | —       |

### Events

| Event       | Description                                             |
| ----------- | ------------------------------------------------------- |
| `oas-click` | The button was clicked (then smooth-scrolls to the top) |

The button is `position: fixed` on the viewport; the `:host` defaults to `display: inline-block`; the button has `aria-hidden="true"` when hidden.
