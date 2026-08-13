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

## 区分大小写搜索

<DemoBlock title="searchable + case-sensitive">
  <oas-transfer id="transfer-casesensitive" searchable case-sensitive></oas-transfer>
</DemoBlock>

## 单向模式

只能从左向右穿梭，右侧只读；左侧展示全部数据，已穿梭项禁用并显示为已选。

<DemoBlock title="one-way">
  <oas-transfer id="transfer-oneway" one-way></oas-transfer>
</DemoBlock>

## 虚拟滚动

万级数据窗口化渲染，滚动流畅，选中态 / 全选 / 键盘导航保持。

<DemoBlock title="virtual（10000 项，item-height 32）">
  <oas-transfer id="transfer-virtual" virtual searchable item-height="32"></oas-transfer>
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
  const cs = document.getElementById('transfer-casesensitive')
  if (cs) cs.data = [
    { key: 'a', label: 'Apple' },
    { key: 'b', label: 'apricot' },
    { key: 'c', label: 'Banana' },
  ]
  const oneway = document.getElementById('transfer-oneway')
  if (oneway) oneway.data = [
    { key: 'a', label: '苹果' },
    { key: 'b', label: '香蕉' },
    { key: 'c', label: '橙子' },
    { key: 'd', label: '草莓' },
  ]
  const virtual = document.getElementById('transfer-virtual')
  if (virtual) virtual.data = Array.from({ length: 10000 }, (_, i) => ({ key: 'k' + i, label: '项目 ' + i }))
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
| `case-sensitive` | 搜索区分大小写（默认大小写不敏感） | `boolean` | — |
| `data` | 数据（JSON attribute 声明式通道，property 赋值单向反射，[{ key, label, disabled }]） | `TransferItem[] \| string` | `[]` |
| `item-height` | 虚拟滚动每行固定高度（px），默认 36 | `string` | `36` |
| `one-way` | 单向模式：只能左→右移动，右侧只读；左侧展示全部数据，已穿梭项禁用并显示为已选 | `boolean` | — |
| `searchable` | 面板内搜索过滤（左右各自过滤） | `boolean` | — |
| `source-title` | — | — | — |
| `target-title` | — | — | — |
| `titles` | 双面板标题（JSON 数组）或 `source-title`/`target-title` | `string` | — |
| `value` | 已选 key 数组（JSON 属性） | `string` | `[]` |
| `virtual` | 大数据量窗口化渲染（虚拟滚动，行高默认 36px） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 穿梭后值变化，`detail: { value }` |

键盘：聚焦面板列表后 `↑`/`↓` 移动选中，`Enter` 穿梭。
