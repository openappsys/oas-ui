# FloatButton

A circular action button fixed to the bottom-right corner of the page by default, for quick actions like "New" and "Feedback"; supports a badge and a custom icon.

> The demos add `style="position: static"` to avoid fixed positioning affecting the page layout; in real use it is fixed to the bottom-right by default.

## Basic usage

<DemoBlock title="With badge">
  <oas-float-button badge="3" style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## Without badge

<DemoBlock title="Without badge">
  <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## Custom icon

<DemoBlock title="Custom icon">
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## Event feedback

<DemoBlock title="Click event">
  <oas-float-button badge="5" style="position: static; box-shadow: none" onoas-click="message.info('悬浮按钮被点击')"></oas-float-button>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

| Property | Description         |
| -------- | ------------------- |
| `badge`  | Badge number at the top-right corner |

| Event        | Description                              |
| ------------ | ---------------------------------------- |
| `oas-click`  | Clicked, `detail: { originalEvent }`     |

Slots: `icon` (default ＋). The default position is `position: fixed; bottom/right`, overridable via host element styles.
