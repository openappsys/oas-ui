# Message

Imperative global message notifications with type icons, loading state, hover-pause, countdown progress, placement/offset, max cap, rich content, and promise chains. Enter/exit animations use transform/opacity and respect `prefers-reduced-motion`.

## Basic usage

<DemoBlock title="Six types">
  <oas-space>
    <oas-button type="success" onclick="message.success('Operation successful')">Success</oas-button>
    <oas-button type="danger" onclick="message.error('Something went wrong')">Error</oas-button>
    <oas-button type="warning" onclick="message.warning('Please pay attention')">Warning</oas-button>
    <oas-button onclick="message.info('This is a message')">Info</oas-button>
    <oas-button onclick="message.question('Need confirmation?')">Question</oas-button>
    <oas-button onclick="message.loading('Processing…', { duration: 3000 })">Loading</oas-button>
  </oas-space>
</DemoBlock>

## Type icons

Built-in types come with icons. Customize via `icon` (resolved through the shared `lookupIcon` channel, so `registerIcon` custom icons work too); set `show-icon="false"` to hide.

<DemoBlock title="Type icons & customization">
  <oas-space>
    <oas-button onclick="message.info('Custom icon (registered via registerIcon)', { icon: 'msg-heart', duration: 4000 })">Custom icon (msg-heart)</oas-button>
    <oas-button onclick="message.success('Hide type icon', { showIcon: false, duration: 4000 })">Hide icon</oas-button>
  </oas-space>
</DemoBlock>

## Loading & async flows

`message.loading()` does not auto-close by default; pair it with `message.update(key, options)` for a lightweight async flow.

<DemoBlock title="Loading & async flows">
  <oas-space>
    <oas-button onclick="message.loading('Uploading…', { key: 'upload', duration: 0 })">Start upload (loading)</oas-button>
    <oas-button onclick="message.update('upload', { content: 'Uploaded', type: 'success', duration: 4000 })">Mark as success</oas-button>
    <oas-button onclick="message.destroy('upload')">Close this message</oas-button>
  </oas-space>
</DemoBlock>

## Custom duration & manual close

<DemoBlock title="Custom duration">
  <oas-space>
    <oas-button onclick="message.info('Auto closes after 2s', 2000)">2s</oas-button>
    <oas-button onclick="message.success('Auto closes after 5s', 5000)">5s</oas-button>
    <oas-button onclick="window.msgHandle = message.warning('Stays open until closed manually', 0)">No auto-close (0)</oas-button>
    <oas-button onclick="window.msgHandle && window.msgHandle.close()">Close manually</oas-button>
    <oas-button onclick="message.info('Not manually closable', { closable: false, duration: 4000 })">Not closable</oas-button>
  </oas-space>
</DemoBlock>

## Click to close

Clicking the message body fires the `onClick` callback and closes the message (`source: 'click'`); the close button reports `source: 'close'`.

<DemoBlock title="Click to close">
  <oas-space>
    <oas-button onclick="window.clickCount = 0; message.info('Click me to close (onClick)', { duration: 0, onClick: () => window.clickCount++ })">Show clickable message</oas-button>
    <oas-button onclick="window.clickCount !== undefined && message.info('Clicked ' + window.clickCount + ' times')">Show click count</oas-button>
  </oas-space>
</DemoBlock>

## Hover / focus pause

`pause-on-hover` is enabled by default: hovering the message or focusing the close button pauses the auto-close timer (remaining time is tracked); the timer resumes on leave. Page visibility changes also pause the countdown.

<DemoBlock title="Hover pause">
  <oas-space>
    <oas-button onclick="message.info('Hover me to pause (auto-close in 10s)', { duration: 10000 })">Auto-close in 10s</oas-button>
    <oas-button onclick="window.pauseHandle = message.info('Programmatic pause/resume (10s)', { duration: 10000 })">Pause/resume</oas-button>
    <oas-button onclick="window.pauseHandle && window.pauseHandle.pause()">Pause</oas-button>
    <oas-button onclick="window.pauseHandle && window.pauseHandle.resume()">Resume</oas-button>
  </oas-space>
</DemoBlock>

## Countdown progress

`show-progress` renders a countdown progress bar whose animation duration matches `duration`; hovering pauses the bar along with the timer.

<DemoBlock title="Countdown progress">
  <oas-space>
    <oas-button onclick="message.info('Auto-close in 5s', { duration: 5000, showProgress: true })">With progress (5s)</oas-button>
    <oas-button onclick="message.warning('Hover to pause the bar', { duration: 8000, showProgress: true })">With progress (8s)</oas-button>
  </oas-space>
</DemoBlock>

## Placement & offset

`placement` supports `top` / `bottom` (top-center is the default; center/corners belong to the toast form). `offset` is a single number in px (default 16).

<DemoBlock title="Placement & offset">
  <oas-space>
    <oas-button onclick="message.info('Top (default)')">top</oas-button>
    <oas-button onclick="message.info('Bottom', { placement: 'bottom' })">bottom</oas-button>
    <oas-button onclick="message.info('Top with offset 80', { offset: 80 })">top + offset 80</oas-button>
    <oas-button onclick="message.info('Bottom with offset 40', { placement: 'bottom', offset: 40 })">bottom + offset 40</oas-button>
  </oas-space>
</DemoBlock>

## Max cap

`max` caps the stack; the oldest message is evicted first when the cap is exceeded.

<DemoBlock title="Max cap">
  <oas-space>
    <oas-button onclick="window.maxCount = 0; message.info('Max queue reset')">Reset</oas-button>
    <oas-button onclick="window.maxCount = (window.maxCount || 0) + 1; message.info('Queue message ' + window.maxCount, { max: 2, duration: 0 })">Fire repeatedly (max 2)</oas-button>
  </oas-space>
</DemoBlock>

## Rich content

`content` accepts `string | Node`; a Node is injected into the text area directly (no innerHTML channel).

<DemoBlock title="Rich content">
  <oas-space>
    <oas-button onclick="message.info('Plain text')">Text content</oas-button>
    <oas-button onclick="richContent()">Rich content (Node)</oas-button>
  </oas-space>
</DemoBlock>

## Promise chain

`message.promise(promise, { loading, success, error })`: loading → success on resolve / error on reject, auto-closing 3s after success.

<DemoBlock title="Promise chain">
  <oas-space>
    <oas-button onclick="runPromise(true)">Simulate success</oas-button>
    <oas-button onclick="runPromise(false)">Simulate failure</oas-button>
  </oas-space>
</DemoBlock>

## Grouped messages & repeat badge

Messages with the same `group` merge into one; repeated triggers increment the count (`×n`). With `repeatNum: true` a repeat-count badge appears in the corner. Different groups are independent.

<DemoBlock title="Grouped messages">
  <oas-space>
    <oas-button onclick="message.success('Saved', { group: 'save', repeatNum: true, duration: 0 })">Save (click repeatedly)</oas-button>
    <oas-button onclick="message.info('Synced', { group: 'sync', duration: 0 })">Sync (another group)</oas-button>
  </oas-space>
</DemoBlock>

## Customization

`avatar` (Node or `slot="avatar"`), custom `spinner` (icon name or Node), `registerType` for custom types, and `mask` overlay (click the mask to close).

<DemoBlock title="Customization">
  <oas-space>
    <oas-button onclick="avatarDemo()">Avatar</oas-button>
    <oas-button onclick="message.loading('Custom spinner', { spinner: 'refresh', duration: 3000 })">Custom spinner</oas-button>
    <oas-button onclick="message.show('custom-alert', 'Registered custom type', { duration: 4000 })">Custom type</oas-button>
    <oas-button onclick="message.info('Masked; click the mask to close', { mask: true, duration: 0 })">Mask</oas-button>
  </oas-space>
</DemoBlock>

## Declarative usage

`<oas-message>` also works declaratively: attributes map 1:1 to the imperative options, text goes into the content area, rich content uses `slot="content"`.

<DemoBlock title="Declarative usage">
  <oas-space direction="vertical" style="width: 100%">
    <oas-message type="success" duration="6000" closable>Declarative success message (auto-closes in 6s)</oas-message>
    <oas-message type="info" duration="15000" show-progress>Countdown progress demo (auto-closes in 15s; hover to pause)</oas-message>
    <oas-message type="question" duration="0" repeat-num="3">Declarative + static badge</oas-message>
    <oas-message type="warning" duration="0"><b slot="content">Rich declarative content: </b>slots supported</oas-message>
  </oas-space>
</DemoBlock>

## App global defaults

`<oas-app message='{...}'>` configures global defaults for the message API (call options win): `duration` / `closable` / `pauseOnHover` / `placement` / `offset` / `max` / `showProgress` / `showIcon` / `mask` / `repeatNum`.

<DemoBlock title="App global defaults">
  <oas-space>
    <oas-button onclick="setAppMsgConfig()">Enable global defaults (bottom + max 2 + no icon)</oas-button>
    <oas-button onclick="clearAppMsgConfig()">Clear global defaults</oas-button>
  </oas-space>
  <oas-app id="msg-app-cfg" style="display: block; margin-top: 12px">
    <oas-space>
      <oas-button type="primary" onclick="message.success('Uses global defaults')">Send message</oas-button>
      <oas-button onclick="message.info('Overrides placement to top', { placement: 'top' })">Local override</oas-button>
    </oas-space>
  </oas-app>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message, destroyAllMessage, registerIcon } = await import('@oas-ui/ui')
  window.message = message
  window.destroyAllMessage = destroyAllMessage

  window.runPromise = (ok) => {
    message.promise(
      new Promise((resolve, reject) =>
        setTimeout(() => (ok ? resolve('data') : reject(new Error('Request failed'))), 1500),
      ),
      {
        loading: 'Loading…',
        success: (data) => `Success: ${data}`,
        error: (err) => err.message,
      },
    )
  }

  window.richContent = () => {
    const node = document.createElement('span')
    node.innerHTML = '<b>Bold content</b> and <span style="color: var(--oas-color-primary)">primary text</span>'
    message.success(node, { duration: 5000 })
  }

  window.avatarDemo = () => {
    const avatar = document.createElement('span')
    avatar.textContent = '🧑'
    message.info('A message with an avatar', { avatar, duration: 5000 })
  }

  // Register a custom type: icon + color + closability
  window.message.registerType('custom-alert', {
    icon: 'alert-circle',
    color: 'var(--oas-color-warning)',
  })

  // Demonstrate the custom icon channel
  registerIcon('msg-heart', '<path d="M8 13.5 C4.5 10.5 2.8 8.6 2.8 6.3 C2.8 4.4 4.3 3 6.1 3 C7 3 7.9 3.4 8 4.2 C8.1 3.4 9 3 9.9 3 C11.7 3 13.2 4.4 13.2 6.3 C13.2 8.6 11.5 10.5 8 13.5 Z" fill="currentColor"/>')

  const app = document.getElementById('msg-app-cfg')
  window.setAppMsgConfig = () => {
    app.setAttribute(
      'message',
      JSON.stringify({ placement: 'bottom', offset: 32, max: 2, showIcon: false }),
    )
    message.success('Global defaults enabled')
  }
  window.clearAppMsgConfig = () => {
    app.removeAttribute('message')
    message.info('Global defaults cleared')
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `message.info(content, options?)` | Info message, returns `{ close, pause, resume }` |
| `message.success(content, options?)` | Success message |
| `message.warning(content, options?)` | Warning message |
| `message.error(content, options?)` | Error message |
| `message.question(content, options?)` | Question message (question icon) |
| `message.loading(content, options?)` | Loading message (no auto-close, not closable by default) |
| `message.show(type, content, options?)` | Generic entry: built-in type or one registered via `registerType` |
| `message.update(key, { content, type?, duration? })` | Update an existing message; creates a new one if the key does not exist |
| `message.destroy(key)` | Close the message identified by `key` |
| `message.promise(promise, { loading, success, error })` | Promise chain: loading → success/error |
| `message.registerType(name, { icon?, color?, closable? })` | Register a custom message type |
| `destroyAllMessage()` | Clear all messages |

### Attributes

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `closable` | Whether to show the close button (default true; hidden while loading) | `string` | `true` |
| `count` | Merge count (shows `×n` after content when > 1) | `string` | `0` |
| `duration` | Auto-close duration (ms), `0` to keep open | `string` | `3000` |
| `group` | Group id: messages in the same group merge into one | — | — |
| `icon` | Custom icon (declarative element usage); overrides the default type icon | `string` | — |
| `key` | Unique id: used by `message.update` / `message.destroy` | — | — |
| `mask` | Show a page mask; clicking it closes the message with oas-close detail.source = mask | `boolean` | — |
| `pause-on-hover` | Pause the timer on hover (default on), resume with the remaining time on leave | `string` | `true` |
| `placement` | Declarative element usage position: top (default) / bottom | — | — |
| `repeat-num` | Repeat badge: merge repeated identical messages with a counter | `string` | — |
| `show-icon` | Whether to show the type icon (default true; false for text only) | `string` | `true` |
| `show-progress` | Show a countdown progress bar synced with the duration | `boolean` | — |
| `type` | Message type: `info`/`success`/`warning`/`error` | `string` | `info` |

### Events

| Event | Description |
| --- | --- |
| `oas-close` | Emitted when the message closes (auto-close / close button / `destroy`), `detail: { key? }` |

### Slots

| Name | Description |
| --- | --- |
| `avatar` | Avatar slot (before the message text) |
| `content` | Rich body content slot |

### options

- `{ duration?, group?, key?, onClose?, closable?, pauseOnHover?, placement?, offset?, max?, icon?, showIcon?, showProgress?, repeatNum?, mask?, onClick?, avatar?, spinner? }`
- `content` (first arg) accepts `string | Node` rich content; `group` merges and increments the count; `key` is used by `update` / `destroy`; `onClose` fires on close; `onClick` fires on message-body click (closes with `source: 'click'`).
- `duration` defaults to `3000`ms; pass `0` to keep open; `offset` defaults to `16`px; `max` evicts the oldest.
- Hover / focus / page-hidden automatically pause the countdown (remaining time is tracked); `error` uses `role="alert"`, others use `role="status"`.
- Enter/exit animations use transform/opacity (durations via the `--oas-message-anim-in` / `--oas-message-anim-out` CSS variables) and respect `prefers-reduced-motion`.
- Colors use CSS variable tokens only; `registerType`'s `color` is an explicitly injected CSS color (the component never hardcodes color values).
