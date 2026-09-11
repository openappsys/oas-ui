# Image 图片

用于展示图片资源，支持可选预览能力。

## 基础用法

<DemoBlock title="基础图片">
  <oas-image src="https://picsum.photos/seed/isui/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjN2Y5Y2Y1Jy8+PC9zdmc+" alt="示例图"></oas-image>
</DemoBlock>

## 适应方式

<DemoBlock title="object-fit 变体">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap">
    <div>
      <p class="image-cap">cover（裁切填充）</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-fit-cover/600/300" fit="cover" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZjVhOTdmJy8+PC9zdmc+" alt="cover"></oas-image>
    </div>
    <div>
      <p class="image-cap">contain（完整显示）</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-fit-contain/600/300" fit="contain" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjN2ZkMGE5Jy8+PC9zdmc+" alt="contain"></oas-image>
    </div>
  </div>
</DemoBlock>

通过 `fit` 设置 `object-fit`，再配合 `::part(image)` 固定图片容器尺寸实现裁切效果。

<style>
.image-cap {
  margin: 0 0 var(--oas-space-2);
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.fit-demo {
  width: 240px;
  height: 150px;
  display: block;
}
.fit-demo::part(image) {
  width: 100%;
  height: 100%;
}
.lazy-list {
  width: 100%;
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-4);
}
.album-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--oas-space-3);
}
.album-grid oas-image {
  display: block;
}
.album-grid oas-image::part(image) {
  width: 100%;
  height: 110px;
  object-fit: cover;
}
.group-wall {
  width: 100%;
}
.group-wall oas-image::part(image) {
  width: 160px;
  height: 100px;
  object-fit: cover;
}
</style>

## 占位与兜底

<DemoBlock title="加载占位">
  <oas-image src="https://picsum.photos/seed/isui-placeholder/600/300" placeholder fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZTU5YWQxJy8+PC9zdmc+" alt="加载占位"></oas-image>
  <p style="width: 100%; margin: var(--oas-space-3) 0 0; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm)">
    设置 <code>placeholder</code> 后，图片加载完成前显示浅灰占位；加载完成后自动切换为图片。
  </p>
</DemoBlock>

<DemoBlock title="加载失败兜底">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap; align-items: flex-start">
    <div>
      <p class="image-cap">默认失败占位</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/missing.png" alt="加载失败"></oas-image>
    </div>
    <div>
      <p class="image-cap">自定义兜底图</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/missing.png" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjOGFiOGU2Jy8+PC9zdmc+" alt="自定义兜底"></oas-image>
    </div>
  </div>
</DemoBlock>

图片加载失败时默认显示「图片加载失败」占位；提供 `fallback` 属性可指定兜底图片地址，兜底图也失败时回退到占位文案。

## 懒加载

<DemoBlock title="懒加载长列表（滚动逐图加载）">
  <p class="image-cap">设置 <code>lazy</code> 后图片进入视口才发起加载；配合 <code>placeholder</code> 展示「加载中」占位。向下滚动列表，观察占位 → 加载的过渡（视口内图片立即加载）。</p>
  <div class="lazy-list" id="image-lazy-list">
    <oas-image lazy placeholder src="https://picsum.photos/seed/isui-lazy-static/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZjVjOTdmJy8+PC9zdmc+" alt="懒加载示例图"></oas-image>
  </div>
</DemoBlock>

## 预览

<DemoBlock title="点击预览（内置浮层）">
  <oas-image id="image-preview" src="https://picsum.photos/seed/isui-preview/600/300" preview fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYTlhZWY1Jy8+PC9zdmc+" alt="可预览图片"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    点击图片打开全屏预览浮层：工具栏支持放大/缩小/旋转/水平翻转/垂直翻转/下载，放大后可拖拽平移、滚动滚轮缩放；Esc 或点击遮罩关闭；打开时聚焦关闭按钮，关闭后还原焦点。派发 <code>oas-preview</code> 事件（detail 含 src）。
  </p>
</DemoBlock>

预览浮层打开时挂载到 <code>document.body</code>（portal），规避组件位于 <code>transform</code>/<code>filter</code> 祖先内时 <code>position: fixed</code> 失效的问题；portal 期间 <code>::part(preview-*)</code> 无法从宿主穿透，定制请走 CSS 变量。

## 图集预览

<DemoBlock title="图集预览（多图翻页）">
  <oas-image id="image-gallery" preview src="https://picsum.photos/seed/isui-gallery-1/600/300" preview-src-list='["https://picsum.photos/seed/isui-gallery-1/1200/600","https://picsum.photos/seed/isui-gallery-2/1200/600","https://picsum.photos/seed/isui-gallery-3/1200/600","https://picsum.photos/seed/isui-gallery-4/1200/600"]' fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYzRiNWU1Jy8+PC9zdmc+" alt="图集"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    设置 <code>preview-src-list</code>（JSON URL 数组）进入图集模式：点击后可用两侧箭头、工具栏翻页按钮或键盘 ←→ 翻页，页码指示「n/total」；某张加载失败显示失败占位（复用 <code>error</code> 插槽内容）而非空白。
  </p>
</DemoBlock>

<DemoBlock title="无限循环（infinite）">
  <oas-image id="image-gallery-infinite" preview infinite src="https://picsum.photos/seed/isui-loop-1/600/300" preview-src-list='["https://picsum.photos/seed/isui-loop-1/1200/600","https://picsum.photos/seed/isui-loop-2/1200/600","https://picsum.photos/seed/isui-loop-3/1200/600"]' fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjOTVjN2NlJy8+PC9zdmc+" alt="循环图集"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    加 <code>infinite</code> 后翻页首尾循环：最后一张再「下一张」回到第一张，第一张再「上一张」跳到最后一张。
  </p>
</DemoBlock>

## 缩略图与原图分离

<DemoBlock title="preview-src（缩略图与原图分离）">
  <oas-image preview src="https://picsum.photos/seed/isui-thumb/240/150" preview-src="https://picsum.photos/seed/isui-thumb/1600/1000" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="缩略图与原图分离"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: 0">
    列表内显示 <code>src</code> 缩略图，点开预览时加载 <code>preview-src</code> 指定的高清原图（下载地址同步指向原图）。
  </p>
</DemoBlock>

## 受控预览

<DemoBlock title="受控预览（preview-open + openPreview()）">
  <div style="width: 100%; display: flex; gap: var(--oas-space-3); align-items: center; flex-wrap: wrap">
    <oas-button id="image-controlled-open">打开预览</oas-button>
    <oas-image id="image-controlled" preview src="https://picsum.photos/seed/isui-controlled/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZDRhNWU4Jy8+PC9zdmc+" alt="受控预览"></oas-image>
    <span id="image-controlled-state" class="image-cap" style="margin: 0">当前状态：预览未打开</span>
  </div>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    外部按钮调 <code>openPreview()</code> 方法打开；<code>preview-open</code> 属性在场时受控当前开合态——内部开合（点击/Esc/关闭按钮）会反射回该属性并派发 <code>oas-preview-change</code>（detail <code>{ open }</code>），外部增删该属性同样驱动开合（双向同步）。
  </p>
</DemoBlock>

## 自定义工具栏

<DemoBlock title="自定义工具栏（slot=toolbar + oas-toolbar-render）">
  <oas-image id="image-custom-toolbar" preview src="https://picsum.photos/seed/isui-ct-1/600/300" preview-src-list='["https://picsum.photos/seed/isui-ct-1/1200/600","https://picsum.photos/seed/isui-ct-2/1200/600","https://picsum.photos/seed/isui-ct-3/1200/600"]' fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYTRjYWY4Jy8+PC9zdmc+" alt="自定义工具栏">
    <template slot="toolbar">
      <button type="button" data-cmd="zoom-out">缩小</button>
      <button type="button" data-cmd="zoom-in">放大</button>
      <button type="button" data-cmd="rotate-left">左旋</button>
      <button type="button" data-cmd="rotate-right">右旋</button>
      <button type="button" data-cmd="prev">上一张</button>
      <button type="button" data-cmd="next">下一张</button>
      <button type="button" data-cmd="download">下载</button>
      <button type="button" data-cmd="close">关闭</button>
    </template>
  </oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    提供 <code>template[slot="toolbar"]</code> 后，模板内容被克隆进预览浮层工具栏区并替换默认按钮组（原模板保留在 light DOM；无模板时维持默认工具栏）。克隆完成与每次打开预览都会派发 <code>oas-toolbar-render</code>：在事件回调里用 detail 的 <code>element</code>（工具栏容器）与 <code>actions</code>（查看器命令）把自定义按钮接到预览命令即可，上图按钮均已接线可直接点击。
  </p>
</DemoBlock>

`oas-toolbar-render` 的 detail 为 `{ element, actions }`：`element` 是克隆后的工具栏容器（宿主在其上绑定按钮事件，重复绑定幂等）；`actions` 命令集合如下（图集模式下 `prev`/`next` 有效，单图模式为 no-op）：

| 命令 | 说明 |
| --- | --- |
| `zoomIn` / `zoomOut` | 放大 / 缩小一档（与滚轮、默认按钮同一份 transform 状态机） |
| `rotateLeft` / `rotateRight` | 逆时针 / 顺时针旋转 90° |
| `flipX` / `flipY` | 水平 / 垂直翻转 |
| `download` | 触发当前预览图下载 |
| `close` | 关闭预览浮层（等价 Esc / 点遮罩） |
| `prev` / `next` | 图集上一张 / 下一张（受 `infinite` 边界约束，同默认翻页） |

宿主接线示例：

```js
el.addEventListener('oas-toolbar-render', (e) => {
  const { element, actions } = e.detail
  element.querySelector('#my-zoom-in').onclick = actions.zoomIn
})
```

`oas-image-group` 共享预览同样支持：把 `template[slot="toolbar"]` 直接放在组图内即可透传到共享浮层。自定义工具栏的按钮自动获得 token 化基础样式（light/dark 可读），并参与 Tab 焦点陷阱。

## 加载事件

<DemoBlock title="加载事件（oas-load / oas-error）">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap; align-items: flex-start">
    <div>
      <p class="image-cap">加载成功 → oas-load</p>
      <oas-image id="image-events-ok" class="fit-demo" src="https://picsum.photos/seed/isui-events-ok/600/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZWViNmZmJy8+PC9zdmc+" alt="事件示例（成功）"></oas-image>
    </div>
    <div>
      <p class="image-cap">加载失败 → oas-error</p>
      <oas-image id="image-events-bad" class="fit-demo" src="https://invalid.example.com/events-missing.png" alt="事件示例（失败）"></oas-image>
    </div>
  </div>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    主图加载成功派发 <code>oas-load</code>、最终失败派发 <code>oas-error</code>（detail 均含 <code>src</code>）；<code>fallback</code> 重试期间不派发 <code>oas-error</code>，兜底图也失败时才派发（detail.src 为兜底图地址）。
  </p>
</DemoBlock>

## 自定义占位与失败插槽

<DemoBlock title="自定义 placeholder / error 插槽">
  <div style="width: 100%; display: flex; gap: var(--oas-space-4); flex-wrap: wrap; align-items: flex-start">
    <div>
      <p class="image-cap">slot="placeholder"</p>
      <oas-image class="fit-demo" src="https://picsum.photos/seed/isui-slot-ph/600/300" placeholder>
        <template slot="placeholder"><span style="color: var(--oas-color-primary)">自定义加载占位…</span></template>
      </oas-image>
    </div>
    <div>
      <p class="image-cap">slot="error"</p>
      <oas-image class="fit-demo" src="https://invalid.example.com/slot-missing.png" alt="自定义失败插槽">
        <template slot="error"><span style="color: var(--oas-color-danger)">自定义失败内容（可放图标/按钮）</span></template>
      </oas-image>
    </div>
  </div>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    <code>template[slot="placeholder"]</code> / <code>template[slot="error"]</code>（或任意带同名 slot 属性的元素）会被克隆进对应占位区，优先于内置文案；图集预览中某张加载失败也复用 <code>error</code> 插槽内容。
  </p>
</DemoBlock>

## 翻转

<DemoBlock title="翻转（flipX / flipY）">
  <oas-image preview src="https://picsum.photos/seed/isui-flip/900/500" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc5MDAnIGhlaWdodD0nNTAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjZjBjNWE4Jy8+PC9zdmc+" alt="可翻转图片"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    工具栏提供「水平翻转」「垂直翻转」，与缩放、旋转、拖拽平移串接为同一份 transform 状态机，互不打断。
  </p>
</DemoBlock>

## 拖拽与滚轮缩放

<DemoBlock title="拖拽平移 + 滚轮缩放（大图/长图）">
  <oas-image preview src="https://picsum.photos/seed/isui-pan/1800/1100" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxODAwJyBoZWlnaHQ9JzExMDAnPjxyZWN0IHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnIGZpbGw9JyM5ZGMzZTYnLz48L3N2Zz4=" alt="大图拖拽缩放"></oas-image>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    放大后在预览图上按住拖拽平移（超出可视范围的部分按边界自动收敛），在预览区滚动滚轮缩放（已阻断页面滚动）。缩放步进与上下限可经 CSS 变量覆盖（见下表）。
  </p>
</DemoBlock>

## 相册墙组合

<DemoBlock title="相册墙（多图各自进图集）">
  <p class="image-cap">网格排布多张缩略图，点击任意一张从该张开始进入同一图集翻页（主图 src 命中列表时按该张起开）。</p>
  <div class="album-grid" id="image-album">
    <oas-image preview src="https://picsum.photos/seed/isui-album-1/800/500" preview-src-list='["https://picsum.photos/seed/isui-album-1/800/500","https://picsum.photos/seed/isui-album-2/800/500","https://picsum.photos/seed/isui-album-3/800/500","https://picsum.photos/seed/isui-album-4/800/500","https://picsum.photos/seed/isui-album-5/800/500","https://picsum.photos/seed/isui-album-6/800/500"]' alt="相册图片"></oas-image>
  </div>
</DemoBlock>

## 图集容器（oas-image-group）

<DemoBlock title="图集容器（声明式图片墙 → 共享预览）">
  <p class="image-cap">把多个 <code>oas-image</code> 放进 <code>oas-image-group</code>，容器自动收集为共享图集：点击任一图片从该张起打开预览，两侧箭头 / 键盘 ←→ 在整组图间翻页（页码 n/total）。子图带 <code>preview</code> 时点击同样被容器接管为组图集，不再需要各自配置 <code>preview-src-list</code>。</p>
  <oas-image-group id="image-group-demo" class="group-wall">
    <oas-image src="https://picsum.photos/seed/isui-group-1/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="图集图片 1"></oas-image>
    <oas-image src="https://picsum.photos/seed/isui-group-2/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="图集图片 2"></oas-image>
    <oas-image src="https://picsum.photos/seed/isui-group-3/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="图集图片 3"></oas-image>
    <oas-image src="https://picsum.photos/seed/isui-group-4/480/300" fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjYjRlYzUxJy8+PC9zdmc+" alt="图集图片 4"></oas-image>
  </oas-image-group>
  <p style="width: 100%; color: var(--oas-color-text-secondary); font-size: var(--oas-font-size-sm); margin: var(--oas-space-3) 0 0">
    子图动态增删（或修改 <code>src</code>）图集自动同步；<code>current</code> 可选受控当前索引——属性在场时点击按 <code>current</code> 起开、内部翻页反射回该属性，缺席时不造属性、仅派发 <code>oas-change</code>（detail <code>{ current, prev }</code>，演示见上方消息反馈）；<code>infinite</code> 透传共享预览。
  </p>
</DemoBlock>

与 `preview-src-list` 的关系：`preview-src-list` 适合「数据数组驱动」的单点图集入口（一张缩略图代表整组）；`oas-image-group` 适合「声明式图片墙」——每张子图天然是图集成员，DOM 里加图即入集。两者共享同一份预览浮层能力（缩放/旋转/翻转/下载/Esc/遮罩/焦点陷阱）；组内子图仍可用 `preview-src` 指定预览原图、用 `preview-src-list` 把单张子图展平为多张。组图默认 flex 换行排列，间距可经 CSS 变量 `--oas-image-group-gap` 覆盖。

### 预览缩放 CSS 变量

| CSS 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `--oas-image-zoom-step` | `0.5` | 每次放大/缩小的步进（工具栏按钮与滚轮共用） |
| `--oas-image-zoom-min` | `0.5` | 缩放下限 |
| `--oas-image-zoom-max` | `3` | 缩放上限 |

在宿主元素或主题层覆盖即生效，例如 `style="--oas-image-zoom-max: 5"`。

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  // 懒加载长列表：逐图进入视口才加载
  const list = document.querySelector('#image-lazy-list')
  if (list) {
    for (let i = 1; i <= 12; i++) {
      const el = document.createElement('oas-image')
      el.setAttribute('lazy', '')
      el.setAttribute('placeholder', '')
      el.setAttribute('src', `https://picsum.photos/seed/isui-lazy-${i}/600/300`)
      el.setAttribute('fallback', "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nMzAwJz48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPScjNzJjN2QwJy8+PC9zdmc+")
      el.setAttribute('alt', `懒加载图片 ${i}`)
      list.appendChild(el)
    }
  }

  const { message } = await import('@oas-ui/ui')
  window.message = message
  document.querySelector('#image-preview')?.addEventListener('oas-preview', (e) => {
    message.success(`打开预览：${e.detail.src}`)
    console.log('oas-preview', e.detail.src)
  })

  // 以下涉及 oas-image 的 property/方法调用，等升级完成再执行
  //（preview 构建下升级前赋值 expando 会遮蔽后来的 setter，必须守卫）
  await customElements.whenDefined('oas-image')

  // 受控预览：外部按钮 openPreview() 打开；Esc/关闭按钮收起后反射回 preview-open 属性
  // （hasAttribute 回读验证反射通道）+ oas-preview-change 回显
  const controlled = document.querySelector('#image-controlled')
  const controlledState = document.querySelector('#image-controlled-state')
  document.querySelector('#image-controlled-open')?.addEventListener('click', () => {
    controlled?.openPreview()
  })
  controlled?.addEventListener('oas-preview-change', (e) => {
    const open = controlled.hasAttribute('preview-open')
    if (controlledState) {
      controlledState.textContent = `当前状态：${open ? '预览已打开' : '预览已关闭'}`
    }
    message.success(`oas-preview-change: ${e.detail.open}`)
  })

  // 图集容器：切图时给出可见反馈（oas-change 的 current/prev）
  document.querySelector('#image-group-demo')?.addEventListener('oas-change', (e) => {
    message.success(`oas-change：current=${e.detail.current}，prev=${e.detail.prev}`)
  })

  // 自定义工具栏：oas-toolbar-render 命令通道接线（克隆完成与每次打开均派发，幂等）
  const customToolbar = document.querySelector('#image-custom-toolbar')
  customToolbar?.addEventListener('oas-toolbar-render', (e) => {
    const { element, actions } = e.detail
    const CMD = {
      'zoom-in': actions.zoomIn,
      'zoom-out': actions.zoomOut,
      'rotate-left': actions.rotateLeft,
      'rotate-right': actions.rotateRight,
      prev: actions.prev,
      next: actions.next,
      download: actions.download,
      close: actions.close,
    }
    for (const btn of element.querySelectorAll('[data-cmd]')) {
      btn.onclick = CMD[btn.getAttribute('data-cmd')]
    }
  })

  // 加载事件演示
  document.querySelector('#image-events-ok')?.addEventListener('oas-load', (e) => {
    message.success(`oas-load：${e.detail.src}`)
  })
  document.querySelector('#image-events-bad')?.addEventListener('oas-error', (e) => {
    message.error(`oas-error：${e.detail.src}`)
  })

  // 相册墙：网格多图共享同一图集，点击任意一张从该张开始
  const ALBUM = [
    'https://picsum.photos/seed/isui-album-1/800/500',
    'https://picsum.photos/seed/isui-album-2/800/500',
    'https://picsum.photos/seed/isui-album-3/800/500',
    'https://picsum.photos/seed/isui-album-4/800/500',
    'https://picsum.photos/seed/isui-album-5/800/500',
    'https://picsum.photos/seed/isui-album-6/800/500',
  ]
  const album = document.querySelector('#image-album')
  if (album) {
    // 首张为静态声明（DemoBlock 代码可见性），其余 5 张数据驱动补齐
    for (const url of ALBUM.slice(1)) {
      const el = document.createElement('oas-image')
      el.setAttribute('preview', '')
      el.setAttribute('src', url)
      el.setAttribute('preview-src-list', JSON.stringify(ALBUM))
      el.setAttribute('alt', '相册图片')
      album.appendChild(el)
    }
  }
})
</script>

## API

### oas-image

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `alt` | 替代文本 | — | — |
| `fallback` | 加载失败时切换的兜底图地址；未设置则显示「图片加载失败」占位 | `string` | — |
| `fit` | `object-fit` 值 | `string` | — |
| `infinite` | 图集首尾循环切换 | `boolean` | — |
| `lazy` | 懒加载：图片进入视口才发起加载（IntersectionObserver）；已位于视口内立即加载；环境不支持时退化为立即加载 | `boolean` | — |
| `placeholder` | 加载完成前显示浅灰占位 | `boolean` | — |
| `preview` | 开启内置预览：点击放大 + 缩放/旋转/下载 + Esc 关闭 + 焦点陷阱 | `boolean` | — |
| `preview-open` | 受控预览开合（属性在场受控，配合 `oas-preview-change` 双向；另见 `openPreview()` 方法） | `boolean` | — |
| `preview-src` | 预览原图 URL（缩略图与原图分离；缺省用 `src`） | `string` | — |
| `preview-src-list` | 图集预览：URL JSON 数组，点开后 prev/next 翻页 + 页码 + 键盘 ←→ | `string` | — |
| `src` | 图片地址 | `string` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-error` | 图片最终失败（回退链耗尽），`detail: { src }` |
| `oas-load` | 图片加载成功，`detail: { src }` |
| `oas-preview` | 打开预览浮层，`detail: { src }`；浮层关闭不派发事件 |
| `oas-preview-change` | 预览开合变化，`detail: { open }` |
| `oas-preview-nav` | 图集翻页/跳转，`detail: { index, src }`；供 oas-image-group 容器接管索引 |
| `oas-toolbar-render` | 自定义工具栏渲染通知（克隆完成与每次打开预览均派发，宿主重复绑定幂等），detail { element, actions }：element 为克隆后的工具栏容器，actions 为查看器命令集合 |

| 名称 | 说明 |
| --- | --- |
| `template[slot="error"]` | 自定义失败占位内容（主图与图集预览失败位复用） |
| `template[slot="placeholder"]` | 自定义加载占位内容（缺省为浅灰占位 + 文案） |
| `template[slot="toolbar"]` | 自定义预览工具栏内容：克隆进浮层工具栏区并替换默认按钮组（缺席维持默认）；克隆完成与每次打开预览派发 oas-toolbar-render（detail { element, actions }），actions 命令：zoomIn/zoomOut/rotateLeft/rotateRight/flipX/flipY/download/close/prev/next（单图模式 prev/next 无效） |

### oas-image-group

| 属性 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `current` | 当前图集索引（可选受控）：属性在场时受控——点击按 current 起开、内部翻页反射回该属性、外部改属性驱动预览跳图；缺席时不造属性，仅派发 oas-change | — | — |
| `infinite` | 翻页首尾循环（透传共享预览宿主） | `boolean` | — |

| 事件 | 说明 |
| --- | --- |
| `oas-change` | 图集切换，`detail: { current, prev }` |
| `oas-preview` | 打开共享预览浮层，`detail: { src }`（src 为当前张地址） |

| 名称 | 说明 |
| --- | --- |
| 默认 | — |
| `template[slot="toolbar"]` | 透传共享预览宿主：自定义共享预览浮层的工具栏（克隆替换默认按钮组 + oas-toolbar-render 命令通道，同 oas-image） |
