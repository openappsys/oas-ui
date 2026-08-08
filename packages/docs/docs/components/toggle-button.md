# ToggleButton 切换按钮

`aria-pressed` 二态切换按钮，按下态使用主色底。

## 基础用法

<DemoBlock title="基础">
  <oas-toggle-button value="bold">加粗</oas-toggle-button>
  <oas-toggle-button value="italic" pressed>斜体</oas-toggle-button>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-toggle-button id="tb-event" value="underline">下划线</oas-toggle-button>
  <span id="tb-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 160px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('tb-event')
  const out = document.getElementById('tb-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: { value: ${e.detail.value}, pressed: ${e.detail.pressed} }`
  })
})
</script>

## 禁用

<DemoBlock title="禁用">
  <oas-toggle-button value="strike" disabled>删除线</oas-toggle-button>
  <oas-toggle-button value="strike" pressed disabled>删除线（按下）</oas-toggle-button>
</DemoBlock>

## API

| 属性       | 说明                         | 默认值    |
| ---------- | ---------------------------- | --------- |
| `value`    | 值（随事件回传）             | 无        |
| `pressed`  | 是否按下（受控）             | `false`   |
| `disabled` | 禁用                         | `false`   |

| 事件         | 说明                                          |
| ------------ | --------------------------------------------- |
| `oas-change` | 切换，`detail: { value, pressed }`            |
