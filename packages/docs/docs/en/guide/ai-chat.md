# AI Chat Integration

A minimal runnable AI chat loop: `oas-prompt-input` owns input/stop, `oas-message-scroller` owns the message list and auto-follow, and `oas-message-row` / `oas-bubble` render each turn.

## Streaming, stop and retry

<DemoBlock title="Send → stream reply → stop / simulate error / retry last prompt">
  <div style="width:100%;display:flex;flex-direction:column;gap:var(--oas-space-2)">
    <oas-message-scroller
      id="ai-chat-log"
      auto-scroll
      label="AI conversation"
      style="height:240px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-lg);padding:var(--oas-space-3);box-sizing:border-box"
    >
      <oas-message-row>
        <oas-bubble>Hi, I am the OAS assistant. Ask me to explain a component, draft a schedule or review a snippet.</oas-bubble>
      </oas-message-row>
    </oas-message-scroller>
    <oas-prompt-input
      id="ai-chat-input"
      placeholder="Type a message, Enter to send"
      suggestions='["Introduce OAS-UI in three sentences","Draft a schedule","Explain the input component"]'
    ></oas-prompt-input>
    <div style="display:flex;gap:var(--oas-space-2);align-items:center;flex-wrap:wrap">
      <oas-button id="ai-chat-fail" size="small">Simulate error</oas-button>
      <oas-button id="ai-chat-retry" size="small" type="primary">Retry last</oas-button>
      <span id="ai-chat-status" role="status" style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary)">Waiting</span>
    </div>
  </div>
</DemoBlock>

```ts
const input = document.querySelector('oas-prompt-input')
const log = document.querySelector('oas-message-scroller')
const status = document.querySelector('#status')

input.addEventListener('oas-submit', async (e) => {
  const prompt = e.detail.value
  const reply = appendAssistantBubble()
  input.setAttribute('loading', '')
  try {
    for await (const chunk of streamChat(prompt)) {
      reply.textContent += chunk
      log.scrollToEnd()
    }
    status.textContent = 'Done'
  } catch {
    status.textContent = 'Failed, retry available'
  } finally {
    input.removeAttribute('loading')
  }
})
input.addEventListener('oas-stop', () => {
  controller.abort()
  status.textContent = 'Stopped'
})
```

<details>
<summary>Integration notes</summary>

- `oas-submit` only carries `detail.value`; Enter, Shift+Enter and clearing are handled by the component.
- Set `loading` while generating; the send button becomes stop and dispatches `oas-stop`.
- After streaming a chunk, call `message-scroller.scrollToEnd()` instead of writing `scrollTop` directly, so auto-follow and anchoring keep working.
- Keep the user message on failure; retry appends a new assistant turn instead of overwriting the error.
- Use `AbortController` in real requests and clean up listeners on unmount.

</details>

<script setup>
import { onMounted } from 'vue'

onMounted(async () => {
  await customElements.whenDefined('oas-prompt-input')
  await customElements.whenDefined('oas-message-scroller')
  const log = document.getElementById('ai-chat-log')
  const input = document.getElementById('ai-chat-input')
  const status = document.getElementById('ai-chat-status')
  const failBtn = document.getElementById('ai-chat-fail')
  const retryBtn = document.getElementById('ai-chat-retry')
  if (!log || !input || !status) return

  let busy = false
  let stopped = false
  let lastPrompt = ''
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

  const append = (text, mine) => {
    const row = document.createElement('oas-message-row')
    if (mine) row.setAttribute('align', 'end')
    const bubble = document.createElement('oas-bubble')
    bubble.textContent = text
    row.appendChild(bubble)
    log.appendChild(row)
    log.scrollToEnd()
    return bubble
  }

  const respond = async (prompt, fail = false) => {
    if (busy) return
    busy = true
    stopped = false
    lastPrompt = prompt
    append(prompt, true)
    const reply = append('', false)
    input.setAttribute('loading', '')
    status.textContent = fail ? 'Simulating failure…' : 'Generating…'

    const text = fail
      ? ''
      : `Got it: "${prompt}". This streaming demo shows prompt-input handling submit/stop, the message scroller following the bottom, and message rows rendering each turn.`
    if (fail) {
      await sleep(120)
      reply.textContent = 'Request failed: network error'
      status.textContent = 'Failed, retry available'
    } else {
      for (const char of text) {
        if (stopped) break
        reply.textContent += char
        log.scrollToEnd()
        await sleep(22)
      }
      status.textContent = stopped ? 'Stopped' : 'Done'
    }
    input.removeAttribute('loading')
    busy = false
  }

  input.addEventListener('oas-submit', (e) => {
    void respond(e.detail.value)
  })
  input.addEventListener('oas-stop', () => {
    stopped = true
    status.textContent = 'Stopping…'
  })
  failBtn?.addEventListener('click', () => {
    if (!busy && lastPrompt) void respond(lastPrompt, true)
  })
  retryBtn?.addEventListener('click', () => {
    if (!busy && lastPrompt) void respond(lastPrompt)
  })
})
</script>
