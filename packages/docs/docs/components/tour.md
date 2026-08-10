# Tour 引导

分步功能引导，带全屏遮罩与目标高亮。

## 基础用法

<DemoBlock title="开始引导">
  <oas-button type="primary" onclick="document.getElementById('tour-basic').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="tour-basic" steps='[{"selector":"#tour-b1","title":"第一步","description":"这是第一个高亮区域，通过 selector 定位。"},{"selector":"#tour-b2","title":"第二步","description":"点击「下一步」或「完成」推进步骤。"}]'></oas-tour>
  <div id="tour-b1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域一</div>
  <div id="tour-b2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域二</div>
</DemoBlock>

## 引导事件

<DemoBlock title="步骤事件">
  <oas-button type="primary" onclick="document.getElementById('tour-event').setAttribute('open','')">开始引导</oas-button>
  <oas-tour id="tour-event" onoas-step="tourLog(event)" onoas-finish="message.success('引导完成')" onoas-cancel="message.info('已跳过引导')" steps='[{"selector":"#tour-e1","title":"第一步","description":"观察步骤切换事件输出。"},{"selector":"#tour-e2","title":"第二步","description":"点击「完成」触发 oas-finish，Esc / 跳过触发 oas-cancel。"}]'></oas-tour>
  <oas-tag id="tour-result" type="info">尚未开始</oas-tag>
  <div id="tour-e1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域一</div>
  <div id="tour-e2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">高亮区域二</div>
</DemoBlock>

## 受控步骤与开关

`open` 与 `current` 均为受控属性：外部按钮 / JS 设置 `open` 启动引导，设置 `current` 直接跳到指定步骤（无需逐步点击）。

<DemoBlock title="受控 open / current">
  <oas-space>
    <oas-button type="primary" onclick="tourCtlOpen()">开始引导（设置 open）</oas-button>
    <oas-button onclick="tourCtlJump(1)">跳到第 2 步（current=1）</oas-button>
    <oas-button onclick="tourCtlJump(2)">跳到第 3 步（current=2）</oas-button>
    <oas-button onclick="tourCtlClose()">结束（移除 open）</oas-button>
  </oas-space>
  <oas-tour id="tour-ctrl" steps='[{"selector":"#tour-c1","title":"第一步","description":"通过外部按钮设置 current 可跳步。"},{"selector":"#tour-c2","title":"第二步","description":"当前步骤高亮随属性变化。"},{"selector":"#tour-c3","title":"第三步","description":"直接移除 open 结束引导。"}]'></oas-tour>
  <div id="tour-c1" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">受控高亮区域一</div>
  <div id="tour-c2" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">受控高亮区域二</div>
  <div id="tour-c3" style="margin-top: 12px; height: 60px; padding: 0 12px; white-space: nowrap; border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md); display: flex; align-items: center; justify-content: center">受控高亮区域三</div>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.tourLog = (e) => {
    const tag = document.getElementById('tour-result')
    if (tag) tag.textContent = `当前步骤：${e.detail.index + 1}`
  }
  window.tourCtlOpen = () => document.getElementById('tour-ctrl').setAttribute('open', '')
  window.tourCtlJump = (i) => document.getElementById('tour-ctrl').setAttribute('current', String(i))
  window.tourCtlClose = () => document.getElementById('tour-ctrl').removeAttribute('open')
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `current` | 当前步骤索引 | — | `0` |
| `open` | 开始引导（布尔属性，存在即启动） | — | — |
| `steps` | 步骤 JSON | `TourStep[] \| string` | `[]` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 跳过 / Esc 取消 |
| `oas-finish` | 最后一步点击「完成」 |
| `oas-step` | 步骤切换，`detail: { index }` |

遮罩高亮目标，`role="dialog"` + `aria-modal="true"`；支持「上一步 / 下一步 / 跳过」与键盘 Esc。
