# Alert 警告提示

内嵌式提示条，展示成功、信息、警告或错误。

## 基础用法

<div class="demo">
  <oas-space direction="vertical" style="width: 400px">
    <oas-alert type="success" title="成功提示">操作已成功完成</oas-alert>
    <oas-alert type="info" title="信息提示" closeable>这是一条可关闭的信息</oas-alert>
    <oas-alert type="warning" title="警告提示">请注意安全</oas-alert>
    <oas-alert type="error" title="错误提示">操作失败，请重试</oas-alert>
  </oas-space>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `type` | `info` / `success` / `warning` / `error` | `info` |
| `title` | 标题 | — |
| `closeable` | 显示关闭按钮 | `false` |

| 事件 | 说明 |
|---|---|
| `oas-close` | 点击关闭 |

error 使用 `role="alert"`，其余 `role="status"`。
