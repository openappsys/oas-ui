# Tooltip 文字提示

简单的文字提示气泡，hover 或键盘聚焦触发。

## 基础用法

<DemoBlock title="悬停触发">
  <oas-tooltip content="这是一条提示文字">
    <oas-button type="primary">悬停查看</oas-button>
  </oas-tooltip>
</DemoBlock>

## 放置方向

<DemoBlock title="四个方向">
  <oas-tooltip content="提示在上方" placement="top">
    <oas-button>上</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在下方" placement="bottom">
    <oas-button>下</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在左侧" placement="left">
    <oas-button>左</oas-button>
  </oas-tooltip>
  <oas-tooltip content="提示在右侧" placement="right">
    <oas-button>右</oas-button>
  </oas-tooltip>
</DemoBlock>

空间不足时自动沿主轴翻转，并在视口边缘避让。

## 聚焦触发

<DemoBlock title="键盘聚焦触发">
  <oas-tooltip content="通过 Tab 聚焦也能看到我">
    <oas-button>Tab 聚焦我</oas-button>
  </oas-tooltip>
</DemoBlock>

## 受控显示

`open` 属性受控：外部按钮设置 / 移除 `open` 即可显示 / 隐藏提示（hover / focus 触发仍叠加生效）。

<DemoBlock title="受控显示（open 属性）">
  <oas-space size="small">
    <oas-button type="primary" size="small" onclick="tipCtrl(true)">显示</oas-button>
    <oas-button size="small" onclick="tipCtrl(false)">隐藏</oas-button>
    <oas-tag id="tip-status" type="info">open: false</oas-tag>
  </oas-space>
  <oas-tooltip id="tip-ctrl" content="由 open 属性控制显隐" placement="bottom">
    <oas-button>触发元素</oas-button>
  </oas-tooltip>
</DemoBlock>

## 长文本

<DemoBlock title="长文本与最大宽度">
  <oas-tooltip content="这是一段较长的提示文字，用于演示最大宽度限制与自动换行，最长不超过 240px。" placement="bottom">
    <oas-button>悬停查看长提示</oas-button>
  </oas-tooltip>
</DemoBlock>

## 虚拟触发

虚拟模式（`virtual`）不绑定宿主触发元素：`open` 完全受外部控制，位置由 `virtual-anchor`（锚点元素选择器）或 `virtual-x` / `virtual-y`（视口坐标）指定，`placement` 仍生效。适合图表点位、拖拽中的浮层提示等无法用普通触发元素的场景。

<DemoBlock title="虚拟锚点跟随（图表点位）">
  <div class="vp-chart" id="vp-chart">
    <span class="vp-dot" id="vp-dot-0" style="left: 15%; bottom: 45%" data-label="Q1 营收 12.4w"></span>
    <span class="vp-dot" id="vp-dot-1" style="left: 40%; bottom: 75%" data-label="Q2 营收 15.1w"></span>
    <span class="vp-dot" id="vp-dot-2" style="left: 65%; bottom: 35%" data-label="Q3 营收 18.9w"></span>
    <span class="vp-dot" id="vp-dot-3" style="left: 90%; bottom: 60%" data-label="Q4 营收 21.6w"></span>
    <span class="vp-axis">月份 →</span>
  </div>
  <oas-tooltip id="tt-anchor" virtual virtual-anchor="#vp-dot-0" content="Q1 营收 12.4w" placement="top"></oas-tooltip>
  <p class="vp-hint">悬停任意点位查看提示（tooltip 锚定该点显示）。</p>
</DemoBlock>

<DemoBlock title="坐标跟随（鼠标移动）">
  <div class="vp-canvas" id="vp-canvas">
    在此区域内移动鼠标
    <oas-tag id="tt-follow-status" type="info" size="small">未跟随</oas-tag>
  </div>
  <oas-tooltip id="tt-follow" virtual virtual-x="0" virtual-y="0" content="坐标：0, 0" placement="bottom"></oas-tooltip>
</DemoBlock>

<style>
.vp-chart {
  position: relative;
  width: 100%;
  height: 160px;
  background: var(--oas-color-bg-hover);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
}
.vp-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--oas-color-primary);
  cursor: pointer;
  transform: translate(-50%, -50%);
}
.vp-dot:hover {
  background: var(--oas-color-primary-hover);
}
.vp-axis {
  position: absolute;
  left: var(--oas-space-4);
  bottom: var(--oas-space-2);
  font-size: var(--oas-font-size-xs);
  /* 落在 bg-hover 上，text-secondary 对比度 4.39:1 < 4.5:1 → 用 text-primary */
  color: var(--oas-color-text-primary);
}
.vp-canvas {
  width: 100%;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--oas-space-3);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
  border: 1px dashed var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  cursor: crosshair;
}
.vp-hint {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
</style>

## 边界

<DemoBlock title="空内容">
  <oas-tooltip placement="bottom">
    <oas-button>无内容提示</oas-button>
  </oas-tooltip>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  const tip = document.getElementById('tip-ctrl')
  const status = document.getElementById('tip-status')
  if (tip && status) {
    const sync = () => {
      status.textContent = `open: ${tip.hasAttribute('open')}`
    }
    window.tipCtrl = (open) => {
      if (open) tip.setAttribute('open', '')
      else tip.removeAttribute('open')
    }
    sync()
    // hover / focus 触发与外部控制都会改 open，用 MutationObserver 保持状态同步
    new MutationObserver(sync).observe(tip, { attributes: true, attributeFilter: ['open'] })
  }

  // 虚拟锚点：hover 点位 → virtual-anchor 指向该点 + 更新内容 + open
  const anchorTip = document.getElementById('tt-anchor')
  if (anchorTip) {
    document.querySelectorAll('#vp-chart .vp-dot').forEach((dot) => {
      dot.addEventListener('mouseenter', () => {
        anchorTip.setAttribute('virtual-anchor', `#${dot.id}`)
        anchorTip.setAttribute('content', dot.dataset.label || '')
        anchorTip.setAttribute('open', '')
      })
      dot.addEventListener('mouseleave', () => anchorTip.removeAttribute('open'))
    })
  }

  // 坐标跟随：画布 mousemove → virtual-x/y + open；移出关闭
  const canvas = document.getElementById('vp-canvas')
  const followTip = document.getElementById('tt-follow')
  const followStatus = document.getElementById('tt-follow-status')
  if (canvas && followTip) {
    canvas.addEventListener('mousemove', (e) => {
      followTip.setAttribute('virtual-x', String(e.clientX))
      followTip.setAttribute('virtual-y', String(e.clientY))
      followTip.setAttribute('content', `坐标：${e.clientX}, ${e.clientY}`)
      followTip.setAttribute('open', '')
    })
    canvas.addEventListener('mouseleave', () => followTip.removeAttribute('open'))
  }
  if (followTip && followStatus) {
    const syncFollow = () => {
      followStatus.textContent = followTip.hasAttribute('open') ? '跟随中' : '未跟随'
    }
    syncFollow()
    new MutationObserver(syncFollow).observe(followTip, {
      attributes: true,
      attributeFilter: ['open'],
    })
  }
})
</script>

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `content` | 提示内容文本 | `string` | — |
| `open` | 受控显示（布尔属性，存在即显示） | `boolean` | — |
| `placement` | 浮层位置 | `Placement` | `top` |
| `virtual` | 虚拟触发模式：不绑定宿主触发元素，`open` 完全受外部控制，位置由 `virtual-anchor` 或 `virtual-x`/`virtual-y` 指定（适合图表点位、拖拽中的浮层提示） | `boolean` | — |
| `virtual-anchor` | 虚拟锚点元素选择器（如 `#chart-point-1`），tooltip 按该元素矩形定位；与 `virtual-x`/`virtual-y` 二选一，坐标优先 | — | — |
| `virtual-x` | 虚拟锚点视口 X 坐标（px，如鼠标 `clientX`），与 `virtual-y` 同时设置时按坐标定位 | — | — |
| `virtual-y` | 虚拟锚点视口 Y 坐标（px，如鼠标 `clientY`），与 `virtual-x` 同时设置时按坐标定位 | — | — |

### 事件

| 事件 | 说明 |
| --- | --- |
| `oas-open-change` | open 状态变化（显示/隐藏）时派发，`detail: { open }` |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | 触发元素（hover/focus 触发）；`virtual` 虚拟模式下可省略 |

`oas-open-change`：`open` 状态变化（显示/隐藏）时派发，`detail: { open }`。hover / focus 触发显隐；`role="tooltip"`，浮层 `pointer-events: none` 不拦截交互。
