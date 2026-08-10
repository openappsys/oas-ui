# Backdrop 遮罩

全屏半透明遮罩，支持 `transparent`/`blur` 变体与 body 滚动锁定；`open=false` 时自动卸载节点，不留孤儿 DOM。

## 基础用法

<DemoBlock title="基础用法">
  <oas-space>
    <oas-button type="primary" onclick="openBackdrop('backdrop-basic')">打开遮罩</oas-button>
  </oas-space>
  <p>点击遮罩任意位置关闭（监听 <code>oas-click</code>）。</p>
</DemoBlock>

## 透明与模糊

<DemoBlock title="透明与模糊">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-transparent', { transparent: true, blur: true })">透明 + 模糊</oas-button>
    <oas-button onclick="openBackdrop('backdrop-plain', { transparent: true })">纯透明</oas-button>
  </oas-space>
</DemoBlock>

## 不锁定滚动

<DemoBlock title="不锁定滚动">
  <oas-space>
    <oas-button onclick="openBackdrop('backdrop-scroll', { lockScroll: false })">打开（可滚动）</oas-button>
  </oas-space>
  <p><code>lock-scroll</code> 默认 <code>true</code>，设为 <code>false</code> 后 body 可继续滚动。</p>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast } = await import('@oas-ui/ui')
  window.toast = toast
  window.openBackdrop = (id, opts = {}) => {
    let el = document.getElementById(id)
    if (el) el.remove()
    el = document.createElement('oas-backdrop')
    el.id = id
    if (opts.transparent) el.setAttribute('transparent', '')
    if (opts.blur) el.setAttribute('blur', '')
    if (opts.lockScroll === false) el.setAttribute('lock-scroll', 'false')
    el.addEventListener('oas-click', () => {
      el.removeAttribute('open')
      toast.info({ title: '遮罩被点击，已关闭', duration: 2000 })
    })
    // 先设 open 再挂载：组件在 !open 时连接会自动卸载，顺序颠倒会导致被立即移除
    el.setAttribute('open', '')
    document.body.appendChild(el)
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `blur` | 背景模糊 | — | — |
| `lock-scroll` | 打开时锁定 body 滚动 | — | `true` |
| `open` | 是否显示 | — | — |
| `transparent` | 遮罩透明（无底色） | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | 点击遮罩，`detail.originalEvent` 为原始点击事件 |

- 自身无焦点陷阱（由上层弹窗负责）；Esc 不自动关闭（由外层弹窗决定）。
- `open=false` 时节点从 DOM 卸载，无孤儿 DOM；多遮罩共存时仅最后一个关闭才恢复滚动。
