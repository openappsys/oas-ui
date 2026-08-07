# Confirm 确认框

命令式确认对话框，基于 Promise，底层复用 `oas-modal`。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space>
    <oas-button type="primary" onclick="openConfirm()">打开确认框</oas-button>
  </oas-space>
</DemoBlock>

## 自定义文案

<DemoBlock title="自定义文案">
  <oas-space>
    <oas-button onclick="openCustomConfirm()">自定义按钮文案</oas-button>
  </oas-space>
</DemoBlock>

## 取消处理

<DemoBlock title="取消处理">
  <oas-space>
    <oas-button type="danger" onclick="openCancelable()">确认删除（可感知取消）</oas-button>
  </oas-space>
</DemoBlock>

## 清空全部

<DemoBlock title="清空全部">
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

### 方法

| 方法 | 说明 |
|---|---|
| `confirm({ title?, content?, okText?, cancelText? })` | 打开确认框，返回 `Promise<void>`；确定 resolve、取消 reject |
| `destroyAllConfirm()` | 关闭全部确认框 |

- 复用 `oas-modal`，Esc / 遮罩 / 取消按钮均可关闭。
- 确定与取消内部触发 `oas-ok` / `oas-cancel` 事件。
