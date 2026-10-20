# Gantt 甘特图

项目排期语义的任务图表组件（data 族）：行树 WBS（父任务摘要条 = 子任务时间并集）× 横向时间轴，任务条 / 里程碑 / 摘要条三形态 + 进度填充；依赖连线（FS/SS/FF/SF 四型，SVG 单画布覆盖层）；拖拽三件套（拖条改期 / 左右手柄拉伸 / 拖改进度，pointerup 收口一次性写回并派发事件）；时间刻度六档（hour/day/week/month/quarter/year）双层表头；今日线、周末/假日列高亮；行虚拟滚动支撑万级任务；三级只读 + 任务级禁拖。数据契约以扁平 `parent` 指针为主（嵌套 `children` 输入自动拍平兼容）。

## 基础用法

<DemoBlock title="行树 WBS + 依赖连线 + 里程碑 + 进度（tasks JSON，扁平 parent / 嵌套 children 双通道）">
  <oas-gantt id="gantt-basic" tasks='[{"id":"p1","name":"一期：基建","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"t1","name":"需求分析","start":"2026-03-02","end":"2026-03-06","progress":40},{"id":"t2","name":"开发","start":"2026-03-05","end":"2026-03-13","progress":20,"dependencies":[{"id":"t1"}]}]},{"id":"p2","name":"二期：发布","start":"2026-03-16","end":"2026-03-20","type":"summary","expanded":false,"children":[{"id":"t3","name":"回归测试","start":"2026-03-16","end":"2026-03-18","dependencies":[{"id":"t2"}]},{"id":"m1","name":"v1.0 发布","start":"2026-03-20"}]},{"id":"t9","name":"文档整理","start":"2026-03-09","end":"2026-03-12","progress":70,"dependencies":[{"id":"t2","type":"ss"}]}]'></oas-gantt>
  <div id="gantt-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- 父任务渲染**摘要条**（时间 = 子任务并集、进度 = 子任务工期加权平均），行首折叠钮收起/展开子行，展开集合写回 `expanded` 属性（JSON 数组）并派发 `oas-expand-change`；折叠后子行连同其依赖连线一并隐藏（连线随行可见性走，不穿到摘要条）；
- **里程碑**渲染为菱形：`type: "milestone"` 显式声明优先（即使携带 `end` 也按里程碑渲染，`end` 忽略并 `console.warn` 提示数据矛盾一次），无 `end` 亦推导为里程碑；**有子任务时恒按摘要条渲染**（子级承载聚合语义，形态与聚合须一致；仅当同时显式声明 `type: "milestone"` 时 `console.warn` 提示数据矛盾一次）；`start` 晚于 `end`（日期颠倒）在清洗层自动交换并 `console.warn` 一次（不渲染 2px 假条）；
- `dependencies` 声明依赖（`type` 缺省 `fs`，支持 `fs`/`ss`/`ff`/`sf` 四型），SVG 单画布绘制折线 + 箭头；
- 悬停任务条出 tooltip（名称 + 起止 + 进度）；`template[slot="tooltip"]` 可覆盖内容（`[data-task-name]` / `[data-task-range]` / `[data-task-progress]` 绑定点）。

## 刻度六档（scale）

<DemoBlock title="时间刻度六档：hour / day（默认）/ week / month / quarter / year（双层表头：上层主刻度合并 + 下层辅刻度）">
  <oas-segmented id="gantt-scale-switch" value="day" options='[{"label":"时","value":"hour"},{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"},{"label":"季","value":"quarter"},{"label":"年","value":"year"}]' style="margin-bottom:var(--oas-space-2)"></oas-segmented>
  <oas-gantt id="gantt-scale" scale="day" tasks='[{"id":"s1","name":"一期交付","start":"2026-01-05","end":"2026-06-30","progress":50},{"id":"s2","name":"二期启动","start":"2026-04-01","end":"2026-08-15","progress":0,"dependencies":[{"id":"s1","type":"fs"}]}]'></oas-gantt>
</DemoBlock>

切换 `scale` 重排时间轴（列宽随档位自适应，下限保证标签有立足位），派发 `oas-scale-change`；非法值回落 `day`。列宽被容器压窄到放不下标签时辅刻度按 N 抽稀（保留格线、隐去部分文本，如日档窄列每 2 格），避免日号/月号首尾相接。拖拽吸附以当前刻度为单位（`snap="false"` 关闭吸附，按像素比例平移并保留时间精度）。

## 拖拽三件套

<DemoBlock title="拖条改期 / 手柄拉伸 / 拖改进度（pointerup 收口一次性写回；Esc 或 pointercancel 取消零事件）">
  <oas-gantt id="gantt-drag" tasks='[{"id":"dg1","name":"可拖任务（拖身改期、拖缘拉伸、拖点改进度）","start":"2026-03-02","end":"2026-03-08","progress":30},{"id":"dg2","name":"可拖里程碑","start":"2026-03-10"}]'></oas-gantt>
</DemoBlock>

- **拖条身** = 整体平移（保持工期）；**拖左右手柄** = 改开始/结束（不越过对侧）；**拖条内圆点** = 改进度；
- 收口（pointerup）才写回并派发 `oas-task-change`（`detail: { id, task, oldStart, oldEnd, start, end }`）/ `oas-progress-change`（`detail: { id, task, progress }`）+ `oas-tasks-change`（全量），零位移松开零事件；
- 拖拽中 Esc（或 pointercancel）取消 → 视觉回滚、零事件零写回；拖拽中外部重写 `tasks` 属性 → 拖拽终止回滚（外部数据为准）；
- 聚焦任务条后 **Shift + ←/→** 键盘改期一格（RTL 方向镜像）；
- 拖条 / 拉伸 / 拖连线靠近视口边缘时，横向与纵向**自动滚动**（越靠边越快，到边界即停）；拖行重排仅纵向自动滚动。

## 行拖拽改父子 / 重排（reparent）

<DemoBlock title="拖左侧名称行：上/下半区 = 目标前/后（同级），指针深入右侧 = 成为目标子级；收口派发 oas-reparent">
  <oas-gantt id="gantt-reparent" tasks='[{"id":"p1","name":"阶段一","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"w1","name":"设计","start":"2026-03-02","end":"2026-03-06"},{"id":"w2","name":"编码","start":"2026-03-05","end":"2026-03-13"}]},{"id":"w3","name":"验收（拖我）","start":"2026-03-16","end":"2026-03-20"},{"id":"w4","name":"上线（拖我）","start":"2026-03-23","end":"2026-03-27"}]'></oas-gantt>
  <div id="gantt-reparent-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

拖左侧名称行到目标：落在目标行**上半区** → 插到目标之前（同级）；**下半区** → 插到目标之后（同级）；**指针深入右侧** → 成为目标的子级。收口派发 `oas-reparent`（`detail: { id, parent, index }`，`parent` 为 `null` 表示根级）+ `oas-tasks-change`（全量）。不允许把父拖进自己的后代（防环，零事件）；`readonly` 或任务级 `disabled` 不启动；拖拽中 `Esc` / `pointercancel` 取消零事件。

## 依赖连线交互编辑

<DemoBlock title="悬停任务条出连线点：从左/右点拖到目标任务建依赖（端点定 FS/SS/FF/SF）；点连线选中后 Delete 删除">
  <oas-gantt id="gantt-link" tasks='[{"id":"l1","name":"设计","start":"2026-03-02","end":"2026-03-06"},{"id":"l2","name":"开发","start":"2026-03-09","end":"2026-03-13"},{"id":"l3","name":"测试","start":"2026-03-16","end":"2026-03-20","dependencies":[{"id":"l2"}]}]'></oas-gantt>
  <div id="gantt-link-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

悬停任务条出两个**连线点**：拖右侧点（完成端）到目标条 → 建依赖；拖左侧点（开始端）同理。**里程碑** start == end，只出完成端**单点**（fs 惯例；其作为前置时的 ss/sf 与 fs/ff 等价）。落点取目标条的**左半**（开始端）/ **右半**（完成端），与起点端组合决定类型（FS / SS / FF / SF），依赖记在**后继任务**上。同源同型依赖不重复添加；同源多型可并存，选中删除按类型作用域只删该条。点已有连线**选中**（高亮），按 `Delete` / `Backspace` 删除（仅组件持有焦点时响应，不劫持宿主输入；任务条聚焦时按 `Delete` 不会误删已选连线）。收口派发 `oas-dependencies-change`（`detail: { taskId, dependencies }`）+ `oas-tasks-change`。`readonly` 不渲染连线点与命中区、不可删；拖拽中 `Esc` / `pointercancel` 取消零事件。触屏点任务条揭示连线点；连线命中路径可聚焦，`Enter`/`Delete` 删除该依赖。

## 多选、重命名与键盘

<DemoBlock title="点击行选中（Ctrl/Cmd 加选、Shift 连选）；双击名称重命名；Delete 批量删除；Alt+↑↓ 同级移动、Alt+←→ 升降级；连线聚焦 Enter 删除">
  <oas-gantt id="gantt-select" tasks='[{"id":"s1","name":"需求","start":"2026-03-02","end":"2026-03-06"},{"id":"s2","name":"开发","start":"2026-03-05","end":"2026-03-13"},{"id":"s3","name":"测试","start":"2026-03-16","end":"2026-03-20"},{"id":"s4","name":"上线","start":"2026-03-23","end":"2026-03-27"}]'></oas-gantt>
  <div id="gantt-select-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

- **多选**：点击左侧名称行选中（单选）；`Ctrl`/`Cmd` 点击切换；`Shift` 点击范围连选；选中态走 `selection` property（id 数组，可读写）与 `oas-selection-change` 事件。`Delete`/`Backspace` 删除所选（连同其后代），或调用 `removeTasks(ids)`。
- **行内重命名**：双击名称 → 输入框（`Enter` 提交 / `Esc` 还原 / 失焦提交），改 `name` 并派发 `oas-tasks-change`。
- **键盘**：行聚焦后 `↑`/`↓` 移动焦点、`空格` 选择、`Alt+↑/↓` 同级上移/下移、`Alt+→` 降为前一项子级、`Alt+←` 升为父级同级、`F2` 重命名；连线命中路径可聚焦，`Enter`/`Delete` 删除该依赖（删除后焦点交回组件，键盘不落空）。
- **无障碍**：名称列为 `role="tree"`，每行 `treeitem` 带 `aria-level` / `aria-posinset` / `aria-setsize`（同级全集，含折叠子级；悬空/断环父级按根计）；选中态同步 `aria-selected`，展开态同步 `aria-expanded`。
- **触屏**：点任务条揭示其连线点（无 hover）；左列行首的拖拽手柄（⋮⋮）用于触屏**行重排**（整行纵向拖与列表滚动在触屏上冲突，改由手柄承载；手柄独占手势，其余区域仍可滚动），纯点按手柄不改选中。

## 任务管理（创建 / 编辑 / 依赖 / 导出）

宿主用**命令式方法**驱动增删改，无需整体重写 `tasks`（写回统一走清洗层并派发 `oas-tasks-change`）：

- `addTask(task?, opts?)`：新增任务，返回新 id；`opts: { parent?, before?, after? }`。缺省名走 i18n `gantt.newTask`、开始为今天、非里程碑补 1 天（含端）。
- `moveTask(id, { parent?, index? })`：改父级 / 调同级顺序，派发 `oas-reparent` + `oas-tasks-change`。
- `duplicateTask(id, opts?)`：深拷贝任务及其子树（各自新 id），紧跟原子树之后，返回新根 id。
- `addDependency(taskId, dep)` / `removeDependency(taskId, dep)` / `updateDependency(taskId, from, to)`：增 / 删 / 改依赖（`dep: { id, type? }`），派发 `oas-dependencies-change`。
- `updateTasks(patches)`：批量浅合并（`[{ id, ...patch }]`），返回生效条数，只派发一次 `oas-tasks-change`。
- 缩放：`zoomIn()` / `zoomOut()` 沿六档刻度步进；`fit()` 取最细且能容纳全部任务的档。
- 属性 **`creatable`**（布尔，默认关）：开启后行尾出「＋」（摘要行加子级、叶子行加同级后继）、**双击空白区按落点日期建任务**，新建后进入行内重命名；只读 / 任务级禁用行不出按钮。
- 事件 **`oas-task-add`**（detail `{ id, task }`）：命令式或行内新建后派发，供宿主定位并打开编辑。

<DemoBlock title="命令式任务管理：新建 / 复制所选 / 加依赖 / 删除所选 / 缩放 / 导出；creatable 行内新建（点行尾「＋」或双击空白）">
  <div style="display:flex;gap:var(--oas-space-2);flex-wrap:wrap;margin-bottom:var(--oas-space-2)">
    <oas-button id="gantt-tm-add" size="small">新建任务</oas-button>
    <oas-button id="gantt-tm-copy" size="small">复制所选</oas-button>
    <oas-button id="gantt-tm-dep" size="small">加依赖（所选→下一项）</oas-button>
    <oas-button id="gantt-tm-del" size="small" variant="outline">删除所选</oas-button>
    <oas-button id="gantt-tm-progress" size="small" variant="outline">改进度 +10</oas-button>
    <oas-button id="gantt-tm-zoomout" size="small" variant="outline">缩小</oas-button>
    <oas-button id="gantt-tm-zoomin" size="small" variant="outline">放大</oas-button>
    <oas-button id="gantt-tm-fit" size="small" variant="outline">适配</oas-button>
    <oas-button id="gantt-tm-save" size="small" variant="outline">导出 JSON</oas-button>
  </div>
  <oas-gantt id="gantt-tm" creatable height="260"></oas-gantt>
  <div id="gantt-tm-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

用 `oas-modal` + `oas-form` 组装任务详情编辑器（组件只派发 `oas-task-dblclick`，不内建弹窗）：

```html
<oas-gantt id="g" creatable></oas-gantt>
<oas-modal id="edit" title="编辑任务">
  <oas-form id="edit-form">
    <oas-form-item label="名称" name="name" required><oas-input name="name"></oas-input></oas-form-item>
    <oas-form-item label="开始" name="start" required><oas-date-picker name="start"></oas-date-picker></oas-form-item>
    <oas-form-item label="结束" name="end"><oas-date-picker name="end"></oas-date-picker></oas-form-item>
    <oas-form-item label="进度" name="progress"><oas-slider name="progress" show-value></oas-slider></oas-form-item>
  </oas-form>
</oas-modal>
<script>
  const g = document.getElementById('g')
  const modal = document.getElementById('edit')
  const form = document.getElementById('edit-form')
  const field = (name) => form.querySelector(`oas-input[name="${name}"], oas-date-picker[name="${name}"], oas-slider[name="${name}"]`)
  let editing = ''
  g.addEventListener('oas-task-dblclick', (e) => {
    editing = e.detail.id
    const t = e.detail.task
    field('name').value = t.name
    field('start').value = t.start
    field('end').value = t.end ?? ''
    field('progress').value = t.progress ?? 0
    modal.setAttribute('visible', '') // 受控打开（弹窗点「确定」会自关）
  })
  modal.addEventListener('oas-ok', () => form.submit())
  form.addEventListener('oas-submit', (e) => {
    const v = e.detail.values // 表单值恒为字符串，数字字段按需转换
    g.updateTask(editing, { ...v, progress: Number(v.progress) })
  })
</script>
```

> `oas-task-dblclick` / `oas-task-click` 与 `oas-task-render` 让宿主任意接管编辑与自定义渲染；组件本身只保证数据与交互闭环。

## 任务管理增强（依赖联动排程 / 框选 / 拖拽建任务）

- **依赖联动排程**：`auto-schedule`（布尔，默认关）——日期变更（拖拽 / 键盘 / `updateTask` / `updateTasks`）或依赖增改后，按 FS/SS/FF/SF 沿依赖图对**后继**做**最小前推**（只推迟、保持工期；跳过 disabled 与摘要行；成环安全），派发 `oas-reschedule`（detail `{ ids }`）与联动的 `oas-tasks-change`。
- **框选多任务**：左侧列表空白纵向拖按行带选中；时间轴空白拖（未开 `creatable` 时）按条相交选中；`Ctrl`/`Cmd` 追加。结果写入 `selection` 并派发 `oas-selection-change`；只读下仍可框选（选择属查看态）。
- **拖拽建任务**：`creatable` 开启时，在时间轴空白**拖出区间**即建相应跨度任务（双击空白按当天建保留）。

> 触屏：时间轴空白拖与二维滚动冲突，**时间轴上的框选/拖建不接管触屏手势**（留给原生滚动）；触屏建任务用行尾「＋」或双击空白，框选用左侧列表纵向拖。`auto-schedule` 下**摘要任务作前置**时按其**后代聚合区间**约束（忽略摘要自身 date 字段）。

<DemoBlock title="auto-schedule：拖右侧「原型」条向右，后继「开发」按 FS 自动顺延；时间轴空白拖出区间建任务；左侧空白纵向拖框选多行">
  <oas-gantt id="gantt-auto" auto-schedule creatable height="240"></oas-gantt>
</DemoBlock>

## 排程深化（依赖 lag/lead + 关键路径）

- **依赖 lag/lead**：`dependencies: [{ id, type?, lag? }]`——`lag` 单位为**天、可负**（负 = 提前/重叠），并入 `auto-schedule` 四型约束（`fs: 后继 start ≥ 前置 end + lag`、`ss: 后继 start ≥ 前置 start + lag`、`ff/sf` 同理按 end）。缺省 0，向后兼容。`|lag|` 超过 **11574 天（≈31 年）**或非有限数值时按 0 处理并 devWarn 一次（防止极端值把排期写成组件无法回读的 5 位年份）。
- **关键路径**：`show-critical-path`（布尔，默认关）——以**当前排期为基准**（ES 取现网 start）在依赖图 + 工期上反向推最晚时间算**总时差**，时差为 0 的任务条加 `.critical` 高亮（颜色走 `--oas-gantt-critical-color`）。只读展示，不改数据。
- **时差标记**：总时差为 **0** → `.critical`（实线描边）；总时差为**负**（已违反后继约束）→ `.conflict`（虚线描边，`--oas-gantt-conflict-color`）。`el.tasks` 里 `lag` 为分数（如 `0.5`）时会把该条升为时间精度串（按需取整）。

<DemoBlock title="关键路径：a→b（长）、a→c（短）同为 a 的后继——b 在关键路径上高亮，c 有时差不高亮（关闭 show-critical-path 即无高亮）">
  <oas-gantt id="gantt-critical" show-critical-path height="200"></oas-gantt>
</DemoBlock>

## 排程约束与工作日日历

- **任务约束**：`GanttTask.constraint`（`'asap'` 默认 / `'snet'` 不得早于 / `'mso'` 固定开始 / `'fnlt'` 不得晚于完成）+ `constraintDate`。`auto-schedule` 下：`snet` 取起始下限、`mso` 固定开始（不被依赖前推）、`fnlt` 为软截止（不自动移动）。违反（`snet` 早于下限 / `mso` 与依赖冲突或偏离 / `fnlt` 超期）在 **`show-critical-path` 或 `auto-schedule` 开启时**以 `.conflict` 标出。摘要行上的约束无意义（日期派生）→ 忽略并告警一次。
- **工作日日历**：`workdays`（JSON 周几数组 `[0..6]`，opt-in；缺省/空 = 不限周几）+ `holidays`（**假日恒为非工作日**，与是否开 `workdays` 无关）。`auto-schedule` 的前推落点**吸附到下一个工作日**（跳过假日与 `workdays` 之外的日子）。运行期改 `workdays`/`holidays` 或整体重写 `tasks` 都会触发重新规整。
- **事件顺序**：`auto-schedule` 开启且联动改期时，无论交互提交（拖拽 / 键盘 / `updateTask` / `updateTasks`）还是宿主直接改写 `tasks`（属性通道），事件序统一为 `oas-reschedule`（联动订正）→ `oas-tasks-change`（订正后的最终数据）；拖拽 / 键盘改期收口随后再派发 `oas-task-change`（拖动的那个任务，`start/end` 取**订正后终值**）。一次操作只派发一次 `oas-tasks-change`。宿主以 `el.tasks` / `detail.task` 为准即可。

<DemoBlock title="工作日日历：workdays=[工作日] 下拖前置，后置自动吸附到下一个工作日；连线 +2（lag）标签可见">
  <oas-gantt id="gantt-workdays" auto-schedule workdays="[1,2,3,4,5]" height="200"></oas-gantt>
</DemoBlock>

## 宿主集成配方（撤销重做 / 编辑弹窗 / 导出）

组件只保证「数据 + 交互闭环」，下列能力以官方配方给出（不改组件本体）：

### 撤销 / 重做（宿主自建历史栈）

组件是**受控数据模型**：每次改动派发 `oas-task-change`（含 `oldStart/oldEnd/start/end`）与 `oas-tasks-change`。宿主据这些事件维护**自己的**历史栈最稳妥——组件内建历史会与宿主 `tasks` 真相形成双源：撤销写回内部再被宿主回写覆盖、粒度与宿主业务动作不一致、受控重渲染会把撤销结果弹回。典型做法：监听 `oas-task-change`/`oas-reparent`/`oas-dependencies-change` 记录逆操作，撤销/重做时用 `updateTask` / `moveTask` / `updateTasks` 回写。

### 编辑弹窗（双击任务条）

组件只派发 `oas-task-dblclick`；用 `oas-modal` + `oas-form` 组装详情编辑器：

<DemoBlock title="双击任务条打开编辑弹窗（oas-modal + oas-form），保存经 updateTask 写回">
  <oas-gantt id="gantt-edit" creatable height="200"></oas-gantt>
  <oas-modal id="gantt-edit-modal" title="编辑任务">
    <oas-form id="gantt-edit-form">
      <oas-form-item label="名称" name="name" required><oas-input name="name"></oas-input></oas-form-item>
      <oas-form-item label="开始" name="start" required><oas-date-picker name="start"></oas-date-picker></oas-form-item>
      <oas-form-item label="结束" name="end"><oas-date-picker name="end"></oas-date-picker></oas-form-item>
      <oas-form-item label="进度" name="progress"><oas-slider name="progress" show-value></oas-slider></oas-form-item>
    </oas-form>
  </oas-modal>
</DemoBlock>

### 导出（JSON / 打印 / 图片）

- **JSON**：`el.tasks` 即为可序列化数据（嵌套输入已拍平）——`JSON.stringify(el.tasks)`。
- **打印**：加 `@media print` 展开时间轴、隐藏无关 UI；或先 `fit()` 再 `window.print()`。
- **图片 / PDF**：宿主侧渲染（HTML→canvas 或 SVG 序列化），示例：`new XMLSerializer().serializeToString(el.shadowRoot.querySelector('.inner'))` 后转 canvas。

<DemoBlock title="导出：点按钮输出当前 tasks JSON（宿主可直接落库/下载）">
  <oas-button id="gantt-export" size="small" variant="outline">导出 JSON</oas-button>
  <oas-gantt id="gantt-exportable" height="200"></oas-gantt>
  <div id="gantt-export-output" style="color:var(--oas-color-text-secondary);font-size:var(--oas-font-size-sm);margin-top:var(--oas-space-2)"></div>
</DemoBlock>

## 只读三级 + 任务级禁用

<DemoBlock title="readonly（全禁）/ dates-readonly（禁改期）/ progress-readonly（禁进度）；只读态不渲染拖拽手柄（视觉即语义）">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">readonly：整图只读</div>
      <oas-gantt readonly tasks='[{"id":"r1","name":"锁定任务","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">dates-readonly：禁改期、进度可拖</div>
      <oas-gantt dates-readonly tasks='[{"id":"r2","name":"日期锁定","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
    <div>
      <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-bottom:var(--oas-space-1)">progress-readonly：禁进度、改期可拖</div>
      <oas-gantt progress-readonly tasks='[{"id":"r3","name":"进度锁定","start":"2026-03-02","end":"2026-03-08","progress":60}]'></oas-gantt>
    </div>
  </div>
</DemoBlock>

任务数据里的 `disabled: true` 单独禁该条（其他任务不受影响）：**只锁自身数据**——不可被拖（作源）、不可作依赖**后继**、不可作重排 **drop-inside** 目标；但可作他任务的前置（连线源）与重排前/后同级目标。

## 今日线与周末/假日高亮

<DemoBlock title="今日线（show-today 默认开）+ 周末列高亮（weekends 默认开）+ holidays 假日高亮（演示区间动态覆盖今天）">
  <oas-gantt id="gantt-today" height="200"></oas-gantt>
</DemoBlock>

<DemoBlock title="关闭今日线 / 关闭周末高亮 / 假日高亮（holidays JSON）">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt show-today="false" weekends="false" tasks='[{"id":"n1","name":"无今日线无周末底色","start":"2026-03-02","end":"2026-03-08"}]'></oas-gantt>
    <oas-gantt holidays='["2026-03-04","2026-03-11"]' tasks='[{"id":"n2","name":"假日列高亮","start":"2026-03-02","end":"2026-03-13"}]'></oas-gantt>
  </div>
</DemoBlock>

今日线为装饰层（`aria-hidden`），落在时间轴范围内才渲染；周末/假日列高亮在 day/hour 档生效。

## 基线对比（show-baseline）

<DemoBlock title="show-baseline 开启：实际条下叠浅色基线条，title 标差值（比基线晚/早 N 天或一致）">
  <oas-gantt show-baseline tasks='[{"id":"b1","name":"设计（实际晚基线 2 天）","start":"2026-03-02","end":"2026-03-06","progress":80,"baseline":{"start":"2026-03-02","end":"2026-03-04"}},{"id":"b2","name":"开发（与基线一致）","start":"2026-03-05","end":"2026-03-13","progress":40,"baseline":{"start":"2026-03-05","end":"2026-03-13"}},{"id":"b3","name":"测试（实际早基线 1 天）","start":"2026-03-16","end":"2026-03-18","progress":20,"baseline":{"start":"2026-03-16","end":"2026-03-19"}}]'></oas-gantt>
</DemoBlock>

`show-baseline`（默认关）开启后，任务带 `baseline: { start, end? }` 时在实际条下渲染一条浅色基线条；条的 `title` 标实际相对基线的差值（比基线晚/早 N 天、或「与基线一致」）。基线数据由宿主保存，组件只读不写回；基线条颜色走 `--oas-gantt-baseline-color`，截止虚线走 `--oas-gantt-deadline-color`。基线条还暴露 `data-start-delta` / `data-end-delta` / `data-duration-delta` / `data-progress-delta`（天/百分比），供宿主做差异面板；也可直接调用 `computeVariance(tasks)`。`baseline.progress` 为基线进度（0-100），开启后在基线条内渲染进度覆盖层（`--oas-gantt-baseline-progress-color`）。

## 项目分组与偏差徽标（group-by-project / show-variance）

<DemoBlock title="group-by-project：按 project 自动生成项目根摘要；show-variance：行名后显示结束日偏差">
  <oas-gantt
    id="gantt-project"
    group-by-project
    show-baseline
    show-variance
    height="220"
    tasks='[{"id":"a1","name":"需求","start":"2026-03-02","end":"2026-03-06","project":"Alpha","progress":80,"baseline":{"start":"2026-03-02","end":"2026-03-04"}},{"id":"a2","name":"设计","start":"2026-03-04","end":"2026-03-10","project":"Alpha"},{"id":"b1","name":"接口","start":"2026-03-05","end":"2026-03-09","project":"Beta","progress":40,"baseline":{"start":"2026-03-05","end":"2026-03-09"}}]'
  ></oas-gantt>
</DemoBlock>

- `GanttTask.project`：根任务的项目键。开启 `group-by-project` 后组件按首次出现顺序生成合成项目根摘要（行 id 形如 `__oas_project__:<project>`），根任务挂到对应摘要下；原任务数组不被修改。`windowed` 模式要求宿主自行展平，不做自动分组。
- `show-variance`：任务带 `baseline` 时在行名后渲染 `.variance` 徽标（文本 `Δ±Nd`，以结束日偏差为主），并写 `data-start-delta` / `data-end-delta` / `data-duration-delta` / `data-progress-delta`；正值标红、负值标绿，完整差值在 `title` / `aria-label`。

## 截止日、浮时与基线差异（deadline / show-float / baseline.progress）

<DemoBlock title="show-baseline + show-float：基线进度、总浮时/自由浮时；deadline 超期标 conflict">
  <oas-gantt
    show-baseline
    show-float
    height="220"
    tasks='[{"id":"d1","name":"设计（超截止日）","start":"2026-03-02","end":"2026-03-04","deadline":"2026-03-03","progress":40,"baseline":{"start":"2026-03-02","end":"2026-03-03","progress":25}},{"id":"d2","name":"开发","start":"2026-03-05","end":"2026-03-09","progress":50,"baseline":{"start":"2026-03-05","end":"2026-03-08","progress":30}},{"id":"d3","name":"联调（有浮时）","start":"2026-03-05","end":"2026-03-06","dependencies":[{"id":"d1"}]}]'
  ></oas-gantt>
</DemoBlock>

- `GanttTask.deadline`：截止日（`YYYY-MM-DD`；hour 档可带时刻）。条结束晚于截止日时加 `.conflict`，并在时间轴渲染 `.deadline` 虚线标记。
- `GanttTask.deadlines`：多个截止日（可选）。与 `deadline` 合并去重后每个日期渲染一个 `.deadline`（`data-deadline-index` 标序号）；任一截止日被超过即标 `.conflict`。摘要行上的截止日仍忽略并 devWarn。
- `show-float`：显示**总浮时**（LF − EF）与**自由浮时**（最近后继允许的延后量）；条上同时写入 `data-total-float` / `data-free-float`（天）。摘要不参与 CPM；windowed 模式无法在切片上得到正确依赖图，会跳过并 devWarn。
- `baseline.progress`：基线进度 0-100；开启 `show-baseline` 后基线条内渲染 `.baseline-progress` 覆盖层。
- 宿主可用导出的纯函数 `computeVariance(tasks)` 得到基线差异：

```ts
import { computeVariance } from '@oas-ui/ui'

const rows = computeVariance(el.tasks)
// [{ id, startDelta, endDelta, durationDelta, progressDelta }]
// 正数 = 当前晚于基线 / 工期更长 / 进度更多；无 baseline.progress 时 progressDelta 为 null
```

## 行虚拟滚动（万级任务）

<DemoBlock title="height + row-height 启用视口窗口渲染（演示 300 行；只渲染可视窗口 + buffer）">
  <oas-gantt id="gantt-virtual" height="240" row-height="32" stripe></oas-gantt>
  <div style="font-size:var(--oas-font-size-sm);color:var(--oas-color-text-secondary);margin-top:var(--oas-space-2)">方法通道：<oas-button id="gantt-jump" size="small">scrollToTask 跳到第 250 行</oas-button></div>
</DemoBlock>

方法：`scrollToTask(id)` 定位任务行、`scrollToDate(date)` / `scrollToToday()` 水平定位、`updateTask(id, patch)` 单条增量更新（走清洗层，派发 `oas-tasks-change`）。

## 服务端行窗口（windowed）

> 十万行级场景：宿主只喂「可视窗口附近」的行切片，组件**不持有全量数据**。行窗口按滚动位置计算，未被已装载区间覆盖时派发 `oas-window-request`，宿主回填后按**绝对行号**渲染。

属性 `windowed`（开启）+ `total`（全量行数）+ `window-start`（切片首行绝对行号）+ `range-start` / `range-end`（宿主托管时间轴范围，ISO 日期，`range-end` 含当日——切片不含完整日期跨度时必用）。事件：

- `oas-window-request`：`detail: { start, end, reason }`（半开区间、绝对行号；`reason` = `init` / `scroll` / `resize` / `data`），同一期望区间不重复派发。
- `oas-range-request`：可视时间窗接近轴端时派发，`detail: { startMs, endMs, reason }`，供宿主扩展范围。

```html
<oas-gantt windowed total="200000" window-start="0" range-start="2026-01-01" range-end="2026-12-31"
  height="360" scale="day"></oas-gantt>
<script>
  const el = document.querySelector('oas-gantt[windowed]')
  el.addEventListener('oas-window-request', (e) => {
    const { start, end } = e.detail
    el.setAttribute('window-start', String(start))
    el.setAttribute('tasks', JSON.stringify(fetchTasks(start, end))) // 真实项目请求后端
  })
</script>
```

windowed 下的约定：**切片须为扁平行**（含 `parent`/`children` 的层级切片会 devWarn 并按扁平渲染，展开/收起请宿主侧展平）；`auto-schedule` 与关键路径在部分数据上会算错，**跳过并 devWarn**；行拖拽重排禁用（`index` 只对切片有意义）；**切片越界**（`window-start` + 装载行数 > `total`）时越界行按 `total` 夹取不渲染，并 devWarn 一次；**跨窗口连线不绘制**——前置任务不在已装载切片内时该依赖连线跳过（组件只持有切片，无法定位切片外端点；需要完整连线时请让宿主把相关前置一并放入切片，或在聚合层展示）；**一次用户操作只派发一次 `oas-tasks-change`**；`oas-tasks-change` 的 `detail.tasks` 仅含切片——宿主须**按 id 合并回全量**，不得整体替换。

> 完整宿主取数配方（分段、取消在途、按 id 合并、原子回填）与可运行示例见 [服务端窗口取数](/guide/windowed-data)。

## 展开集合受控 / 标签与吸附 / 本地化

- **自定义字段透传**：`GanttTask` 允许携带任意业务字段（如 `assignee`、`tag`）——组件**原样保留**（`el.tasks` / `oas-task-render` / 模板可见），不参与排程；显示走条标签模板或 `oas-task-render`，编辑走 `oas-modal`+`oas-form` 配方或 `updateTask`。
- **行名列自定义模板**：`<template slot="row">` 每行克隆进 `.name`，其中 `[data-task-name]` 自动填任务名；可放任意控件——**这就是「负责人」列的落点**（负责人用自定义字段承载，模板负责显示与就地编辑）。模板内控件不会被行拖拽/选中劫持。示例：

```html
<oas-gantt id="g">
  <template slot="row">
    <span data-task-name></span>
    <oas-select class="owner" size="small" options='[{"label":"张三","value":"zhang"},{"label":"李四","value":"li"}]'></oas-select>
  </template>
</oas-gantt>
<script>
  const g = document.getElementById('g')
  const tasks = [{ id: 'a', name: '设计', start: '2026-03-02', end: '2026-03-06', owner: 'zhang' }]
  g.tasks = tasks
  // 克隆后按行回填控件
  g.shadowRoot.querySelectorAll('.row-name').forEach((row) => {
    const t = tasks.find((x) => x.id === row.dataset.key)
    row.querySelector('.owner').value = t.owner
  })
  // 改负责人 → 写回自定义字段
  g.addEventListener('oas-change', (e) => {
    const row = e.target.closest('.row-name')
    if (row && e.target.classList.contains('owner')) g.updateTask(row.dataset.key, { owner: e.target.value })
  })
</script>
```

<DemoBlock title="expanded 受控（JSON 数组 = 已展开集合；显式 [] 全收起）+ label-position 标签（缺省 none 不渲染——行名列已承载名称；inside 条内 / right 条旁需显式开启）">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt expanded='["p1"]' label-position="inside" tasks='[{"id":"p1","name":"阶段一","start":"2026-03-02","end":"2026-03-13","type":"summary","children":[{"id":"w1","name":"设计","start":"2026-03-02","end":"2026-03-06","progress":80},{"id":"w2","name":"编码","start":"2026-03-04","end":"2026-03-13","progress":35}]},{"id":"p2","name":"阶段二","start":"2026-03-16","end":"2026-03-20","type":"summary","children":[{"id":"w3","name":"验收","start":"2026-03-16","end":"2026-03-20"}]}]'></oas-gantt>
    <oas-gantt label-position="right" tasks='[{"id":"l1","name":"条旁标签（right）","start":"2026-03-02","end":"2026-03-06","progress":60},{"id":"l2","name":"缺省 none 只有条无标签","start":"2026-03-09","end":"2026-03-13","progress":30}]'></oas-gantt>
  </div>
</DemoBlock>

<DemoBlock title="snap=false 非吸附（半格平移保留时间精度）+ locale / first-day-of-week 本地化">
  <div style="display:flex;flex-direction:column;gap:var(--oas-space-4)">
    <oas-gantt snap="false" tasks='[{"id":"sf1","name":"拖拽不吸附（按像素比例平移）","start":"2026-03-02","end":"2026-03-06","progress":50}]'></oas-gantt>
    <oas-gantt locale="en" first-day-of-week="0" tasks='[{"id":"sf2","name":"English locale, week starts on Sunday","start":"2026-03-02","end":"2026-03-13","progress":20}]'></oas-gantt>
  </div>
</DemoBlock>

`template[slot="task"]` 覆盖条内标签内容（`[data-task-name]` 绑定名称；缺省 `label-position="none"` 不渲染标签，需显式开启后模板才生效）；每条任务渲染后派发 `oas-task-render`（`detail: { task, element }`），宿主可改写条内 DOM。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  await customElements.whenDefined('oas-gantt')
  const out = document.getElementById('gantt-output')

  // 今日线演示：区间动态覆盖今天（保证今日线必然落在范围内）
  const today = document.getElementById('gantt-today')
  if (today) {
    const iso = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const s = new Date()
    s.setDate(s.getDate() - 4)
    const e = new Date()
    e.setDate(e.getDate() + 10)
    today.tasks = [
      { id: 'td0', name: '覆盖今天的区间（今日线 + 周末底色）', start: iso(s), end: iso(e), progress: 45 },
    ]
  }

  // 虚拟滚动演示：300 行
  const virtual = document.getElementById('gantt-virtual')
  if (virtual) {
    const tasks = []
    for (let i = 0; i < 300; i++) {
      const day = (i % 20) + 1
      tasks.push({
        id: `v${i}`,
        name: `任务 ${i + 1}（批次 ${Math.floor(i / 25) + 1}）`,
        start: `2026-03-${String(day).padStart(2, '0')}`,
        end: `2026-03-${String(Math.min(day + 3, 28)).padStart(2, '0')}`,
        progress: (i * 7) % 100,
      })
    }
    virtual.tasks = tasks
    document.getElementById('gantt-jump')?.addEventListener('oas-click', () => virtual.scrollToTask('v249'))
  }

  // 刻度切换（宿主 segmented → scale 属性）
  const scaleSwitch = document.getElementById('gantt-scale-switch')
  const ganttScale = document.getElementById('gantt-scale')
  if (scaleSwitch && ganttScale) {
    scaleSwitch.addEventListener('oas-change', (e) => {
      ganttScale.setAttribute('scale', e.detail.value)
    })
  }

  // 事件反馈输出
  const basic = document.getElementById('gantt-basic')
  if (basic && out) {
    const show = (text) => {
      out.textContent = text
    }
    basic.addEventListener('oas-task-click', (e) => {
      const d = e.detail
      show(`oas-task-click：${d.task.name}（id=${d.id}）——宿主可在此打开详情`)
    })
    basic.addEventListener('oas-task-dblclick', (e) => {
      const d = e.detail
      show(`oas-task-dblclick：${d.task.name}——宿主可在此接编辑表单`)
    })
    basic.addEventListener('oas-expand-change', (e) => {
      const d = e.detail
      show(`oas-expand-change：${d.id} → ${d.expanded ? '展开' : '收起'}`)
    })
    basic.addEventListener('oas-task-change', (e) => {
      const d = e.detail
      show(`oas-task-change：${d.id} ${d.oldStart} → ${d.start}（数据已写回 tasks）`)
    })
    basic.addEventListener('oas-progress-change', (e) => {
      const d = e.detail
      show(`oas-progress-change：${d.id} → ${d.progress}%`)
    })
    basic.addEventListener('oas-tasks-change', () => show(`oas-tasks-change：当前 ${basic.tasks.length} 条任务`))
  }

  // 行重排事件反馈
  const reparent = document.getElementById('gantt-reparent')
  const rout = document.getElementById('gantt-reparent-output')
  if (reparent && rout) {
    reparent.addEventListener('oas-reparent', (e) => {
      const d = e.detail
      rout.textContent = `oas-reparent：${d.id} → parent=${d.parent ?? '（根级）'}（同级第 ${d.index} 位）`
    })
  }

  // 连线交互事件反馈
  const link = document.getElementById('gantt-link')
  const lout = document.getElementById('gantt-link-output')
  if (link && lout) {
    link.addEventListener('oas-dependencies-change', (e) => {
      const d = e.detail
      const list = d.dependencies.map((x) => `${x.id}(${x.type ?? 'fs'})`).join('、') || '（无）'
      lout.textContent = `oas-dependencies-change：${d.taskId} 的前置 = ${list}`
    })
  }

  // 多选反馈
  const sel = document.getElementById('gantt-select')
  const sout = document.getElementById('gantt-select-output')
  if (sel && sout) {
    const report = () => {
      const ids = sel.selection
      sout.textContent = ids.length ? `已选 ${ids.length} 条：${ids.join('、')}` : '未选中（点行选中，Ctrl 加选，Shift 连选，Delete 删除）'
    }
    sel.addEventListener('oas-selection-change', report)
    report()
  }

  // 任务管理示例：命令式增删改 + 缩放 + 导出
  const tm = document.getElementById('gantt-tm')
  const tmOut = document.getElementById('gantt-tm-output')
  if (tm && tmOut) {
    tm.tasks = [
      { id: 'd1', name: '需求梳理', start: '2026-03-02', end: '2026-03-06', progress: 100 },
      { id: 'd2', name: '原型设计', start: '2026-03-05', end: '2026-03-11', progress: 60, dependencies: [{ id: 'd1' }] },
      { id: 'd3', name: '开发实现', start: '2026-03-10', end: '2026-03-20', progress: 20, dependencies: [{ id: 'd2' }] },
      { id: 'd4', name: '验收上线', start: '2026-03-20' },
    ]
    const say = (m) => {
      tmOut.textContent = m
    }
    const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn)
    on('gantt-tm-add', () => say(`addTask → ${tm.addTask({ name: '新任务' })}`))
    on('gantt-tm-copy', () => {
      const id = tm.selection[0]
      const n = id ? tm.duplicateTask(id) : null
      say(n ? `duplicateTask(${id}) → ${n}` : '先在左侧点选一行')
    })
    on('gantt-tm-dep', () => {
      const ids = tm.tasks.map((t) => t.id)
      const i = ids.indexOf(tm.selection[0])
      const next = ids[i + 1]
      const ok = i >= 0 && next ? tm.addDependency(next, { id: tm.selection[0] }) : false
      say(ok ? `依赖 ${tm.selection[0]} → ${next}` : '先点选一行且其后有任务')
    })
    on('gantt-tm-del', () => {
      const sel = tm.selection
      if (!sel.length) return say('先在左侧点选一行')
      tm.removeTasks(sel)
      say(`removeTasks → 删除 ${sel.length} 条`)
    })
    on('gantt-tm-zoomin', () => say(`zoomIn → scale=${(tm.zoomIn(), tm.getAttribute('scale'))}`))
    on('gantt-tm-zoomout', () => say(`zoomOut → scale=${(tm.zoomOut(), tm.getAttribute('scale'))}`))
    on('gantt-tm-fit', () => say(`fit → scale=${(tm.fit(), tm.getAttribute('scale'))}`))
    on('gantt-tm-save', () => say(`导出 ${tm.tasks.length} 条：${JSON.stringify(tm.tasks)}`))
    on('gantt-tm-progress', () => {
      const id = tm.selection[0]
      if (!id) return say('先在左侧点选一行')
      const cur = tm.tasks.find((t) => t.id === id)?.progress ?? 0
      const n = tm.updateTasks([{ id, progress: Math.min(100, cur + 10) }])
      say(`updateTasks → 生效 ${n} 条`)
    })
    say('点「＋」或双击空白可直接建任务；点按钮试命令式 API')
  }

  // 任务管理增强示例：依赖联动排程 + 框选 + 拖拽建任务
  const auto = document.getElementById('gantt-auto')
  if (auto) {
    auto.tasks = [
      { id: 'a1', name: '需求', start: '2026-03-02', end: '2026-03-06' },
      { id: 'a2', name: '原型', start: '2026-03-07', end: '2026-03-11', dependencies: [{ id: 'a1' }] },
      { id: 'a3', name: '开发', start: '2026-03-12', end: '2026-03-18', dependencies: [{ id: 'a2' }] },
    ]
  }

  // 关键路径示例
  const crit = document.getElementById('gantt-critical')
  if (crit) {
    crit.tasks = [
      { id: 'k1', name: '需求（关键）', start: '2026-03-02', end: '2026-03-04' },
      { id: 'k2', name: '开发（关键，长）', start: '2026-03-05', end: '2026-03-09', dependencies: [{ id: 'k1' }] },
      { id: 'k3', name: '文档（有时差）', start: '2026-03-05', end: '2026-03-06', dependencies: [{ id: 'k1' }] },
    ]
  }

  // 编辑弹窗 demo（双击条）
  const ged = document.getElementById('gantt-edit')
  const gedModal = document.getElementById('gantt-edit-modal')
  const gedForm = document.getElementById('gantt-edit-form')
  if (ged && gedModal && gedForm) {
    ged.tasks = [
      { id: 'e1', name: '设计', start: '2026-03-02', end: '2026-03-06', progress: 40 },
      { id: 'e2', name: '开发', start: '2026-03-09', end: '2026-03-13', progress: 10 },
    ]
    const fld = (n) => gedForm.querySelector(`oas-input[name="${n}"], oas-date-picker[name="${n}"], oas-slider[name="${n}"]`)
    let cur = ''
    ged.addEventListener('oas-task-dblclick', (e) => {
      cur = e.detail.id
      const t = e.detail.task
      fld('name').value = t.name
      fld('start').value = t.start
      fld('end').value = t.end ?? ''
      fld('progress').value = t.progress ?? 0
      gedModal.setAttribute('visible', '')
    })
    gedModal.addEventListener('oas-ok', () => gedForm.submit())
    gedForm.addEventListener('oas-submit', (e) => {
      const v = e.detail.values
      ged.updateTask(cur, { ...v, progress: Number(v.progress) })
    })
  }

  // 导出 JSON demo
  const gex = document.getElementById('gantt-exportable')
  const gexOut = document.getElementById('gantt-export-output')
  if (gex && gexOut) {
    gex.tasks = [
      { id: 'x1', name: '需求', start: '2026-03-02', end: '2026-03-06' },
      { id: 'x2', name: '开发', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'x1' }] },
    ]
    document.getElementById('gantt-export')?.addEventListener('click', () => {
      gexOut.textContent = JSON.stringify(gex.tasks)
    })
  }

  // 工作日日历 demo
  const wd = document.getElementById('gantt-workdays')
  if (wd) {
    wd.tasks = [
      { id: 'w1', name: '需求', start: '2026-03-02', end: '2026-03-06' },
      { id: 'w2', name: '开发', start: '2026-03-09', end: '2026-03-13', dependencies: [{ id: 'w1', lag: 2 }] },
    ]
  }
})
</script>

## API

### oas-gantt

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `auto-schedule` | 依赖联动排程（布尔，默认关）：日期变更（拖拽/键盘/updateTask/updateTasks）或依赖增改后，按 FS/SS/FF/SF 沿依赖图对后继做最小前推（只推迟不提前、保持工期），跳过 disabled 与摘要行，成环安全；派发 oas-reschedule | `string` | — |
| `creatable` | 行内新建（布尔，默认关）：开启后行尾出「＋」（摘要行加子级、叶子行加同级后继）、双击空白区按落点日期建任务，新建后进入行内重命名；只读/任务级禁用行不出按钮 | `boolean` | — |
| `dates-readonly` | 禁改期/拉伸（进度仍可拖） | `boolean` | — |
| `expanded` | 已展开集合（JSON 数组，受控）：属性缺席缺省全展开；显式 [] 全收起；点折叠钮写回 | `string` | — |
| `first-day-of-week` | 周起始日（0-6）；缺省按 locale 推导（week 档对齐用） | `string` | — |
| `group-by-project` | 按任务 project 自动生成项目根摘要（行 id 为 __oas_project__:&lt;project&gt;），原任务数组不变；windowed 模式要求宿主自行展平，不做自动分组 | `string` | — |
| `height` | 组件高度 px（默认 320；接受纯数字或 Npx）：映射到自定义属性 --oas-gantt-height。高度挂在内部画布（.gantt）上——宿主自身 height 内联只框定外盒，内部画布高度仍由 height 属性 / --oas-gantt-height 决定（不会被宿主内联 height 拉伸）；整体调高请用 height 属性或 --oas-gantt-height。height 属性在场且为合法值（>0 纯数字或 Npx）时组件接管该变量，写入宿主内联并覆盖宿主自己设置的 --oas-gantt-height；空串/空白按未设置处理；非法值不写该变量、仅清除本实例此前写入的值，宿主 token 不受影响；属性移除后组件写入的值归零清除，高度回落 token 缺省 320 或宿主 CSS，宿主原先内联设置的值不恢复；从未设置 height 属性时组件不写该变量，宿主内联或 class 规则设置的 --oas-gantt-height 完全不受影响 | `string` | `320` |
| `holidays` | 假日列表（JSON ["YYYY-MM-DD",…]）：对应列高亮（优先于周末底色）；假日恒为非工作日（与 workdays 是否开启无关），auto-schedule 前推时跳过 | `string` | — |
| `label-position` | 任务条标签位置：inside 条内 / right 条旁 / left 条左；缺省 none（行名列已承载名称，条旁不再重复渲染）；非法值回落 none | `string` | — |
| `locale` | 本地化（覆盖 config-provider 注入与全局 locale） | `string` | — |
| `progress-readonly` | 禁改进度（改期仍可拖） | `boolean` | — |
| `range-end` | 宿主托管时间轴终点（ISO 日期 YYYY-MM-DD，含当日）：与 range-start 成对使用 | `string` | — |
| `range-start` | 宿主托管时间轴起点（ISO 日期 YYYY-MM-DD）：提供后轴范围不再由数据推导，配合 range-end 支撑窗口化（切片不含完整日期跨度） | `string` | — |
| `readonly` | 整图只读（禁改期/禁进度，不渲染拖拽手柄） | `boolean` | — |
| `row-height` | 行高 px（默认 36，下限 20） | `string` | `36` |
| `scale` | 时间刻度：hour / day（默认）/ week / month / quarter / year；非法值回落 day | `string` | — |
| `show-baseline` | 基线对比（布尔，默认关）：任务带 baseline 时在实际条下渲染基线条（baseline.progress 渲染进度覆盖层），title 标差值（比基线晚/早 N 天或一致） | `boolean` | — |
| `show-critical-path` | 关键路径（布尔，默认关）：在依赖图与工期上算总时差，时差为 0 的任务加 .critical 高亮（颜色走 --oas-gantt-critical-color）；只读展示不改数据 | `string` | — |
| `show-float` | 显示总浮时/自由浮时（布尔，默认关）：仅在依赖图完整时计算，条上显示「总浮时/自由浮时」标签并写入 data-total-float/data-free-float（单位为天）；摘要不参与，windowed 模式跳过并 devWarn | `string` | — |
| `show-today` | 今日线（默认开；false 关闭） | `string` | — |
| `show-variance` | 任务带 baseline 时在行名后显示 Δ±Nd 偏差徽标，并写入 data-start-delta/data-end-delta/data-duration-delta/data-progress-delta；正值标红、负值标绿 | `string` | — |
| `snap` | 拖拽吸附当前刻度（默认开；false 按像素比例平移并保留时间精度） | `string` | — |
| `stripe` | 行斑马纹（布尔，默认关）：按**绝对行号**奇偶给行加底色（虚拟化/窗口化滚动稳定，不随 DOM 顺序跳变）；颜色走 `--oas-gantt-row-stripe-bg`（缺省 `--oas-color-bg-hover`）；选中/周末假日等背景覆盖条纹 | `string` | — |
| `tasks` | 甘特任务（JSON）：[{ id?, name, start, end?, type?, progress?, parent?, children?, dependencies?, color?, disabled?, expanded?, baseline?（start/end?/progress?）, deadline?, deadlines?, constraint?（asap/snet/mso/fnlt）, constraintDate? }]——扁平 parent 指针为主，嵌套 children 自动拍平；type:"milestone" 显式优先（带 end 也按里程碑渲染，end 忽略），有子任务时恒为摘要；无 end 亦推导为里程碑；start 晚于 end 自动交换 | `GanttTask[]` | `[]` |
| `total` | windowed 模式下的全量行（任务）数；为 0 或非法时 windowed 不生效（回落本地模式） | `string` | — |
| `weekends` | 周末列高亮（默认开；day/hour 档生效；false 关闭） | `string` | — |
| `window-start` | windowed 模式下切片首行的绝对行号（相对全量） | `string` | `0` |
| `windowed` | 服务端行窗口模式（布尔，默认关）：与 total / window-start 配合，宿主只喂可视窗口切片（按绝对行号渲染），期望行区间未被已装载覆盖时派发 oas-window-request 由宿主回填；本地跨全量能力（auto-schedule / 关键路径）在部分数据上会算错，已跳过并 devWarn。非 windowed 行为不变 | `boolean` | — |
| `workdays` | 工作日周几（JSON [0-6]，0=周日…6=周六；opt-in，缺省/空=不限制）：auto-schedule 前推结果吸附到下一个工作日（叠加 holidays） | `string` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `selection` | 选中任务 id 集合（`string[]`）：`el.selection` 读（拷贝）；`el.selection = [...]` 写（重渲染选中态 + 派发 oas-selection-change）；`removeTasks(ids)` 批量删除（连同后代） | `string[]` | — |
| `tasks` | 甘特任务（`GanttTask[]`）：`el.tasks` 读（拷贝，嵌套输入已拍平为 parent 指针）；`el.tasks = [...]` 写（同步 tasks 属性 + 重渲染 + 派发 oas-tasks-change） | `GanttTask[]` | `[]` |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-dependencies-change` | 连线拖拽建依赖 / 选中删除收口时派发，detail: { taskId, dependencies }（taskId 为依赖变化的后继任务） |
| `oas-expand-change` | 行树折叠/展开时派发，detail: { id, expanded } |
| `oas-progress-change` | 拖进度手柄收口时派发，detail: { id, task, progress } |
| `oas-range-request` | 宿主托管时间范围（range-start/range-end）且可视时间窗接近轴端点时派发，detail: { startMs, endMs, reason }（期望的相邻范围）；同一期望范围不重复派发 |
| `oas-reparent` | 行拖拽改父子 / 重排收口时派发，detail: { id, parent, index }（parent 为 null 表示根级，index 为同级序号） |
| `oas-reschedule` | 依赖联动排程改动了后继任务时派发（auto-schedule 开启），detail: { ids }（被联动改动的任务 id） |
| `oas-scale-change` | scale 属性变化时派发，detail: { scale }；首次吸收不派发 |
| `oas-selection-change` | 多选集合变化（点击 / 键盘 / property 写入）时派发，detail: { ids }（选中的任务 id 数组） |
| `oas-task-add` | 命令式新增任务后派发（addTask / duplicateTask / creatable 行内新建），detail: { id, task }（id 为新任务 id） |
| `oas-task-change` | 拖拽/拉伸/键盘改期收口（pointerup）时派发，detail: { id, task, oldStart, oldEnd, start, end }；零位移不派发 |
| `oas-task-click` | 点击任务条/里程碑时派发，detail: { id, task } |
| `oas-task-dblclick` | 双击任务条时派发，detail: { id, task }——宿主接编辑表单 |
| `oas-task-render` | 每条任务渲染后派发，detail: { task, element }——宿主可改写条内 DOM |
| `oas-tasks-change` | 任务数据变化（程序写 tasks / updateTask / 拖拽写回）时派发，detail: { tasks } |
| `oas-window-request` | windowed 模式下期望行窗口未被已装载区间覆盖时派发，detail: { start, end, reason }（半开区间、绝对行号；reason 为 init / scroll / resize / data）；同一期望区间不重复派发 |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `template[slot="empty"]` | 空数据态内容（缺省「暂无任务」） |
| `template[slot="row"]` | 行名列自定义模板（每行克隆进 .name；[data-task-name] 自动填任务名；可内含控件以渲染/编辑负责人等自定义字段，行拖拽与选中不会劫持其中控件） |
| `template[slot="task"]` | 任务条标签模板（克隆进条身，[data-task-name] 节点自动填任务名） |
| `template[slot="tooltip"]` | 悬停浮层模板（[data-task-name] / [data-task-range] / [data-task-progress] 绑定点） |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-gantt-bar-bg` | — | `color-mix(in srgb, var(--oas-gantt-bar-color, var(--oas-color-primary)) 22%, var(--oas-color-bg))` |
| `--oas-gantt-bar-height` | — | `22px` |
| `--oas-gantt-bar-progress-bg` | — | `var(--oas-gantt-bar-color, var(--oas-color-primary))` |
| `--oas-gantt-baseline-color` | 基线条颜色（默认半透明次要文字色） | `color-mix(in srgb, var(--oas-color-text-secondary-strong) 55%, transparent)` |
| `--oas-gantt-baseline-progress-color` | — | `var(--oas-color-text-secondary-strong)` |
| `--oas-gantt-conflict-color` | 违约（负总时差）高亮色（默认 --oas-color-danger） | `var(--oas-color-danger)` |
| `--oas-gantt-critical-color` | 关键路径高亮色（默认 --oas-color-danger） | `var(--oas-color-danger)` |
| `--oas-gantt-deadline-color` | 截止日标记颜色（默认 --oas-color-danger） | `var(--oas-color-danger)` |
| `--oas-gantt-grid-line-color` | — | `var(--oas-color-border)` |
| `--oas-gantt-header-bg` | — | `var(--oas-color-bg)` |
| `--oas-gantt-header-height` | — | `44px` |
| `--oas-gantt-height` | — | `320px` |
| `--oas-gantt-holiday-bg` | — | `color-mix(in srgb, var(--oas-color-warning) 12%, transparent)` |
| `--oas-gantt-link-color` | — | `var(--oas-color-primary)` |
| `--oas-gantt-list-width` | — | `220px` |
| `--oas-gantt-milestone-color` | — | `var(--oas-color-warning)` |
| `--oas-gantt-row-height` | — | `36px` |
| `--oas-gantt-row-stripe-bg` | — | `var(--oas-color-bg-hover)` |
| `--oas-gantt-summary-bg` | — | `var(--oas-color-text-secondary-strong)` |
| `--oas-gantt-today-color` | — | `var(--oas-color-danger)` |
| `--oas-gantt-weekend-bg` | — | `color-mix(in srgb, var(--oas-color-bg-hover) 60%, transparent)` |
