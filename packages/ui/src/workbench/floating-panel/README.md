# oas-floating-panel（工作台悬浮面板）

非模态工具窗：可拖动、可缩放、可置前的悬浮面板。定位在「工作台里的一块临时工具面」，不承担
页面级弹层职责（无遮罩、无焦点陷阱、不 portal）。

## 1. 几何模型

- **坐标空间**：`rect` 是**相对宿主锚点**的像素坐标（`x,y,width,height`，逗号或空格分隔）。
  宿主 `position: relative; display: block; width: 0; height: 0`——零尺寸锚点，不占布局、不推移兄弟节点；
  面板框体 `position: absolute` 相对该锚点定位。因此面板随容器滚动、不依赖 `position: fixed` 的
  包含块陷阱，也不改动宿主 DOM 层级（无 portal）。
- **缺省值**：`DEFAULT_RECT = { 48, 48, 420, 300 }`；`min` 缺省 `160,96`；`max` 缺省不限制。
- **纯函数**（`geometry.ts`，零 DOM）：解析/格式化、min/max 夹取、边界夹取、移动、八向缩放、
  键盘移动/缩放、相等判定。所有输出 `Math.round` 到整数像素，保证同一输入在 SSR/客户端/测试一致。
- **退化规则**：
  - `min > max` → 以 `min` 为准（`resolveLimits` 把 `max` 抬到 `min`），不产生负尺寸；
  - 面板比边界大 → 贴起始边（`x = boundary.x + padding`），**边界不压缩尺寸**（尺寸只受 min/max 约束）；
  - 边界元素零尺寸/缺失 → 不夹取（dev 告警一次，语义为「边界尚未可测」）。
- **边界只约束交互**：外部写 `rect` 原样归一化后立即生效（宿主显式坐标优先）；拖动/缩放/键盘
  才按 `boundary` + `boundary-padding` 夹取。好处是 SSR 与客户端首帧一致（服务端不测量、不改写宿主坐标）。
- **RTL**：`rect` 始终是物理坐标（拖拽是物理行为）。RTL 只镜像**键盘水平语义**：
  `ArrowRight` 朝书写前进方向（RTL 下 `x` 减小）；`Shift+ArrowRight` 在该侧扩展宽度。
- **键盘缩放映射（固定为「方向键移动被拖动的边」）**：`Shift+→` / `Shift+↓` 放大
  （LTR 推东缘、RTL 推西缘；南缘下移），`Shift+←` / `Shift+↑` 缩小（LTR 西缘右移、
  RTL 东缘左移；北缘下移）。垂直方向不随 RTL 镜像。
- **边界取整**：真实 `getBoundingClientRect()` 带亚像素，边界先 `ceil`/`floor` 再夹取，
  避免最终 `round` 越过边界 <1px；`boundary` 选择器在自身 `getRootNode()` 内解析
  （面板嵌在 shadow DOM 时也能找到同树边界）；`viewport` 用 `documentElement.clientWidth/Height`
  （排除滚动条）。

## 2. 叠放协议

- 族内基准档 = `calc(var(--oas-z-index-base, 0) + var(--oas-z-overlay, 1040))`；仅「最前」面板 +1。
  因此族内只有两个 z 值，**不随 open 次数增长**，也不与 modal（1050+）/tooltip（1080）抢档。
- `panel-stack.ts` 维护族内最近使用顺序：`register` → `activate`（移到队尾）→ `unregister`。
  「最前」= 队尾中第一个仍打开的面板。
- 打开即置前（不派发 `activate`，属状态边沿）；面板内 pointerdown 或 `bringToFront()` 置前并派发
  `oas-activate`（`source` = `pointer` / `api`）。
- **Esc 顺序跟随视觉最前**：每块面板的 Esc 层在置前时 `promote` 到栈顶，一次 Esc 关的是刚置前的
  那块，而不是「最后打开」的那块；同层不重复压栈（反复激活不会叠加层）。
- **首帧层级**：登记发生在 render 之前，`applyFront(true)` 当时无 frame 可写；`update()` 末尾按
  叠放态补写一次，因此单面板首帧即打开也落在最前档（+1）。
- 最前面板关闭或被断开摘除时，由下一个仍打开的面板接任最前；无候选时族内无最前（全部回基准档）。

## 3. 交互与取消路径

| 路径 | 结果 |
| --- | --- |
| 拖动标题栏 / 八向手柄（主指针） | 逐帧更新视觉矩形；`pointerup` 提交属性 + 单次 `oas-move` / `oas-resize` |
| 第二指针 / 非主指针 | 忽略（不启动、不覆盖进行中手势） |
| `setPointerCapture` 抛错 | 回退 document 级 `pointermove` / `pointerup` 监听（同一提交语义） |
| `pointercancel` / `window blur` / 交互中 Esc | 取消手势：回到起始 rect、零事件；交互中 Esc **不关闭**面板 |
| `lostpointercapture` | 视为结束并提交（`pointerup` 已提交则忽略后续 lost capture） |
| 零位移 | 不写属性、不派发事件 |
| 关闭钮 / Esc / `close()` | 先派发可取消 `oas-before-close`；`preventDefault()` → 不关闭、不写属性、不发 `open-change` |
| 外部写 `open` / `rect` | 静默吸收（不派发 `open-change` / `move` / `resize`） |
| 触屏（`pointer: coarse`） | 手柄/关闭钮 44px；标题栏（含关闭钮）层级高于手柄，上侧/上角手柄从标题栏下沿起算 |
| 断开期间改 `open` | 只更新内部状态与 `data-open`；Esc 层 / 叠放 / 焦点基线副作用被 `isConnected` 守卫跳过，重连由 `onReconnect` 补齐 |

焦点：打开时聚焦 `initial-focus`（light DOM 或 shadow 内首个命中），缺省聚焦面板框体；关闭时归还
打开前元素（仍连接时）。键盘：面板框体可聚焦，方向键移动、`Shift` + 方向键缩放（8px/步），
焦点在输入类控件内时不拦截。

## 4. 清理与重连

- 打开态挂：document Esc 层（共享 `overlay-stack`，后开的子浮层优先消费）、面板 pointerdown 置前、
  进行中手势的 document 监听、rAF 合并帧。
- 断开连接：释放 Esc 层、移除 document/window 监听、取消 rAF、取消进行中手势（回起始 rect、零事件）、
  从叠放登记摘除；**保留 `open` 属性与 rect**（状态在宿主属性，不在内部）。
- 重连：重新登记叠放（打开态重新置前）与 Esc、恢复交互监听，不重建 shadow/内部状态；进行中手势
  不跨摘挂续传。
- SSR（`window.__OAS_SSR__`）：不登记叠放、不挂 document/window 监听、不抢焦点、不测量边界。

## 5. SSR / 水合

- `template()` 与 `update()` 只依赖属性：快照内联 `left/top/width/height` 与标题文本，禁 JS 即可见；
  `open` 缺失时 `:host(:not([open])) { display: none }` 保证关闭态零可见、零 a11y 树占位。
- `hydrate()` 校验框体 / 标题 / 八个手柄 / 内容槽后直接接管（缓存节点 + 绑定交互），不重建 shadow。
- `aria-labelledby` 指向快照内标题元素 id；快照保留原 id，客户端无需重算。

## 6. 非目标

不 portal / teleport、不 `append-to`、不持久化布局、不做吸附/平铺/最小化/最大化/多窗口管理、无模态
遮罩与焦点陷阱、不接管宿主滚动与全局快捷键（Esc 层除外）。宿主不得把面板放在 `overflow: hidden`
裁剪容器或会创建新包含块的 `transform` 祖先内（无 portal 的固有限制）。

## 7. 测试

- `geometry.test.ts`：解析/夹取/移动/缩放/键盘/RTL/退化。
- `panel-stack.test.ts`：置前顺序、多实例、断开接任、z 值恒定。
- `oas-floating-panel.test.ts`：开合事件矩阵、before-close、指针/键盘/焦点/清理/重连、属性回写。
- `packages/ui/qa-regression/floating-panel.spec.ts`：真实浏览器拖拽/缩放/置前/子浮层 Esc/受控回写/
  coarse/dark/reduced-motion/axe/console。
- `packages/ssr`：白名单计数、DSD fixture（禁 JS 可见 + 真水合不重建）。
