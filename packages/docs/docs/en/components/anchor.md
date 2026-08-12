# Anchor

Tracks the current section on scroll and highlights it automatically; clicking an anchor smooth-scrolls to the target.

## Basic usage

<DemoBlock title="Scroll spy">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" items='[{"href":"#anchor-sec-1","title":"Chapter 1"},{"href":"#anchor-sec-2","title":"Chapter 2"},{"href":"#anchor-sec-3","title":"Chapter 3"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Section 1 content: demonstrates scroll spy and highlight tracking.</p>
      <h4 id="anchor-sec-2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">When scrolled into view, the left anchor highlights automatically.</p>
      <h4 id="anchor-sec-3">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">Click an anchor to smooth-scroll to the corresponding section.</p>
    </div>
  </div>
</DemoBlock>

## Highlight offset

<DemoBlock title="Highlight offset (offset)">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" offset="80" items='[{"href":"#anchor-sec-4","title":"Chapter 1"},{"href":"#anchor-sec-5","title":"Chapter 2"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-4" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">offset controls the offset of the top highlight detection zone.</p>
      <h4 id="anchor-sec-5">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">Scroll to observe the difference between the highlight switch point and the default.</p>
    </div>
  </div>
</DemoBlock>

## Click event

<DemoBlock title="Click event">
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch">
    <oas-anchor style="width: 128px; flex-shrink: 0" onoas-change="anchorLog(event)" items='[{"href":"#anchor-sec-6","title":"Chapter 1"},{"href":"#anchor-sec-7","title":"Chapter 2"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-6" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Click the left anchor to see the event output.</p>
      <h4 id="anchor-sec-7">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">The event detail carries the target href.</p>
    </div>
  </div>
  <oas-tag id="anchor-result" type="info">Nothing clicked</oas-tag>
</DemoBlock>

## Controlled highlight

`active` is a controlled attribute: an external set/remove of `active` directly controls the currently highlighted item (the scroll spy still takes over as you scroll).

<DemoBlock title="Controlled active">
  <oas-space>
    <oas-button onclick="anchorSetActive('#anchor-sec-c1')">Highlight Chapter 1</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c2')">Highlight Chapter 2</oas-button>
    <oas-button onclick="anchorSetActive('#anchor-sec-c3')">Highlight Chapter 3</oas-button>
    <oas-button onclick="document.getElementById('anchor-ctrl').removeAttribute('active')">Clear highlight</oas-button>
  </oas-space>
  <div style="display: flex; gap: 16px; width: 100%; align-items: stretch; margin-top: 8px">
    <oas-anchor id="anchor-ctrl" style="width: 128px; flex-shrink: 0" items='[{"href":"#anchor-sec-c1","title":"Chapter 1"},{"href":"#anchor-sec-c2","title":"Chapter 2"},{"href":"#anchor-sec-c3","title":"Chapter 3"}]'></oas-anchor>
    <div style="flex: 1; height: 240px; overflow: auto; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); padding: var(--oas-space-4)">
      <h4 id="anchor-sec-c1" style="margin-top: 0">Chapter 1</h4>
      <p style="color: var(--oas-color-text-secondary)">Click a left button to set <code>active</code>; the anchor highlights the corresponding item immediately.</p>
      <h4 id="anchor-sec-c2">Chapter 2</h4>
      <p style="color: var(--oas-color-text-secondary)">When scrolling this container, the scroll spy takes over highlighting.</p>
      <h4 id="anchor-sec-c3">Chapter 3</h4>
      <p style="color: var(--oas-color-text-secondary)">"Clear highlight" removes <code>active</code>, restoring the no-highlight state.</p>
    </div>
  </div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.anchorLog = (e) => {
    const tag = document.getElementById('anchor-result')
    if (tag) tag.textContent = `Located: ${e.detail.href}`
  }
  window.anchorSetActive = (href) => document.getElementById('anchor-ctrl').setAttribute('active', href)
})
</script>

## API

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `active` | Currently highlighted href | `string` | — |
| `items` | Anchor items JSON | `AnchorItem[] \| string` | `[]` |
| `offset` | Highlight offset in px | `string` | `0` |

### Events

| Event | Description |
| --- | --- |
| `oas-change` | An anchor was clicked, `detail: { href }` |

Scroll spy based on `IntersectionObserver`; clicking smooth-scrolls to the target; `nav` + `aria-label="锚点导航"`, the current item has `aria-current="true"`.
