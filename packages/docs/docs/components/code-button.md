---
description: 验证码发送按钮：点击派发可拦截的 oas-send，内置倒计时冷却与重发、加载/禁用态、插槽自定义内容，发送结果经 aria-live 播报。
---

# CodeButton 验证码按钮

「获取验证码」按钮的完整前端流程：点击 → 派发 `oas-send` → 进入倒计时冷却 → 冷却结束回到可重发。请求由宿主完成，组件只负责交互与状态。

## 基础用法

点击后立即进入冷却（默认 60 秒），冷却期内按钮禁用并逐秒显示剩余时间。

<DemoBlock title="cooldown=10">
  <oas-code-button id="cb-basic" cooldown="10"></oas-code-button>
  <p id="cb-basic-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">等待发送…</p>
</DemoBlock>

<DemoBlock title="cooldown=3（快速看完整流程）">
  <oas-code-button id="cb-fast" cooldown="3"></oas-code-button>
</DemoBlock>

## 受控流程（请求成功后再开始冷却）

`oas-send` 可被 `preventDefault()` 拦截：此时不自动进入冷却，宿主请求成功后再调用 `start()`。下面是「模拟请求 800ms 后成功」的用法。

<DemoBlock title="拦截 → 请求 → start()">
  <oas-code-button id="cb-controlled" cooldown="10"></oas-code-button>
  <p id="cb-controlled-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-1) 0 0">未发送</p>
</DemoBlock>

## 加载与禁用

<DemoBlock title="loading / disabled">
  <oas-code-button loading></oas-code-button>
  <oas-code-button disabled></oas-code-button>
</DemoBlock>

- `loading`：显示内置 spinner、`aria-busy="true"`，阻止重复点击
- `disabled`：不可点击，也不派发事件

## 自定义内容（默认插槽）

插槽内容用于空闲态；进入倒计时后仍显示内置倒计时文案（避免自定义文案掩盖剩余时间）。

<DemoBlock title="默认插槽">
  <oas-code-button cooldown="5"><span>发送到手机</span></oas-code-button>
</DemoBlock>

## 事件

| 事件 | 时机 | detail |
| --- | --- | --- |
| `oas-send` | 可点击时点击（可 `preventDefault` 拦截冷却） | `{ cooldown }` |

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const log = (out, text) => {
    if (out) out.textContent = text
  }

  const basic = document.getElementById('cb-basic')
  const basicOut = document.getElementById('cb-basic-out')
  basic?.addEventListener('oas-send', (e) => log(basicOut, `oas-send：冷却 ${e.detail.cooldown} 秒`))

  const controlled = document.getElementById('cb-controlled')
  const controlledOut = document.getElementById('cb-controlled-out')
  controlled?.addEventListener('oas-send', (e) => {
    // 拦截自动冷却：模拟服务端请求，成功后再启动
    e.preventDefault()
    log(controlledOut, '请求中…（已拦截自动冷却）')
    window.setTimeout(() => {
      controlled.start()
      log(controlledOut, '请求成功，已开始冷却')
    }, 800)
  })
})
</script>

## API

### oas-code-button

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `cooldown` | 冷却秒数（默认 60）；非法/非正数回落默认并告警 | `string` | — |
| `disabled` | 禁用：不可点击且不派发事件 | `boolean` | — |
| `loading` | 请求进行中：spinner + `aria-busy` + 阻止重复点击 | `boolean` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `counting` | 是否处于冷却中（只读） | `boolean` | — |
| `remaining` | 剩余冷却秒数（只读） | `number` | `0` |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `start` | `start(seconds?: number): void` | 启动冷却（缺省取 `cooldown`） |
| `reset` | `reset(): void` | 立即结束冷却并回到空闲态 |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-send` | 可点击时点击派发，`detail: { cooldown }`；可 `preventDefault()` 拦截自动冷却（宿主请求成功后再 `start()`） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 自定义按钮内容（空闲态生效；倒计时期间显示内置倒计时文案） |
