---
description: "地址簿：地址编辑表单（联系人 / 省市区三级联动 / 详细地址 / 默认地址）+ 地址列表（单选 / 默认标记）+ 联系人轻模式。"
---

# Address 地址

地址簿场景组件，一个组件覆盖三种形态：地址编辑表单、地址列表（默认标记 + 单选）、联系人轻模式（只含姓名与电话，不独立成件）。

## 基础用法

`mode` 缺省为 `edit`。省市区数据走宿主注入（`regions`），组件不内置行政区划数据（理由见下方「省市区数据契约」）。

<DemoBlock title="地址编辑表单">
  <oas-address
    regions='[{"name":"浙江省","children":[{"name":"杭州市","children":[{"name":"西湖区"},{"name":"滨江区"},{"name":"余杭区"}]},{"name":"宁波市","children":[{"name":"海曙区"},{"name":"鄞州区"}]}]},{"name":"江苏省","children":[{"name":"南京市","children":[{"name":"玄武区"},{"name":"鼓楼区"}]},{"name":"苏州市","children":[{"name":"姑苏区"},{"name":"工业园区"}]}]}]'
    value='{"name":"张三","phone":"13800000000","province":"浙江省","city":"杭州市","district":"西湖区","detail":"文三路 100 号","isDefault":true}'
  ></oas-address>
</DemoBlock>

## 地址列表

`mode="list"` 渲染地址卡列表：原生单选（键盘可达）、默认地址徽标、选中高亮。`selected-id` 未指定时优先选 `isDefault` 项，否则选第一项。

<DemoBlock title="选择收货地址">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-address
      id="address-list-demo"
      mode="list"
      items='[{"id":"a1","name":"张三","phone":"13800000000","province":"浙江省","city":"杭州市","district":"西湖区","detail":"文三路 100 号","isDefault":true},{"id":"a2","name":"李四","phone":"13900000000","province":"江苏省","city":"南京市","district":"玄武区","detail":"中山路 8 号"}]'
    ></oas-address>
    <oas-tag type="primary" id="address-list-info">当前选中：a1</oas-tag>
  </oas-space>
</DemoBlock>

## 联系人轻模式

`mode="contact"` 只渲染姓名 + 电话两个字段（下单联系人、发票收件人等场景），输入即派发 `oas-change`，不出现地区 / 详细地址 / 保存按钮。

<DemoBlock title="联系人信息">
  <oas-address mode="contact" value='{"name":"王五","phone":"13700000000"}'></oas-address>
</DemoBlock>

## 校验

保存时校验：姓名必填、电话必填且格式合法、注入地区数据时三级地区完整、详细地址必填。失败派发 `oas-invalid`（detail `{ fields }`）并聚焦首个错误字段。

<DemoBlock title="校验反馈">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-address id="address-validate-demo"></oas-address>
    <oas-tag type="warning" id="address-validate-info">等待提交</oas-tag>
  </oas-space>
</DemoBlock>

## 省市区数据契约

组件**不内置**行政区划数据，`regions` 是唯一契约（JSON 数组，最多三级）：完整县级数据体积大且更新频繁，内置会让按需包体不可控、数据版本也难以追溯；由宿主按需注入（可来自后端接口、静态 JSON 或已有地址库）。

```json
[
  {
    "name": "浙江省",
    "children": [
      { "name": "杭州市", "children": [{ "name": "西湖区" }, { "name": "滨江区" }] }
    ]
  }
]
```

- 节点字段：`name`（必填，展示与提交值）、`code`（可选稳定标识）、`children`（可递归，组件取三级）
- 未注入或 JSON 非法时地区下拉为空且不参与校验，详细地址照常可填
- 切换上级自动重置下级；`value` 回填时按名称逐级匹配

## 无障碍

- 每个输入有可见 label 关联；错误提示通过 `aria-invalid` / `aria-describedby` 关联
- 地址列表为原生单选组（`role="radiogroup"` + 每项 native radio），`←` / `→` / `Tab` 走原生行为
- 联系人 / 地区分组带 `role="group"` 与可访问名

<DemoBlock title="禁用态">
  <oas-address
    disabled
    regions='[{"name":"浙江省","children":[{"name":"杭州市","children":[{"name":"西湖区"}]}]}]'
  ></oas-address>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const list = document.getElementById('address-list-demo')
  const listInfo = document.getElementById('address-list-info')
  list?.addEventListener('oas-select', (e) => {
    listInfo.textContent = `当前选中：${e.detail.id}`
  })
  const form = document.getElementById('address-validate-demo')
  const info = document.getElementById('address-validate-info')
  form?.addEventListener('oas-invalid', (e) => {
    info.textContent = `校验未通过：${e.detail.fields.join(' / ')}`
  })
  form?.addEventListener('oas-submit', () => {
    info.textContent = '校验通过，已提交'
  })
})
</script>

## API

### oas-address

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 禁用全部输入与操作（含列表单选与新增） | `boolean` | — |
| `items` | 地址列表数据（mode=list）：JSON 数组 [{ id?, name, phone, province?, city?, district?, detail?, isDefault? }]；isDefault 项优先预选 | `string` | `[]` |
| `mode` | 形态：edit（默认，地址编辑）/ list（地址列表，单选 + 默认标记）/ contact（联系人轻模式，仅姓名与电话） | `string` | `edit` |
| `readonly` | 只读：可聚焦与复制，不可编辑 / 提交 / 选择 | `boolean` | — |
| `regions` | 省市区数据（宿主注入契约）：JSON 数组 [{ name, code?, children? }]，最多三级；组件不内置行政区划数据 | `string` | — |
| `selected-id` | 列表选中项 id（受控）；缺省选 isDefault 项，否则选第一项 | `string` | — |
| `value` | 受控地址值（JSON 对象）：{ id?, name, phone, province?, city?, district?, detail?, isDefault? }；编辑模式用于预填，联系人模式只用 name / phone | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-add` | 列表模式点击「新增地址」时派发，无 detail |
| `oas-change` | 字段输入或地区选择变化时派发，detail { field, value }（value 为当前地址草稿） |
| `oas-invalid` | 提交校验失败时派发，detail { fields }（字段名数组），同时标记错误并聚焦首个错误字段 |
| `oas-select` | 列表模式选中地址项时派发，detail { id, item } |
| `oas-submit` | 编辑模式校验通过时派发，detail { value }（完整地址对象） |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-address-width` | `100%` |
