# Transfer 穿梭框

左右双面板 + 中间穿梭按钮，支持搜索过滤与键盘操作。

## 基础用法

<DemoBlock title="基础">
  <oas-transfer id="transfer-basic"></oas-transfer>
</DemoBlock>

## 预置选中值与标题

<DemoBlock title="预置 value + titles">
  <oas-transfer id="transfer-preset" value='["b"]' titles='["可选水果", "已选水果"]'></oas-transfer>
</DemoBlock>

## 可搜索

<DemoBlock title="searchable">
  <oas-transfer id="transfer-search" searchable></oas-transfer>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-transfer id="transfer-event"></oas-transfer>
  <span id="transfer-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const basic = document.getElementById('transfer-basic')
  if (basic) basic.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '葡萄', disabled: true },
  ]
  const preset = document.getElementById('transfer-preset')
  if (preset) preset.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
  ]
  const search = document.getElementById('transfer-search')
  if (search) search.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '草莓' },
    { key: 'e', label: '西瓜' },
  ]
  const el = document.getElementById('transfer-event')
  if (el) {
    el.data = [
      { key: 'a', label: '苹果' },
      { key: 'b', label: '香蕉' },
      { key: 'c', label: '橙子' },
    ]
    const out = document.getElementById('transfer-output')
    el.addEventListener('oas-change', (e) => {
      out.textContent = `oas-change: [${e.detail.value.join(', ')}]`
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `data` | 数据（property，`[{ key, label, disabled }]`） | `TransferItem[]` | — |
| `searchable` | 面板内搜索过滤 | `boolean` | — |
| `source-title` | — | — | — |
| `target-title` | — | — | — |
| `titles` | 双面板标题（JSON 数组）或 `source-title`/`target-title` | `string` | — |
| `value` | 已选 key 数组（JSON 属性） | `string` | `[]` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 穿梭后值变化，`detail: { value }` |

键盘：聚焦面板列表后 `↑`/`↓` 移动选中，`Enter` 穿梭。
