# SpeedDial 悬浮动作按钮

悬浮主按钮 + 展开子动作列表，常用于「新建/分享」等快捷操作；`aria-expanded` 同步，点击外部/Esc 收起，无孤儿浮层。

> 演示中已加 `style="position: static"` 避免固定定位影响页面布局；实际使用默认固定在右下角。子动作展开方向由 `direction` 控制。

## 展开方向

`direction` 支持 `up`（默认）/ `down` / `left` / `right`，首个子动作始终最靠近主按钮。

<DemoBlock title="方向：up / down / left / right">
  <div style="display: flex; gap: var(--oas-space-5); align-items: center; min-height: 200px; width: 100%">
    <div style="width: 96px; height: 160px">
      <oas-speed-dial style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 96px; height: 160px">
      <oas-speed-dial direction="down" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 220px; height: 80px; display: flex; align-items: center">
      <oas-speed-dial direction="right" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
    <div style="width: 220px; height: 80px; display: flex; align-items: center; justify-content: flex-end">
      <oas-speed-dial direction="left" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
    </div>
  </div>
</DemoBlock>

## 纯文字动作

`icon` 可省略，只显示 label；也支持只写 icon 不写 label。

<DemoBlock title="纯文字 / 纯图标">
  <div style="width: 120px; height: 160px">
    <oas-speed-dial style="position: static" actions='[{"label":"分享"},{"label":"收藏"},{"label":"举报"}]'></oas-speed-dial>
  </div>
</DemoBlock>

## 事件

点击主按钮展开/收起派发 `oas-open`（`detail: { open }`）；点击子动作派发 `oas-select`（`detail: { index, label }`）并自动收起。

<DemoBlock title="事件反馈">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial id="sd-event" style="position: static" actions='[{"label":"复制","icon":"copy"},{"label":"编辑","icon":"edit"},{"label":"删除","icon":"trash"}]'></oas-speed-dial>
  </div>
  <span id="sd-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

## 受控 open

`open` 属性受控：外部设置/移除即展开/收起，组件自身点击也会同步属性并派发 `oas-open`（点击外部 / Esc 仍会收起）。

<DemoBlock title="受控展开">
  <div style="width: 200px; height: 160px">
    <oas-speed-dial id="sd-ctrl" style="position: static" actions='[{"label":"新建","icon":"plus"},{"label":"上传","icon":"upload"},{"label":"下载","icon":"download"}]'></oas-speed-dial>
  </div>
  <oas-button-group>
    <oas-button type="primary" size="small" onclick="event.stopPropagation(); sdCtrl(true)">展开</oas-button>
    <oas-button size="small" onclick="event.stopPropagation(); sdCtrl(false)">收起</oas-button>
    <oas-tag id="sd-status" type="info">open: false</oas-tag>
  </oas-button-group>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const el = document.getElementById('sd-event')
  const out = document.getElementById('sd-out')
  el?.addEventListener('oas-open', (e) => {
    out.textContent = `oas-open: { open: ${e.detail.open} }`
  })
  el?.addEventListener('oas-select', (e) => {
    out.textContent = `oas-select: { index: ${e.detail.index}, label: "${e.detail.label}" }`
  })

  const ctrl = document.getElementById('sd-ctrl')
  const status = document.getElementById('sd-status')
  if (ctrl && status) {
    const sync = () => {
      status.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.sdCtrl = (open) => {
      if (open) ctrl.setAttribute('open', '')
      else ctrl.removeAttribute('open')
    }
    sync()
    // 组件自身点击 / 点击外部 / Esc 都会改 open，用 MutationObserver 保持状态同步
    new MutationObserver(sync).observe(ctrl, { attributes: true, attributeFilter: ['open'] })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `actions` | 子动作 JSON | `string` | `[]` |
| `direction` | 展开方向 | `string` | `up` |
| `open` | 展开态（受控） | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open` | 展开/收起，`detail: { open }` |
| `oas-select` | 选择子动作，`detail: { index, label }`，随后自动收起 |

`SpeedDialAction` 字段：

| 字段   | 说明                                       | 类型     |
| ------ | ------------------------------------------ | -------- |
| `label` | 动作文案                                   | `string` |
| `icon`  | 图标名（`@oas-ui/icons` 的 iconRegistry 键） | `string` |

行为：点击主按钮切换展开（`aria-expanded` 同步）；点击外部或 Esc 收起（Esc 后焦点回到主按钮）；展开时自动聚焦第一个子动作。默认定位 `position: fixed; bottom/right`，可覆盖。文档级监听仅在展开时挂载、断开连接清理，无孤儿浮层。
