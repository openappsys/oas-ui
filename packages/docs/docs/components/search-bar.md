---
description: "搜索栏：输入框 + 清除 / 取消 / 搜索触发（Enter / 搜索钮）+ 历史词与热门词插槽（持久化归宿主）+ 联想位插槽，空值 / 有值自动分组切换；oas-search / oas-cancel 事件。"
---

# SearchBar 搜索栏

移动端搜索惯例封装：胶囊输入框（内置放大镜）+ 清除钮 + 搜索钮（Enter 同效）+ 取消钮（`hide-cancel` 可隐藏）+ 聚焦惯例面板——**空值时显示历史词 / 热门词插槽容器、有值时切换到联想位插槽容器**（与主流电商 App 搜索页一致的分组切换）。`value` 双通道；`oas-search` / `oas-cancel` 事件；**历史词持久化归宿主**（组件不持有数据，宿主自行写 localStorage 并渲染进插槽）。

与 `oas-input` 的边界：oas-input 是通用文本输入（已具备 `prefix-icon="search"` + `enterkeyhint="search"` 的组装能力），search-bar 不重复输入控件本体，只封装搜索页惯例——触发语义（`oas-search` 统一出口）、取消钮退出语义、历史词 / 热门词 / 联想位的槽位与显隐分组。详见组件 README「与 oas-input 的边界」。

## 基础搜索

Enter 或搜索钮触发 `oas-search`（detail `{ value }`，**空值不派发**）；输入过程实时回写 `value` attribute 并派 `oas-input`（宿主可做联想渲染）；点卡片清除钮清空并派 `oas-input`（焦点回输入框）：

<DemoBlock title="基础搜索（Enter / 搜索钮 / 清除）">
  <oas-search-bar id="sb-basic" value="运动鞋"></oas-search-bar>
  <p id="sb-basic-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    输入后按 Enter（或点搜索钮）观察 oas-search 反馈。
  </p>
</DemoBlock>

## 历史词与热门词插槽

`history` / `hot` 插槽渲染历史词与热门词（持久化归宿主：demo 用内存数组模拟宿主记录），**空值 + 聚焦时显示**；插槽内容点击经面板 `pointerdown` 保持焦点（历史词可点中）；Esc 收起面板、重新聚焦再展开：

<DemoBlock title="历史词 + 热门词（聚焦展开，点词回填）">
  <oas-search-bar id="sb-panel" placeholder="搜索商品"></oas-search-bar>
  <p id="sb-panel-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点输入框聚焦 → 面板展示历史词 / 热门词；点词回填并触发搜索。
  </p>
</DemoBlock>

## 联想位插槽

`suggestions` 插槽在**有值 + 聚焦**时显示（空值 / 有值的分组切换由组件驱动）；宿主监听 `oas-input` 动态渲染联想条目：

<DemoBlock title="联想位（输入即出联想）">
  <oas-search-bar id="sb-suggest"></oas-search-bar>
  <p id="sb-suggest-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    输入「鞋」观察联想；点联想词回填并触发搜索。
  </p>
</DemoBlock>

## 形态：取消钮 / 隐藏取消 / 禁用

`hide-cancel` 隐藏取消钮（嵌入已有退出途径的工具条）；`disabled` 禁用输入与全部按钮；取消钮派 `oas-cancel`（detail 携带**清空前值**，宿主可按需恢复），组件随即清空并收起面板：

<DemoBlock title="取消钮 / hide-cancel / disabled">
  <div style="display: grid; gap: var(--oas-space-3); width: 100%">
    <oas-search-bar id="sb-cancel" value="蓝牙耳机"></oas-search-bar>
    <oas-search-bar hide-cancel value="隐藏取消钮"></oas-search-bar>
    <oas-search-bar disabled value="禁用态"></oas-search-bar>
    <p id="sb-cancel-out" style="margin: 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      点第一行的取消钮观察 oas-cancel 反馈。
    </p>
  </div>
</DemoBlock>

## 键盘与无障碍

- 输入框 `type="search"`（隐式 searchbox 语义）+ `aria-label`（i18n「搜索栏」，不依赖 placeholder）+ `enterkeyhint="search"`（移动虚拟键盘显示「搜索」）；Enter 触发搜索、Esc 收起面板。
- 搜索钮 / 清除钮图标无可见文字，`aria-label` 分别为「搜索」「清除搜索内容」；清除钮不进 Tab 序（Tab 顺序 = 输入框 → 搜索钮 → 取消钮）；取消钮可见文本「取消」天然可读。
- 面板是输入框的伴随内容（非浮层）：插槽内容的语义归宿主（历史词按钮自带可访问名）；面板 `pointerdown` 阻止默认失焦，插槽内若放输入类元素需自行管理焦点。
- RTL 下布局走逻辑属性自动镜像；颜色全走 token（暗色自动跟随）。

## 自定义样式须知

`::part(field)` 为胶囊输入行（放大镜 `::part(lead-icon)` + `::part(input)` + `::part(clear)` 清除钮）；`::part(go)` 搜索钮、`::part(cancel)` 取消钮；惯例面板 `::part(panel)` 内含三个分组容器 `::part(suggestions)` / `::part(history)` / `::part(hot)`（显隐由组件按 value 驱动）。改搜索钮配色覆写 `::part(go)` 的 background 即可。

<script setup lang="ts">
import { onMounted } from 'vue'

// demo 脚本约定（勿改位置）：① 必须是**页面级** script setup——写进 DemoBlock 内部时 VitePress 不会抽取，
// 会被原样输出成页面正文（Cannot use import statement / hydration mismatch，demo 全灭）；
// ② 放在 `## API` 之前：该章节是 api:gen 生成区，业务脚本不得落在生成区内。
onMounted(() => {
  customElements.whenDefined('oas-search-bar').then(() => {
    // —— 基础搜索 ——
    const basic = document.getElementById('sb-basic')!
    const basicOut = document.getElementById('sb-basic-out')!
    basic.addEventListener('oas-search', (e) => {
      const d = (e as CustomEvent).detail
      basicOut.textContent = `oas-search：${d.value}（真实场景此处跳转搜索结果页）`
    })

    // —— 历史词 / 热门词（宿主持有历史记录，此处用内存数组模拟） ——
    const panel = document.getElementById('sb-panel')!
    const panelOut = document.getElementById('sb-panel-out')!
    const history = ['跑步鞋', '针织开衫', '帆布包']
    const renderHistory = (): void => {
      panel.querySelectorAll('[data-demo-history]').forEach((n) => n.remove())
      for (const word of history) {
        const btn = document.createElement('oas-button')
        btn.dataset.demoHistory = ''
        btn.setAttribute('slot', 'history')
        btn.setAttribute('size', 'small')
        btn.textContent = word
        btn.addEventListener('click', () => {
          panel.setAttribute('value', word)
          panelOut.textContent = `点历史词回填：${word}（宿主同时触发搜索惯例）`
        })
        panel.appendChild(btn)
      }
      const hotWords = ['秋冬新品', '满 300 减 50']
      for (const word of hotWords) {
        const btn = document.createElement('oas-button')
        btn.setAttribute('slot', 'hot')
        btn.setAttribute('size', 'small')
        btn.setAttribute('type', 'primary')
        btn.setAttribute('plain', '')
        btn.textContent = word
        btn.addEventListener('click', () => {
          panel.setAttribute('value', word)
          panelOut.textContent = `点热门词回填：${word}`
        })
        panel.appendChild(btn)
      }
    }
    renderHistory()
    panel.addEventListener('oas-search', (e) => {
      panelOut.textContent = `oas-search：${(e as CustomEvent).detail.value}`
    })

    // —— 联想位（宿主监听 oas-input 渲染联想） ——
    const suggest = document.getElementById('sb-suggest')!
    const suggestOut = document.getElementById('sb-suggest-out')!
    const pool = ['运动鞋', '板鞋', '凉鞋', '篮球鞋']
    suggest.addEventListener('oas-input', (e) => {
      const d = (e as CustomEvent).detail
      suggest.querySelectorAll('[data-demo-suggest]').forEach((n) => n.remove())
      if (d.value === '') return
      for (const item of pool.filter((p) => p.includes(d.value))) {
        const btn = document.createElement('oas-button')
        btn.dataset.demoSuggest = ''
        btn.setAttribute('slot', 'suggestions')
        btn.setAttribute('size', 'small')
        btn.textContent = item
        btn.addEventListener('click', () => {
          suggest.setAttribute('value', item)
          suggest.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        })
        suggest.appendChild(btn)
      }
    })
    suggest.addEventListener('oas-search', (e) => {
      suggestOut.textContent = `oas-search：${(e as CustomEvent).detail.value}`
    })

    // —— 取消钮 ——
    const cancel = document.getElementById('sb-cancel')!
    const cancelOut = document.getElementById('sb-cancel-out')!
    cancel.addEventListener('oas-cancel', (e) => {
      const d = (e as CustomEvent).detail
      cancelOut.textContent = `oas-cancel：已清空「${d.value}」（detail 携带清空前值）`
    })
  })
})
</script>

## API

### oas-search-bar

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `disabled` | 输入与全部按钮禁用（config-provider 注入 disabled 同样生效） | `boolean` | — |
| `hide-cancel` | 隐藏取消钮（嵌入已有退出途径的工具条场合） | `boolean` | — |
| `placeholder` | 占位文案，缺省 i18n「搜索商品」（宿主可覆盖） | — | — |
| `value` | 当前输入值。输入过程实时回写 attribute 并派发 oas-input（宿主可做联想渲染）；空值搜索不派发 oas-search | `string \| number` | — |

#### Property（JS property；是否写回 attribute 见各行说明）

| Property | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `value` | 当前输入值：get+set 双通道，写即反射 `value` attribute（赋值即生效不派发事件） | `string \| number` | — |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-cancel` | 取消钮触发，`detail: { value }` 携带清空前值（宿主可按需恢复）；组件随即清空并收起面板 |
| `oas-input` | 输入实时派发（清除钮同样派发——只听 oas-input 的宿主不漏清除），`detail: { value }` |
| `oas-search` | Enter 或搜索钮触发，`detail: { value }`；空值不派发（无意义空搜索） |

#### 插槽

| 名称 | 说明 |
| --- | --- |
| `history` | 历史词（空值 + 聚焦时显示；持久化归宿主——宿主渲染 chips 并自行记录） |
| `hot` | 热门词（空值 + 聚焦时显示，与 history 同组并列） |
| `suggestions` | 联想位（有值 + 聚焦时显示；宿主监听 oas-input 动态渲染） |
