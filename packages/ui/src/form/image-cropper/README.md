# oas-image-cropper 组件说明

图片裁剪（form 族）。设计前必答清单：

1. **取消路径**：无浮层、无全局监听；`ResizeObserver` 经 `onCleanup` 断开；拖拽状态在 `pointerup` / `pointercancel` 落定，断开连接时清空。`reset()` 恢复初始缩放/旋转/裁剪框。
2. **属性默认值 / 空态**：`src` 缺省显示空态文案；`aspect-ratio` 缺省自由比例；`max-zoom` 缺省 3；`max-output-size` 缺省 1024；`output-type` 缺省 `image/png`；非法值逐项回落并单次告警。
3. **多步交互**：载入（`oas-load` / `oas-error`）→ 缩放/旋转/拖动裁剪框（`oas-change`）→ 确认裁剪（`oas-crop`，canvas 不可用时 `blob: null` 并如实返回）。失败点：图片加载失败只派发 `oas-error`，不进入可裁剪态。
4. **破坏性选项**：无破坏性选项；`reset()` 只复位视图不删除数据；确认裁剪不改内部状态，结果交宿主。
5. **键盘可达 / ARIA**：裁剪框 `tabindex="0"` + 方向键移动（Shift 10px）；工具栏与缩放滑块为原生控件并带可读名称；`disabled` 同步全部 `disabled` 与 `tabindex=-1`。
6. **受控 / 非受控与宿主桥接**：`src` 为受控属性；`zoom` / `rotation` 为 JS property（`zoom` 可写，写入即生效）；输出走 `toBlob()` / `toDataURL()` 与 `oas-crop`，宿主可直接接上传链路（裁剪产物 → `File` → 上传）。
