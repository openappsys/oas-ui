# Toast 轻提示

命令式全局轻提示，支持成功/错误/警告/信息/加载态、操作按钮、promise 链、队列治理与键盘/读屏无障碍，默认 3 秒自动关闭。

## 基础用法

<DemoBlock title="五种类型">
  <oas-space>
    <oas-button type="success" onclick="toast.success({ title: '保存成功' })">成功</oas-button>
    <oas-button type="danger" onclick="toast.error({ title: '网络错误' })">错误</oas-button>
    <oas-button type="warning" onclick="toast.warning({ title: '请注意' })">警告</oas-button>
    <oas-button onclick="toast.info({ title: '这是一条提示' })">信息</oas-button>
    <oas-button onclick="toast.loading({ title: '正在处理…' })">加载</oas-button>
  </oas-space>
</DemoBlock>

## 自定义时长

<DemoBlock title="自定义时长">
  <oas-space>
    <oas-button onclick="toast.info({ title: '2 秒后自动关闭', duration: 2000 })">2 秒</oas-button>
    <oas-button onclick="toast.success({ title: '5 秒后自动关闭', duration: 5000 })">5 秒</oas-button>
    <oas-button onclick="window.toastHandle = toast.warning({ title: '持续显示，需手动关闭', duration: 0 })">不自动关闭（0）</oas-button>
    <oas-button onclick="window.toastHandle && window.toastHandle.close()">手动关闭</oas-button>
  </oas-space>
</DemoBlock>

## 操作按钮

<DemoBlock title="操作按钮（多按钮 + noDismiss + 变体）">
  <oas-space>
    <oas-button onclick="toast.info({ title: '已撤销删除', action: { label: '重做', onClick: () => toast.success({ title: '已重做' }) } })">单操作按钮</oas-button>
    <oas-button onclick="toast.warning({ title: '检测到异常', actions: [ { label: '查看详情', variant: 'danger', onClick: () => toast.info({ title: '打开详情页' }) }, { label: '忽略', noDismiss: true, onClick: () => toast.info({ title: '已忽略，本条保留' }) } ] })">多按钮 + noDismiss</oas-button>
    <oas-button onclick="toast.info({ title: '不可关闭', closable: false, duration: 0 })">不可关闭</oas-button>
  </oas-space>
</DemoBlock>

## 位置

<DemoBlock title="位置（9 方向）">
  <oas-space>
    <oas-button onclick="toast.info({ title: '右上角（默认）' })">top-right</oas-button>
    <oas-button onclick="toast.info({ title: '左上角', position: 'top-left' })">top-left</oas-button>
    <oas-button onclick="toast.info({ title: '顶部居中', position: 'top-center' })">top-center</oas-button>
    <oas-button onclick="toast.info({ title: '左侧居中', position: 'left' })">left</oas-button>
    <oas-button onclick="toast.info({ title: '正中央', position: 'center' })">center</oas-button>
    <oas-button onclick="toast.info({ title: '右侧居中', position: 'right' })">right</oas-button>
    <oas-button onclick="toast.info({ title: '底部居中', position: 'bottom-center' })">bottom-center</oas-button>
    <oas-button onclick="toast.info({ title: '左下角', position: 'bottom-left' })">bottom-left</oas-button>
    <oas-button onclick="toast.info({ title: '右下角', position: 'bottom-right' })">bottom-right</oas-button>
  </oas-space>
</DemoBlock>

## Promise 链

<DemoBlock title="Promise 链">
  <oas-space>
    <oas-button onclick="runPromise(true)">模拟成功</oas-button>
    <oas-button onclick="runPromise(false)">模拟失败</oas-button>
  </oas-space>
</DemoBlock>

## 生命周期与 onClose

<DemoBlock title="生命周期与 onClose 回调">
  <oas-space>
    <oas-button onclick="toast.info({ title: '自动关闭的 toast', duration: 2000, onClose: () => flash('onClose 触发：toast 已自动关闭') })">onClose（自动关闭）</oas-button>
    <oas-button onclick="window.lifecycleHandle = toast.info({ title: '手动关闭的 toast', duration: 0, onClose: () => flash('onClose 触发：toast 已手动关闭') })">onClose（手动关闭）</oas-button>
    <oas-button onclick="window.lifecycleHandle && window.lifecycleHandle.close()">触发关闭</oas-button>
  </oas-space>
  <p class="toast-demo-feedback" id="lifecycle-feedback"></p>
</DemoBlock>

## 按 id 更新与关闭

<DemoBlock title="按 id 更新与关闭">
  <oas-space>
    <oas-button onclick="toast.info({ title: '开始上传…', id: 'upload', duration: 0 })">开始上传</oas-button>
    <oas-button onclick="toast.update('upload', { title: '上传中 50%' })">更新进度</oas-button>
    <oas-button onclick="toast.update('upload', { title: '上传成功', type: 'success', duration: 2000 })">完成</oas-button>
    <oas-button onclick="toast.dismiss('upload')">关闭</oas-button>
  </oas-space>
</DemoBlock>

## 通知风暴治理

<DemoBlock title="max 队列与同内容去重">
  <oas-space>
    <oas-button onclick="window.storm = (window.storm || 0) + 1; toast.info({ title: '通知 ' + window.storm, id: 'storm-' + window.storm, duration: 0, max: 3 })">连点触发（max=3 排队）</oas-button>
    <oas-button onclick="window.stormClose = (window.stormClose || 0) + 1; toast.dismiss('storm-' + window.stormClose)">关闭第 N 条（补位）</oas-button>
    <oas-button onclick="toast.info({ title: '保存成功', grouping: true, duration: 0 })">同内容连点（去重计数）</oas-button>
    <oas-button onclick="destroyAllToast()">清空全部</oas-button>
  </oas-space>
  <p class="toast-demo-tip">「连点触发」超出 3 条排队，关闭后自动补位；优先级 priority 可让高优先级抢占可见位。</p>
</DemoBlock>

## 阅读宽限

<DemoBlock title="hover/聚焦暂停计时 + 剩余时间进度条">
  <oas-space>
    <oas-button onclick="toast.info({ title: '悬停/聚焦暂停倒计时', description: '鼠标悬停或键盘聚焦会暂停计时，进度条同步定格', duration: 5000, showProgress: true })">暂停计时 + 进度条</oas-button>
    <oas-button onclick="toast.info({ title: '进度环关闭按钮', duration: 5000, progressRing: true })">进度环关闭按钮</oas-button>
    <oas-button onclick="toast.info({ title: '顶部进度条', duration: 4000, showProgress: true, progressPosition: 'top' })">顶部进度条</oas-button>
  </oas-space>
  <p class="toast-demo-tip">窗口失焦（切走标签页/窗口）同样暂停；`pauseOnHover`/`pauseOnFocus`/`pauseOnWindowBlur` 可单独关闭。</p>
</DemoBlock>

## 键盘与读屏

<DemoBlock title="Esc 关闭与屏幕阅读器敏感度">
  <oas-space>
    <oas-button onclick="toast.info({ title: '按 Esc 关闭', description: '点击后 Tab 聚焦到关闭按钮，再按 Esc 关闭本条', duration: 0 })">Esc 关闭</oas-button>
    <oas-button onclick="toast.info({ title: '后台任务完成（polite）', politeness: 'polite', duration: 3000 })">polite 读屏</oas-button>
    <oas-button onclick="toast.error({ title: '操作失败（assertive）', politeness: 'assertive', duration: 3000 })">assertive 读屏</oas-button>
  </oas-space>
</DemoBlock>

## 滑动关闭

<DemoBlock title="滑动关闭（swipe）">
  <oas-space>
    <oas-button onclick="toast.info({ title: '按住拖拽关闭', description: '在 toast 上按住并向左/右拖动超过阈值即可关闭', duration: 0, swipeDirection: 'both' })">双向滑动</oas-button>
    <oas-button onclick="toast.info({ title: '只认左滑', duration: 0, swipeDirection: 'left' })">仅左滑</oas-button>
  </oas-space>
</DemoBlock>

## 折叠堆叠

<DemoBlock title="折叠堆叠（+N 收纳 / hover 展开）">
  <oas-space>
    <oas-button onclick="window.stackN = (window.stackN || 0) + 1; toast.info({ title: '堆叠通知 ' + window.stackN, duration: 4000, stacked: true })">连续触发（折叠）</oas-button>
  </oas-space>
  <p class="toast-demo-tip">折叠后最新一条全显，其余 peek 层叠并出现 +N 徽标；悬停/聚焦展开，点击 +N 持久展开。</p>
</DemoBlock>

## 变体与动画

<DemoBlock title="变体（plain/translucent）与动画配置">
  <oas-space>
    <oas-button onclick="toast.info({ title: '默认实底' })">solid</oas-button>
    <oas-button onclick="toast.info({ title: 'Plain 无底纹', variant: 'plain' })">plain</oas-button>
    <oas-button onclick="toast.info({ title: 'Translucent 毛玻璃', variant: 'translucent' })">translucent</oas-button>
    <oas-button onclick="setAnim('0.6s', 'cubic-bezier(0.34, 1.56, 0.64, 1)')">弹性慢速动画</oas-button>
    <oas-button onclick="setAnim('0.2s', 'ease')">恢复默认动画</oas-button>
  </oas-space>
  <p class="toast-demo-tip">动画时长/曲线走 CSS 变量 `--oas-toast-enter-duration` / `--oas-toast-leave-duration` / `--oas-toast-ease`，无需 JS 配置。</p>
</DemoBlock>

## 全局默认配置

<DemoBlock title="全局默认配置（toast.config）">
  <oas-space>
    <oas-button onclick="toast.config({ duration: 6000, position: 'bottom-center' }); toast.info({ title: '默认 6 秒 + 底部居中' })">应用全局默认</oas-button>
    <oas-button onclick="toast.config({ duration: 3000, position: 'top-right' }); toast.info({ title: '已恢复默认' })">恢复默认</oas-button>
  </oas-space>
</DemoBlock>

## 挂载点与命名实例

<DemoBlock title="挂载点控制与命名实例">
  <oas-space>
    <oas-button onclick="toast.info({ title: '挂载到指定容器', description: 'DOM 挂载到下方容器内', container: document.querySelector('.toast-host-box') })">指定容器</oas-button>
    <oas-button onclick="toast.toaster('console').info({ title: 'console 命名实例', position: 'bottom-center' })">console 实例</oas-button>
    <oas-button onclick="toast.toaster('console').destroyAll()">清空 console 实例</oas-button>
  </oas-space>
  <div class="toast-host-box"></div>
</DemoBlock>

## 声明式用法

<DemoBlock title="声明式用法（受控 open）">
  <oas-space direction="vertical">
    <oas-toast class="declarative-toast" open type="info" title="声明式 Toast" description="在模板中直接使用 oas-toast 元素，open 属性控制显隐，duration=0 不自动关闭" duration="0" closable></oas-toast>
    <oas-button onclick="toggleDeclarative()">切换显隐（open）</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { toast, destroyAllToast } = await import('@oas-ui/ui')
  window.toast = toast
  window.destroyAllToast = destroyAllToast
  window.flash = (msg) => {
    const el = document.getElementById('lifecycle-feedback')
    if (el) el.textContent = msg
  }
  window.setAnim = (duration, ease) => {
    document.documentElement.style.setProperty('--oas-toast-enter-duration', duration)
    document.documentElement.style.setProperty('--oas-toast-leave-duration', duration)
    document.documentElement.style.setProperty('--oas-toast-ease', ease)
    toast.info({ title: `动画时长 ${duration}` })
  }
  window.toggleDeclarative = () => {
    const t = document.querySelector('.declarative-toast')
    if (t) t.setAttribute('open', t.getAttribute('open') === 'false' ? 'true' : 'false')
  }
  window.runPromise = (ok) => {
    toast.promise(
      new Promise((resolve, reject) => setTimeout(() => (ok ? resolve('数据') : reject(new Error('请求失败'))), 1500)),
      {
        loading: '请求中…',
        success: (data) => `成功：${data}`,
        error: (err) => err.message,
      },
    )
  }
})
</script>

<style scoped>
.toast-demo-feedback {
  margin-top: var(--oas-space-3);
  padding: var(--oas-space-2) var(--oas-space-3);
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-sm);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
  min-height: 24px;
}
.toast-demo-tip {
  margin-top: var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.toast-host-box {
  margin-top: var(--oas-space-3);
  min-height: 48px;
  border: 1px dashed var(--oas-color-border-strong);
  border-radius: var(--oas-radius-md);
}
</style>

## API

### 方法

| 方法 | 说明 |
| --- | --- |
| `toast.info(options)` | 信息提示，返回 `{ close, update }` |
| `toast.success(options)` | 成功提示，返回 `{ close, update }` |
| `toast.warning(options)` | 警告提示，返回 `{ close, update }` |
| `toast.error(options)` | 错误提示，返回 `{ close, update }` |
| `toast.loading(options)` | 加载提示（不可关），返回 `{ close, update }` |
| `toast.promise(promise, opts)` | promise 链：loading → success/error |
| `toast.update(id, options)` | 按 id 原位更新；id 不存在则新建 |
| `toast.dismiss(id)` | 按 id 关闭（可见或排队中） |
| `toast.config(options)` | 全局默认配置（调用参数优先） |
| `toast.toaster(name)` | 命名实例：独立栈/队列/配置 |
| `destroyAllToast()` | 清空全部实例 |

### options

| 字段 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `title` | 标题（string 或 Node） | `string \| Node` | — |
| `description` | 描述 | `string` | — |
| `action` / `actions` | 操作按钮（多按钮 + noDismiss + variant） | `ToastAction \| ToastAction[]` | — |
| `duration` | 自动关闭时长（ms），0 不关闭 | `number` | `3000` |
| `closable` | 是否可手动关闭（loading 恒关） | `boolean` | `true` |
| `position` | 位置（9 方向） | `ToastPosition` | `top-right` |
| `id` | 唯一标识：供 `update` / `dismiss` 定位 | `string` | — |
| `onClose` | 关闭回调（自动/手动/按钮/dismiss/destroyAll 均触发一次） | `() => void` | — |
| `priority` | 优先级：与 max 队列配合，高优先级抢占可见位 | `number` | `0` |
| `max` | 该位置栈最大可见数，超限排队 | `number` | `Infinity` |
| `politeness` | 读屏敏感度：`assertive` / `polite` | `string` | 按类型 |
| `showProgress` | 剩余时间进度条（duration>0 时显示） | `boolean` | `false` |
| `progressRing` | 进度环式关闭按钮（duration>0 时显示） | `boolean` | `false` |
| `grouping` | 同内容去重：同栈同内容合并并递增计数徽标 | `boolean` | `false` |
| `swipeDirection` | 滑动关闭方向：`both`/`right`/`left`/`up`/`down` | `string` | `both` |
| `stacked` | 折叠堆叠模式（+N 收纳 / peek 层叠） | `boolean` | `false` |
| `variant` | 变体：`solid`/`plain`/`translucent` | `string` | `solid` |
| `container` | 挂载点（元素或函数），覆盖默认宿主 | `HTMLElement \| () => HTMLElement` | — |
| `pauseOnHover` / `pauseOnFocus` / `pauseOnWindowBlur` | 暂停计时开关（默认全开） | `boolean` | `true` |

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `closable` | 是否显示关闭按钮（loading 态强制不可关） | `boolean` | — |
| `count` | — | `string` | `0` |
| `description` | 描述文案 | `string` | — |
| `duration` | 自动关闭时长（ms），`0` 表示不自动关闭 | `string` | `3000` |
| `id` | — | — | — |
| `open` | — | `string` | `true` |
| `pause-on-focus` | — | — | — |
| `pause-on-hover` | — | — | — |
| `pause-on-window-blur` | — | — | — |
| `politeness` | — | `string` | — |
| `progress-position` | — | `string` | `bottom` |
| `progress-ring` | — | `boolean` | — |
| `show-progress` | — | `boolean` | — |
| `swipe-direction` | — | `string` | `both` |
| `title` | 标题文案（渲染进可见标题区；读取后即从宿主移除，不残留原生悬浮提示；清空传空串）；富内容用 slot="title" | `string` | — |
| `type` | 提示类型：`info`/`success`/`warning`/`error`/`loading` | `string` | `info` |
| `variant` | — | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | — |
| `oas-destroy` | — |
| `oas-open` | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `title` | 标题富内容插槽，有内容时覆盖 title 属性文案 |

- `error` 类型默认 `role="alert"` + `aria-live="assertive"`，其余 `role="status"` + `aria-live="polite"`；`politeness` 可覆盖。
- 多个 toast 共用一个栈容器，同一方向按位置堆叠；`duration` 计时器在关闭/卸载时清理，无泄漏。
- 动画时长/曲线经 CSS 变量 `--oas-toast-enter-duration` / `--oas-toast-leave-duration` / `--oas-toast-ease` 配置。
