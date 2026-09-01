# Notification 通知

四角定位的通知卡片，支持标题、描述、时长、类型、悬停暂停、优先级抢占与栈治理（折叠计数/层叠悬停展开）。

## 基础用法

<DemoBlock title="四种类型">
  <oas-space>
    <oas-button onclick="notification.info({ title: '信息通知', description: '这是一条普通通知' })">信息</oas-button>
    <oas-button type="success" onclick="notification.success({ title: '成功通知', description: '操作已完成' })">成功</oas-button>
    <oas-button type="warning" onclick="notification.warning({ title: '警告通知', description: '请及时处理' })">警告</oas-button>
    <oas-button type="danger" onclick="notification.error({ title: '错误通知', description: '操作失败' })">错误</oas-button>
  </oas-space>
</DemoBlock>

## 自定义时长

<DemoBlock title="自定义时长">
  <oas-space>
    <oas-button onclick="notification.info({ title: '长时展示', description: '8 秒后自动关闭', duration: 8000 })">8 秒</oas-button>
    <oas-button onclick="notification.success({ title: '不自动关闭', description: '需手动点击 ✕ 关闭', duration: 0 })">不自动关闭</oas-button>
  </oas-space>
</DemoBlock>

## 带进度条

<DemoBlock title="带进度条">
  <oas-space>
    <oas-button onclick="notification.success({ title: '下载完成', description: '通知将在 5 秒后自动关闭', duration: 5000, showProgress: true })">进度条（底部）</oas-button>
    <oas-button onclick="notification.info({ title: '部署进行中', description: '进度条显示在顶部，6 秒后自动关闭', duration: 6000, showProgress: true, progressPosition: 'top' })">进度条（顶部）</oas-button>
  </oas-space>
</DemoBlock>

## 长内容可滚动

<DemoBlock title="长内容可滚动">
  <oas-space>
    <oas-button onclick="notification.info({ title: '长内容通知', description: '这是一段用于演示超长内容的描述。通知卡片内部会限制高度并开启纵向滚动，用户可以在不撑破卡片的前提下查看全部内容。想象这里写满了若干段落：第一段说明产品更新要点，第二段列出迁移注意事项，第三段补充回滚方案与技术支持渠道，第四段…… 文字足够多时滚动条就会自然出现。' })">长内容</oas-button>
  </oas-space>
</DemoBlock>

## 位置四角

<DemoBlock title="位置四角">
  <oas-space>
    <oas-button onclick="notification.info({ title: '左上角', duration: 6000, position: 'top-left' })">左上</oas-button>
    <oas-button onclick="notification.info({ title: '右上角（默认）', duration: 6000, position: 'top-right' })">右上</oas-button>
    <oas-button onclick="notification.info({ title: '左下角', duration: 6000, position: 'bottom-left' })">左下</oas-button>
    <oas-button onclick="notification.info({ title: '右下角', duration: 6000, position: 'bottom-right' })">右下</oas-button>
  </oas-space>
</DemoBlock>

## 数量上限

<DemoBlock title="数量上限（超限丢最老）">
  <oas-space>
    <oas-button onclick="for (let i = 1; i <= 6; i++) notification.info({ title: '通知 ' + i, description: '同屏最多 3 条，最老的被挤出', duration: 0, max: 3 })">连发 6 条（max=3）</oas-button>
    <oas-button onclick="destroyAllNotification()">清空</oas-button>
  </oas-space>
</DemoBlock>

## 悬停暂停

<DemoBlock title="悬停暂停（默认开启）">
  <oas-space>
    <oas-button onclick="notification.info({ title: '悬停我试试', description: '鼠标悬停时倒计时与进度条暂停，移开后继续', duration: 8000, showProgress: true })">悬停暂停</oas-button>
    <oas-button onclick="notification.info({ title: '悬停不暂停', description: 'pauseOnHover: false 关闭', duration: 8000, showProgress: true, pauseOnHover: false })">关闭悬停暂停</oas-button>
  </oas-space>
</DemoBlock>

## 关闭回调

<DemoBlock title="关闭回调 onClose">
  <p style="font-size: 13px; margin: 0 0 8px;">无论自动关闭、点击 ✕ 还是命令式销毁，onClose 都会触发一次：</p>
  <oas-space>
    <oas-button onclick="window.__notifLog('close', notification.info({ title: '观察关闭', description: '等待关闭后看下方计数', duration: 4000, onClose: () => window.__notifCount('close') }).close)">命令式销毁</oas-button>
    <oas-button onclick="notification.info({ title: '观察关闭', description: '等 4 秒自动关闭或点 ✕', duration: 4000, onClose: () => window.__notifCount('close') })">自动/手动关闭</oas-button>
    <span id="notif-close-count" style="font-size: 13px; align-self: center;">onClose 触发：0 次</span>
  </oas-space>
</DemoBlock>

## 点击回调

<DemoBlock title="点击回调 onClick（查看详情场景）">
  <oas-space>
    <oas-button onclick="notification.warning({ title: '版本已发布', description: '点击本卡片查看发布说明', duration: 8000, onClick: () => window.__notifCount('click') })">发出可点击通知</oas-button>
    <span id="notif-click-count" style="font-size: 13px; align-self: center;">onClick 触发：0 次</span>
  </oas-space>
</DemoBlock>

## 关闭开关

<DemoBlock title="关闭开关 closable">
  <oas-space>
    <oas-button onclick="notification.info({ title: '没有关闭按钮', description: '4 秒后自动消失', duration: 4000, closable: false })">closable=false</oas-button>
    <oas-button onclick="notification.info({ title: '默认可关闭', description: '右上角有 ✕', duration: 4000 })">默认（可关闭）</oas-button>
  </oas-space>
</DemoBlock>

## 图标插槽

<DemoBlock title="图标插槽 slot=&quot;icon&quot; / slot=&quot;close-icon&quot;">
  <oas-space>
    <oas-button onclick="document.getElementById('notif-slot-host').innerHTML = '<oas-notification type=\'success\' duration=\'0\' title=\'自定义图标\' description=\'🔔 覆盖类型默认图标，DONE 覆盖默认 ✕\'><span slot=\'icon\' style=\'font-size:18px\'>🔔</span><span slot=\'close-icon\'>DONE</span></oas-notification>'">显示自定义图标通知</oas-button>
    <oas-button onclick="document.getElementById('notif-slot-host').innerHTML = ''">移除</oas-button>
  </oas-space>
  <div id="notif-slot-host"></div>
</DemoBlock>

## 内容更新（key）

<DemoBlock title="内容更新 key / update">
  <oas-space>
    <oas-button onclick="window.__deployDemo()">模拟部署进度</oas-button>
  </oas-space>
</DemoBlock>

## 进度条颜色

<DemoBlock title="进度条颜色 --oas-notification-progress-color">
  <p style="font-size: 13px; margin: 0 0 8px;">通知挂载到下方容器（container），容器上的颜色变量穿透生效——观察右上角进度条为危险色：</p>
  <oas-space>
    <oas-button onclick="window.__progressColorDemo()">发出 danger 色进度条通知</oas-button>
  </oas-space>
  <div id="notif-color-host" style="--oas-notification-progress-color: var(--oas-color-danger);"></div>
</DemoBlock>

## 偏移

<DemoBlock title="偏移 offset">
  <oas-space>
    <oas-button onclick="notification.info({ title: '偏移 64px', description: '栈容器距视口边缘 64px', duration: 6000, offset: 64 })">offset=64</oas-button>
    <oas-button onclick="notification.info({ title: '默认 16px', duration: 6000 })">默认 16</oas-button>
  </oas-space>
</DemoBlock>

## 挂载容器

<DemoBlock title="挂载容器 container">
  <p style="font-size: 13px; margin: 0 0 8px;">通知栈挂到下方容器内（DOM 归属指定元素，视觉仍为视口四角定位）；打开 devtools 可见栈容器在 div#notif-mount-host 内：</p>
  <oas-space>
    <oas-button onclick="window.__containerDemo()">挂到下方容器</oas-button>
  </oas-space>
  <div id="notif-mount-host" style="border: 1px dashed var(--oas-color-border); border-radius: 8px; padding: 8px; font-size: 12px; color: var(--oas-color-text-secondary);">挂载目标容器（notif-mount-host）</div>
</DemoBlock>

## footer 操作区

<DemoBlock title="footer 操作区（查看详情 / 撤销）">
  <oas-space>
    <oas-button onclick="window.__footerDemo()">发出带操作区的通知</oas-button>
  </oas-space>
</DemoBlock>

## 优先级

<DemoBlock title="优先级 priority（高优抢占）">
  <p style="font-size: 13px; margin: 0 0 8px;">先连发普通通知（max=5），再发高优：高优恒占最新侧，超限时低优先被挤出：</p>
  <oas-space>
    <oas-button onclick="window.__priorityNormalDemo()">连发 4 条普通</oas-button>
    <oas-button type="warning" onclick="window.__priorityHighDemo()">连发 2 条高优</oas-button>
    <oas-button onclick="destroyAllNotification()">清空</oas-button>
  </oas-space>
</DemoBlock>

## 栈治理

<DemoBlock title="栈治理 stackMode（折叠计数 / 层叠悬停）">
  <oas-space>
    <oas-button onclick="window.__stackCollapsibleDemo()">折叠计数模式（+N 展开）</oas-button>
    <oas-button onclick="window.__stackPeekDemo()">层叠悬停模式（hover 展开）</oas-button>
    <oas-button onclick="destroyAllNotification()">清空</oas-button>
  </oas-space>
</DemoBlock>

## loading 与 promise

<DemoBlock title="loading 态与 promise 链">
  <oas-space>
    <oas-button onclick="notification.loading({ title: '正在加载', description: '完成前不可关闭' })">常驻 loading</oas-button>
    <oas-button onclick="window.__promiseDemo(true)">promise 成功</oas-button>
    <oas-button onclick="window.__promiseDemo(false)">promise 失败</oas-button>
  </oas-space>
</DemoBlock>

## 富内容与尺寸

<DemoBlock title="富内容 content 与尺寸 size">
  <oas-space>
    <oas-button onclick="window.__contentDemo('small')">小尺寸 + 代码块</oas-button>
    <oas-button onclick="window.__contentDemo('medium')">默认尺寸 + 代码块</oas-button>
    <oas-button onclick="window.__contentDemo('large')">大尺寸 + 代码块</oas-button>
  </oas-space>
</DemoBlock>

## 清空全部

<DemoBlock title="清空全部">
  <oas-space>
    <oas-button onclick="notification.error({ title: '错误通知', description: '通知一' }); notification.warning({ title: '警告通知', description: '通知二' }); notification.success({ title: '成功通知', description: '通知三' })">连发三条</oas-button>
    <oas-button onclick="destroyAllNotification()">清空全部</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { notification, destroyAllNotification } = await import('@oas-ui/ui')
  window.notification = notification
  window.destroyAllNotification = destroyAllNotification

  // 回调计数反馈
  window.__notifCount = (kind) => {
    const el = document.getElementById(`notif-${kind}-count`)
    if (!el) return
    const m = el.textContent.match(/(\d+)/)
    el.textContent = el.textContent.replace(/\d+/, String((Number(m?.[1] ?? 0)) + 1))
  }
  window.__notifLog = (_kind, handle) => {
    setTimeout(() => handle.close(), 1500)
    return handle
  }

  // key/update：模拟部署进度
  window.__deployDemo = () => {
    notification.update('deploy', { title: '准备发布', description: '打包中…', duration: 0 })
    setTimeout(() => notification.update('deploy', { title: '上传产物', description: '已上传 60%', duration: 0 }), 1200)
    setTimeout(() => notification.update('deploy', { title: '发布完成', type: 'success', description: '新版本已上线', duration: 3000 }), 2600)
  }

  // 进度条颜色：挂到 demo 容器使变量穿透
  window.__progressColorDemo = () => {
    notification.info({
      title: '危险色进度条',
      description: '进度条颜色来自宿主变量穿透',
      duration: 6000,
      showProgress: true,
      container: document.getElementById('notif-color-host'),
    })
  }

  // container 挂载
  window.__containerDemo = () => {
    notification.success({
      title: '挂在指定容器',
      description: 'DOM 归属 notif-mount-host，视觉仍在视口右上角',
      duration: 6000,
      container: document.getElementById('notif-mount-host'),
    })
  }

  // footer 操作区
  window.__footerDemo = () => {
    const detail = document.createElement('oas-button')
    detail.size = 'small'
    detail.textContent = '查看详情'
    detail.addEventListener('click', (e) => {
      e.stopPropagation()
      window.__notifCount('click')
      notification.info({ title: '详情', description: '这里是发布说明正文', duration: 3000 })
    })
    const undo = document.createElement('oas-button')
    undo.size = 'small'
    undo.textContent = '撤销'
    undo.addEventListener('click', (e) => {
      e.stopPropagation()
      notification.success({ title: '已撤销', duration: 2000 })
    })
    notification.warning({
      title: '文件已删除',
      description: '撤销操作将在 12 秒后不可用',
      duration: 12000,
      footer: [detail, undo],
    })
  }

  // priority
  window.__priorityNormalDemo = () => {
    for (let i = 1; i <= 4; i++) {
      notification.info({ title: `普通 ${i}`, description: 'priority: normal', duration: 0, max: 5 })
    }
  }
  window.__priorityHighDemo = () => {
    for (let i = 1; i <= 2; i++) {
      notification.warning({ title: `高优 ${i}`, description: 'priority: high——恒占最新侧', duration: 0, max: 5, priority: 'high' })
    }
  }

  // stack 治理
  window.__stackCollapsibleDemo = () => {
    for (let i = 1; i <= 5; i++) {
      notification.info({ title: `消息 ${i}`, description: '超过阈值折叠为 +N', duration: 0, stackMode: 'collapsible' })
    }
  }
  window.__stackPeekDemo = () => {
    for (let i = 1; i <= 5; i++) {
      notification.info({ title: `层叠 ${i}`, description: 'hover 栈区域展开全部', duration: 0, stackMode: 'peek', position: 'bottom-right' })
    }
  }

  // promise
  window.__promiseDemo = (ok) => {
    notification.promise(
      new Promise((resolve, reject) => setTimeout(() => (ok ? resolve('v3.2.0') : reject(new Error('网络中断'))), 1800)),
      {
        loading: '正在发布新版本…',
        success: (data) => `发布成功：${data}`,
        error: () => '发布失败，请重试',
      },
    )
  }

  // content 富内容 + size
  window.__contentDemo = (size) => {
    const code = document.createElement('pre')
    code.textContent = 'pnpm add @oas-ui/ui'
    code.style.cssText = 'margin:0;padding:8px;border-radius:6px;background:var(--oas-color-bg-hover);font-size:12px;overflow:auto;'
    notification.info({
      title: '安装命令',
      content: code,
      duration: 0,
      size,
      closable: true,
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `closable` | — | `string` | `true` |
| `description` | 描述内容 | `string` | — |
| `duration` | 自动关闭时长（ms），`0` 表示不自动关闭 | `string` | `4500` |
| `pause-on-hover` | — | `string` | `true` |
| `progress-position` | 进度条位置：`bottom`（默认）/ `top` | `string` | `bottom` |
| `scrollable` | 描述内容超长时卡片内滚动，默认开启；传 `false` 关闭 | `string` | `true` |
| `show-progress` | 显示自动关闭倒计时进度条（动画时长与 `duration` 同步） | `boolean` | — |
| `size` | — | — | — |
| `title` | 标题文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `type` | 通知类型：`info`/`success`/`warning`/`error` | `string` | `info` |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-click` | — |
| `oas-close` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `close-icon` | — |
| `content` | — |
| `footer` | — |
| `icon` | — |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

### CSS 变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-notification-progress-color` | 倒计时进度条颜色 | `var(--oas-color-primary)` |
| `--oas-notification-width` | 卡片宽度（size 档位内部引用） | `320px` |

### 方法

| 方法 | 说明 |
| --- | --- |
| `notification.info({ title, description?, content?, duration?, showProgress?, progressPosition?, scrollable?, position?, max?, offset?, container?, priority?, stackMode?, stackThreshold?, key?, onClose?, onClick?, closable?, pauseOnHover?, size?, icon?, closeIcon?, footer? })` | 信息通知，返回 `{ close }` |
| `notification.success(...)` / `notification.warning(...)` / `notification.error(...)` | 成功/警告/错误通知，options 同上 |
| `notification.loading(...)` | loading 态：spinner 图标、不自动关、不可手动关 |
| `notification.promise(p, { loading, success, error })` | promise 链：loading → 成功切 success（4500ms 自动关）/ 失败切 error |
| `notification.update(key, { title?, description?, content?, duration?, type? })` | 更新已存在通知（key 定位）；key 不存在则新建 |
| `notification.destroy(key)` | 关闭指定 key 的通知；不存在静默无操作 |
| `destroyAllNotification()` | 清空全部通知（不触发 onClose） |

- `position` 四角：`top-right`（默认）/ `top-left` / `bottom-right` / `bottom-left`，每角独立栈容器。
- `max` 同栈数量上限（默认 `0` 不限），超限丢最老——优先丢最老的 normal，全 high 才丢最老 high；被挤出同样触发 `onClose`（`source: 'evict'`）。
- `offset` 栈距视口边偏移（默认 `16`），作用于当前 position 方向；`container` 覆盖挂载目标（默认最近 app 宿主或 body）。
- `priority`：`high` 恒占最新侧（后续 normal 插到其前），抢占语义由插入排序 + max 挤出策略共同实现。
- `stackMode` 栈治理：`collapsible`（超过 `stackThreshold` 默认 `3` 折叠旧通知，"+N" 徽章点击展开/收起）/ `peek`（非最新卡收起为边缘条，hover 栈展开）。
- `onClose` 关闭统一触发一次；`onClick` 通知体点击回调；`closable` 默认 `true`；`pauseOnHover` 默认开启（悬停暂停计时与进度条）。
- `title`/`icon`/`closeIcon`/`footer`/`content` 支持 Node 富内容通道；`footer` 也接受 Node 数组。
- 命令式创建的通知挂最近 `oas-app` 宿主（无则 body），`role="region"` + `aria-label`，右上角堆叠。
