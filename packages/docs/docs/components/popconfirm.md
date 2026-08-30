# Popconfirm 气泡确认

在触发元素旁显示确认气泡，常用于删除等危险操作前的二次确认。

## 基础用法

<DemoBlock title="基础用法">
  <oas-popconfirm title="确定删除这条数据吗？" onoas-ok="message.success('已删除')" onoas-cancel="message.info('已取消')">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

## 受控显示

`open` 属性受控：外部按钮设置 / 移除 `open` 控制气泡显隐（点击外部 / Esc / 确定 / 取消仍会关闭）。

<DemoBlock title="受控显示（open 属性）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); pcCtrl(true)">打开确认</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); pcCtrl(false)">关闭</oas-button>
    <oas-tag id="pc-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-popconfirm id="pc-ctrl" title="确定删除这条数据吗？">
    <oas-button type="danger">删除</oas-button>
  </oas-popconfirm>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  const pc = document.getElementById('pc-ctrl')
  const status = document.getElementById('pc-status')
  if (!pc || !status) return
  const sync = () => {
    status.textContent = `open: ${pc.hasAttribute('open')}`
  }
  window.pcCtrl = (open) => {
    if (open) pc.setAttribute('open', '')
    else pc.removeAttribute('open')
  }
  sync()
  // 确定 / 取消 / 外部点击 / Esc 由组件移除 open，用 MutationObserver 保持状态同步
  new MutationObserver(sync).observe(pc, { attributes: true, attributeFilter: ['open'] })
})
</script>

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

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `open` | 是否显示气泡 | `boolean` | — |
| `position` | 气泡位置 | `string` | `top` |
| `title` | 确认文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串） | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 取消：取消按钮 / Esc / 外部点击，`detail: { source: this }` |
| `oas-ok` | 点击「确定」，随后气泡自动收起，`detail: { source: this }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

点击包裹内容切换显隐，气泡 `role="dialog"`。
