---
description: 排序题：点击或键盘把选项加入排名序列，已选项显示名次徽标并可上移 / 下移 / 取消；值 = 有序 key 数组（支持部分排名），min-ranks 下限校验，名次变化经 aria-live 播报。
---

# Rank 排序题

按名次选择选项：点击（或键盘回车）把选项加入排名序列，已选项显示名次徽标；上移 / 下移 / 移除都是可见按钮，不依赖拖拽。值契约 = 按名次排序的 key 数组，部分排名即已选子集有序。

## 基础用法

点击选项加入排名，再点已选项（或移除按钮）取消。

<DemoBlock title="偏好排序">
  <oas-rank
    id="rk-basic"
    label="请按偏好排序"
    options='[{"key":"apple","label":"苹果"},{"key":"banana","label":"香蕉"},{"key":"orange","label":"橙子"},{"key":"grape","label":"葡萄"}]'
  ></oas-rank>
  <span id="rk-basic-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">尚未排序</span>
</DemoBlock>

## 名次调整与下限校验

`min-ranks` 设定最少入选数；下方实时显示已选计数。点击「提交」调用 `validate()`：未达下限会显示错误并派发 `oas-invalid`，继续选择会自动复检。

<DemoBlock title="min-ranks=2">
  <oas-rank
    id="rk-min"
    label="选出至少两项优先功能"
    options='[{"key":"search","label":"搜索"},{"key":"filter","label":"筛选"},{"key":"export","label":"导出"},{"key":"share","label":"分享"}]'
    min-ranks="2"
  ></oas-rank>
  <oas-button id="rk-min-submit" type="primary">提交</oas-button>
  <span id="rk-min-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 问卷场景（排名题）

排名题常见于问卷：受试者按偏好拖动 / 点击排序，提交时取有序数组。示例把结果直接展示出来。

<DemoBlock title="请排序你最看重的因素">
  <oas-rank
    id="rk-survey"
    label="请按重要程度排序（最重要的排第 1）"
    options='[{"key":"price","label":"价格"},{"key":"quality","label":"质量"},{"key":"service","label":"服务"},{"key":"design","label":"设计"}]'
    min-ranks="1"
  ></oas-rank>
  <oas-button id="rk-survey-submit" type="primary">提交问卷</oas-button>
  <span id="rk-survey-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 禁用与只读

选项级 `disabled` 不可加入；组级 `disabled` 全部不可操作；`readonly` 保留正常外观与排名展示，但不响应交互。

<DemoBlock title="disabled / readonly">
  <oas-space direction="vertical" style="width: 100%">
    <oas-rank
      options='[{"key":"a","label":"可选项"},{"key":"b","label":"禁用项","disabled":true},{"key":"c","label":"另一项"}]'
    ></oas-rank>
    <oas-rank
      options='[{"key":"a","label":"苹果"},{"key":"b","label":"香蕉"},{"key":"c","label":"橙子"}]'
      value='["b","a"]'
      readonly
    ></oas-rank>
  </oas-space>
</DemoBlock>

## 与 oas-form 组合（通用表单场景）

排序题不是原生表单控件：`oas-form` 不收集它的值，宿主读取 `value`（或监听 `oas-change`）后合并进提交数据。示例在 `oas-submit` 中先 `validate()` 再合并。

<DemoBlock title="表单内嵌排序题">
  <oas-form id="rk-form" style="width: 100%; max-width: 520px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-rank
        id="rk-form-rank"
        label="请按偏好排序"
        options='[{"key":"apple","label":"苹果"},{"key":"banana","label":"香蕉"},{"key":"orange","label":"橙子"}]'
        min-ranks="2"
      ></oas-rank>
      <oas-button type="primary" onclick="this.closest('oas-form').submit()">提交表单</oas-button>
    </oas-space>
  </oas-form>
  <span id="rk-form-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 键盘与无障碍

- 选项、上移、下移、移除都是原生 `button`，Tab 可达，Enter / Space 激活；调整按钮的可访问名带选项名，同名按钮可区分
- 名次变化经 `aria-live="polite"` 播报（如「苹果 已排第 1 名」），不依赖视觉徽标
- 名次徽标与间距使用逻辑属性，RTL 下自动镜像

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  const read = (el) => JSON.stringify(el.value)

  const basic = document.getElementById('rk-basic')
  basic?.addEventListener('oas-change', (event) => {
    text('rk-basic-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
  })

  const min = document.getElementById('rk-min')
  document.getElementById('rk-min-submit')?.addEventListener('click', () => {
    const ok = min.validate()
    if (ok) text('rk-min-out', `校验通过：${read(min)}`)
  })
  min?.addEventListener('oas-invalid', (event) => {
    text('rk-min-out', `oas-invalid：已选 ${event.detail.count} / 至少 ${event.detail.min}`)
  })

  const survey = document.getElementById('rk-survey')
  document.getElementById('rk-survey-submit')?.addEventListener('click', () => {
    const ok = survey.validate()
    text('rk-survey-out', ok ? `问卷答案：${read(survey)}` : '校验未通过：请至少排序 1 项')
  })

  const form = document.getElementById('rk-form')
  const formRank = document.getElementById('rk-form-rank')
  form?.addEventListener('oas-submit', (event) => {
    const ok = formRank.validate()
    if (!ok) {
      text('rk-form-out', '请先完成排序题（至少 2 项）')
      return
    }
    text('rk-form-out', `oas-submit: ${JSON.stringify({ ...event.detail.values, ranking: formRank.value })}`)
  })
})
</script>

## API

### oas-rank

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用全部交互 | `boolean` | — |
| `label` | 题面文本（渲染为标题，并作为分组可访问名称） | `string` | — |
| `min-ranks` | 最少入选名次数（正整数）；未达下限时 `validate()` 不通过 | `string` | — |
| `options` | 可排序项 JSON 数组 `[{ key, label?, disabled?, description? }]`；字符串项按 `key=label` 收敛 | `RankOption[] \| string` | — |
| `readonly` | 只读：保留外观与排名展示，不响应交互 | `boolean` | — |
| `value` | 按名次排序的 key 数组（JSON）；部分排名即已选子集有序 | `string[] \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `options` | 可排序项列表：get+set 双通道（数组或 JSON 字符串）；赋值即生效，不派发事件 | `RankOption[] \| string` | — |
| `value` | 当前值（有序 key 数组）：get+set 双通道（数组或 JSON 字符串）；赋值即生效，不派发事件 | `string[] \| string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `validate` | `validate(): boolean` | 校验名次下限并同步可视错误，返回是否通过（未通过时派发 `oas-invalid`） |
| `clear` | `clear(): void` | 清空排名（派发 `oas-change`） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 用户加入 / 移除 / 上移 / 下移 / 清空时派发，`detail: { value, key, rank, action }` |
| `oas-invalid` | `validate()` 未达 `min-ranks` 时派发，`detail: { reason, min, count, value }` |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-rank-badge-size` | 名次徽标直径（默认 `--oas-control-height-sm`） | `var(--oas-control-height-sm)` |
