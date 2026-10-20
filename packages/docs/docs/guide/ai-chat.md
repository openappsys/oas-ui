# AI 会话接入

一条最小可运行的 AI 会话链路：`oas-prompt-input` 负责输入与停止，`oas-message-scroller` 负责消息列表与自动跟随，`oas-message-row` / `oas-bubble` 负责消息呈现。

## 流式、停止与重试

<DemoBlock title="发送消息 → 流式回复 → 停止 / 模拟失败 / 重试上一条">
  <div style="width:100%;display:flex;flex-direction:column;gap:var(--oas-space-2)">
    <oas-message-scroller
      id="ai-chat-log"
      auto-scroll
      label="AI 会话"
      style="height:240px;border:1px solid var(--oas-color-border);border-radius:var(--oas-radius-lg);padding:var(--oas-space-3);box-sizing:border-box"
    >
      <oas-message-row>
        <oas-bubble>你好，我是 OAS 助手。可以让我介绍组件、生成排期或解释一段代码。</oas-bubble>
      </oas-message-row>
    </oas-message-scroller>
    <oas-prompt-input
      id="ai-chat-input"
      placeholder="输入消息，Enter 发送"
      suggestions='["用三句话介绍 OAS-UI","给我一个排期示例","解释上面的输入组件"]'
    ></oas-prompt-input>
    <div style="display:flex;gap:var(--oas-space-2);align-items:center;flex-wrap:wrap">
      <oas-button id="ai-chat-fail" size="small">模拟失败</oas-button>
      <oas-button id="ai-chat-retry" size="small" type="primary">重试上一条</oas-button>
      <span id="ai-chat-status" role="status" style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary)">等待发送</span>
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
    status.textContent = '完成'
  } catch {
    status.textContent = '失败，可重试'
  } finally {
    input.removeAttribute('loading')
  }
})
input.addEventListener('oas-stop', () => {
  controller.abort()
  status.textContent = '已停止'
})
```

<details>
<summary>接入要点</summary>

- `oas-submit` 只负责取 `detail.value`；清空、Enter 提交、Shift+Enter 换行由组件处理。
- 生成期间给 `oas-prompt-input` 加 `loading`，发送钮会变成「停止」并派发 `oas-stop`。
- 流式追加后调用 `message-scroller.scrollToEnd()`，不要直接改 `scrollTop`，避免与自动跟随/锚点逻辑冲突。
- 失败时保留用户消息，重试只追加新的 assistant 轮次；不要覆盖原错误消息。
- 真实请求应使用 `AbortController`，并在组件卸载时中止与清理监听。

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
    status.textContent = fail ? '模拟失败中…' : '生成中…'

    const text = fail
      ? ''
      : `收到：「${prompt}」。这是流式回复示例：输入框负责提交和停止，消息滚动容器负责自动跟随，消息行与气泡只负责呈现。`
    if (fail) {
      await sleep(120)
      reply.textContent = '请求失败：网络错误'
      status.textContent = '失败，可重试'
    } else {
      for (const char of text) {
        if (stopped) break
        reply.textContent += char
        log.scrollToEnd()
        await sleep(22)
      }
      status.textContent = stopped ? '已停止' : '完成'
    }
    input.removeAttribute('loading')
    busy = false
  }

  input.addEventListener('oas-submit', (e) => {
    void respond(e.detail.value)
  })
  input.addEventListener('oas-stop', () => {
    stopped = true
    status.textContent = '停止中…'
  })
  failBtn?.addEventListener('click', () => {
    if (!busy && lastPrompt) void respond(lastPrompt, true)
  })
  retryBtn?.addEventListener('click', () => {
    if (!busy && lastPrompt) void respond(lastPrompt)
  })
})
</script>
