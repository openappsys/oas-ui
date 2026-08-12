# FloatButton 悬浮按钮

默认固定于页面右下角的圆形操作按钮，常用于「新建」「反馈」等快捷操作，支持角标与自定义图标。

> 演示中已加 `style="position: static"` 避免固定定位影响页面布局；实际使用默认固定在右下角。

## 基础用法

<DemoBlock title="带角标">
  <oas-float-button badge="3" style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## 无角标

<DemoBlock title="无角标">
  <oas-float-button style="position: static; box-shadow: none"></oas-float-button>
</DemoBlock>

## 自定义图标

<DemoBlock title="自定义图标">
  <oas-float-button style="position: static; box-shadow: none"><span slot="icon">✎</span></oas-float-button>
</DemoBlock>

## 事件反馈

<DemoBlock title="点击事件">
  <oas-float-button badge="5" style="position: static; box-shadow: none" onoas-click="message.info('悬浮按钮被点击')"></oas-float-button>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
})
</script>

## API

### 属性

| 属性    | 说明         | 类型     | 默认值 |
| ------- | ------------ | -------- | ------ |
| `badge` | 右上角标数字 | `string` | —      |

### 事件

| 事件        | 说明                              |
| ----------- | --------------------------------- |
| `oas-click` | 点击，`detail: { originalEvent }` |

### 插槽

| 名称   | 说明 |
| ------ | ---- |
| `icon` | —    |

插槽：`icon`（默认 ＋）。默认定位 `position: fixed; bottom/right`，可通过宿主元素样式覆盖。
