# Upload 上传

点击或拖拽选择文件，展示文件列表与上传进度。支持真实上传通道（`action` XHR / `custom-request` 逃生舱）、上传前校验转换、失败重试与取消。

## 基础用法

<DemoBlock title="基础（选择文件）">
  <oas-upload></oas-upload>
</DemoBlock>

## 多选与数量限制

<DemoBlock title="多选 + max">
  <oas-upload multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

`max` 限制最多可选文件数，`accept` 过滤文件类型；超出 `max` 的文件被拒绝并派发 `oas-exceed`。

## 自动上传

<DemoBlock title="自动上传（模拟进度）">
  <oas-upload auto-upload multiple></oas-upload>
</DemoBlock>

`auto-upload` 时添加文件即自动上传；未设置 `action` / `custom-request` 时为**模拟进度**（内置定时器推进，仅作展示兜底，不发起网络请求），进度条复用 `oas-progress`。

## 拖拽上传

<DemoBlock title="拖拽上传">
  <oas-upload id="upload-drag" multiple auto-upload></oas-upload>
</DemoBlock>

将文件直接拖入虚线区域，松开即添加（支持多选）；拖入时区域高亮提示。`disabled` 时拖拽会显示禁止光标且不接收文件。

## 照片墙

`list-type` 控制列表样式：`list`（默认，文本行）、`picture`（列表带小缩略图）、`picture-card`（卡片缩略图墙）。

### picture-card 卡片墙

<DemoBlock title="照片墙（picture-card）">
  <oas-upload id="upload-wall" list-type="picture-card" multiple max="4" auto-upload accept="image/*"></oas-upload>
</DemoBlock>

图片文件显示缩略图（`URL.createObjectURL`），非图片显示文件图标与文件名；点击缩略图打开预览浮层（Esc 或点击遮罩关闭），右上角 × 删除，hover 卡片出现预览/删除操作区。圆形头像卡可用 CSS 变量 `--oas-upload-card-radius: 50%` 达成。

### 删除、预览与超限拦截

<DemoBlock title="照片墙 · 删除/预览/超限">
  <oas-upload id="upload-wall-exceed" list-type="picture-card" multiple max="3" auto-upload accept="image/*"></oas-upload>
</DemoBlock>

选择/拖入第 4 张时被 `max="3"` 拦截，触发 `oas-exceed` 弹出警告；点击缩略图触发 `oas-preview`。

### picture 列表带缩略图

<DemoBlock title="列表带小缩略图（picture）">
  <oas-upload list-type="picture" multiple auto-upload></oas-upload>
</DemoBlock>

`list` / `picture` 模式下点击**文件名**同样打开预览浮层（文件名为可聚焦按钮）。

### 已达上限

<DemoBlock title="已达 max 上限（预置满 3 张）">
  <oas-upload id="upload-full" list-type="picture-card" multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

预置满 `max="3"` 后继续选择会被 `oas-exceed` 拦截。

## 禁用

<DemoBlock title="禁用">
  <oas-upload disabled></oas-upload>
</DemoBlock>

## 真实上传通道（action）

`action` 指定服务端地址后走内置 XHR 通道：`name`（表单文件字段名，默认 `file`）、`data`（附加表单字段 JSON）、`headers`（请求头 JSON）、`method`（默认 `POST`）、`with-credentials` 均透传；进度/成功/失败来自真实 XHR 事件。

<DemoBlock title="action 通道（含失败重试演示）">
  <oas-upload id="upload-action" action="/api/upload" name="file" data='{"biz":"demo"}' method="POST" with-credentials auto-upload multiple></oas-upload>
</DemoBlock>

文档站没有真实上传端点，`/api/upload` 返回 404，正好演示**失败态**：列表行转红色并出现重试按钮（⟳），点击重试重新发起请求；上传中可点 × 取消（派发 `oas-cancel`）。成功时派发 `oas-success`（`detail: { file, response }`，`response` 为解析后的 JSON 或原文），失败派发 `oas-error`（`detail: { file, response, status }`）。

## 自定义请求通道（custom-request）

分片上传、对象存储直传、WebSocket 等非标通道用 `custom-request` 函数 property 接管（组件不管请求策略）：

<DemoBlock title="custom-request 接管请求">
  <oas-upload id="upload-request" auto-upload multiple></oas-upload>
</DemoBlock>

```js
el.customRequest = ({ file, name, action, onProgress, onSuccess, onError }) => {
  // 自行发起请求，回调节奏由宿主控制
  onProgress({ percent: 60 })
  onSuccess({ url: 'https://example.com/f.png' }) // 或 onError({ status: 500 })
  return { abort: () => {/* 取消 */} } // 可选：提供后上传中显示取消按钮
}
```

## 手动上传

不加 `auto-upload` 即手动模式：选完文件后调用 `submit()`（`startUpload()` 的等价别名）统一提交。

<DemoBlock title="手动上传（选完统一提交）">
  <oas-upload id="upload-manual" multiple></oas-upload>
  <oas-button type="primary" size="small" id="upload-manual-btn" style="margin-top: var(--oas-space-2)">开始上传</oas-button>
</DemoBlock>

## 上传前校验与转换（before-upload）

`before-upload` 函数 property：返回 `false` 拒绝文件；返回新 `File` 转换（改名/压缩等 transform 语义）；支持异步 `Promise`。

<DemoBlock title="before-upload 校验与转换">
  <oas-upload id="upload-before" multiple></oas-upload>
</DemoBlock>

## 文件大小限制（max-size）

`max-size` 支持字节数或带单位写法（`512KB` / `2MB` / `1GB`）；超限拒绝并派发 `oas-exceed`（`detail.type === 'size'`，含 `maxSize` 字节数）。

<DemoBlock title="max-size（100KB）">
  <oas-upload id="upload-size" multiple max-size="100KB"></oas-upload>
</DemoBlock>

## 超限替换（replace）

`replace` 开启后数量超限不再拒绝，而是移除最早的文件为新文件腾位（`max=1` / 单选场景即「选新顶旧」，头像等高频场景免「先删再选」）。

<DemoBlock title="replace（max=1，选择新文件自动替换）">
  <oas-upload id="upload-replace" max="1" replace></oas-upload>
</DemoBlock>

## 目录与粘贴上传

`directory` 开启目录上传（input 落 `webkitdirectory`，列表显示相对路径）；`paste` 开启粘贴上传（组件上直接 Ctrl+V 剪贴板文件，截图场景高频，默认关闭）。

<DemoBlock title="目录上传（directory）">
  <oas-upload id="upload-dir" directory multiple></oas-upload>
</DemoBlock>

<DemoBlock title="粘贴上传（paste）">
  <oas-upload id="upload-paste" paste multiple tip="点击选择文件，或聚焦本区域后 Ctrl+V 粘贴截图"></oas-upload>
</DemoBlock>

## 触发器、提示与列表项自定义

- `slot="trigger"`：替换拖拽区内容（点击/拖拽语义保留在拖拽区容器上，内容应自带可聚焦性，如 `oas-button`）
- `tip` 属性或 `template[slot="tip"]`：拖拽区下方次要说明文案（属性优先）
- `template[slot="item"]`：克隆进 `list` / `picture` 每行，`[data-item-name]` / `[data-item-size]` 自动绑定文件名与大小

<DemoBlock title="trigger / tip 插槽">
  <oas-upload id="upload-trigger" multiple tip="支持任意文件，单个不超过 20MB">
    <template slot="trigger">
      <oas-button>选择文件</oas-button>
      <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)">或将文件拖到此处</span>
    </template>
  </oas-upload>
</DemoBlock>

<DemoBlock title="item 插槽（列表行自定义）">
  <oas-upload id="upload-item" multiple>
    <template slot="item">
      <oas-icon name="form" size="16"></oas-icon>
      <b data-item-name></b>
      <span style="font-size: var(--oas-font-size-xs); color: var(--oas-color-text-secondary)" data-item-size></span>
    </template>
  </oas-upload>
</DemoBlock>

## 已上传回显与隐藏列表

- `files` / `defaultFiles` property 接受 `{ name, url, size? }` 型回显记录（状态 done，预览走远程 url），编辑场景的初值语义
- `show-file-list="false"` 隐藏内置列表，只留触发区（宿主自绘预览的前提）

<DemoBlock title="已上传回显（defaultFiles）">
  <oas-upload id="upload-echo" list-type="picture" multiple></oas-upload>
</DemoBlock>

<DemoBlock title="头像上传（show-file-list=false + trigger 自绘 + before-upload 校验）">
  <oas-upload id="upload-avatar" accept="image/*" replace show-file-list="false" list-type="picture-card">
    <template slot="trigger">
      <img id="upload-avatar-img" alt="头像预览" style="width: 104px; height: 104px; object-fit: cover; border-radius: var(--oas-upload-card-radius, var(--oas-radius-md)); display: none" />
      <oas-icon name="user" size="28"></oas-icon>
      <span style="font-size: var(--oas-font-size-xs)">点击或拖拽上传头像</span>
    </template>
  </oas-upload>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-upload id="upload-event" multiple></oas-upload>
  <span id="upload-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

监听 `oas-change` / `oas-remove` / `oas-upload`：

- `oas-upload`：进度，`detail: { file, percent, status }`（`status`: pending/uploading/done/error）
- `oas-success` / `oas-error`：上传成功/失败（真实通道），`detail: { file, response, status? }`
- `oas-retry` / `oas-cancel`：重试发起 / 上传取消，`detail: { file }`
- `oas-exceed`：超限拒绝，`detail: { files, max, total }`（数量）或 `{ files, type: 'size', maxSize, total }`（大小）
- `oas-remove`：移除文件，`detail: { file, index, replaced? }`（`replaced: true` 表示被 `replace` 语义替换）

方法：`submit()`（手动上传）、`startUpload()`（等价）、`abort(file?)`（取消单个/全部进行中的上传）。

## 第三方组合场景

以下场景不进组件 API，经既有通道组合达成：

```js
// 大文件分片 / 对象存储直传：custom-request 接管（分片策略是业务决策）
el.customRequest = async ({ file, onProgress, onSuccess, onError }) => {
  const chunks = sliceFile(file, 5 * 1024 * 1024) // 自行分片
  for (let i = 0; i < chunks.length; i++) {
    await uploadChunk(chunks[i], i)
    onProgress({ percent: ((i + 1) / chunks.length) * 100 })
  }
  onSuccess(await assembleChunks(file))
}
```

- **头像裁剪**：`before-upload` 返回裁剪后的新 `File`（接第三方裁剪库）
- **上传列表拖拽排序**：`item` 插槽自定义行 + 宿主接第三方 dnd 库重排 `files`
- **圆形头像卡**：CSS 变量 `--oas-upload-card-radius: 50%`（不占独立枚举）

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message

  const el = document.getElementById('upload-event')
  const out = document.getElementById('upload-output')
  el?.addEventListener('oas-change', (e) => {
    out.textContent = `oas-change: ${e.detail.files.length} 个文件`
  })
  el?.addEventListener('oas-remove', () => {
    out.textContent = `oas-remove`
  })
  el?.addEventListener('oas-upload', (e) => {
    out.textContent = `oas-upload: ${e.detail.file.name} ${e.detail.percent}%`
  })

  // 照片墙：超限拦截 + 预览反馈
  const wall = document.getElementById('upload-wall-exceed')
  wall?.addEventListener('oas-exceed', (e) => {
    message.warning(`最多上传 ${e.detail.max} 个文件`)
  })
  wall?.addEventListener('oas-preview', (e) => {
    message.info(`预览：${e.detail.file.name}`)
  })

  // 已达上限演示：预置 3 张 SVG 图片（占满 max="3"）
  const full = document.getElementById('upload-full')
  if (full) {
    const photo = (i) =>
      new File(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b6cff"/><stop offset="1" stop-color="#4d9fff"/></linearGradient></defs><rect width="200" height="200" rx="12" fill="url(#g)" opacity="0.92"/><text x="100" y="122" font-size="76" font-family="sans-serif" fill="#ffffff" text-anchor="middle">${i}</text></svg>`,
        ],
        `photo-${i}.svg`,
        { type: 'image/svg+xml' },
      )
    full.files = [photo(1), photo(2), photo(3)]
  }

  // 真实通道（action）：文档站无端点，404 → 失败态 + 重试演示
  const action = document.getElementById('upload-action')
  action?.addEventListener('oas-success', (e) => {
    message.success(`${e.detail.file.name} 上传成功`)
  })
  action?.addEventListener('oas-error', (e) => {
    message.error(`${e.detail.file.name} 上传失败（HTTP ${e.detail.status ?? '?'}），可点击重试`)
  })

  // custom-request：宿主接管请求（无网络依赖的演示通道）
  const req = document.getElementById('upload-request')
  if (req) {
    req.customRequest = ({ file, onProgress, onSuccess }) => {
      let percent = 0
      const timer = setInterval(() => {
        percent = Math.min(100, percent + 20)
        onProgress({ percent })
        if (percent >= 100) {
          clearInterval(timer)
          onSuccess({ url: `https://example.com/files/${encodeURIComponent(file.name)}` })
        }
      }, 150)
      return { abort: () => clearInterval(timer) }
    }
    req.addEventListener('oas-success', (e) => {
      message.success(`${e.detail.file.name} 已上传：${e.detail.response.url}`)
    })
  }

  // 手动上传
  const manualBtn = document.getElementById('upload-manual-btn')
  const manual = document.getElementById('upload-manual')
  manualBtn?.addEventListener('click', () => manual?.submit())

  // before-upload：校验（大小）+ 转换（改名）
  const before = document.getElementById('upload-before')
  if (before) {
    before.beforeUpload = (file) => {
      if (file.size > 100 * 1024) {
        message.warning(`${file.name} 超过 100KB，已拒绝`)
        return false
      }
      const renamed = new File([file], `demo-${Date.now()}-${file.name}`, { type: file.type })
      message.info(`已转换文件名：${renamed.name}`)
      return renamed
    }
  }

  // max-size 超限反馈
  const size = document.getElementById('upload-size')
  size?.addEventListener('oas-exceed', (e) => {
    if (e.detail.type === 'size') {
      message.warning(`${e.detail.files[0].name} 超过 ${Math.round(e.detail.maxSize / 1024)}KB，已拒绝`)
    } else {
      message.warning('超出数量限制')
    }
  })

  // replace 替换反馈
  const rep = document.getElementById('upload-replace')
  rep?.addEventListener('oas-remove', (e) => {
    if (e.detail.replaced) message.info(`旧文件「${e.detail.file.name}」已被替换`)
  })

  // 已上传回显（defaultFiles：{name, url} 型初值，状态 done）
  const echo = document.getElementById('upload-echo')
  if (echo) {
    const svg = (color, text) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="12" fill="${color}"/><text x="60" y="74" font-size="44" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${text}</text></svg>`,
      )}`
    echo.defaultFiles = [
      { name: '品牌标识.svg', url: svg('#0b6cff', 'A'), size: 2048 },
      { name: '宣传海报.svg', url: svg('#18a058', 'B'), size: 4096 },
    ]
    echo.addEventListener('oas-preview', (e) => {
      message.info(`预览：${e.detail.file.name}`)
    })
  }

  // 头像：before-upload 校验 + 自绘预览
  const avatar = document.getElementById('upload-avatar')
  if (avatar) {
    const img = document.getElementById('upload-avatar-img')
    avatar.beforeUpload = (file) => {
      if (!file.type.startsWith('image/')) {
        message.warning('头像只能是图片格式')
        return false
      }
      if (file.size > 2 * 1024 * 1024) {
        message.warning('头像不能超过 2MB')
        return false
      }
      return true
    }
    avatar.addEventListener('oas-change', (e) => {
      const f = e.detail.files[e.detail.files.length - 1]
      if (f && img) {
        img.src = URL.createObjectURL(f)
        img.style.display = 'block'
      }
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accept` | 接受的文件类型 | `string` | — |
| `action` | 上传接口 URL（真实 XHR 通道；不配且无 customRequest 时为模拟进度） | `string` | — |
| `auto-upload` | 添加后自动模拟上传 | `boolean` | — |
| `data` | 附加表单字段（JSON 字符串，随文件一起提交） | — | — |
| `directory` | 目录上传（整目录递归入列） | `boolean` | — |
| `disabled` | 禁用 | `boolean` | — |
| `files` | 文件列表（property，`File[]`） | `Array<File \| UploadEchoFile>` | `[]` |
| `headers` | 附加请求头（JSON 字符串） | — | — |
| `list-type` | 列表样式：`list`（默认）/ `picture`（列表带小缩略图）/ `picture-card`（卡片缩略图墙） | `string` | `list` |
| `max` | 最大文件数 | `string` | `0` |
| `max-size` | 单文件大小上限（字节或 `2KB`/`1MB`/`1GB`；超限派 oas-exceed size 形态） | `string` | — |
| `method` | HTTP 方法（默认 POST） | `string` | `POST` |
| `multiple` | 多选 | `boolean` | — |
| `name` | 上传文件的表单字段名（默认 `file`） | `string` | `file` |
| `paste` | 粘贴上传（默认关；开启后粘贴剪贴板文件入列） | `boolean` | — |
| `replace` | max-count=1 时替换语义（新文件替换旧文件而非拒绝） | `boolean` | — |
| `show-file-list` | 文件列表显隐（`"false"` 隐藏，仅保留拖拽区） | `string` | `true` |
| `tip` | 拖拽区提示文案（同 `template[slot="tip"]` 富内容） | `string` | — |
| `with-credentials` | 跨域携带凭证 | `boolean` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 取消上传，`detail: { file }`（行/卡片 cancel 按钮） |
| `oas-change` | 文件列表变化，`detail: { files }` |
| `oas-error` | 上传失败，`detail: { file, response?, status? }`（行/卡片出重试按钮） |
| `oas-exceed` | 添加文件超限被拒绝，`detail: { files, max, total }` |
| `oas-preview` | 打开预览浮层，`detail: { file, url }` |
| `oas-remove` | 移除文件，`detail: { file, index }` |
| `oas-retry` | 点击重试，`detail: { file }`（失败后重发） |
| `oas-success` | 上传成功，`detail: { file, response }` |
| `oas-upload` | 上传进度，`detail: { file, percent, status }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="item"]` | 自定义文件行/卡片（`[data-item-name]`/`[data-item-size]` 绑定） |
| `template[slot="tip"]` | 拖拽区提示富内容（tip 属性优先） |
| `trigger` | 替换拖拽区内容（zone 语义保留） |

键盘：拖拽区 `Enter` / `空格` 打开文件选择；删除按钮可聚焦；预览浮层 Esc 关闭。
