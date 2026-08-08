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

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.tourLog = (e) => {
    const tag = document.getElementById('tour-result')
    if (tag) tag.textContent = `当前步骤：${e.detail.index + 1}`
  }
})
</script>

## API

| 属性      | 说明                             | 类型                                  | 默认值  |
| --------- | -------------------------------- | ------------------------------------- | ------- |
| `steps`   | 步骤 JSON                        | `[{ selector, title, description? }]` | `[]`    |
| `open`    | 开始引导（布尔属性，存在即启动） | `boolean`                             | `false` |
| `current` | 当前步骤索引                     | `number`                              | `0`     |

| 事件         | 说明                          |
| ------------ | ----------------------------- |
| `oas-step`   | 步骤切换，`detail: { index }` |
| `oas-finish` | 最后一步点击「完成」          |
| `oas-cancel` | 跳过 / Esc 取消               |

遮罩高亮目标，`role="dialog"` + `aria-modal="true"`；支持「上一步 / 下一步 / 跳过」与键盘 Esc。
