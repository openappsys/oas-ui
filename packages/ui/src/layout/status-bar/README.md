# StatusBar 设计前必答

1. **取消路径**：纯展示件，无操作可取消；无监听器/浮层，无孤儿产物。
2. **属性默认值**：`height` 缺省读取 `env(safe-area-inset-top)`；`color` 缺省继承 `--oas-color-text-primary`；背景默认透明。
3. **多步交互**：无。无失败点、无加载/禁用态。
4. **破坏性选项**：无。`color` 注入不自动改写，任意 CSS 值的对比度由宿主负责（文档已说明）。
5. **键盘 / ARIA**：无焦点、无交互语义；插槽内容由宿主提供可读名称。
6. **受控 / 宿主桥接**：标准 attribute；`height` / `color` 在 Vue / React 下直接生效。
