# Popconfirm 气泡确认

在触发元素旁显示确认气泡。

## 基础用法

<div class="demo">
  <oas-popconfirm title="确认删除这条数据？" onoas-ok="message.success('已删除')">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</div>

## API

| 属性 | 说明 | 默认值 |
|---|---|---|
| `open` | 显示气泡 | `false` |
| `title` | 确认文案 | — |
| `position` | `top` / `bottom` / `left` / `right` | `top` |

| 事件 | 说明 |
|---|---|
| `oas-ok` | 确定 |
| `oas-cancel` | 取消 / Esc / 外部点击 |

点击包裹内容切换显隐，`role="dialog"`。
