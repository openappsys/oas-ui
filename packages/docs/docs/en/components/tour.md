# Tour

Step-by-step feature onboarding with a fullscreen overlay and target highlighting.

## Basic usage

<DemoBlock title="Start the tour">
  <oas-button type="primary" onclick="document.getElementById('tour-basic').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-basic" steps='[{"selector":"#tour-b1","title":"Step 1","description":"This is the first highlighted area, located via selector."},{"selector":"#tour-b2","title":"Step 2","description":"Click "Next" or "Finish" to advance."}]'></oas-tour>
  <div id="tour-b1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 1</div>
  <div id="tour-b2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 2</div>
</DemoBlock>

## Tour events

<DemoBlock title="Step events">
  <oas-button type="primary" onclick="document.getElementById('tour-event').setAttribute('open','')">Start tour</oas-button>
  <oas-tour id="tour-event" onoas-step="tourLog(event)" onoas-finish="message.success('Tour complete')" onoas-cancel="message.info('Tour skipped')" steps='[{"selector":"#tour-e1","title":"Step 1","description":"Observe the step-change event output."},{"selector":"#tour-e2","title":"Step 2","description":"Click "Finish" to fire oas-finish; Esc / Skip fires oas-cancel."}]'></oas-tour>
  <oas-tag id="tour-result" type="info">Not started</oas-tag>
  <div id="tour-e1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 1</div>
  <div id="tour-e2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Highlighted area 2</div>
</DemoBlock>

## Controlled step and visibility

Both `open` and `current` are controlled attributes: an external button / JS sets `open` to start the tour, and sets `current` to jump directly to a given step (no need to click through).

<DemoBlock title="Controlled open / current">
  <oas-space>
    <oas-button type="primary" onclick="tourCtlOpen()">Start tour (set open)</oas-button>
    <oas-button onclick="tourCtlJump(1)">Jump to step 2 (current=1)</oas-button>
    <oas-button onclick="tourCtlJump(2)">Jump to step 3 (current=2)</oas-button>
    <oas-button onclick="tourCtlClose()">Finish (remove open)</oas-button>
  </oas-space>
  <oas-tour id="tour-ctrl" steps='[{"selector":"#tour-c1","title":"Step 1","description":"You can jump steps by setting current via an external button."},{"selector":"#tour-c2","title":"Step 2","description":"The current step highlight follows the attribute."},{"selector":"#tour-c3","title":"Step 3","description":"Remove open directly to end the tour."}]'></oas-tour>
  <div id="tour-c1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Controlled highlight area 1</div>
  <div id="tour-c2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Controlled highlight area 2</div>
  <div id="tour-c3" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">Controlled highlight area 3</div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.tourLog = (e) => {
    const tag = document.getElementById('tour-result')
    if (tag) tag.textContent = `Current step: ${e.detail.index + 1}`
  }
  window.tourCtlOpen = () => document.getElementById('tour-ctrl').setAttribute('open', '')
  window.tourCtlJump = (i) => document.getElementById('tour-ctrl').setAttribute('current', String(i))
  window.tourCtlClose = () => document.getElementById('tour-ctrl').removeAttribute('open')
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `current` | Current step index | — | `0` |
| `open` | Start the tour (boolean attribute; starts when present) | — | — |
| `steps` | Steps JSON | `TourStep[] \| string` | `[]` |

### Events

| Event | Description |
| --- | --- |
| `oas-cancel` | Skipped or cancelled via Esc |
| `oas-finish` | "Finish" was clicked on the last step |
| `oas-step` | The step changed, `detail: { index }` |

The overlay highlights the target, `role="dialog"` + `aria-modal="true"`; supports "Previous / Next / Skip" and the Esc key.
