# Upload 上传

点击或拖拽选择文件，展示文件列表与上传进度。

## 基础用法

<DemoBlock title="基础（选择文件）">
  <oas-upload></oas-upload>
</DemoBlock>

## 多选与数量限制

<DemoBlock title="多选 + max">
  <oas-upload multiple max="3" accept="image/*"></oas-upload>
</DemoBlock>

`max` 限制最多可选文件数，`accept` 过滤文件类型。

## 自动上传

<DemoBlock title="自动上传（模拟进度）">
  <oas-upload auto-upload multiple></oas-upload>
</DemoBlock>

`auto-upload` 时添加文件即自动模拟上传进度，进度条复用 `oas-progress`。

## 禁用

<DemoBlock title="禁用">
  <oas-upload disabled></oas-upload>
</DemoBlock>

## 事件

<DemoBlock title="变化事件">
  <oas-upload id="upload-event" multiple></oas-upload>
  <span id="upload-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); min-width: 200px"></span>
</DemoBlock>

监听 `oas-change` / `oas-remove` / `oas-upload`：

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
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
})
</script>

## API

| 属性          | 说明                                | 默认值    |
| ------------- | ----------------------------------- | --------- |
| `files`       | 文件列表（property，`File[]`）      | `[]`      |
| `accept`      | 接受的文件类型                      | 无        |
| `multiple`    | 多选                                | `false`   |
| `max`         | 最大文件数                          | 无限制    |
| `disabled`    | 禁用                                | `false`   |
| `auto-upload` | 添加后自动模拟上传                  | `false`   |

键盘：拖拽区 `Enter` / `空格` 打开文件选择；删除按钮可聚焦。

| 事件         | 说明                                             |
| ------------ | ------------------------------------------------ |
| `oas-change` | 文件列表变化，`detail: { files }`                |
| `oas-remove` | 移除文件，`detail: { file, index }`              |
| `oas-upload` | 上传进度，`detail: { file, percent, status }`    |
