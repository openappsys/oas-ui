# Message 消息提示

命令式全局消息提示，支持类型图标、加载态、悬停暂停、倒计时进度条、位置偏移、数量上限、富内容与 promise 链。进出场动画走 transform/opacity，尊重 `prefers-reduced-motion`。

## 基础用法

<DemoBlock title="六种类型">
  <oas-space>
    <oas-button type="success" onclick="message.success('操作成功')">成功</oas-button>
    <oas-button type="danger" onclick="message.error('出错了')">错误</oas-button>
    <oas-button type="warning" onclick="message.warning('请注意')">警告</oas-button>
    <oas-button onclick="message.info('这是一条提示')">信息</oas-button>
    <oas-button onclick="message.question('需要确认吗')">疑问</oas-button>
    <oas-button onclick="message.loading('正在处理…', { duration: 3000 })">加载</oas-button>
  </oas-space>
</DemoBlock>

## 类型图标

内置类型自带图标（成功/错误/警告/疑问/信息），可通过 `icon` 自定义（`lookupIcon` 查表通道，`registerIcon` 注册的自定义图标同样可用），`show-icon="false"` 关闭。

<DemoBlock title="类型图标与自定义">
  <oas-space>
    <oas-button onclick="message.info('自定义图标（registerIcon 注册）', { icon: 'msg-heart', duration: 4000 })">自定义图标（msg-heart）</oas-button>
    <oas-button onclick="message.success('隐藏类型图标', { showIcon: false, duration: 4000 })">隐藏图标</oas-button>
  </oas-space>
</DemoBlock>

## Loading 与异步流

`message.loading()` 默认不自动关闭（可 `update` 收尾），配合 `message.update(key, options)` 组成轻量异步流。

<DemoBlock title="Loading 与异步流">
  <oas-space>
    <oas-button onclick="message.loading('正在上传…', { key: 'upload', duration: 0 })">开始上传（loading）</oas-button>
    <oas-button onclick="message.update('upload', { content: '上传成功', type: 'success', duration: 4000 })">更新为成功</oas-button>
    <oas-button onclick="message.destroy('upload')">关闭该条</oas-button>
  </oas-space>
</DemoBlock>

## 自定义时长与手动关闭

<DemoBlock title="自定义时长">
  <oas-space>
    <oas-button onclick="message.info('2 秒后自动关闭', 2000)">2 秒</oas-button>
    <oas-button onclick="message.success('5 秒后自动关闭', 5000)">5 秒</oas-button>
    <oas-button onclick="window.msgHandle = message.warning('持续显示，需手动关闭', 0)">不自动关闭（0）</oas-button>
    <oas-button onclick="window.msgHandle && window.msgHandle.close()">手动关闭</oas-button>
    <oas-button onclick="message.info('不可手动关闭', { closable: false, duration: 4000 })">不可关闭</oas-button>
  </oas-space>
</DemoBlock>

## 点击消息

点击消息体触发 `onClick` 回调并关闭消息（`oas-close` 的 `source` 为 `click`）；关闭按钮走 `close` 来源。

<DemoBlock title="点击消息关闭">
  <oas-space>
    <oas-button onclick="window.clickCount = 0; message.info('点击我关闭（onClick）', { duration: 0, onClick: () => window.clickCount++ })">弹出可点击消息</oas-button>
    <oas-button onclick="window.clickCount !== undefined && message.info('已点击 ' + window.clickCount + ' 次')">查看点击次数</oas-button>
  </oas-space>
</DemoBlock>

## 悬停/焦点暂停

`pause-on-hover` 默认开启：悬停消息或聚焦关闭按钮时暂停自动关闭计时（剩余时长记账），移开继续；页面隐藏（`visibilitychange`）同样暂停。

<DemoBlock title="悬停暂停">
  <oas-space>
    <oas-button onclick="message.info('悬停我可暂停计时（10 秒自动关闭）', { duration: 10000 })">10 秒自动关闭</oas-button>
    <oas-button onclick="window.pauseHandle = message.info('编程式暂停/恢复（10 秒）', { duration: 10000 })">弹出后暂停/恢复</oas-button>
    <oas-button onclick="window.pauseHandle && window.pauseHandle.pause()">暂停</oas-button>
    <oas-button onclick="window.pauseHandle && window.pauseHandle.resume()">恢复</oas-button>
  </oas-space>
</DemoBlock>

## 倒计时进度条

`show-progress` 开启自动关闭倒计时进度条，动画时长与 `duration` 同步；悬停暂停时进度条同步暂停。

<DemoBlock title="倒计时进度条">
  <oas-space>
    <oas-button onclick="message.info('5 秒后自动关闭', { duration: 5000, showProgress: true })">带进度条（5 秒）</oas-button>
    <oas-button onclick="message.warning('悬停可暂停进度', { duration: 8000, showProgress: true })">带进度条（8 秒）</oas-button>
  </oas-space>
</DemoBlock>

## 位置与偏移

`placement` 限 `top` / `bottom` 两向（顶部居中为默认，center/角落归 toast 形态）；`offset` 为单数字偏移（px，默认 16）。

<DemoBlock title="位置与偏移">
  <oas-space>
    <oas-button onclick="message.info('顶部（默认）')">top</oas-button>
    <oas-button onclick="message.info('底部', { placement: 'bottom' })">bottom</oas-button>
    <oas-button onclick="message.info('顶部偏移 80', { offset: 80 })">top + offset 80</oas-button>
    <oas-button onclick="message.info('底部偏移 40', { placement: 'bottom', offset: 40 })">bottom + offset 40</oas-button>
  </oas-space>
</DemoBlock>

## 数量上限

`max` 设置栈上限，超出时丢最旧派（最早的消息先关闭）。

<DemoBlock title="数量上限">
  <oas-space>
    <oas-button onclick="window.maxCount = 0; message.info('已重置上限队列')">重置</oas-button>
    <oas-button onclick="window.maxCount = (window.maxCount || 0) + 1; message.info('队列消息 ' + window.maxCount, { max: 2, duration: 0 })">连发（上限 2）</oas-button>
  </oas-space>
</DemoBlock>

## 富内容

`content` 支持 `string | Node`，Node 直接注入文本区渲染（不做 innerHTML 通道）。

<DemoBlock title="富内容">
  <oas-space>
    <oas-button onclick="message.info('普通文本')">文本内容</oas-button>
    <oas-button onclick="richContent()">富内容（Node）</oas-button>
  </oas-space>
</DemoBlock>

## Promise 链

`message.promise(promise, { loading, success, error })`：loading → 成功切 success / 失败切 error，成功后 3 秒自动关闭。

<DemoBlock title="Promise 链">
  <oas-space>
    <oas-button onclick="runPromise(true)">模拟成功</oas-button>
    <oas-button onclick="runPromise(false)">模拟失败</oas-button>
  </oas-space>
</DemoBlock>

## 分组消息与重复计数

相同 `group` 的消息合并为一条，重复触发递增计数（`×n`）；`repeatNum: true` 时右上角显示重复计数徽标；不同 `group` 相互独立。

<DemoBlock title="分组消息">
  <oas-space>
    <oas-button onclick="message.success('保存成功', { group: 'save', repeatNum: true, duration: 0 })">保存（连点试试）</oas-button>
    <oas-button onclick="message.info('数据已同步', { group: 'sync', duration: 0 })">同步（另一组）</oas-button>
  </oas-space>
</DemoBlock>

## 定制杂项

`avatar`（Node 或 `slot="avatar"`）、`spinner` 自定义（图标名或 Node）、`registerType` 自定义类型注册、`mask` 遮罩（点击遮罩关闭）。

<DemoBlock title="定制杂项">
  <oas-space>
    <oas-button onclick="avatarDemo()">头像（avatar）</oas-button>
    <oas-button onclick="message.loading('自定义 spinner', { spinner: 'refresh', duration: 3000 })">自定义 spinner</oas-button>
    <oas-button onclick="message.show('custom-alert', '自定义类型（已注册）', { duration: 4000 })">自定义类型</oas-button>
    <oas-button onclick="message.info('带遮罩，点击遮罩关闭', { mask: true, duration: 0 })">遮罩</oas-button>
  </oas-space>
</DemoBlock>

## 声明式用法

`<oas-message>` 也支持声明式使用：属性与命令式 options 一一对应，文本走内容区，富内容走 `slot="content"`。

<DemoBlock title="声明式用法">
  <oas-space direction="vertical" style="width: 100%">
    <oas-message type="success" duration="6000" closable>声明式成功消息（6 秒自动关闭）</oas-message>
    <oas-message type="info" duration="15000" show-progress>倒计时进度演示（15 秒自动关闭，悬停暂停）</oas-message>
    <oas-message type="question" duration="0" repeat-num="3">声明式 + 静态徽标</oas-message>
    <oas-message type="warning" duration="0"><b slot="content">富内容声明式：</b>支持插槽</oas-message>
  </oas-space>
</DemoBlock>

## App 全局默认

`<oas-app message='{...}'>` 可配置 message 全局默认（调用参数优先）：`duration` / `closable` / `pauseOnHover` / `placement` / `offset` / `max` / `showProgress` / `showIcon` / `mask` / `repeatNum`。

<DemoBlock title="App 全局默认">
  <oas-space>
    <oas-button onclick="setAppMsgConfig()">启用全局默认（底部 + 上限 2 + 无图标）</oas-button>
    <oas-button onclick="clearAppMsgConfig()">清除全局默认</oas-button>
  </oas-space>
  <oas-app id="msg-app-cfg" style="display: block; margin-top: 12px">
    <oas-space>
      <oas-button type="primary" onclick="message.success('走全局默认配置')">发消息</oas-button>
      <oas-button onclick="message.info('覆盖 placement 为顶部', { placement: 'top' })">局部覆盖</oas-button>
    </oas-space>
  </oas-app>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message, destroyAllMessage, registerIcon } = await import('@oas-ui/ui')
  window.message = message
  window.destroyAllMessage = destroyAllMessage

  window.runPromise = (ok) => {
    message.promise(
      new Promise((resolve, reject) =>
        setTimeout(() => (ok ? resolve('数据') : reject(new Error('请求失败'))), 1500),
      ),
      {
        loading: '请求中…',
        success: (data) => `成功：${data}`,
        error: (err) => err.message,
      },
    )
  }

  window.richContent = () => {
    const node = document.createElement('span')
    node.innerHTML = '<b>加粗内容</b> 与 <span style="color: var(--oas-color-primary)">主色文字</span>'
    message.success(node, { duration: 5000 })
  }

  window.avatarDemo = () => {
    const avatar = document.createElement('span')
    avatar.textContent = '🧑'
    message.info('带头像的消息', { avatar, duration: 5000 })
  }

  // 注册自定义类型：图标 + 配色 + 可关性
  window.message.registerType('custom-alert', {
    icon: 'alert-circle',
    color: 'var(--oas-color-warning)',
  })

  // 演示自定义图标通道
  registerIcon('msg-heart', '<path d="M8 13.5 C4.5 10.5 2.8 8.6 2.8 6.3 C2.8 4.4 4.3 3 6.1 3 C7 3 7.9 3.4 8 4.2 C8.1 3.4 9 3 9.9 3 C11.7 3 13.2 4.4 13.2 6.3 C13.2 8.6 11.5 10.5 8 13.5 Z" fill="currentColor"/>')

  const app = document.getElementById('msg-app-cfg')
  window.setAppMsgConfig = () => {
    app.setAttribute(
      'message',
      JSON.stringify({ placement: 'bottom', offset: 32, max: 2, showIcon: false }),
    )
    message.success('全局默认已启用')
  }
  window.clearAppMsgConfig = () => {
    app.removeAttribute('message')
    message.info('全局默认已清除')
  }
})
</script>

## API

### 方法

| 方法                                  | 说明                       |
| ------------------------------------- | -------------------------- |
| `message.info(content, options?)` | 信息提示，返回 `{ close, pause, resume }` |
| `message.success(content, options?)` | 成功提示 |
| `message.warning(content, options?)` | 警告提示 |
| `message.error(content, options?)` | 错误提示 |
| `message.question(content, options?)` | 疑问提示（问号图标） |
| `message.loading(content, options?)` | 加载提示（默认不自动关、不可关） |
| `message.show(type, content, options?)` | 通用入口：内置类型或 `registerType` 注册的自定义类型 |
| `message.update(key, { content, type?, duration? })` | 更新已存在消息，key 不存在则新建 |
| `message.destroy(key)` | 关闭指定 key 的消息 |
| `message.promise(promise, { loading, success, error })` | promise 链：loading → success/error |
| `message.registerType(name, { icon?, color?, closable? })` | 注册自定义消息类型 |
| `destroyAllMessage()` | 清空全部消息 |

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `closable` | — | `string` | `true` |
| `count` | 合并计数（>1 时内容后显示 `×n`） | `string` | `0` |
| `duration` | 自动关闭时长（ms），`0` 表示不自动关闭 | `string` | `3000` |
| `group` | 分组标识：同组消息合并为一条 | — | — |
| `icon` | — | `string` | — |
| `key` | 唯一标识：供 `message.update` / `message.destroy` 定位 | — | — |
| `mask` | — | `boolean` | — |
| `pause-on-hover` | — | `string` | `true` |
| `placement` | — | — | — |
| `repeat-num` | — | `string` | — |
| `show-icon` | — | `string` | `true` |
| `show-progress` | — | `boolean` | — |
| `type` | 消息类型：`info`/`success`/`warning`/`error` | `string` | `info` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 消息关闭时派发（自动关闭/关闭按钮/`destroy`），`detail: { key? }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `avatar` | — |
| `content` | — |

### options

- `{ duration?, group?, key?, onClose?, closable?, pauseOnHover?, placement?, offset?, max?, icon?, showIcon?, showProgress?, repeatNum?, mask?, onClick?, avatar?, spinner? }`
- `content`（首参）支持 `string | Node` 富内容；`group` 同组合并并递增计数；`key` 供 `update` / `destroy` 定位；`onClose` 关闭回调；`onClick` 点击消息体回调（触发后以 `click` 来源关闭）。
- `duration` 默认 `3000`ms，传 `0` 表示不自动关闭；`offset` 默认 `16`px；`max` 超出丢最旧派。
- 悬停/聚焦关闭按钮/页面隐藏自动暂停计时（剩余时长记账）；`error` 类型使用 `role="alert"`，其余使用 `role="status"`。
- 进出场动画走 transform/opacity（时长 CSS 变量 `--oas-message-anim-in` / `--oas-message-anim-out` 开口），尊重 `prefers-reduced-motion`。
- 颜色只走 CSS 变量 token；`registerType` 的 `color` 为显式注入的任意 CSS 颜色（组件默认不硬编码色值）。
