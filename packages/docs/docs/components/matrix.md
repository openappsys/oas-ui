---
description: 矩阵题：行（子问题）× 列（选项）的单选 / 多选矩阵，JSON 数据属性与对象 property 双通道，行级 / 全表级必答校验，fieldset + legend 行标题与方向键行内导航。
---

# Matrix 矩阵题

行 = 子问题、列 = 选项的矩阵选择：`mode="radio"`（默认）行内单选，`mode="checkbox"` 行内多选。值契约为 JSON 对象——单选 `{ rowKey: columnKey }`，多选 `{ rowKey: [columnKey] }`。

## 基础用法（行内单选）

点击任意单元格选择；行标题与列头都参与可访问名称（读屏会同时朗读行头与列头）。

<DemoBlock title="满意度矩阵">
  <oas-matrix
    id="mx-basic"
    label="请评价本次服务"
    rows='[{"key":"speed","label":"响应速度"},{"key":"quality","label":"内容质量"},{"key":"attitude","label":"服务态度"}]'
    columns='[{"key":"bad","label":"差"},{"key":"ok","label":"一般"},{"key":"good","label":"好"},{"key":"great","label":"很好"}]'
  ></oas-matrix>
  <span id="mx-basic-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">尚未作答</span>
</DemoBlock>

## 多选矩阵（checkbox）

同一行可勾选多个选项；`required-scope="table"` 表示整题至少回答一行即可。

<DemoBlock title="mode=&quot;checkbox&quot;">
  <oas-matrix
    id="mx-check"
    mode="checkbox"
    label="你通过哪些渠道了解我们？"
    rows='[{"key":"online","label":"线上渠道"},{"key":"offline","label":"线下渠道"}]'
    columns='[{"key":"search","label":"搜索"},{"key":"social","label":"社交平台"},{"key":"friend","label":"朋友推荐"}]'
    required
    required-scope="table"
  ></oas-matrix>
  <span id="mx-check-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">至少选择一项</span>
</DemoBlock>

## 必答校验（问卷场景）

`required` 缺省按行级校验（每一行都要作答）。点击「提交问卷」调用 `validate()`：未通过会显示错误并派发 `oas-invalid`；继续作答会自动复检、补满即消失。

<DemoBlock title="行级必答 + validate()">
  <oas-matrix
    id="mx-required"
    label="请完成以下评价"
    rows='[{"key":"speed","label":"响应速度"},{"key":"quality","label":"内容质量"}]'
    columns='[{"key":"bad","label":"差"},{"key":"ok","label":"一般"},{"key":"good","label":"好"}]'
    required
  ></oas-matrix>
  <oas-button id="mx-required-submit" type="primary">提交问卷</oas-button>
  <span id="mx-required-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 禁用与只读

组级 `disabled` 全部不可操作；`readonly` 保留正常外观与已选展示，但不响应交互、值也不变。

<DemoBlock title="disabled / readonly">
  <oas-space direction="vertical" style="width: 100%">
    <oas-matrix
      rows='[{"key":"a","label":"已禁用行"},{"key":"b","label":"另一行"}]'
      columns='[{"key":"x","label":"选项 A"},{"key":"y","label":"选项 B"}]'
      value='{"a":"x"}'
      disabled
    ></oas-matrix>
    <oas-matrix
      rows='[{"key":"a","label":"只读行"},{"key":"b","label":"另一行"}]'
      columns='[{"key":"x","label":"选项 A"},{"key":"y","label":"选项 B"}]'
      value='{"a":"y","b":"x"}'
      readonly
    ></oas-matrix>
  </oas-space>
</DemoBlock>

## 与 oas-form 组合（通用表单场景）

矩阵题已注册进 `oas-form` 的收集链（`value` 通道，表单值为 JSON 串）：带 `name` 时随表单提交、`initial-values` / `reset` 同样作用于它。下例演示宿主自行校验并合并的写法——行级必答错误只有在调用 `validate()` 后才显示。

<DemoBlock title="表单内嵌矩阵">
  <oas-form id="mx-form" style="width: 100%; max-width: 620px">
    <oas-space direction="vertical" style="width: 100%">
      <oas-input name="name" placeholder="姓名"></oas-input>
      <oas-matrix
        id="mx-form-matrix"
        label="请评价本次服务"
        rows='[{"key":"speed","label":"响应速度"},{"key":"quality","label":"内容质量"}]'
        columns='[{"key":"bad","label":"差"},{"key":"ok","label":"一般"},{"key":"good","label":"好"}]'
        required
      ></oas-matrix>
      <oas-button type="primary" id="mx-form-submit" onclick="this.closest('oas-form').submit()">提交表单</oas-button>
    </oas-space>
  </oas-form>
  <span id="mx-form-out" style="display: block; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)"></span>
</DemoBlock>

## 键盘与无障碍

- 每行一个 `fieldset` + `legend` 承载行标题；选项是原生 `input[type=radio|checkbox]`，可访问名称由「行标题 + 列头」组合
- 单选行采用 roving tabindex（行内只有一个 Tab 停靠点），方向键在行内移动并选中，Home / End 跳到首 / 末列；RTL 下左右方向语义镜像
- 必答提示与错误文案以 `aria-describedby` 关联到选项，校验失败时输入带 `aria-invalid`

## 校验语义

- `required` 在场即必答；`required-scope="row"`（默认）每一行都必须作答，`required-scope="table"` 整题至少一行作答
- `validate()` 返回是否通过；未通过时显示错误并派发 `oas-invalid`（`detail: { reason, scope, missingRows, value }`）
- 禁用行 / 全部列都禁用的行不参与必答判定

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const text = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.textContent = value
  }
  const read = (el) => JSON.stringify(el.value)

  const basic = document.getElementById('mx-basic')
  basic?.addEventListener('oas-change', (event) => {
    text('mx-basic-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
  })

  const check = document.getElementById('mx-check')
  check?.addEventListener('oas-change', (event) => {
    text('mx-check-out', `oas-change: ${JSON.stringify(event.detail.value)}`)
  })

  const required = document.getElementById('mx-required')
  document.getElementById('mx-required-submit')?.addEventListener('click', () => {
    const ok = required.validate()
    if (ok) text('mx-required-out', `校验通过：${read(required)}`)
  })
  required?.addEventListener('oas-invalid', (event) => {
    text('mx-required-out', `oas-invalid：缺少 ${event.detail.missingRows.length} 行（${event.detail.missingRows.join('、')}）`)
  })

  const form = document.getElementById('mx-form')
  const formMatrix = document.getElementById('mx-form-matrix')
  form?.addEventListener('oas-submit', (event) => {
    const ok = formMatrix.validate()
    if (!ok) {
      text('mx-form-out', '请先完成矩阵题（每行必选）')
      return
    }
    text('mx-form-out', `oas-submit: ${JSON.stringify({ ...event.detail.values, review: formMatrix.value })}`)
  })
})
</script>

## API

### oas-matrix

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `columns` | 选项（列）JSON 数组，形态同 `rows` | `MatrixColumn[] \| string` | — |
| `disabled` | 禁用全部行与列（行 / 列级 `disabled` 仍可单独设置） | `boolean` | — |
| `label` | 题面文本（渲染为标题，并作为分组可访问名称） | `string` | — |
| `mode` | 行内选择模式：`radio` 单选（默认）/ `checkbox` 多选；非法值回落 `radio` 并告警 | `string` | `radio` |
| `readonly` | 只读：保留外观与已选展示，不响应交互 | `boolean` | — |
| `required` | 必答：配合 `required-scope` 表达行级或全表级语义 | `boolean` | — |
| `required-scope` | 必答范围：`row` 每行必选（默认）/ `table` 全表至少一行作答 | `string` | `row` |
| `rows` | 子问题（行）JSON 数组 `[{ key, label?, disabled? }]`；字符串项按 `key=label` 收敛 | `MatrixRow[] \| string` | — |
| `value` | 值 JSON 对象：radio `{ rowKey: columnKey }` / checkbox `{ rowKey: [columnKey] }`（用户交互时回写） | `MatrixValue \| string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `columns` | 选项（列）列表：get+set 双通道（数组或 JSON 字符串）；赋值即生效，不派发事件 | `MatrixColumn[] \| string` | — |
| `rows` | 行（子问题）列表：get+set 双通道（数组或 JSON 字符串）；赋值即生效，不派发事件 | `MatrixRow[] \| string` | — |
| `value` | 当前值：get+set 双通道（对象或 JSON 字符串）；赋值即生效，不派发事件 | `MatrixValue \| string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `validate` | `validate(): boolean` | 校验必答语义并同步可视错误，返回是否通过（未通过时派发 `oas-invalid`） |
| `clear` | `clear(): void` | 清空全部选择（派发 `oas-change`） |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 用户改变选择时派发，`detail: { value, rowKey, columnKey, checked }` |
| `oas-invalid` | `validate()` 未通过时派发，`detail: { reason, scope, missingRows, value }` |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-matrix-label-width` | 行标题列宽（默认 `34%`） | `34%` |
