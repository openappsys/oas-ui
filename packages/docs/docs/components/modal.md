# Modal 对话框

模态对话框，用于需要用户确认或输入的中断场景。

## 基础用法

<DemoBlock title="基础用法">
  <oas-button type="primary" onclick="document.querySelector('#modal-basic').setAttribute('visible','')">打开对话框</oas-button>
  <oas-modal id="modal-basic" title="提示">
    <p>这是一个基础对话框示例。</p>
  </oas-modal>
</DemoBlock>

## 无底部按钮

<DemoBlock title="无底部按钮">
  <oas-button onclick="document.querySelector('#modal-nofooter').setAttribute('visible','')">打开无按钮对话框</oas-button>
  <oas-modal id="modal-nofooter" title="操作说明" no-footer>
    <p>隐藏底部操作区，仅通过 ✕ / Esc / 遮罩关闭。</p>
  </oas-modal>
</DemoBlock>

## 禁止遮罩关闭

<DemoBlock title="禁止遮罩关闭">
  <oas-button onclick="document.querySelector('#modal-nomask').setAttribute('visible','')">打开对话框</oas-button>
  <oas-modal id="modal-nomask" title="必须确认" no-mask-close>
    <p>点击遮罩不会关闭，需通过按钮或 Esc 关闭。</p>
  </oas-modal>
</DemoBlock>

## 事件反馈

<DemoBlock title="事件反馈">
  <oas-button onclick="document.querySelector('#modal-event').setAttribute('visible','')">打开并监听事件</oas-button>
  <oas-modal id="modal-event" title="删除确认" onoas-ok="closeModal('modal-event'); message.success('已删除')" onoas-cancel="closeModal('modal-event'); message.info('已取消')">
    <p>点击「确定」或「取消」，观察右上角消息提示。</p>
  </oas-modal>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.closeModal = (id) => document.getElementById(id).removeAttribute('visible')
})
</script>

## API

### 属性

| 属性            | 说明             | 类型      | 默认值  |
| --------------- | ---------------- | --------- | ------- |
| `visible`       | 是否显示         | `boolean` | `false` |
| `title`         | 标题文案         | `string`  | —       |
| `no-footer`     | 隐藏底部操作按钮 | `boolean` | `false` |
| `no-mask-close` | 禁用点击遮罩关闭 | `boolean` | `false` |

### 事件

| 事件         | 说明                                |
| ------------ | ----------------------------------- |
| `oas-ok`     | 点击「确定」                        |
| `oas-cancel` | 取消：取消按钮 / ✕ / 遮罩点击 / Esc |

`role="dialog"` + `aria-modal="true"`，打开时焦点移入「取消」按钮，关闭后还原。
