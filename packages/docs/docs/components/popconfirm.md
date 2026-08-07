# Popconfirm 气泡确认

在触发元素旁显示确认气泡，常用于删除等危险操作前的二次确认。

## 基础用法

<DemoBlock title="基础用法">
  <oas-popconfirm title="确定删除这条数据吗？" onoas-ok="message.success('已删除')" onoas-cancel="message.info('已取消')">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

## 四种位置

<DemoBlock title="四种位置">
  <oas-space direction="vertical" size="large" align="center" style="width: 100%; padding: 24px 0">
    <div style="display: flex; justify-content: center; gap: 16px">
      <oas-popconfirm title="上方气泡" position="top"><oas-button size="small">上方 top</oas-button></oas-popconfirm>
      <oas-popconfirm title="下方气泡" position="bottom"><oas-button size="small">下方 bottom</oas-button></oas-popconfirm>
    </div>
    <div style="display: flex; justify-content: center; gap: 16px">
      <oas-popconfirm title="左侧气泡" position="left"><oas-button size="small">左侧 left</oas-button></oas-popconfirm>
      <oas-popconfirm title="右侧气泡" position="right"><oas-button size="small">右侧 right</oas-button></oas-popconfirm>
    </div>
  </oas-space>
</DemoBlock>

## 长文案

<DemoBlock title="长文案">
  <oas-popconfirm title="此操作会永久删除该订单及其全部子记录，且无法恢复，确定继续吗？">
    <oas-button type="danger">删除订单</oas-button>
  </oas-popconfirm>
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

| 属性 | 说明 | 类型 | 默认值 |
|---|---|---|---|
| `open` | 是否显示气泡 | `boolean` | `false` |
| `title` | 确认文案 | `string` | — |
| `position` | 气泡位置 | `top` / `bottom` / `left` / `right` | `top` |

### 事件

| 事件 | 说明 |
|---|---|
| `oas-ok` | 点击「确定」，随后气泡自动收起 |
| `oas-cancel` | 取消：取消按钮 / Esc / 外部点击 |

点击包裹内容切换显隐，气泡 `role="dialog"`。
