# NavigationMenu 多级导航

网站式多级导航栏：悬停 / 键盘展开子菜单（级联浮出），带 `href` 的叶子项渲染为链接。

## 基础用法

<DemoBlock title="基础用法">
  <oas-navigation-menu id="nav-basic" onoas-select="navLog(event)" items='[{"label":"产品","value":"products","children":[{"label":"组件","value":"components","href":"/components"},{"label":"文档","value":"docs","href":"/docs"},{"label":"更多","value":"more","children":[{"label":"博客","value":"blog","href":"/blog"},{"label":"社区","value":"community","href":"/community"}]}]},{"label":"定价","value":"pricing","href":"/pricing"},{"label":"关于","value":"about","href":"/about"}]'></oas-navigation-menu>
  <oas-tag id="nav-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-navigation-menu items='[{"label":"首页","value":"home","href":"/"},{"label":"产品","value":"products","children":[{"label":"组件","value":"components"},{"label":"文档","value":"docs","disabled":true}]}]'></oas-navigation-menu>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.navLog = (e) => {
    const tag = document.getElementById('nav-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }
})
</script>

## API

### 属性

| 属性    | 说明                    | 类型     | 默认值 |
| ------- | ----------------------- | -------- | ------ |
| `items` | 导航项 JSON（层级结构） | `string` | `[]`   |

### 事件

| 事件         | 说明                          |
| ------------ | ----------------------------- |
| `oas-select` | 选择某项，`detail: { value }` |

`NavItem` 字段（继承 `MenuItem`）：

| 字段       | 说明                                                  | 类型        |
| ---------- | ----------------------------------------------------- | ----------- |
| `label`    | 导航文字                                              | `string`    |
| `value`    | 选中值                                                | `string`    |
| `href`     | 链接地址（可选）；叶子项带 href 渲染为 `<a>` 并可跳转 | `string`    |
| `target`   | 链接打开方式（可选）                                  | `string`    |
| `disabled` | 禁用                                                  | `boolean`   |
| `children` | 子导航项（可继续嵌套，级联向右浮出）                  | `NavItem[]` |

交互：悬停展开子菜单、点击切换；键盘 `←`/`→` 顶级切换、`↓`/`Enter` 打开、`↑` 打开并聚焦末项、`→` 进入级联、`←` 返回父级、`Esc` 关闭全部并聚焦顶级。子菜单打开时 `Tab` 在子项间循环（焦点陷阱）；选中后收起并派发 `oas-select`。
