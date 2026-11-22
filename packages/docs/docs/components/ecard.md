---
description: "电子卡 / 储值卡：卡面列表选择、自定义面额输入、协议勾选与确认提交。"
---

# ECard 电子卡

电子卡 / 储值卡购买面板：卡面单选列表、自定义面额、协议勾选与确认提交。卡面数据与面额上下限全部由宿主注入。

## 基础用法

`cards` 注入卡面：`value` 为提交金额（数值），`faceValue` / `price` 为展示文案。

<DemoBlock title="卡种选择">
  <oas-ecard
    cards='[{"id":"c100","name":"电子礼品卡","value":100,"faceValue":"100 元","price":"95 元","description":"全场通用"},{"id":"c500","name":"储值卡","value":500,"faceValue":"500 元","price":"480 元","description":"可叠加会员折扣"}]'
  ></oas-ecard>
</DemoBlock>

## 自定义面额

选择「自定义面额」后显示金额输入；`min-amount` / `max-amount` 限定整数值范围，越界提交派发 `oas-invalid`。

<DemoBlock title="自定义面额">
  <oas-ecard
    selected-id="custom"
    amount="300"
    min-amount="10"
    max-amount="1000"
    cards='[{"id":"c100","name":"电子礼品卡","value":100,"faceValue":"100 元"}]'
  ></oas-ecard>
</DemoBlock>

## 协议勾选与提交

确认按钮始终可点，点击时校验卡种 / 面额 / 协议：失败派发 `oas-invalid`（detail `{ fields }`），通过派发 `oas-submit`（detail `{ card, cardId, amount, custom, agreed }`）。协议文案可用 `slot="agreement"` 覆盖（如加协议链接）。

<DemoBlock title="协议与提交">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-ecard
      id="ecard-submit-demo"
      cards='[{"id":"c100","name":"电子礼品卡","value":100,"faceValue":"100 元","price":"95 元"},{"id":"c500","name":"储值卡","value":500,"faceValue":"500 元","price":"480 元"}]'
    ></oas-ecard>
    <oas-tag type="primary" id="ecard-submit-info">等待提交</oas-tag>
  </oas-space>
</DemoBlock>

<DemoBlock title="自定义协议内容">
  <oas-ecard
    cards='[{"id":"c100","name":"电子礼品卡","value":100,"faceValue":"100 元"}]'
  >
    <span slot="agreement">
      我已阅读并同意 <a href="#协议内容" style="color: var(--oas-color-primary)">《电子卡使用协议》</a>
    </span>
  </oas-ecard>
</DemoBlock>

## 数据契约

- `cards`：`[{ "id": string, "name": string, "value": number, "faceValue": string, "price"?: string, "description"?: string, "disabled"?: boolean }]`
- `selected-id`：卡 id 或 `custom`（自定义面额）；缺省选第一张可用卡，无可用卡时回落到 `custom`
- `amount`：自定义面额（字符串，提交时转数值）；`min-amount` 默认 `1`，`max-amount` 默认 `10000`；`currency` 控制自定义面额输入框前缀符号（默认 `¥`）

## 无障碍

- 卡面为原生单选组，每项 `aria-label` 带上卡名
- 自定义面额区随选中态显隐；金额错误通过 `aria-invalid` 关联
- 协议为原生复选框；`disabled` / `readonly` 时全部操作禁用

<DemoBlock title="禁用态">
  <oas-ecard
    disabled
    cards='[{"id":"c100","name":"电子礼品卡","value":100,"faceValue":"100 元"}]'
  ></oas-ecard>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('ecard-submit-demo')
  const info = document.getElementById('ecard-submit-info')
  el?.addEventListener('oas-invalid', (e) => {
    info.textContent = `校验未通过：${e.detail.fields.join(' / ')}`
  })
  el?.addEventListener('oas-submit', (e) => {
    info.textContent = `已提交：${e.detail.card?.name ?? '自定义'} / ${e.detail.amount}`
  })
})
</script>

## API

### oas-ecard

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `agreed` | 是否已勾选协议（受控布尔属性；点击复选框时回写并派发 oas-change） | `boolean` | — |
| `amount` | 自定义面额（字符串，提交时转数值） | `string` | — |
| `cards` | 卡面数据（宿主注入）：JSON 数组 [{ id, name, value, faceValue, price?, description?, disabled? }]；value 为提交金额，faceValue / price 为展示文案 | `string` | — |
| `currency` | 自定义面额前缀货币符号（默认 ¥；仅影响自定义面额输入框展示） | `string` | `¥` |
| `disabled` | 禁用卡面 / 面额 / 协议与确认按钮 | `boolean` | — |
| `max-amount` | 自定义面额上限（整数，默认 10000） | `string` | `10000` |
| `min-amount` | 自定义面额下限（整数，默认 1） | `string` | `1` |
| `readonly` | 只读：不可选择、输入、勾选或提交 | `boolean` | — |
| `selected-id` | 选中卡 id（受控）或 custom（自定义面额）；缺省选第一张可用卡，无可用卡回落 custom | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 选择卡种、输入自定义面额或勾选协议时派发，detail { card, cardId, amount, custom, agreed } |
| `oas-invalid` | 提交校验失败时派发，detail { fields }（card / amount / agreement） |
| `oas-submit` | 校验通过时派发，detail { card, cardId, amount, custom, agreed } |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `agreement` | 自定义协议文案（覆盖默认文本，可放协议链接） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-ecard-width` | `100%` |
