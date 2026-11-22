---
description: "发票信息表单：个人 / 企业抬头切换、税号校验、发票内容选择与已保存抬头选择弹层。"
---

# Invoice 发票

发票信息填写组件：抬头类型切换、抬头与税号校验、发票内容选择、已保存抬头弹层回填。数据契约全部由宿主注入（`contents` / `save-titles`），组件不保存任何抬头数据。

## 基础用法

个人抬头只需填写抬头；`contents` 注入发票内容选项。

<DemoBlock title="个人抬头">
  <oas-invoice
    title="张三"
    contents='[{"value":"goods","label":"商品明细"},{"value":"services","label":"服务费"},{"value":"other","label":"其他"}]'
  ></oas-invoice>
</DemoBlock>

## 企业抬头与税号校验

`type="company"` 显示税号字段；税号需为 15–20 位字母或数字，提交失败派发 `oas-invalid` 并聚焦首个错误字段。

<DemoBlock title="企业抬头">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-invoice
      id="invoice-company-demo"
      type="company"
      title="杭州示例科技有限公司"
      tax-id="91330100MA2AB1234X"
      contents='[{"value":"goods","label":"商品明细"},{"value":"services","label":"服务费"}]'
    ></oas-invoice>
    <oas-tag type="success" id="invoice-company-info">等待提交</oas-tag>
  </oas-space>
</DemoBlock>

## 已保存抬头弹层

`save-titles` 注入历史抬头：入口按钮打开 `role="listbox"` 弹层，支持 `↑` / `↓` 移动、`Enter` 选择、`Esc` 关闭并归还焦点，点击宿主外部也会关闭。选中后回填类型 / 抬头 / 税号并派发 `oas-title-select`。

<DemoBlock title="选择已保存抬头">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-invoice
      id="invoice-saved-demo"
      contents='[{"value":"goods","label":"商品明细"},{"value":"services","label":"服务费"}]'
      save-titles='[{"id":"t1","type":"company","title":"杭州示例科技有限公司","taxId":"91330100MA2AB1234X"},{"id":"t2","type":"personal","title":"张三"},{"id":"t3","type":"company","title":"宁波示例贸易有限公司","taxId":"91330200MA2CD5678Y"}]'
    ></oas-invoice>
    <oas-tag type="primary" id="invoice-saved-info">尚未选择已保存抬头</oas-tag>
  </oas-space>
</DemoBlock>

## 抬头类型切换

抬头类型为单选组（`role="radiogroup"`），支持 `←` / `→` 切换；切换时保留已输入的抬头草稿。切换会派发 `oas-change`（detail `{ field: 'type', value }`）。

<DemoBlock title="类型切换">
  <oas-invoice
    type="personal"
    contents='[{"value":"goods","label":"商品明细"},{"value":"services","label":"服务费"}]'
  ></oas-invoice>
</DemoBlock>

## 数据契约

- `contents`：`[{ "value": string, "label": string }]`，缺省 / 非法时不渲染内容字段
- `save-titles`：`[{ "id"?: string, "type": "personal" | "company", "title": string, "taxId"?: string }]`，缺省 / 非法时隐藏入口
- 提交值：`{ type, title, taxId, content }`，经 `oas-submit` 的 `detail.value` 返回

## 无障碍

- 输入框 label 关联、错误提示 `aria-invalid` / `aria-describedby`
- 已保存抬头弹层：触发按钮 `aria-haspopup="listbox"` + `aria-expanded`，列表带可访问名
- `disabled` / `readonly` 时输入、弹层入口与提交均禁用

<DemoBlock title="禁用态">
  <oas-invoice disabled title="张三" type="personal"></oas-invoice>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const company = document.getElementById('invoice-company-demo')
  const companyInfo = document.getElementById('invoice-company-info')
  company?.addEventListener('oas-invalid', (e) => {
    companyInfo.textContent = `校验未通过：${e.detail.fields.join(' / ')}`
  })
  company?.addEventListener('oas-submit', (e) => {
    companyInfo.textContent = `已提交：${e.detail.value.title}`
  })
  const saved = document.getElementById('invoice-saved-demo')
  const savedInfo = document.getElementById('invoice-saved-info')
  saved?.addEventListener('oas-title-select', (e) => {
    savedInfo.textContent = `已选择：${e.detail.value.title}`
  })
})
</script>

## API

### oas-invoice

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `content` | 发票内容选中值（受控）；需与 contents 的 value 对应 | `string` | — |
| `contents` | 发票内容选项（宿主注入）：JSON 数组 [{ value, label }]；缺省或非法时不渲染内容字段 | `string` | — |
| `disabled` | 禁用全部输入、弹层入口与提交 | `boolean` | — |
| `readonly` | 只读：可聚焦与复制，不可编辑 / 选择 / 提交 | `boolean` | — |
| `save-titles` | 已保存抬头（宿主注入）：JSON 数组 [{ id?, type, title, taxId? }]；缺省或非法时隐藏弹层入口 | `string` | — |
| `tax-id` | 纳税人识别号（受控）；企业抬头下校验 15–20 位字母或数字 | `string` | — |
| `title` | 发票抬头（受控）；输入时派发 oas-change，提交成功后回写 | `string` | — |
| `type` | 抬头类型：personal（默认）/ company；企业抬头显示并校验税号 | `string` | `personal` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 字段或抬头类型变化时派发，detail { field, value }（field：type / title / taxId / content / saved） |
| `oas-invalid` | 提交校验失败时派发，detail { fields }，同时标记错误并聚焦首个错误字段 |
| `oas-submit` | 校验通过时派发，detail { value }（{ type, title, taxId, content }） |
| `oas-title-select` | 从已保存抬头弹层选择时派发，detail { id, value }（value 已回填到当前表单） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-invoice-width` | `100%` |
