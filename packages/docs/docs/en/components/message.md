# Message

Imperative global message notifications with support for types, custom duration, and manual dismissal.

## Basic usage

<DemoBlock title="Four types">
  <oas-space>
    <oas-button type="success" onclick="message.success('Operation successful')">Success</oas-button>
    <oas-button type="danger" onclick="message.error('Something went wrong')">Error</oas-button>
    <oas-button type="warning" onclick="message.warning('Please pay attention')">Warning</oas-button>
    <oas-button onclick="message.info('This is a message')">Info</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="message.info('Auto closes after 2s', 2000)">2s</oas-button>
    <oas-button onclick="message.success('Auto closes after 5s', 5000)">5s</oas-button>
    <oas-button onclick="message.warning('Stays open until closed manually', 0)">No auto-close (0)</oas-button>
  </oas-space>
</DemoBlock>

## Manual close

<DemoBlock title="Manual close">
  <oas-space>
    <oas-button onclick="window.msgHandle = message.info('This message will not close automatically', 0)">Show message</oas-button>
    <oas-button onclick="window.msgHandle && window.msgHandle.close()">Close manually</oas-button>
  </oas-space>
</DemoBlock>

## Clear all

<DemoBlock title="Clear all">
  <oas-space>
    <oas-button onclick="message.info('Message one'); message.success('Message two'); message.warning('Message three')">Fire three</oas-button>
    <oas-button onclick="destroyAllMessage()">Clear all</oas-button>
  </oas-space>
</DemoBlock>

## Grouped messages

Messages with the same `group` merge into a single one; repeated triggers increment the count (`×n`). Different groups are independent.

<DemoBlock title="Grouped messages">
  <oas-space>
    <oas-button onclick="message.success('Saved', { group: 'save', duration: 0 })">Save (click repeatedly)</oas-button>
    <oas-button onclick="message.info('Synced', { group: 'sync', duration: 0 })">Sync (another group)</oas-button>
  </oas-space>
</DemoBlock>

## Updating messages

Tag a message with `key`, then update its content/type via `message.update(key, options)` and close it via `message.destroy(key)`.

<DemoBlock title="Updating messages">
  <oas-space>
    <oas-button onclick="message.info('Processing…', { key: 'upload', duration: 0 })">Start upload</oas-button>
    <oas-button onclick="message.update('upload', { content: 'Uploaded', type: 'success' })">Mark as success</oas-button>
    <oas-button onclick="message.destroy('upload')">Close this message</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message, destroyAllMessage } = await import('@oas-ui/ui')
  window.message = message
  window.destroyAllMessage = destroyAllMessage
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `message.info(content, duration?)` / `message.info(content, options?)` | Info message, returns `{ close }` |
| `message.success(content, duration?)` / `message.success(content, options?)` | Success message, returns `{ close }` |
| `message.warning(content, duration?)` / `message.warning(content, options?)` | Warning message, returns `{ close }` |
| `message.error(content, duration?)` / `message.error(content, options?)` | Error message, returns `{ close }` |
| `message.update(key, { content, type?, duration? })` | Update content/type of an existing message; creates a new one if the key does not exist |
| `message.destroy(key)` | Close the message identified by `key` |
| `destroyAllMessage()` | Clear all messages |

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `count` | Merge count (shows `×n` after content when > 1) | `string` | `0` |
| `duration` | Auto-close duration (ms), `0` to keep open | `string` | `3000` |
| `group` | Group id: messages in the same group merge into one | — | — |
| `key` | Unique id: used by `message.update` / `message.destroy` | — | — |
| `type` | Message type: `info`/`success`/`warning`/`error` | `string` | `info` |

### Events

| Event | Description |
| --- | --- |
| `oas-close` | Emitted when the message closes (auto-close / close button / `destroy`), `detail: { key? }` |

- `options`: `{ duration?, group?, key?, onClose? }`. `group` merges messages into one and increments the count; `key` is used by `update` / `destroy`; `onClose` fires when the message closes.
- `duration` defaults to `3000`ms; pass `0` to keep the message open.
- When a message closes (auto-close / close button / `destroy`), `oas-close` is emitted with `detail: { key? }`.
- Stacked and centered at the top; `error` uses `role="alert"`, others use `role="status"`.
