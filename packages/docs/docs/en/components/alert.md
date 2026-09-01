# Alert

An inline notice bar for success, info, warning, or error messages, with support for a title, description, icon, action area, close animation, and multiple variants.

## Basic usage

<DemoBlock title="Four types">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="Info notice">This is a regular info message</oas-alert>
    <oas-alert type="success" title="Success notice">The operation completed successfully</oas-alert>
    <oas-alert type="warning" title="Warning notice">Please save your current progress</oas-alert>
    <oas-alert type="error" title="Error notice">Operation failed, please try again later</oas-alert>
  </oas-space>
</DemoBlock>

## No title

<DemoBlock title="No title">
  <oas-alert type="info">An alert with only body content and no title line.</oas-alert>
</DemoBlock>

## Icon

`icon` shows the default icon for the type; `slot="icon"` overrides it with custom content; `prominent` scales the icon up one step (combined with `icon` or `banner`).

<DemoBlock title="Icon (icon)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="Info notice" icon>An info notice with an icon</oas-alert>
    <oas-alert type="success" title="Success notice" icon>The operation completed successfully</oas-alert>
    <oas-alert type="warning" title="Warning notice" icon>Please save your current progress</oas-alert>
    <oas-alert type="error" title="Error notice" icon>Operation failed, please try again later</oas-alert>
  </oas-space>
</DemoBlock>

<DemoBlock title="Custom icon (slot=icon)">
  <oas-alert type="info" icon>
    <span slot="icon">🚀</span>
    Replace the default icon via <code>slot="icon"</code> — any icon or image works.
  </oas-alert>
</DemoBlock>

<DemoBlock title="Large icon (prominent)">
  <oas-alert type="warning" title="Disk space is running low" icon prominent>
    <span slot="icon">⚠️</span>
    <oas-button size="small" variant="outlined" onclick="message.info('Cleanup started')">Clean up now</oas-button>
    Only 1.2GB of free space remains, please clean up your cache.
  </oas-alert>
</DemoBlock>

## Description

The `description` attribute or `slot="description"` renders a description line between the title and the body, coexisting with the default slot content.

<DemoBlock title="Description (description)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="Scheduled maintenance" description="Maintenance runs tonight 22:00 - 24:00; some services may be briefly unavailable.">
      Please save your work in advance. The system recovers automatically after maintenance.
    </oas-alert>
    <oas-alert type="warning" icon>
      <span slot="description">This is a slot description with rich content.</span>
      An alert with only a slot description and no title.
    </oas-alert>
  </oas-space>
</DemoBlock>

## Action area

`slot="action"` renders an action area on the right (buttons such as view details, undo, etc.); when combined with the close button, it sits to the left of the close button.

<DemoBlock title="Action area (slot=action)">
  <oas-alert type="warning" title="Update available" closeable>
    <oas-button size="small" type="primary" slot="action" onclick="message.info('Update started')">Update now</oas-button>
    <oas-button size="small" slot="action" onclick="message.info('Maybe later')">Later</oas-button>
    Version v2.4.0 is available with performance improvements and bug fixes.
  </oas-alert>
</DemoBlock>

## Variants

`variant` supports three styles: `tint` (default, tinted background + border), `filled` (solid type color with contrasting text), and `outlined` (transparent background + type-colored border).

<DemoBlock title="Variants (variant)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" title="tint background" closeable>The default look: tinted background + same-color border.</oas-alert>
    <oas-alert type="success" title="filled solid" variant="filled" closeable>Solid type color background; text switches to a contrasting color.</oas-alert>
    <oas-alert type="success" title="outlined border" variant="outlined" closeable>Transparent background + type-colored border.</oas-alert>
  </oas-space>
</DemoBlock>

## Banner

`banner` removes the border and border radius for a full-width strip, and shows the type icon by default (combined with `icon`); commonly used with `center` for a centered page-top banner.

<DemoBlock title="Banner (banner + center)">
  <oas-alert type="warning" banner center>
    The platform will undergo system upgrade on Saturday 00:00 - 06:00, please plan accordingly.
  </oas-alert>
</DemoBlock>

<DemoBlock title="Closable banner">
  <oas-alert type="error" banner center closeable>
    Abnormal traffic detected; some requests were blocked. Please verify your account security.
  </oas-alert>
</DemoBlock>

## Centered

`center` horizontally centers the text area (title / description / body), commonly used with banners and plain text notices.

<DemoBlock title="Centered (center)">
  <oas-alert type="info" title="Notice" center>The content area is horizontally centered.</oas-alert>
</DemoBlock>

## Closable

<DemoBlock title="Closable">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" title="Closable notice" closeable>Click the ✕ on the right to close this alert</oas-alert>
    <oas-alert type="warning" closeable>A closable alert without a title</oas-alert>
  </oas-space>
</DemoBlock>

## Close animation & controlled visibility

Closing plays a fade-out transition and dispatches `oas-after-close` when done. The `open` attribute controls visibility (open by default); after closing, the component removes `open` and dispatches `oas-open-change`, and the host can re-open it by setting `open` again. With `prefers-reduced-motion`, the transition is skipped and the alert hides directly.

<DemoBlock title="Close animation (controlled reopen)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-button id="alert-reopen-btn" type="primary" onclick="document.querySelector('#alert-reopen').setAttribute('open','')">Reopen notice</oas-button>
    <oas-alert id="alert-reopen" type="info" title="Reopenable notice" closeable onoas-after-close="message.info('Exit animation finished')">Click ✕ to close; use the button above to reopen after the animation.</oas-alert>
  </oas-space>
</DemoBlock>

<DemoBlock title="Controlled visibility (open)">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#alert-ctrl').setAttribute('open','')">Open (set open)</oas-button>
    <oas-button onclick="document.querySelector('#alert-ctrl').removeAttribute('open')">Close (remove open)</oas-button>
  </oas-space>
  <oas-alert id="alert-ctrl" type="success" title="Controlled notice" icon>External buttons set / remove <code>open</code> to control visibility, with the same exit transition.</oas-alert>
</DemoBlock>

## Custom close

`close-text` replaces the ✕ text (and becomes the button's accessible name); `slot="close"` provides rich custom close content.

<DemoBlock title="Custom close (close-text)">
  <oas-alert type="warning" title="Custom close text" closeable close-text="Got it">Click "Got it" on the right to close.</oas-alert>
</DemoBlock>

<DemoBlock title="Custom close (slot=close)">
  <oas-alert type="info" title="Rich custom close" closeable>
    <oas-icon slot="close" name="close-circle"></oas-icon>
    Replaces the default ✕ with an icon; click to close.
  </oas-alert>
</DemoBlock>

## Collapse

The numeric `max-line` attribute truncates the body with CSS line-clamp, and provides an expand / collapse toggle.

<DemoBlock title="Collapse (max-line)">
  <oas-alert type="info" title="Changelog" max-line="2">
    This release brings several improvements: a brand-new theme customization panel, faster list rendering, configurable keyboard shortcuts, and a wide range of accessibility enhancements. It also fixes several known issues, including table overflow on narrow screens and popup misalignment on low resolutions. See the full changelog for details.
  </oas-alert>
</DemoBlock>

## Accent border

The `border` attribute renders a type-colored accent bar on the corresponding side(s). Values are space-separated: `top` / `end` / `bottom` / `start`.

<DemoBlock title="Accent border (border)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="info" title="Top accent" border="top">The accent bar is rendered on the top.</oas-alert>
    <oas-alert type="error" title="Start + bottom accent" border="start bottom">Multiple sides can be combined.</oas-alert>
  </oas-space>
</DemoBlock>

## Sizes

`size` supports three steps: `small` / `medium` (default) / `large`, scaling font size and padding.

<DemoBlock title="Sizes (size)">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-alert type="success" size="small" title="Small" icon>For compact scenarios.</oas-alert>
    <oas-alert type="success" size="medium" title="Medium (default)" icon>The regular size.</oas-alert>
    <oas-alert type="success" size="large" title="Large" icon prominent>For featured scenarios.</oas-alert>
  </oas-space>
</DemoBlock>

## Event feedback

<DemoBlock title="Event feedback">
  <oas-alert type="warning" title="With event feedback" closeable onoas-close="message.info('Alert closed')" onoas-open-change="message.info('open=' + $event.detail.open)">Dispatches oas-close when closed and oas-open-change on visibility changes.</oas-alert>
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

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `banner` | — | `boolean` | — |
| `border` | — | `string` | — |
| `center` | — | `boolean` | — |
| `close-text` | — | `string` | — |
| `closeable` | Whether to show the close button | `boolean` | — |
| `description` | — | `string` | — |
| `icon` | — | `boolean` | — |
| `max-line` | — | `string` | `0` |
| `open` | — | `boolean` | — |
| `prominent` | — | `boolean` | — |
| `size` | — | `string` | `medium` |
| `title` | Title text (rendered into the visible title region; absorbed from the host on read so no native hover tooltip remains; pass an empty string to clear); use the "title" slot for rich content | `string` | — |
| `type` | Alert type | `string` | `info` |
| `variant` | — | `string` | `tint` |

### Events

| Event | Description |
| --- | --- |
| `oas-after-close` | — |
| `oas-close` | Dispatched after the close button is clicked; the component then hides |
| `oas-open-change` | — |

### Slots

| Name | Description |
| --- | --- |
| default | — |
| `action` | — |
| `close` | — |
| `description` | — |
| `icon` | — |
| `title` | Rich title content slot; overrides the title attribute text when present |
