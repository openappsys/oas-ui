# PageHeader

A page header information area with title, subtitle, back button and a right-side action area. Commonly used at the top of detail and edit pages.

## Basic usage

<DemoBlock title="Title and subtitle">
  <oas-page-header title="Order details" subtitle="Order No. 20260801001"></oas-page-header>
</DemoBlock>

## With back button

<DemoBlock title="Back button">
  <oas-page-header title="User settings" subtitle="Update account and security info" back></oas-page-header>
</DemoBlock>

## Right-side action area

<DemoBlock title="extra slot">
  <oas-page-header title="Project management" subtitle="12 projects in total">
    <oas-space slot="extra" size="small">
      <oas-button size="small">Export</oas-button>
      <oas-button size="small" type="primary">New project</oas-button>
    </oas-space>
  </oas-page-header>
</DemoBlock>

## Event feedback

<DemoBlock title="Back event">
  <oas-page-header title="Article details" back onoas-back="message.info('Back clicked')"></oas-page-header>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

| Property   | Description            | Type    |
| ---------- | ---------------------- | ------- |
| `title`    | Title text             | string  |
| `subtitle` | Subtitle text          | string  |
| `back`     | Whether to show the back button | boolean |

| Event      | Description         |
| ---------- | ------------------- |
| `oas-back` | The back button was clicked |

Slots: `extra` (right-side action area, empty by default). The back button renders as a native `<button aria-label="返回">`.
