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

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.addEventListener('oas-close', () => {
    window.message?.info('标签已关闭')
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

| 事件        | 说明                                        |
| ----------- | ------------------------------------------- |
| `oas-close` | 关闭，`cancelable`，preventDefault 阻止移除 |
