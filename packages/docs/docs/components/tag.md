# Tag 标签

用于标记和分类的小型标签。

## 类型

<DemoBlock title="标签类型">
  <oas-tag>默认</oas-tag>
  <oas-tag type="primary">主色</oas-tag>
  <oas-tag type="success">成功</oas-tag>
  <oas-tag type="warning">警告</oas-tag>
  <oas-tag type="danger">危险</oas-tag>
  <oas-tag type="info">信息</oas-tag>
</DemoBlock>

## 圆角与尺寸

<DemoBlock title="圆角与尺寸">
  <oas-tag round type="primary">胶囊标签</oas-tag>
  <oas-tag size="small">小号</oas-tag>
  <oas-tag size="medium">中号</oas-tag>
  <oas-tag size="large">大号</oas-tag>
</DemoBlock>

## 可关闭

点击 × 触发 `oas-close`（cancelable，preventDefault 可阻止移除）。

<DemoBlock title="可关闭标签">
  <oas-tag closable type="success">可关闭</oas-tag>
  <oas-tag closable type="info">点 × 关闭</oas-tag>
  <oas-tag closable type="danger">关闭后消失</oas-tag>
</DemoBlock>

## 胶囊与可点击

`chip`：胶囊圆角 + 紧凑 padding；`clickable`：整签可点，点击/Enter/Space 派发 `oas-click`。

<DemoBlock title="chip 胶囊">
  <oas-tag chip>默认 chip</oas-tag>
  <oas-tag chip type="primary">主色 chip</oas-tag>
  <oas-tag chip type="success">成功 chip</oas-tag>
  <oas-tag chip type="warning">警告 chip</oas-tag>
  <oas-tag chip closable type="info">可关闭 chip</oas-tag>
</DemoBlock>

<DemoBlock title="clickable 可点击">
  <oas-tag clickable chip type="primary">点我派发 oas-click</oas-tag>
  <oas-tag clickable chip type="success">可点 chip</oas-tag>
  <oas-tag clickable type="danger">普通可点标签</oas-tag>
  <oas-tag clickable chip disabled type="warning">禁用不可点</oas-tag>
</DemoBlock>

> chip 态下 `disabled` 不可点（不派发 `oas-click`）不可关（关闭按钮 disabled）。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-close', () => {
    window.message?.info('标签已关闭')
  })
  document.addEventListener('oas-click', (e) => {
    const text = (e.target?.textContent || '标签').trim()
    window.message?.info(`点击了「${text}」`)
  })
})
</script>

## API

| 属性       | 说明   | 类型                                                              | 默认值    |
| ---------- | ------ | ----------------------------------------------------------------- | --------- |
| `type`     | 类型   | `default` / `primary` / `success` / `warning` / `danger` / `info` | `default` |
| `size`     | 尺寸   | `small` / `medium` / `large`                                      | `medium`  |
| `closable` | 可关闭 | boolean                                                           | `false`   |
| `round`    | 圆角   | boolean                                                           | `false`   |
| `chip`     | 胶囊   | boolean（胶囊圆角 + 紧凑 padding）                                | `false`   |
| `clickable`| 整签可点| boolean（可聚焦，派发 `oas-click`）                               | `false`   |
| `disabled` | 禁用   | boolean（不可点不可关）                                           | `false`   |

| 事件        | 说明                                        |
| ----------- | ------------------------------------------- |
| `oas-close` | 关闭，`cancelable`，preventDefault 阻止移除 |
| `oas-click` | 整签点击（`clickable` 时），detail 含 originalEvent |
