# ToggleGroup 切换组

单选/多选互斥的按钮组：单选组用 radio 语义、多选组用 checkbox 语义，键盘方向键与 Home/End 导航，受控 `value`。支持尺寸档、纵向、贴合形态、项图标、强制选中、多选上限、满宽均分、选中色与校验态。

## 何时用 ToggleGroup，何时用 ButtonGroup

- **oas-toggle-group（本组件）**：**状态选择**——`value` 受控的「选中状态集合」，radio/checkbox 语义（`aria-checked`）、单选/多选、roving 键盘、mandatory / max-count / status 等表单能力。适合视图切换、筛选条件、富文本样式开关等状态机场景。
- **oas-button-group**：**动作编排**——组内按钮各自触发动作（`oas-click`），无选中状态语义；它也保留了 `value` / `multiple` 的选值形态，新代码的状态选择场景推荐使用 toggle-group（ARIA 语义与键盘模型更完整）。

## 单选

不设 `multiple` 时为单选（`role="radiogroup"` + `radio`），`value` 为字符串，同一时刻只有一项按下。

<DemoBlock title="单选">
  <oas-toggle-group id="tg-single" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
  <span id="tg-single-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前：day</span>
</DemoBlock>

## 多选

设置 `multiple` 后为多选（`role="group"` + `checkbox`），`value` 为 JSON 数组字符串。

<DemoBlock title="多选">
  <oas-toggle-group id="tg-multi" multiple items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toggle-group>
  <span id="tg-multi-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">当前：[]</span>
</DemoBlock>

## 禁用

项级 `disabled: true` 禁选；禁用项不参与键盘导航。

<DemoBlock title="禁用项">
  <oas-toggle-group items='[{"label":"可编辑","value":"editable"},{"label":"只读","value":"readonly","disabled":true},{"label":"可删除","value":"deletable"}]'></oas-toggle-group>
</DemoBlock>

## 受控选中（value）

`value` 为受控通道：单选为字符串、多选为 JSON 数组字符串；外部设置属性即时反映到选中态（组内点击也会回写该属性）。以下用按钮外部驱动选中：

<DemoBlock title="受控 value">
  <oas-toggle-group id="tg-controlled" value="week" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
  <oas-toggle-group id="tg-controlled-multi" multiple value='["bold"]' items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"}]'></oas-toggle-group>
  <oas-button id="tg-set-day" size="small">单选：日</oas-button>
  <oas-button id="tg-set-month" size="small">单选：月</oas-button>
  <oas-button id="tg-set-multi" size="small">多选：斜体+下划线</oas-button>
</DemoBlock>

预设 `value="week"` / `value='["bold"]'` 使两个组初始即带选中态；按钮外部写入 `value` 属性后选中态即时切换。

## 子元素声明式通道

除 `items` JSON 外，可用 `<oas-toggle-item>` 子元素声明式书写选项（`items` 属性*显式设置时优先*，未设置时解析子元素收敛到同一渲染路径）。默认插槽文本为 label，属性对齐 `ToggleItem` 字段：`value` / `disabled` / `icon` / `aria-label`。子元素增删、属性与文本变化会自动重渲染（MutationObserver）；单选/多选（`multiple`）语义与 items 通道完全一致。

<DemoBlock title="子元素声明式（单选 + 多选）">
  <oas-space size="small">
    <oas-toggle-group id="tg-decl" value="week">
      <oas-toggle-item value="day">日</oas-toggle-item>
      <oas-toggle-item value="week">周</oas-toggle-item>
      <oas-toggle-item value="month" disabled>月（禁用）</oas-toggle-item>
    </oas-toggle-group>
    <oas-toggle-group id="tg-decl-multi" multiple>
      <oas-toggle-item value="bold">加粗</oas-toggle-item>
      <oas-toggle-item value="italic">斜体</oas-toggle-item>
      <oas-toggle-item value="underline">下划线</oas-toggle-item>
    </oas-toggle-group>
    <oas-button id="tg-decl-add" size="small">动态追加一项</oas-button>
  </oas-space>
</DemoBlock>

## 尺寸档（size）

`size` 三档 `small` / `medium`（默认）/ `large`，控高与字号对齐全局 token；未显式设置时就近读取 config-provider 的 `size` 注入（全局密度联动）。表格行内用 small、筛选条用 large：

<DemoBlock title="尺寸档">
  <oas-space size="small" direction="vertical">
    <oas-toggle-group size="small" value="day" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group value="day" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group size="large" value="day" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
  </oas-space>
</DemoBlock>

## 图标与纯图标项（icon / icon-only）

`items` 项加 `icon` 字段（或子元素 `icon` 属性）在文字前渲染图标（`@oas-ui/icons` 注册表图标名）。**无 label 的图标项自动进入纯图标形态**（等宽正方形），可访问名兜底取图标名，建议用 `ariaLabel` 字段提供更准确的名称；有 label 的项也可用 `ariaLabel` 覆盖可访问名（如富文本的「B」读作「加粗」）。

富文本工具栏是经典场景——字样样式用多选、对齐方式用单选：

<DemoBlock title="富文本工具栏（多选 + 单选 + 纯图标）">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <oas-toggle-group id="tg-rt-style" multiple attached value='["bold"]' aria-label="文字样式">
        <oas-toggle-item value="bold" aria-label="加粗">B</oas-toggle-item>
        <oas-toggle-item value="italic" aria-label="斜体">I</oas-toggle-item>
        <oas-toggle-item value="underline" aria-label="下划线">U</oas-toggle-item>
        <oas-toggle-item value="strike" aria-label="删除线">S</oas-toggle-item>
      </oas-toggle-group>
      <oas-toggle-group id="tg-rt-align" attached value="left" aria-label="对齐方式">
        <oas-toggle-item value="left">左对齐</oas-toggle-item>
        <oas-toggle-item value="center">居中</oas-toggle-item>
        <oas-toggle-item value="right">右对齐</oas-toggle-item>
      </oas-toggle-group>
      <oas-toggle-group id="tg-rt-insert" multiple aria-label="插入元素">
        <oas-toggle-item value="star" icon="star" aria-label="收藏标记"></oas-toggle-item>
        <oas-toggle-item value="link" icon="external-link" aria-label="外部链接"></oas-toggle-item>
        <oas-toggle-item value="clock" icon="clock" aria-label="定时提醒"></oas-toggle-item>
      </oas-toggle-group>
    </oas-space>
    <span id="tg-rt-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">样式: bold | 对齐: left</span>
  </oas-space>
</DemoBlock>

## 纵向排布（vertical）

`vertical` 布尔属性切换为纵向组（同步 `aria-orientation="vertical"`），与纯图标组合是视图切换的经典形态：

<DemoBlock title="纵向视图切换（vertical + 纯图标单选）">
  <oas-space size="large">
    <oas-toggle-group id="tg-view-v" vertical value="list" aria-label="视图切换">
      <oas-toggle-item value="list" icon="menu" aria-label="列表视图"></oas-toggle-item>
      <oas-toggle-item value="detail" icon="form" aria-label="详情视图"></oas-toggle-item>
      <oas-toggle-item value="favorite" icon="star" aria-label="收藏视图"></oas-toggle-item>
    </oas-toggle-group>
    <oas-toggle-group id="tg-view-t" vertical attached value="list" aria-label="紧凑视图切换">
      <oas-toggle-item value="list" icon="menu" aria-label="列表视图"></oas-toggle-item>
      <oas-toggle-item value="detail" icon="form" aria-label="详情视图"></oas-toggle-item>
      <oas-toggle-item value="favorite" icon="star" aria-label="收藏视图"></oas-toggle-item>
    </oas-toggle-group>
    <span id="tg-view-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">视图：list</span>
  </oas-space>
</DemoBlock>

右侧为 `attached` 纵向贴合形态。长选项组纵向排布（带文字）同理：`vertical` + 普通 items 即可。

## 贴合形态（attached）

默认**分离**（按钮间有 gap、各自圆角，维持现状）；`attached` 布尔属性开启**贴合**——间距归零、相邻边框合并为 1px、仅组两端保留圆角（横向左右合并、纵向上下合并，逻辑属性适配 RTL）。hover / 聚焦 / 选中项自动浮于邻项之上，边框不被压线：

<DemoBlock title="分离（默认）与贴合（attached）对照">
  <oas-space size="small" direction="vertical">
    <oas-toggle-group value="week" aria-label="分离形态" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"},{"label":"季","value":"quarter"}]'></oas-toggle-group>
    <oas-toggle-group attached value="week" aria-label="贴合形态" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"},{"label":"季","value":"quarter"}]'></oas-toggle-group>
    <oas-toggle-group attached multiple value='["day","month"]' aria-label="贴合多选" items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"},{"label":"删除线","value":"strike"}]'></oas-toggle-group>
  </oas-space>
</DemoBlock>

## 满宽均分（spread）

`spread` 布尔属性使组占满父容器宽度、选项等宽均分（移动端操作栏 / 筛选条形态）；纵向组同样占满宽度：

<DemoBlock title="移动端操作栏（spread）">
  <div style="width: 100%; max-width: 420px">
    <oas-toggle-group id="tg-spread" spread attached value="all" aria-label="筛选范围" items='[{"label":"全部","value":"all"},{"label":"待办","value":"todo"},{"label":"已完成","value":"done"},{"label":"已取消","value":"cancelled"}]'></oas-toggle-group>
  </div>
</DemoBlock>

## 强制选中（mandatory）

- `mandatory`（布尔）：**多选最后一项不可取消**（点击/键盘拦截，不派发事件）；单选为 radio 语义天然不可全空，无感保持。
- `mandatory="force"`：蕴含上述拦截，并在**空态时自动选第一个非禁用项**——初始无 value、value 被清空、value 指向不存在的项、选项动态变化后落空，都会自动兜底。向导流（日/周/月必须选一个）零宿主代码：

<DemoBlock title="强制选中（force 向导流 + 多选 mandatory）">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">统计周期（force，初始未设 value）：</span>
      <oas-toggle-group id="tg-force" mandatory="force" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
    </oas-space>
    <oas-space size="small">
      <span style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">导出格式（多选 mandatory，至少保留一项）：</span>
      <oas-toggle-group id="tg-mandatory" multiple mandatory value='["pdf"]' items='[{"label":"PDF","value":"pdf"},{"label":"Excel","value":"excel"},{"label":"CSV","value":"csv"}]'></oas-toggle-group>
    </oas-space>
    <span id="tg-mandatory-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">周期: day | 格式: pdf</span>
  </oas-space>
</DemoBlock>

注意：`force` 的自动兜底**只回写 `value` 属性、不派发 `oas-change`**（非用户交互；value 属性即受控真相源），宿主监听属性变化或读取 value 即可。

## 多选上限（max-count）

`max-count`（仅 `multiple` 生效）限制最多选中数：**达上限后未选项置灰**（与禁用同视觉，`aria-disabled` 同步），点击/键盘拦截并派发 `oas-exceed-limit`（`detail: { value, max }`）；**已选项仍可取消**，取消后未选项恢复可选。非法值 / `0` / 负数视为无上限；单选模式不生效：

<DemoBlock title="多选上限（max-count + oas-exceed-limit）">
  <oas-space size="small" direction="vertical">
    <oas-toggle-group id="tg-max" multiple max-count="2" value='["bold"]' aria-label="样式（最多两项）" items='[{"label":"加粗","value":"bold"},{"label":"斜体","value":"italic"},{"label":"下划线","value":"underline"},{"label":"删除线","value":"strike"}]'></oas-toggle-group>
    <span id="tg-max-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">已选 1 / 2</span>
  </oas-space>
</DemoBlock>

## 选中色（color）

`color` 按 ui-spec 统一协议解析：任意 CSS 色值（`#0e7490` / `rgb(...)`，实底文字色按亮度自动取黑/白）优先；11 预设名（`magenta / red / volcano / orange / gold / lime / green / cyan / blue / geekblue / purple`）解析为 `--oas-preset-*` token（明暗主题自适应）；缺省主色。主题级批量定制走 CSS 变量 `--oas-toggle-color` / `--oas-toggle-on-color`：

<DemoBlock title="选中色（color）">
  <oas-space size="small">
    <oas-toggle-group color="purple" value="week" aria-label="紫色选中态" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group color="cyan" value="week" aria-label="青色选中态" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
    <oas-toggle-group color="#0e7490" value="week" aria-label="自定义色选中态" items='[{"label":"日","value":"day"},{"label":"周","value":"week"},{"label":"月","value":"month"}]'></oas-toggle-group>
  </oas-space>
</DemoBlock>

## 表单校验（status）

`status` 三态 `success` / `warning` / `error`：未选项边框着语义色、选中项整块着色、focus ring 同步染色；`error` 联动宿主 `aria-invalid`（宿主自设 `aria-invalid="true"` 等效 error 视觉）。提交校验场景：

<DemoBlock title="表单校验（status）">
  <oas-space size="small" direction="vertical">
    <oas-space size="small">
      <span style="font-size: var(--oas-font-size-sm)">接收渠道：</span>
      <oas-toggle-group id="tg-status" multiple aria-label="接收渠道" items='[{"label":"站内信","value":"inbox"},{"label":"邮件","value":"mail"},{"label":"短信","value":"sms"}]'></oas-toggle-group>
      <oas-button id="tg-status-submit" size="small" type="primary">保存</oas-button>
    </oas-space>
    <span id="tg-status-msg" style="font-size: var(--oas-font-size-sm); color: var(--oas-color-danger)">请至少选择一种接收渠道</span>
  </oas-space>
</DemoBlock>

## 事件

点击或键盘切换派发 `oas-change`，单选 `detail: { value: string }`，多选 `detail: { value: string[] }`。

<DemoBlock title="变化事件">
  <oas-toggle-group id="tg-event" items='[{"label":"左","value":"left"},{"label":"中","value":"center"},{"label":"右","value":"right"}]'></oas-toggle-group>
  <span id="tg-event-out" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">oas-change: { value: "left" }</span>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const single = document.getElementById('tg-single')
  const singleOut = document.getElementById('tg-single-out')
  single?.addEventListener('oas-change', (e) => {
    single.setAttribute('value', e.detail.value)
    singleOut.textContent = `当前：${e.detail.value}`
  })

  const multi = document.getElementById('tg-multi')
  const multiOut = document.getElementById('tg-multi-out')
  multi?.addEventListener('oas-change', (e) => {
    multi.setAttribute('value', JSON.stringify(e.detail.value))
    multiOut.textContent = `当前：${JSON.stringify(e.detail.value)}`
  })

  const evt = document.getElementById('tg-event')
  const evtOut = document.getElementById('tg-event-out')
  evt?.addEventListener('oas-change', (e) => {
    evt.setAttribute('value', e.detail.value)
    evtOut.textContent = `oas-change: { value: "${e.detail.value}" }`
  })

  // 受控 value demo：外部驱动选中态
  document.getElementById('tg-set-day')?.addEventListener('click', () => {
    document.getElementById('tg-controlled')?.setAttribute('value', 'day')
  })
  document.getElementById('tg-set-month')?.addEventListener('click', () => {
    document.getElementById('tg-controlled')?.setAttribute('value', 'month')
  })
  document.getElementById('tg-set-multi')?.addEventListener('click', () => {
    document.getElementById('tg-controlled-multi')?.setAttribute('value', '["italic","underline"]')
  })

  // 子元素声明式通道：动态追加（MutationObserver 自动刷新）
  const decl = document.getElementById('tg-decl')
  document.getElementById('tg-decl-add')?.addEventListener('click', () => {
    if (!decl) return
    const n = decl.children.length + 1
    const item = document.createElement('oas-toggle-item')
    item.setAttribute('value', `dyn-${n}`)
    item.textContent = `动态 ${n}`
    decl.appendChild(item)
  })

  // 富文本工具栏：样式多选 + 对齐单选 + 插入多选，联动输出
  const rtStyle = document.getElementById('tg-rt-style')
  const rtAlign = document.getElementById('tg-rt-align')
  const rtInsert = document.getElementById('tg-rt-insert')
  const rtOut = document.getElementById('tg-rt-out')
  const rtRender = () => {
    const style = rtStyle ? JSON.parse(rtStyle.getAttribute('value') || '[]').join(', ') || '无' : ''
    const align = rtAlign?.getAttribute('value') || ''
    const insert = rtInsert ? JSON.parse(rtInsert.getAttribute('value') || '[]').join(', ') || '无' : ''
    if (rtOut) rtOut.textContent = `样式: ${style} | 对齐: ${align} | 插入: ${insert}`
  }
  ;[rtStyle, rtAlign, rtInsert].forEach((g) =>
    g?.addEventListener('oas-change', (e) => {
      g.setAttribute('value', Array.isArray(e.detail.value) ? JSON.stringify(e.detail.value) : e.detail.value)
      rtRender()
    }),
  )

  // 纵向视图切换
  const viewV = document.getElementById('tg-view-v')
  const viewT = document.getElementById('tg-view-t')
  const viewOut = document.getElementById('tg-view-out')
  const viewRender = () => {
    if (viewOut) viewOut.textContent = `视图：${viewV?.getAttribute('value') || ''}`
  }
  ;[viewV, viewT].forEach((g) =>
    g?.addEventListener('oas-change', (e) => {
      g?.setAttribute('value', e.detail.value)
      if (g !== viewV && viewV) viewV.setAttribute('value', e.detail.value)
      if (g !== viewT && viewT) viewT.setAttribute('value', e.detail.value)
      viewRender()
    }),
  )

  // 强制选中：force 兜底与 mandatory 拦截后的 value 读取
  const force = document.getElementById('tg-force')
  const mandatory = document.getElementById('tg-mandatory')
  const mandatoryOut = document.getElementById('tg-mandatory-out')
  const mandatoryRender = () => {
    if (mandatoryOut) {
      const fmt = mandatory ? JSON.parse(mandatory.getAttribute('value') || '[]').join(', ') : ''
      mandatoryOut.textContent = `周期: ${force?.getAttribute('value') || ''} | 格式: ${fmt}`
    }
  }
  ;[force, mandatory].forEach((g) => g?.addEventListener('oas-change', (e) => {
    g.setAttribute('value', Array.isArray(e.detail.value) ? JSON.stringify(e.detail.value) : e.detail.value)
    mandatoryRender()
  }))

  // 多选上限：oas-exceed-limit 可见反馈
  const max = document.getElementById('tg-max')
  const maxOut = document.getElementById('tg-max-out')
  const maxRender = () => {
    if (!max || !maxOut) return
    const n = JSON.parse(max.getAttribute('value') || '[]').length
    maxOut.textContent = `已选 ${n} / 2`
    maxOut.style.color = 'var(--oas-color-text-secondary)'
  }
  max?.addEventListener('oas-change', (e) => {
    max.setAttribute('value', JSON.stringify(e.detail.value))
    maxRender()
  })
  max?.addEventListener('oas-exceed-limit', (e) => {
    if (maxOut) {
      maxOut.textContent = `已达上限（${e.detail.max} 项），先取消一项再选「${e.detail.value}」`
      maxOut.style.color = 'var(--oas-color-warning)'
    }
  })

  // 表单校验：提交时按选中态切换 status，给出可见反馈
  const status = document.getElementById('tg-status')
  const statusMsg = document.getElementById('tg-status-msg')
  const renderStatus = () => {
    if (!status || !statusMsg) return
    const picked = JSON.parse(status.getAttribute('value') || '[]').length > 0
    status.setAttribute('status', picked ? 'success' : 'error')
    statusMsg.textContent = picked ? '已保存' : '请至少选择一种接收渠道'
    statusMsg.style.color = picked ? 'var(--oas-color-success)' : 'var(--oas-color-danger)'
  }
  status?.addEventListener('oas-change', (e) => {
    status.setAttribute('value', JSON.stringify(e.detail.value))
    renderStatus()
  })
  document.getElementById('tg-status-submit')?.addEventListener('click', renderStatus)
})
</script>

## API

### oas-toggle-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 组可访问名（宿主覆盖；缺省走 locale 兜底） | — | — |
| `attached` | 贴合形态：邻接项共享边线、首尾圆角（默认分离） | — | — |
| `color` | 选中色：预设名或任意 CSS 色值（自动算文字色） | `string` | — |
| `disabled` | 禁用整个切换组（自身显式禁用，或经 config-provider 全局禁用注入继承） | `boolean` | — |
| `items` | 选项 JSON（property 赋值单向反射 attribute） | `ToggleItem[] \| string` | `[]` |
| `mandatory` | 强制选中：布尔=唯一选中项不可取消；`force`=空态自动选首个非禁用项（向导流零代码） | — | — |
| `max-count` | 多选上限：达上限未选项置灰并派 oas-exceed-limit，已选项仍可取消 | `string` | — |
| `multiple` | 多选模式（checkbox 语义） | `boolean` | — |
| `size` | 尺寸档位 `small` / `medium`（默认）/ `large` | `string` | `medium` |
| `spread` | 满宽等分（对齐 button-group 的 spread） | — | — |
| `status` | 校验态：`error` / `warning` / `success`（未选项边框色 + 选中项整块着色） | `string` | — |
| `value` | 当前值：单选为字符串；多选为 JSON 数组字符串 | `string` | `[]` |
| `vertical` | 纵向排列（联动 aria-orientation 与轴向键） | `boolean` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 切换，`detail: { value: string \| string[] }` |
| `oas-exceed-limit` | 达 max-count 上限后的越界选择尝试，`detail: { value, max }` |

### oas-toggle-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `aria-label` | 该项可访问名（纯图标项必填语义；缺省由图标名派生） | — | — |
| `disabled` | 禁用该项（点击不可选，方向键跳过） | — | — |
| `icon` | 图标（oas-icon 图标名）；label 可省（纯图标项） | — | — |
| `value` | 选项值（子元素声明式通道的数据载体字段） | — | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | 按钮文案（默认插槽文本） |

`ToggleItem` 字段：

| 字段       | 说明         | 类型      |
| ---------- | ------------ | --------- |
| `label`    | 按钮文案（icon-only 项可省略） | `string`  |
| `value`    | 值（随事件回传） | `string`  |
| `disabled` | 禁用该项     | `boolean` |
| `icon`     | 前置图标（`@oas-ui/icons` 注册表图标名）；无 label 时进入纯图标形态 | `string`  |
| `ariaLabel` | 项级可访问名称覆盖（缺省：label 文本；icon-only 时兜底图标名） | `string`  |

键盘：单选模式方向键移动并选中（radio 组惯例）；多选模式方向键移动焦点（roving tabindex）、Space/Enter 切换；Home/End 直达首/末可用项（跳过禁用项）。容器 `role="radiogroup"` / `role="group"` + `aria-label`（宿主 `aria-label` 属性覆盖 locale 兜底），选中项 `aria-checked`；`vertical` 同步 `aria-orientation="vertical"`。
