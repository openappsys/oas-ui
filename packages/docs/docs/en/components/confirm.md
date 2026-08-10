# Confirm

Imperative confirmation dialog based on Promises, reusing `oas-modal` under the hood.

## Basic usage

<DemoBlock title="Basic usage">
  <oas-space>
    <oas-button type="primary" onclick="openConfirm()">打开确认框</oas-button>
  </oas-space>
</DemoBlock>

## Custom text

<DemoBlock title="Custom text">
  <oas-space>
    <oas-button onclick="openCustomConfirm()">自定义按钮文案</oas-button>
  </oas-space>
</DemoBlock>

## Cancel handling

<DemoBlock title="Cancel handling">
  <oas-space>
    <oas-button type="danger" onclick="openCancelable()">确认删除（可感知取消）</oas-button>
  </oas-space>
</DemoBlock>

## Clear all

<DemoBlock title="Clear all">
  <oas-space>
    <oas-button onclick="openMany()">连开三个确认框</oas-button>
    <oas-button onclick="destroyAllConfirm()">清空全部</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { confirm, message, destroyAllConfirm } = await import('@oas-ui/ui')
  window.confirm = confirm
  window.message = message
  window.destroyAllConfirm = destroyAllConfirm
  window.openConfirm = () =>
    confirm({ title: '确认操作', content: '该操作无法撤销，是否继续？' }).then(() =>
      message.success('已确认'),
    )
  window.openCustomConfirm = () =>
    confirm({ title: '删除文件', content: '删除后不可恢复', okText: '狠心删除', cancelText: '再想想' }).then(
      () => message.success('已删除'),
    )
  window.openCancelable = () =>
    confirm({ title: '删除数据', content: '删除后不可恢复' }).catch(() => message.info('已取消操作'))
  window.openMany = () => {
    confirm({ title: '确认框 1', content: '第一个确认框' })
    confirm({ title: '确认框 2', content: '第二个确认框' })
    confirm({ title: '确认框 3', content: '第三个确认框' })
  }
})
</script>

## API

### Methods

| Method | Description |
| --- | --- |
| `confirm({ title?, content?, okText?, cancelText? })` | Opens a confirm dialog, returns `Promise<void>`; resolves on OK, rejects on cancel |
| `destroyAllConfirm()` | Close all confirm dialogs |

- Reuses `oas-modal`; Esc / mask / cancel button all close it.
- OK and cancel internally dispatch the `oas-ok` / `oas-cancel` events.
