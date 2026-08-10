# Drawer

A panel that slides in from the side, often used for filters, details, and similar scenarios.

## Basic usage

<DemoBlock title="Right drawer">
  <oas-button type="primary" onclick="document.querySelector('#drawer-right').setAttribute('visible','')">打开右侧抽屉</oas-button>
  <oas-drawer id="drawer-right" title="抽屉标题">
    <p>从右侧滑出的面板内容，点击遮罩、关闭按钮或按 Esc 均可关闭。</p>
  </oas-drawer>
</DemoBlock>

## Left drawer

<DemoBlock title="Left drawer">
  <oas-button onclick="document.querySelector('#drawer-left').setAttribute('visible','')">打开左侧抽屉</oas-button>
  <oas-drawer id="drawer-left" title="筛选条件" placement="left">
    <oas-space direction="vertical" size="small" style="width: 100%">
      <p>状态：全部</p>
      <p>分类：全部</p>
      <p>排序：创建时间</p>
    </oas-space>
  </oas-drawer>
</DemoBlock>

## Disable mask close

`no-mask-close` prevents closing the drawer by clicking the mask (other close paths remain).

<DemoBlock title="no-mask-close">
  <oas-button type="primary" onclick="document.querySelector('#drawer-nomask').setAttribute('visible','')">打开抽屉</oas-button>
  <oas-drawer id="drawer-nomask" title="必须确认" no-mask-close>
    <p>点击遮罩不会关闭，需通过 ✕ / Esc 或底部按钮关闭。</p>
  </oas-drawer>
</DemoBlock>

## Controlled visibility

`visible` is a controlled attribute: the host (button/JS) sets or removes it, and the component never restores it automatically; after closing, listen for `oas-ok` / `oas-close` and remove `visible`.

<DemoBlock title="Controlled visibility (visible)">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#drawer-ctrl').setAttribute('visible','')">打开（设置 visible）</oas-button>
    <oas-button onclick="document.querySelector('#drawer-ctrl').removeAttribute('visible')">关闭（移除 visible）</oas-button>
  </oas-space>
  <oas-drawer id="drawer-ctrl" title="受控显示">
    <p>外部按钮直接设置 / 移除 <code>visible</code> 控制显隐，无需依赖底部按钮。</p>
  </oas-drawer>
</DemoBlock>

## No footer buttons

<DemoBlock title="No footer buttons">
  <oas-button onclick="document.querySelector('#drawer-nofooter').setAttribute('visible','')">打开无按钮抽屉</oas-button>
  <oas-drawer id="drawer-nofooter" title="只读详情" no-footer>
    <p>隐藏底部操作区，仅保留 ✕ 与 Esc 关闭入口。</p>
  </oas-drawer>
</DemoBlock>

## Event feedback

<DemoBlock title="Event feedback">
  <oas-button onclick="document.querySelector('#drawer-event').setAttribute('visible','')">打开并监听事件</oas-button>
  <oas-drawer id="drawer-event" title="提交配置" onoas-ok="closeDrawer('drawer-event'); message.success('已保存')" onoas-close="message.info('已关闭抽屉')">
    <p>点击「确定」或「取消」，观察右上角消息提示。</p>
  </oas-drawer>
</DemoBlock>

## Custom width

<DemoBlock title="Custom width">
  <oas-button type="primary" onclick="document.querySelector('#drawer-width').setAttribute('visible','')">打开 640px 抽屉</oas-button>
  <oas-drawer id="drawer-width" title="自定义宽度" width="640px">
    <p>通过 <code>width</code> 属性指定抽屉宽度，支持 px 或百分比（如 <code>50%</code>），窄屏下受 <code>max-width: 90vw</code> 约束。</p>
  </oas-drawer>
</DemoBlock>

## Size presets

<DemoBlock title="Size presets">
  <oas-button onclick="document.querySelector('#drawer-size-small').setAttribute('visible','')">small（256px）</oas-button>
  <oas-button onclick="document.querySelector('#drawer-size-large').setAttribute('visible','')">large（736px）</oas-button>
  <oas-drawer id="drawer-size-small" title="小抽屉" size="small">
    <p>small 档：256px，适合窄屏辅助信息。</p>
  </oas-drawer>
  <oas-drawer id="drawer-size-large" title="大抽屉" size="large">
    <p>large 档：736px，适合复杂表单或详情场景。</p>
  </oas-drawer>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { message } = await import('@oas-ui/ui')
  window.message = message
  window.closeDrawer = (id) => document.getElementById(id).removeAttribute('visible')
})
</script>

## API

### Props

| Prop | Description | Type | Default |
| --- | --- | --- | --- |
| `visible` | Whether shown | `boolean` | `false` |
| `title` | Title text | `string` | — |
| `placement` | Slide direction | `left` / `right` | `right` |
| `width` | Drawer width (px or percentage), takes precedence over `size` | `string` | — (falls back to 320px) |
| `size` | Preset size or a concrete value: `small` (256px) / `medium` (378px) / `large` (736px), or write directly like `512px`, `40%` | `string` | — (falls back to 320px) |
| `no-footer` | Hide footer action buttons | `boolean` | `false` |
| `no-mask-close` | Disable closing on mask click | `boolean` | `false` |

### Events

| Event | Description |
| --- | --- |
| `oas-ok` | Clicked "OK" |
| `oas-close` | Close: cancel button / ✕ / mask click / Esc |

`role="dialog"` + `aria-modal="true"`; focus moves to the close button on open and is restored on close.
