# Dropdown 下拉菜单

点击触发器展开菜单，浮层定位到触发元素旁。

## 基础用法

<DemoBlock title="点击触发">
  <oas-dropdown items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]' placement="bottom">
    <oas-button type="primary">操作</oas-button>
  </oas-dropdown>
</DemoBlock>

## 触发方式

`trigger` 控制触发方式：`click`（默认）/ `hover` / `focus`，可空格分隔多选（如 `"click hover"`）。hover 触发时 `hover-delay` / `hover-hide-delay` 控制开合防抖延时（默认 150 / 100ms，无延时 hover 会闪开闪关）；悬停区域为触发器 + 浮层面板（跨间隙移动不闪关）。

<DemoBlock title="悬停触发">
  <oas-dropdown trigger="hover" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button>悬停打开</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="聚焦触发">
  <oas-dropdown trigger="focus" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button>聚焦打开（Tab 或点击聚焦）</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="多触发（click + hover）">
  <oas-dropdown trigger="click hover" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button>点击或悬停</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="自定义开合延时">
  <oas-space size="small">
    <oas-dropdown trigger="hover" hover-delay="400" items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>hover-delay=400</oas-button>
    </oas-dropdown>
    <oas-dropdown trigger="hover" hover-hide-delay="400" items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>hover-hide-delay=400</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
  <oas-dropdown placement="top" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>上</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="bottom" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>下</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="left" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>左</oas-button>
  </oas-dropdown>
  <oas-dropdown placement="right" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>右</oas-button>
  </oas-dropdown>
</DemoBlock>

## 12 向放置

`placement` 支持 12 向：四基向 `top / bottom / left / right` 各配 `-start` / `-end` 交叉轴对齐（`bottom-start` 面板左缘对齐触发器左缘，是最常见形态）。空间不足沿主轴翻转时对齐后缀保留（`bottom-start` → `top-start`），对齐后仍做视口夹取。

<DemoBlock title="12 向放置">
  <oas-space size="small">
    <oas-dropdown placement="bottom-start" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>bottom-start</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="bottom-end" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>bottom-end</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="right-start" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>right-start</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="top-end" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>top-end</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## 多级子菜单

items 项支持 `children` 数组级联子菜单（任意层级），hover / 点击展开，选中叶子项后自动收回并关闭；浮层菜单复用了 `oas-menu` 渲染，多级子菜单贴近视口边缘时自动向左 / 向上翻转保证完整可见。

<DemoBlock title="多级子菜单">
  <oas-dropdown items='[{"label":"文件","value":"file","children":[{"label":"新建","value":"new","children":[{"label":"文件","value":"new-file"},{"label":"窗口","value":"new-window"}]},{"label":"打开","value":"open"}]},{"label":"编辑","value":"edit"}]'>
    <oas-button>更多操作</oas-button>
  </oas-dropdown>
</DemoBlock>

## 禁用项

<DemoBlock title="禁用项">
  <oas-dropdown items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete","disabled":true}]'>
    <oas-button>操作</oas-button>
  </oas-dropdown>
</DemoBlock>

## 整体禁用

`disabled` 禁用整个下拉：点击 / 悬停 / 聚焦均不响应，拆分箭头按钮置灰，宿主降饱和（opacity .6）并同步 `aria-disabled`。

<DemoBlock title="整体禁用">
  <oas-space size="small">
    <oas-dropdown disabled items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>禁用（click）</oas-button>
    </oas-dropdown>
    <oas-dropdown disabled split items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>禁用（split）</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## 箭头

菜单面板带指向触发元素的箭头。`arrow` 属性控制显隐（默认显示，`arrow="false"` 隐藏）；`arrow-point-at-center` 让箭头固定指向面板中心（默认按触发元素投影定位，面板被视口避让偏移时箭头仍指向触发元素）；`auto-adjust-overflow` 控制视口空间不足时是否自动翻转（默认开启）。

<DemoBlock title="带箭头">
  <oas-dropdown id="dd-arrow" placement="bottom" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button type="primary">带箭头</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="箭头显隐">
  <oas-space size="small">
    <oas-dropdown items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>默认（箭头）</oas-button>
    </oas-dropdown>
    <oas-dropdown id="dd-arrow-none" arrow="false" items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>arrow="false"</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

<DemoBlock title="箭头指向中心与关闭翻转">
  <oas-space size="small">
    <oas-dropdown arrow-point-at-center items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>arrow-point-at-center</oas-button>
    </oas-dropdown>
    <oas-dropdown auto-adjust-overflow="false" items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>auto-adjust-overflow="false"</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

## 选择事件

<DemoBlock title="选择事件">
  <oas-dropdown id="dd-event" onoas-select="ddLog(event)" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button>选择操作</oas-button>
  </oas-dropdown>
  <oas-tag id="dd-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 选中不关闭

`hide-on-click` 控制选中菜单项后是否关闭（默认 `true` 选中即关；`"false"` 时保持打开，适合多选 / 勾选场景）。

<DemoBlock title="选中不关闭">
  <oas-dropdown id="dd-keep" hide-on-click="false" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button>选中不关闭</oas-button>
  </oas-dropdown>
  <oas-tag id="dd-keep-result" type="info">尚未选择</oas-tag>
</DemoBlock>

## 受控显示

`open` 属性受控：外部按钮设置 / 移除 `open` 控制菜单显隐（点击外部 / Esc / 选择后仍会关闭）。

<DemoBlock title="受控显示（open 属性）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="event.stopPropagation; ddOpen(true)">打开</oas-button>
    <oas-button size="small" onclick="event.stopPropagation; ddOpen(false)">关闭</oas-button>
    <oas-tag id="dd-open-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-dropdown id="dd-ctrl" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>触发元素</oas-button>
  </oas-dropdown>
</DemoBlock>

## 开合事件反馈

组件自己开关（点击 / 悬停 / 聚焦 / Esc / 外部点击 / 选中）都会派发 `oas-open-change`（`detail: { open }`），受控模式下宿主据此同步状态（与 tooltip / popover 语义一致，外部写 `open` 同样触发）。

<DemoBlock title="oas-open-change 事件">
  <oas-space size="small">
    <oas-dropdown id="dd-open-change" trigger="click hover" onoas-open-change="ddOpenChange(event)" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>点击或悬停试试</oas-button>
    </oas-dropdown>
    <oas-tag id="dd-open-change-status" type="info">open: false</oas-tag>
  </oas-space>
</DemoBlock>

## 偏移与滚动

`offset` 调整浮层与触发器的间距（默认 8px）。页面滚动时浮层默认跟随触发器重算位置（fixed 定位与页面脱节修复）；`close-on-scroll` 改为滚动即关闭。

<DemoBlock title="偏移（offset）">
  <oas-space size="small">
    <oas-dropdown placement="bottom-start" items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>默认（8px）</oas-button>
    </oas-dropdown>
    <oas-dropdown placement="bottom-start" offset="16" items='[{"label":"编辑","value":"edit"}]'>
      <oas-button>offset=16</oas-button>
    </oas-dropdown>
  </oas-space>
</DemoBlock>

<DemoBlock title="滚动关闭（close-on-scroll）">
  <oas-dropdown id="dd-scroll" close-on-scroll items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
    <oas-button>打开后滚动页面试试</oas-button>
  </oas-dropdown>
</DemoBlock>

## 受控选中项

`value` 属性受控：外部设置 `value` 指定选中项（下拉菜单无勾选标识，用标签实时回显当前值）；选择菜单项同样会更新 `value` 并派发 `oas-select`。

<DemoBlock title="受控选中（value 属性）">
  <oas-space size="small">
    <oas-button size="small" onclick="ddValue('edit')">选中「编辑」</oas-button>
    <oas-button size="small" onclick="ddValue('copy')">选中「复制」</oas-button>
    <oas-button size="small" onclick="ddValue('')">清除</oas-button>
    <oas-tag id="dd-value-status" type="info">value: -</oas-tag>
  </oas-space>
  <oas-dropdown id="dd-value" onoas-select="ddValueLog(event)" items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button>选择操作</oas-button>
  </oas-dropdown>
</DemoBlock>

## 拆分下拉按钮

`split` 属性开启下拉按钮模式：主按钮 + 拆分箭头按钮。点箭头展开菜单，点主按钮派发 `oas-action`（绑定执行主操作，如保存）；菜单选择仍走 `oas-select`。

<DemoBlock title="拆分下拉按钮">
  <oas-dropdown split items='[{"label":"编辑","value":"edit"},{"label":"复制","value":"copy"},{"label":"删除","value":"delete"}]'>
    <oas-button type="primary">保存并提交</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="主按钮动作事件">
  <oas-space size="small">
    <oas-dropdown id="dd-split" split onoas-action="ddSplitAction(event)" items='[{"label":"编辑","value":"edit"},{"label":"删除","value":"delete"}]'>
      <oas-button>更多操作</oas-button>
    </oas-dropdown>
    <oas-tag id="dd-split-result" type="info">尚未点击</oas-tag>
  </oas-space>
</DemoBlock>

## 加载中菜单项

菜单项配置 `loading: true` 即进入加载态：该项显示旋转 spinner、禁点（点击 / 键盘 / hover 均拦截），异步完成后更新 `items` 移除 `loading` 即恢复。下面的异步演示：选择「保存」后该项转圈禁点约 1.5 秒，随后恢复。

<DemoBlock title="loading 菜单项">
  <oas-dropdown items='[{"label":"保存","value":"save"},{"label":"同步中…","value":"syncing","loading":true},{"label":"删除","value":"delete"}]'>
    <oas-button>操作</oas-button>
  </oas-dropdown>
</DemoBlock>

<DemoBlock title="异步操作演示">
  <oas-space size="small">
    <oas-dropdown id="dd-async" onoas-select="ddAsyncLog(event)" items='[{"label":"保存","value":"save"},{"label":"另存为","value":"save-as"},{"label":"删除","value":"delete"}]'>
      <oas-button>选择操作</oas-button>
    </oas-dropdown>
    <oas-tag id="dd-async-status" type="info">尚未选择</oas-tag>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  window.ddLog = (e) => {
    const tag = document.getElementById('dd-result')
    if (tag) tag.textContent = `已选择：${e.detail.value}`
  }

  const ctrl = document.getElementById('dd-ctrl')
  const openStatus = document.getElementById('dd-open-status')
  if (ctrl && openStatus) {
    const syncOpen = () => {
      openStatus.textContent = `open: ${ctrl.hasAttribute('open')}`
    }
    window.ddOpen = (open) => {
      if (open) ctrl.setAttribute('open', '')
      else ctrl.removeAttribute('open')
    }
    syncOpen
    // 点击外部 / Esc / 选择后由组件移除 open，用 MutationObserver 保持状态同步
    new MutationObserver(syncOpen).observe(ctrl, { attributes: true, attributeFilter: ['open'] })
  }

  const val = document.getElementById('dd-value')
  const valueStatus = document.getElementById('dd-value-status')
  if (val && valueStatus) {
    const syncValue = () => {
      valueStatus.textContent = `value: ${val.getAttribute('value') || '-'}`
    }
    window.ddValue = (v) => {
      if (v) val.setAttribute('value', v)
      else val.removeAttribute('value')
    }
    window.ddValueLog = (e) => {
      val.setAttribute('value', e.detail.value)
    }
    syncValue
    // 选择菜单项由组件更新 value，用 MutationObserver 保持状态同步
    new MutationObserver(syncValue).observe(val, { attributes: true, attributeFilter: ['value'] })
  }

  window.ddSplitAction = (e) => {
    const tag = document.getElementById('dd-split-result')
    if (tag) tag.textContent = `主按钮已点击（${e.type}）`
  }

  const keepDd = document.getElementById('dd-keep')
  const keepResult = document.getElementById('dd-keep-result')
  if (keepDd && keepResult) {
    keepDd.addEventListener('oas-select', (e) => {
      keepResult.textContent = `已选择：${e.detail.value}（菜单保持打开）`
    })
  }

  const openChangeDd = document.getElementById('dd-open-change')
  const openChangeStatus = document.getElementById('dd-open-change-status')
  if (openChangeDd && openChangeStatus) {
    window.ddOpenChange = (e) => {
      openChangeStatus.textContent = `open: ${e.detail.open}`
    }
  }

  const asyncDd = document.getElementById('dd-async')
  const asyncStatus = document.getElementById('dd-async-status')
  if (asyncDd && asyncStatus) {
    window.ddAsyncLog = (e) => {
      asyncStatus.textContent = `已选择：${e.detail.value}`
      if (e.detail.value !== 'save') return
      // 模拟异步：选中「保存」→ 该项转圈禁点 1.5s，随后恢复（菜单保持打开可观察）
      const mark = (loading) => {
        const items = JSON.parse(asyncDd.getAttribute('items') || '[]')
        const target = items.find((i) => i.value === 'save')
        if (!target) return
        if (loading) {
          target.loading = true
          asyncDd.setAttribute('items', JSON.stringify(items))
          // 组件在 select 转发后同步关闭菜单，下一帧再重开以展示 loading 态
          window.setTimeout(() => asyncDd.setAttribute('open', ''), 0)
        } else {
          delete target.loading
          asyncDd.setAttribute('items', JSON.stringify(items))
        }
      }
      mark(true)
      window.setTimeout(() => mark(false), 1500)
    }
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `arrow` | 是否显示指向触发元素的箭头（`arrow="false"` 隐藏，骨架保留） | `string` | `true` |
| `arrow-point-at-center` | 箭头固定指向面板中心（默认按触发元素投影定位，面板被视口避让偏移时箭头仍指向触发元素） | `boolean` | — |
| `auto-adjust-overflow` | 视口空间不足时自动翻转/避让（`auto-adjust-overflow="false"` 关闭，面板可越出视口） | `string` | `true` |
| `close-on-scroll` | 页面滚动时关闭浮层（默认重定位跟随；true 时滚动即关） | `boolean` | — |
| `disabled` | 整体禁用：不响应任何触发 | `boolean` | — |
| `hide-on-click` | 选中项后是否关闭（默认 true；false 时选中不关闭，多选/勾选场景） | `string` | `true` |
| `hover-delay` | hover 触发时展开延迟毫秒数（默认 150） | — | — |
| `hover-hide-delay` | hover 触发时收起延迟毫秒数（默认 100） | — | — |
| `items` | 菜单项 JSON | `string` | `[]` |
| `offset` | 浮层与触发器的间距像素（默认 8） | — | — |
| `open` | 受控显示（布尔属性，存在即展开） | `boolean` | — |
| `placement` | 浮层位置 | `string` | `bottom` |
| `split` | 拆分下拉按钮（布尔属性）：主按钮 + 箭头按钮，点箭头开菜单、主按钮派发 oas-action | `boolean` | — |
| `trigger` | 触发方式：`click`（默认）/ `hover` / `focus`，空格分隔可多选（如 `"click hover"`） | `string` | `click` |
| `value` | 当前选中值 | `string` | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-action` | 拆分模式下点击主按钮，`detail: { originalEvent }` |
| `oas-open-change` | 浮层开合变化，`detail: { open: boolean }`（含外部 setAttribute 触发，受控闭环） |
| `oas-select` | 选择某项，`detail: { value }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

点击触发器切换显隐，点击外部 / 按 Esc / 选择后关闭；浮层为内层 `oas-menu`（`role="menu"`，叶子项 `menuitemradio`、带子菜单项 `menuitem`），支持多级级联子菜单与键盘导航。
