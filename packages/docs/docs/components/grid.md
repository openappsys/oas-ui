# Grid 栅格

24 栅格布局系统，配合 `oas-grid-item` 划分列宽，支持间距、偏移与自定义总列数；设置 `columns` 后切换为自动等分布局（simple-grid）。

## 基础栅格

<DemoBlock title="三等分">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 不等分

<DemoBlock title="不等分">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="6"><div class="demo-grid-box">span 6</div></oas-grid-item>
    <oas-grid-item span="12"><div class="demo-grid-box">span 12</div></oas-grid-item>
    <oas-grid-item span="6"><div class="demo-grid-box">span 6</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 偏移

<DemoBlock title="偏移 offset">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="12"><div class="demo-grid-box">span 12</div></oas-grid-item>
    <oas-grid-item span="8" offset="4"><div class="demo-grid-box">span 8 offset 4</div></oas-grid-item>
    <oas-grid-item span="4" offset="6"><div class="demo-grid-box">span 4 offset 6</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 自定义总列数

<DemoBlock title="自定义 cols">
  <oas-grid cols="12" gap="12px" style="width: 100%">
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 列</div></oas-grid-item>
    <oas-grid-item span="6"><div class="demo-grid-box">span 6 / 12 列</div></oas-grid-item>
    <oas-grid-item span="4"><div class="demo-grid-box">span 4</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 自动列（simple-grid）

设置 `columns` 后按 `repeat(n, 1fr)` 自动等分，子项 span 被忽略（span 仅在无 `columns` 时生效），与 24 列栅格并存不冲突。

<DemoBlock title="columns 自动等分">
  <oas-grid columns="3" gap="12px" style="width: 100%">
    <div class="demo-grid-box">1</div>
    <div class="demo-grid-box">2</div>
    <div class="demo-grid-box">3</div>
    <div class="demo-grid-box">4</div>
    <div class="demo-grid-box">5</div>
    <div class="demo-grid-box">6</div>
  </oas-grid>
</DemoBlock>

<DemoBlock title="columns 忽略 span">
  <oas-grid columns="4" gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 被忽略</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 被忽略</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8 被忽略</div></oas-grid-item>
    <oas-grid-item span="24"><div class="demo-grid-box">span 24 被忽略</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 大间距

<DemoBlock title="间距 gap">
  <oas-grid gap="24px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 行列间距分离

`gap` 支持两值语法：空格分隔「行 列」，分别控制 row-gap 与 column-gap；单值仍为两轴同值（零回归）。

<DemoBlock title="gap 两值：行 8 列 24">
  <oas-grid gap="8 24" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">行距 8 / 列距 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">行距 8 / 列距 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">行距 8 / 列距 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">行距 8 / 列距 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">行距 8 / 列距 24</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">行距 8 / 列距 24</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 响应式断点

`span` / `offset` 支持断点简写：基础值 + 空格分隔的若干 `断点:值`（断点 `sm`=640 / `md`=768 / `lg`=1024 / `xl`=1280，移动优先）。拖窄窗口可观察列数变化。

<DemoBlock title="span 断点：24 → md:12 → lg:8">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="24 md:12 lg:8"><div class="demo-grid-box">span 24 / md 12 / lg 8</div></oas-grid-item>
    <oas-grid-item span="24 md:12 lg:8"><div class="demo-grid-box">span 24 / md 12 / lg 8</div></oas-grid-item>
    <oas-grid-item span="24 md:12 lg:8"><div class="demo-grid-box">span 24 / md 12 / lg 8</div></oas-grid-item>
  </oas-grid>
  <p class="demo-grid-note">&lt;640px 每项占满一行；≥768px 两项一行；≥1024px 三等分。</p>
</DemoBlock>

<DemoBlock title="offset 断点：0 → md:4">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="24 md:16"><div class="demo-grid-box">span 24 / md 16</div></oas-grid-item>
    <oas-grid-item span="24 md:4" offset="0 md:4"><div class="demo-grid-box">span 4 offset 4（md 起）</div></oas-grid-item>
  </oas-grid>
  <p class="demo-grid-note">≥768px 右侧项从第 5 列起、占 4 列（offset 4 / span 4）。</p>
</DemoBlock>

## 自宽列

`span="auto"` 让子项按内容自然宽度排布（不展开占列），可与 `offset` 组合。

<DemoBlock title="span=auto 自宽列">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="auto"><div class="demo-grid-box">auto 自适应</div></oas-grid-item>
    <oas-grid-item span="auto" offset="4"><div class="demo-grid-box">auto offset 4</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    <oas-grid-item span="4"><div class="demo-grid-box">span 4</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

## 容器对齐

`justify` 控制行内轴（justify-items），`align` 控制块向轴（align-items）；合法值直写，非法回落 `stretch` + dev 告警。

<DemoBlock title="justify 行内轴对齐">
  <div class="demo-grid-col">
    <span class="demo-grid-label">justify="start"（默认行为）</span>
    <oas-grid gap="8px" justify="start" style="width: 100%">
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">justify="center"</span>
    <oas-grid gap="8px" justify="center" style="width: 100%">
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">justify="end"</span>
    <oas-grid gap="8px" justify="end" style="width: 100%">
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">span 8</div></oas-grid-item>
    </oas-grid>
  </div>
</DemoBlock>

<DemoBlock title="align 块向轴对齐（固定高度）">
  <div class="demo-grid-col">
    <span class="demo-grid-label">align="start"</span>
    <oas-grid gap="8px" align="start" style="width: 100%; height: 80px">
      <oas-grid-item span="8"><div class="demo-grid-box short">矮</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">高 40</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box tall">高 64</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">align="center"</span>
    <oas-grid gap="8px" align="center" style="width: 100%; height: 80px">
      <oas-grid-item span="8"><div class="demo-grid-box short">矮</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">高 40</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box tall">高 64</div></oas-grid-item>
    </oas-grid>
    <span class="demo-grid-label">align="baseline"</span>
    <oas-grid gap="8px" align="baseline" style="width: 100%; height: 80px">
      <oas-grid-item span="8"><div class="demo-grid-box short">矮</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box">高 40</div></oas-grid-item>
      <oas-grid-item span="8"><div class="demo-grid-box tall">高 64</div></oas-grid-item>
    </oas-grid>
  </div>
</DemoBlock>

## 重排（order）

不提供 push/pull（偏移式前后移动）——用 `order` 表达重排：不改 DOM/源码顺序（语义与读屏顺序保持），仅视觉排序变化。

<DemoBlock title="末位列提到首位">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="8"><div class="demo-grid-box">源码第 1 列（order 0）</div></oas-grid-item>
    <oas-grid-item span="8"><div class="demo-grid-box">源码第 2 列（order 0）</div></oas-grid-item>
    <oas-grid-item span="8" order="-1"><div class="demo-grid-box">源码第 3 列（order -1 → 首位）</div></oas-grid-item>
  </oas-grid>
</DemoBlock>

<DemoBlock title="自定义顺序">
  <oas-grid gap="12px" style="width: 100%">
    <oas-grid-item span="6" order="3"><div class="demo-grid-box">A（order 3）</div></oas-grid-item>
    <oas-grid-item span="6" order="1"><div class="demo-grid-box">B（order 1）</div></oas-grid-item>
    <oas-grid-item span="6" order="2"><div class="demo-grid-box">C（order 2）</div></oas-grid-item>
    <oas-grid-item span="6" order="0"><div class="demo-grid-box">D（order 0）</div></oas-grid-item>
  </oas-grid>
  <p class="demo-grid-note">视觉顺序：D（0）→ B（1）→ C（2）→ A（3）。</p>
</DemoBlock>

<style>
  .demo-grid-box {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--oas-color-bg-hover);
    border-radius: var(--oas-radius-md);
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
  }
  .demo-grid-box.short {
    height: 28px;
  }
  .demo-grid-box.tall {
    height: 64px;
  }
  .demo-grid-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .demo-grid-label {
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
  }
  .demo-grid-note {
    font-size: var(--oas-font-size-xs);
    color: var(--oas-color-text-secondary);
    margin-top: 8px;
  }
</style>

## API

### oas-grid

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `align` | 块向轴对齐（align-items）：`start` / `center` / `end` / `stretch` / `baseline`；非法值回落 `stretch` + dev 告警（同值去重） | `string` | — |
| `cols` | 总列数 | `string` | `24` |
| `columns` | 自动等分数（simple-grid，有值时忽略子项 span） | `string` | — |
| `gap` | 间距；单值两轴同值，两值空格分隔「行 列」（如 `8 16` 行 8 列 16）；三值以上非法静默回落 `0` | `string` | `0` |
| `justify` | 行内轴对齐（justify-items）：`start` / `center` / `end` / `stretch`；非法值回落 `stretch` + dev 告警（同值去重） | `string` | — |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

### oas-grid-item

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `offset` | 左侧偏移列数；支持断点简写（如 `0 lg:4`：基础值 + 空格分隔 `断点:值`，断点 sm=640 / md=768 / lg=1024 / xl=1280） | `string` | `0` |
| `order` | 排序权重（数字，默认 0）；数值越大越靠后，用于列重排（偏移重排场景的等价表达） | `string` | `0` |
| `span` | 跨列数；支持 `auto`（内容自然宽）与断点简写（如 `24 md:12`：基础值 + 空格分隔 `断点:值`，断点 sm=640 / md=768 / lg=1024 / xl=1280） | `string` | `24` |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |

`oas-grid` 渲染为 CSS Grid，子项为 24 份中的一份；`oas-grid-item` 通过 `span` 声明占位。设置 `columns` 后自动等分、忽略 span，普通元素子项也可直接放入。
