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
| `message.info(content, duration?)` | Info message, returns `{ close }` |
| `message.success(content, duration?)` | Success message, returns `{ close }` |
| `message.warning(content, duration?)` | Warning message, returns `{ close }` |
| `message.error(content, duration?)` | Error message, returns `{ close }` |
| `destroyAllMessage()` | Clear all messages |

- `duration` defaults to `3000`ms; pass `0` to keep the message open.
- Stacked and centered at the top; `error` uses `role="alert"`, others use `role="status"`.
