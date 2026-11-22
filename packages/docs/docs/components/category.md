---
description: "分类选择：左类右品双栏联动，左侧多级类目树、右侧当前类子类宫格与商品位。"
---

# Category 分类

电商分类导航的双栏形态：左侧多级类目树（可展开 / 收起），右侧展示当前类的子类宫格；叶子类目展示商品位。两侧联动高亮，支持键盘树导航。

## 基础用法

`categories` 注入类目树：`children` 为子类目，`items` 为叶子商品位。

<DemoBlock title="双栏联动">
  <oas-category
    id="category-demo"
    categories='[{"key":"digital","label":"数码","children":[{"key":"phone","label":"手机","children":[{"key":"apple","label":"苹果"},{"key":"android","label":"安卓"}]},{"key":"audio","label":"影音","items":[{"key":"p1","label":"蓝牙耳机","meta":"热卖"},{"key":"p2","label":"便携音箱","meta":"新品"}]}]},{"key":"home","label":"家居","children":[{"key":"storage","label":"收纳","items":[{"key":"p3","label":"收纳盒"},{"key":"p4","label":"衣架"}]}]},{"key":"beauty","label":"美妆","items":[{"key":"p5","label":"面膜"},{"key":"p6","label":"精华"}]}]'
  ></oas-category>
</DemoBlock>

## 事件反馈

- `oas-change`：左侧选中 / 右侧进入子类时派发，detail `{ key, path, node }`（path 为从根到当前类的 key 数组）
- `oas-select`：点击商品位时派发，detail `{ key, item, path }`

<DemoBlock title="联动反馈">
  <oas-space direction="vertical" size="small" style="width: 100%">
    <oas-category
      id="category-event-demo"
      categories='[{"key":"digital","label":"数码","children":[{"key":"phone","label":"手机","children":[{"key":"apple","label":"苹果"},{"key":"android","label":"安卓"}]},{"key":"audio","label":"影音","items":[{"key":"p1","label":"蓝牙耳机","meta":"热卖"}]}]},{"key":"home","label":"家居","items":[{"key":"p3","label":"收纳盒"}]}]'
    ></oas-category>
    <oas-tag type="primary" id="category-event-info">当前类目：digital</oas-tag>
  </oas-space>
</DemoBlock>

## 多级展开

左侧树支持 `↑` / `↓` 移动、`→` 展开或进入首个子类、`←` 收起或回到父类、`Enter` / `Space` 选中；`aria-expanded` / `aria-level` 随层级同步。点击已展开的父类会收起，右侧仍保留子类宫格。

<DemoBlock title="多级类目">
  <oas-category
    active-key="apple"
    categories='[{"key":"digital","label":"数码","children":[{"key":"phone","label":"手机","children":[{"key":"apple","label":"苹果"},{"key":"android","label":"安卓"}]},{"key":"audio","label":"影音","items":[{"key":"p1","label":"蓝牙耳机"}]}]}]'
  ></oas-category>
</DemoBlock>

## 空态

`categories` 缺省 / 非法 JSON / 空数组时显示空态，不抛异常。

<DemoBlock title="空类目">
  <oas-category></oas-category>
</DemoBlock>

## 数据契约

```json
[
  {
    "key": "digital",
    "label": "数码",
    "children": [{ "key": "phone", "label": "手机", "items": [{ "key": "p1", "label": "蓝牙耳机", "meta": "热卖" }] }]
  }
]
```

- `key` 必填且全局唯一（缺省回落 `id` / `label` / `name`）
- `children` 为子类目，层级不限；`items` 为商品位（`label` + 可选 `meta`）
- `active-key` 受控：外部写入会自动展开其路径；未指定时选中第一个根类目

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('category-event-demo')
  const info = document.getElementById('category-event-info')
  el?.addEventListener('oas-change', (e) => {
    info.textContent = `当前类目：${e.detail.path.join(' / ')}`
  })
  el?.addEventListener('oas-select', (e) => {
    info.textContent = `已选商品：${e.detail.item.label}`
  })
})
</script>

## API

### oas-category

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `active-key` | 当前激活类目 key（受控）；外部写入会自动展开其路径，缺省选第一个根类目 | `string` | — |
| `categories` | 类目树（宿主注入）：JSON 数组 [{ key?, id?, label?, name?, children?, items? }]；key 全局唯一，children 可递归，items 为商品位 [{ key, label, meta? }] | `string` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 左侧选中类目或从右侧进入子类时派发，detail { key, path, node }（path 为根到当前类的 key 数组） |
| `oas-select` | 点击商品位时派发，detail { key, item, path } |

#### CSS 变量

| CSS 变量 | 默认值 |
| --- | --- |
| `--oas-category-height` | `24rem` |
| `--oas-category-side-height` | `12rem` |
| `--oas-category-side-width` | `9rem` |
