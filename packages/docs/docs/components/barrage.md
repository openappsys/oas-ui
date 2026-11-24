---
description: 弹幕组件，多条弹幕在轨道上按速度漂过，同轨道自动排期防重叠，支持密度上限、暂停/继续与清空 API
---

# Barrage 弹幕

流式弹幕：每条弹幕占一个轨道、从右向左匀速漂过；同一轨道按「前一条完全进场 + 最小间距」排期，避免追尾重叠；`max-active` 控制同屏密度，超出的进入队列。

- `tracks` / `speed` / `gap` / `max-active` 控制轨道数、速度、间距与同屏上限
- `add()` / `addBatch()` 追加弹幕；`pause()` / `resume()` / `clear()` 控制播放
- 点击弹幕派发 `oas-item-click`（detail `{ text, key, color }`）
- 默认舞台 `aria-hidden`，`accessible` 开启后为 `role="log"` 活区
- `prefers-reduced-motion` 下动画时长缩短为瞬时，不横向漂移

## 基础用法

<DemoBlock title="发一条 / 暂停 / 清空">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-barrage id="bg-demo" tracks="3" height="160" accessible style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
    <div style="display: flex; gap: var(--oas-space-2); flex-wrap: wrap; align-items: center;">
      <oas-button id="bg-add" size="small">发一条</oas-button>
      <oas-button id="bg-pause" size="small">暂停</oas-button>
      <oas-button id="bg-clear" size="small">清空</oas-button>
      <span id="bg-output" style="color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">点击弹幕可查看 oas-item-click</span>
    </div>
  </div>
</DemoBlock>

## 密度控制

`max-active` 限制同屏条数（0 = 不限）。下例上限 4 条，超出的排队等前一条离场：

<DemoBlock title="max-active=4">
  <div style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-barrage id="bg-dense" tracks="2" max-active="4" speed="150" height="120" style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
    <oas-button id="bg-burst" size="small">连发 10 条</oas-button>
  </div>
</DemoBlock>

## 单轨道

`tracks="1"` 时所有弹幕共用一条轨道，排期保证不重叠；适合窄区域或慢速阅读场景。`gap` 调同轨道相邻弹幕的最小水平间距（前一条完全进场后再留这段空隙）：

> 运行中修改 `tracks` 会让在场与排队弹幕失效并清空（轨道归属重排），建议初始化时定好轨道数。

<DemoBlock title="tracks=1 / speed=80 / gap=120">
  <oas-barrage id="bg-single" tracks="1" speed="80" gap="120" height="72" style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
  <oas-button id="bg-single-add" size="small">再发一条</oas-button>
</DemoBlock>

## 声明式数据 items 与循环 auto-play

`items` 用 JSON 数组声明弹幕（字符串或 `{ text, color?, key? }`），语义对齐 `addBatch`：属性变化时把新条目批量入队（追加，不清空在场）。另有同名 property 通道（赋数组自动序列化反射），框架双向绑定不用手写 `JSON.stringify`。`auto-play` 开启循环：声明条目播完后自动重播（只循环 `items` 声明的数据，`add()` 手动加的不参与；`clear()` 只清在场与排队，想永久停止请移除 `items` 或 `auto-play`）：

<DemoBlock title="items 声明 + auto-play 循环">
  <oas-barrage
    id="bg-items"
    items='["前端组件库","Web Components 原生","暗色主题适配","弹幕也可以声明式","auto-play 循环播放"]'
    auto-play
    tracks="2"
    speed="110"
    height="96"
    accessible
    style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"
  ></oas-barrage>
</DemoBlock>

## 点赞与屏蔽词

- `likeable`：每条弹幕带心形点赞控件，点按切换点赞态并派发 `oas-like`（`detail: { text, key, color, liked, count }`）。点赞状态按 `key`（缺省按文本）**跨条目生命周期记忆**：弹幕离场后同 key 再入场仍是已赞，计数保留；`isLiked(key)` / `likeCount(key)` 供宿主回显。未开该属性时渲染与现状一致（零视觉漂移）。
- 无障碍：缺省弹幕是装饰性内容（舞台 `aria-hidden`），点赞控件同样 `aria-hidden` 且不可聚焦（鼠标可点、读屏不可达）；开 `accessible` 后舞台进读屏，点赞控件变成键盘可达的 `role="button"`（`aria-pressed` + i18n 可访问名），且条目本身不再叠 button 语义（避免嵌套交互控件）。
- `banned-words`：屏蔽词，逗号分隔（全角逗号亦可）或 JSON 数组字符串，**大小写不敏感**。命中的条目**不入队不渲染**（`add` / `addBatch` / `items` 三条入队通道同一判据）；已在场的条目不会回溯移除，入场后插入的屏蔽词对之后的条目生效。

<DemoBlock title="likeable + banned-words（「广告」类弹幕被过滤）">
  <oas-barrage
    id="bg-like"
    items='["这条可以点赞","组件库真好用","广告弹幕会被过滤","再来一条看看点赞保持"]'
    likeable
    accessible
    banned-words="广告,刷屏"
    tracks="2"
    speed="100"
    height="120"
    style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"
  ></oas-barrage>
  <div style="margin-top: var(--oas-space-2); display: flex; gap: var(--oas-space-2)">
    <oas-button id="bg-like-send" size="small">发一条正常弹幕</oas-button>
    <oas-button id="bg-like-banned" size="small">发一条广告弹幕</oas-button>
  </div>
  <span id="bg-like-out" style="display: block; margin-top: var(--oas-space-2); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    点弹幕里的心形点赞；「广告」弹幕不会出现。
  </span>
</DemoBlock>

## 书写方向（RTL）

RTL 页面（祖先 `dir="rtl"`、`oas-config-provider direction="rtl"` 或阿拉伯语等 RTL 语言包）下弹幕自**左**进场、向右飞出——镜像关键帧由 `data-rtl` 自动切换，与阅读方向一致：

<DemoBlock title="dir=rtl：自左进场、向右飞出">
  <div dir="rtl" style="display: flex; flex-direction: column; gap: var(--oas-space-2); width: 100%">
    <oas-barrage id="bg-rtl" tracks="2" speed="90" height="96" style="width: 100%; background: var(--oas-color-bg-elevated); border: 1px solid var(--oas-color-border); border-radius: var(--oas-radius-md)"></oas-barrage>
    <oas-button id="bg-rtl-add" size="small">发一条（RTL 舞台）</oas-button>
  </div>
</DemoBlock>

## 断开重连

宿主被摘挂（路由缓存、条件渲染、折叠面板）后再挂回时，在场弹幕**不清空**：每条按剩余时间（`endAt - now`）重算，CSS 动画以负向 `animation-delay` 定位到对应进度，与离场计时重新对齐——不会「从起点重跑」也不会滞留。断开期间已超时的条目重连时立即退场，轨道随即放行排队项；暂停中重连保持暂停并按暂停时的剩余时间定位。

## 方法

见下方 API 的「方法」表（`add` / `addBatch` / `pause` / `resume` / `clear`）。

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  customElements.whenDefined('oas-barrage').then(() => {
    const demo = document.querySelector('#bg-demo')
    const dense = document.querySelector('#bg-dense')
    const single = document.querySelector('#bg-single')
    const rtl = document.querySelector('#bg-rtl')
    const output = document.querySelector('#bg-output')
    const texts = ['这个组件好用', '轨道防重叠', 'OAS-UI 弹幕', '速度刚刚好', '支持暂停和清空', 'Web Components 原生实现']
    const colors = ['', 'blue', 'green', 'purple', 'orange']
    let i = 0
    const add = (el, text) => el?.add(text, { color: colors[i % colors.length] })
    document.querySelector('#bg-add')?.addEventListener('click', () => {
      i += 1
      add(demo, texts[i % texts.length])
    })
    document.querySelector('#bg-burst')?.addEventListener('click', () => {
      for (let n = 0; n < 10; n++) {
        i += 1
        add(dense, texts[i % texts.length])
      }
    })
    document.querySelector('#bg-single-add')?.addEventListener('click', () => {
      i += 1
      add(single, texts[i % texts.length])
    })
    document.querySelector('#bg-rtl-add')?.addEventListener('click', () => {
      i += 1
      add(rtl, texts[i % texts.length])
    })
    document.querySelector('#bg-clear')?.addEventListener('click', () => demo?.clear())
    // 点赞与屏蔽词：oas-like 反馈 + 两条发送入口（命中屏蔽词的那条不会出现）
    const likeEl = document.querySelector('#bg-like')
    const likeOut = document.querySelector('#bg-like-out')
    likeEl?.addEventListener('oas-like', (event) => {
      const { liked, count, text } = event.detail
      likeOut.textContent = `${liked ? '已点赞' : '已取消点赞'}「${text}」，当前 ${count} 个赞`
    })
    document.querySelector('#bg-like-send')?.addEventListener('click', () => {
      likeEl?.add('这条是正常弹幕', { key: 'normal-' + Date.now() })
    })
    document.querySelector('#bg-like-banned')?.addEventListener('click', () => {
      likeEl?.add('这是一条广告弹幕')
      likeOut.textContent = '已尝试发送含屏蔽词的弹幕（不会渲染）'
    })
    document.querySelector('#bg-pause')?.addEventListener('click', (event) => {
      if (!demo) return
      const button = event.currentTarget
      if (demo.hasAttribute('paused')) {
        demo.resume()
        if (button) button.textContent = '暂停'
      } else {
        demo.pause()
        if (button) button.textContent = '继续'
      }
    })
    demo?.addEventListener('oas-item-click', (event) => {
      if (output) output.textContent = `oas-item-click：${event.detail.text}（key: ${event.detail.key || '—'}）`
    })
  })
})
</script>

## API

### oas-barrage

#### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `accessible` | 布尔，存在时弹幕进入读屏（`role="log"` + `aria-live="polite"`）；缺省 `aria-hidden` | — | — |
| `auto-play` | 循环播放：声明条目队列耗尽后自动重新入队（只循环 items 声明的数据；clear() 只清在场与排队，永久停止请移除 items 或 auto-play） | — | — |
| `banned-words` | 屏蔽词（逗号分隔或 JSON 数组字符串；大小写不敏感）：命中的条目不入队不渲染（`add` / `addBatch` / `items` 同一判据）；已在场条目不回溯移除 | `string` | — |
| `gap` | 同轨道相邻弹幕的最小水平间距（px，默认 48） | `string` | — |
| `height` | 舞台高度（纯数字按 px，亦接受 CSS 长度；默认 200px） | `string` | — |
| `items` | 声明式弹幕数据（JSON 数组，字符串或 `{ text, color?, key? }`）——语义对齐 addBatch：属性变化时把新条目批量入队（追加，不清空在场）；另有同名 get/set 访问器（赋数组自动序列化反射 attribute） | `Array<string \| BarrageItemInput> \| string` | `[]` |
| `likeable` | 每条弹幕带心形点赞控件（点按切换点赞态并派发 `oas-like`；点赞態按 `key` / 文本跨条目生命周期记忆） | — | — |
| `max-active` | 同屏最大条数（0 = 不限，默认 0） | `string` | — |
| `paused` | 受控暂停（在场=暂停；CSS 动画与排期计时同时冻结） | — | — |
| `speed` | 漂移速度（像素/秒，默认 120） | `string` | — |
| `tracks` | 轨道数（正整数，默认 3，上限 20） | `string` | — |

#### 方法

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `add` | `add(text: string, options: BarrageItemOptions): void` | 追加一条弹幕（options: `{ color?, key? }`） |
| `isLiked` | `isLiked(key: string): boolean` | 查询点赞态（键 = `key`，缺省按文本；与 `oas-like` 的 `key` 口径一致） |
| `likeCount` | `likeCount(key: string): number` | 查询点赞数 |
| `addBatch` | `addBatch(items: Array<string \| BarrageItemInput>): void` | 批量追加（字符串或 `{ text, color?, key? }`） |
| `pause` | `pause(): void` | 暂停（写入 `paused` 属性） |
| `resume` | `resume(): void` | 继续（移除 `paused` 属性） |
| `clear` | `clear(): void` | 清空在场与排队弹幕 |

#### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-item-click` | 点击弹幕时派发，`detail: { text: item.text, key: item.key, color: item.color }` |
| `oas-like` | 点按点赞控件派发；`detail: { text, key, color, liked, count }`（`liked` 为切换后的状态） |

#### CSS 变量

| CSS 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `--oas-barrage-bg` | 舞台背景 | `transparent` |
| `--oas-barrage-color` | 默认文字色 | `var(--oas-color-text-primary)` |
| `--oas-barrage-font-size` | 弹幕字号 | `var(--oas-font-size-md)` |
| `--oas-barrage-height` | 舞台高度（`height` 属性写入同一变量） | `200px` |
| `--oas-barrage-item-bg` | 弹幕气泡背景 | `color-mix(in srgb, var(--oas-color-overlay) 24%, transparent)` |
| `--oas-barrage-item-color` | 弹幕文字色 | `var(--oas-color-text-primary)` |
| `--oas-barrage-item-hover-bg` | 弹幕悬停背景 | `color-mix(in srgb, var(--oas-color-overlay) 36%, transparent)` |
| `--oas-barrage-stage-width` | 舞台宽度（组件写入，供动画位移） | `800px` |
| `--oas-barrage-tracks` | 轨道数（组件写入） | `3` |
