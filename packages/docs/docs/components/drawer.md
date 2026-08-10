# Drawer 抽屉

从侧边滑出的面板，常用于筛选条件、详情信息等场景。

## 基础用法

<DemoBlock title="右侧抽屉">
  <oas-button type="primary" onclick="document.querySelector('#drawer-right').setAttribute('visible','')">打开右侧抽屉</oas-button>
  <oas-drawer id="drawer-right" title="抽屉标题">
    <p>从右侧滑出的面板内容，点击遮罩、关闭按钮或按 Esc 均可关闭。</p>
  </oas-drawer>
</DemoBlock>

## 左侧抽屉

<DemoBlock title="左侧抽屉">
  <oas-button onclick="document.querySelector('#drawer-left').setAttribute('visible','')">打开左侧抽屉</oas-button>
  <oas-drawer id="drawer-left" title="筛选条件" placement="left">
    <oas-space direction="vertical" size="small" style="width: 100%">
      <p>状态：全部</p>
      <p>分类：全部</p>
      <p>排序：创建时间</p>
    </oas-space>
  </oas-drawer>
</DemoBlock>

## 禁止遮罩关闭

`no-mask-close` 禁止点击遮罩关闭抽屉（其他关闭入口保留）。

<DemoBlock title="no-mask-close">
  <oas-button type="primary" onclick="document.querySelector('#drawer-nomask').setAttribute('visible','')">打开抽屉</oas-button>
  <oas-drawer id="drawer-nomask" title="必须确认" no-mask-close>
    <p>点击遮罩不会关闭，需通过 ✕ / Esc 或底部按钮关闭。</p>
  </oas-drawer>
</DemoBlock>

## 受控显示

`visible` 为受控属性：由宿主（按钮 / JS）设置或移除，组件不会自动恢复；关闭后可监听 `oas-ok` / `oas-close` 后移除 `visible`。

<DemoBlock title="受控显示（visible）">
  <oas-space>
    <oas-button type="primary" onclick="document.querySelector('#drawer-ctrl').setAttribute('visible','')">打开（设置 visible）</oas-button>
    <oas-button onclick="document.querySelector('#drawer-ctrl').removeAttribute('visible')">关闭（移除 visible）</oas-button>
  </oas-space>
  <oas-drawer id="drawer-ctrl" title="受控显示">
    <p>外部按钮直接设置 / 移除 <code>visible</code> 控制显隐，无需依赖底部按钮。</p>
  </oas-drawer>
</DemoBlock>

## 无底部按钮

<DemoBlock title="无底部按钮">
  <oas-button onclick="document.querySelector('#drawer-nofooter').setAttribute('visible','')">打开无按钮抽屉</oas-button>
  <oas-drawer id="drawer-nofooter" title="只读详情" no-footer>
    <p>隐藏底部操作区，仅保留 ✕ 与 Esc 关闭入口。</p>
  </oas-drawer>
</DemoBlock>

## 事件反馈

<DemoBlock title="事件反馈">
  <oas-button onclick="document.querySelector('#drawer-event').setAttribute('visible','')">打开并监听事件</oas-button>
  <oas-drawer id="drawer-event" title="提交配置" onoas-ok="closeDrawer('drawer-event'); message.success('已保存')" onoas-close="message.info('已关闭抽屉')">
    <p>点击「确定」或「取消」，观察右上角消息提示。</p>
  </oas-drawer>
</DemoBlock>

## 自定义宽度

<DemoBlock title="自定义宽度">
  <oas-button type="primary" onclick="document.querySelector('#drawer-width').setAttribute('visible','')">打开 640px 抽屉</oas-button>
  <oas-drawer id="drawer-width" title="自定义宽度" width="640px">
    <p>通过 <code>width</code> 属性指定抽屉宽度，支持 px 或百分比（如 <code>50%</code>），窄屏下受 <code>max-width: 90vw</code> 约束。</p>
  </oas-drawer>
</DemoBlock>

## 尺寸档位

<DemoBlock title="尺寸档位">
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

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `no-footer` | 隐藏底部操作按钮 | `boolean` | — |
| `no-mask-close` | 禁用点击遮罩关闭 | `boolean` | — |
| `placement` | 滑出方向 | `string` | `right` |
| `size` | 预设尺寸档位或具体值：`small`（256px）/ `medium`（378px）/ `large`（736px），或直接写如 `512px`、`40%` | — | — |
| `title` | 标题文案 | `string` | — |
| `visible` | 是否显示 | `boolean` | — |
| `width` | 抽屉宽度（px 或百分比），优先级高于 `size` | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-close` | 关闭：取消按钮 / ✕ / 遮罩点击 / Esc |
| `oas-ok` | 点击「确定」 |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

`role="dialog"` + `aria-modal="true"`，打开时焦点移入关闭按钮，关闭后还原。
