# Watermark 水印

容器级水印层，铺在内容之上且不拦截任何交互，适合敏感信息防泄露。

## 文字水印

<DemoBlock title="基础文字水印">
  <oas-watermark text="内部资料 · CONFIDENTIAL" repeat>
    <div style="height: 180px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      平铺文字水印，容器内任意内容均可作为 slot 传入
    </div>
  </oas-watermark>
</DemoBlock>

`text` 生成斜纹平铺单元；`repeat` 存在时平铺，缺省时单枚居中。

## 单枚与透明度

<DemoBlock title="单枚居中 + 透明度">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <oas-watermark text="机密" opacity="0.3" style="flex: 1; min-width: 220px">
      <div style="height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
    </oas-watermark>
    <oas-watermark text="已审核" repeat style="flex: 1; min-width: 220px">
      <div style="height: 140px; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md)"></div>
    </oas-watermark>
  </div>
</DemoBlock>

`opacity` 控制水印层透明度（0–1，自动夹取边界）。

## 图片水印

<DemoBlock title="图片水印">
  <oas-watermark image="https://picsum.photos/seed/isui-watermark/160/160" opacity="0.25" repeat>
    <div style="height: 160px; display: flex; align-items: center; justify-content: center; border: 1px dashed var(--oas-color-border); border-radius: var(--oas-radius-md); color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
      `image` 属性传入图片 URL，与 text 同时存在时 image 优先
    </div>
  </oas-watermark>
</DemoBlock>

## 不拦截交互

<DemoBlock title="内容正常交互">
  <oas-watermark text="演示水印" repeat>
    <div style="height: 120px; display: flex; align-items: center; justify-content: center; gap: var(--oas-space-3)">
      <button class="wm-btn" onclick="window.message && window.message.success('按钮仍可点击')">可点击按钮</button>
      <button class="wm-btn">另一按钮</button>
    </div>
  </oas-watermark>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    水印层 `pointer-events: none`，上方的按钮/输入等交互完全不受影响。
  </p>
</DemoBlock>

## 空容器

<DemoBlock title="无内容也显示水印">
  <oas-watermark text="水印" repeat style="display: block; height: 120px"></oas-watermark>
</DemoBlock>

容器没有任何 slot 内容时，水印层照常渲染。

## API

### 属性

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `image` | 图片水印 URL（存在时优先于 text） | — | — |
| `opacity` | 水印层透明度（0–1，自动夹取） | — | `0.15` |
| `repeat` | 布尔，存在时平铺；缺省单枚居中 | — | — |
| `text` | 文字水印内容（与 image 二选一） | — | — |

### 插槽

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

水印为装饰层（`aria-hidden` + `pointer-events: none`），不参与可访问性树，不拦截交互。
