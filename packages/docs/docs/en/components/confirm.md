# Confirm

Imperative confirmation dialog based on Promises, reusing `oas-modal` under the hood.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-button type="primary" onclick="openConfirm()">Open confirm</oas-button>
  </oas-space>
</DemoBlock>

## Custom text

<DemoBlock title="Custom text">
  <oas-space>
    <oas-button onclick="openCustomConfirm()">Custom button text</oas-button>
  </oas-space>
</DemoBlock>

## Cancel handling

<DemoBlock title="Cancel handling">
  <oas-space>
    <oas-button type="danger" onclick="openCancelable()">Confirm delete (cancel-aware)</oas-button>
  </oas-space>
</DemoBlock>

## Clear all

<DemoBlock title="Clear all">
  <oas-space>
    <oas-button onclick="openMany()">Open three confirms</oas-button>
    <oas-button onclick="destroyAllConfirm()">Clear all</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { confirm, message, destroyAllConfirm } = await import('@oas-ui/ui')
  window.confirm = confirm
  window.message = message
  window.destroyAllConfirm = destroyAllConfirm
  window.openConfirm = () =>
    confirm({ title: 'Confirm action', content: 'This action cannot be undone. Continue?' }).then(() =>
      message.success('Confirmed'),
    )
  window.openCustomConfirm = () =>
    confirm({ title: 'Delete file', content: 'Cannot be restored after deletion', okText: 'Delete anyway', cancelText: 'Let me reconsider' }).then(
      () => message.success('Deleted'),
    )
  window.openCancelable = () =>
    confirm({ title: 'Delete data', content: 'Cannot be restored after deletion' }).catch(() => message.info('Operation cancelled'))
  window.openMany = () => {
    confirm({ title: 'Confirm 1', content: 'First confirm dialog' })
    confirm({ title: 'Confirm 2', content: 'Second confirm dialog' })
    confirm({ title: 'Confirm 3', content: 'Third confirm dialog' })
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `confirm({ title?, content?, okText?, cancelText?, onOk? })` | Opens a confirm dialog, returns `Promise<void>`; resolves on OK, rejects on cancel; pass an async `onOk` for a loading confirmation (closes on resolve, stays open for retry on reject) |
| `destroyAllConfirm()` | Close all confirm dialogs |

- Reuses `oas-modal`; Esc / mask / cancel button all close it.
- OK and cancel internally dispatch the `oas-ok` / `oas-cancel` events.
