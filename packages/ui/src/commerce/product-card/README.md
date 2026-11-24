# oas-product-card 设计前必答

1. **取消路径**：无浮层、无异步、无计时器；卡片断开即无状态；图片加载失败只换占位框，不留悬挂请求（`loading="lazy"` 交给浏览器）。
2. **属性默认值/空态**：`title` 缺省 → 标题位隐藏（不渲染空标题行）；`price` 与 `original-price` 都缺省 → 价格区整体隐藏；`image` 缺省 → 虚线占位框 + `role="img"` 无障碍名（i18n `productCard.noImage`）；`image-ratio` 缺省 `1:1`，非法值回落 `1:1` 并告警一次；`layout` 缺省 `vertical`，非法值回落并告警一次；三个插槽为空时容器自动 `hidden`（不占间距）。
3. **多步交互失败点**：卡片本体无内置交互（不吞点击、不做路由），失败点只有图片加载——加载失败后同一 `src` 不再重试，换 `image` 值即重新尝试；`actions` 插槽内的按钮归宿主，事件由宿主按钮自身派发。
4. **破坏性选项**：无（纯展示卡）；「加入购物车」等动作放 `actions` 插槽，语义与确认策略由宿主决定。
5. **键盘/ARIA**：卡片为静态内容，不进入焦点序（避免列表里每张卡都变成 Tab 站）；图片 `alt` 取标题（缺图时占位框 `role="img"` + i18n 文案）；标题两行截断只是视觉，DOM 文本完整、`title` 属性提供长文悬浮提示；`actions` 内的按钮保持原生可达。
6. **受控/非受控与宿主桥接**：全部走 attribute 通道，无 property 冲突需规避（`title` 是原生反射属性，`el.title = '…'` 会照常写 attribute，正是我们要的通道）；金额字段透传内嵌 `oas-price`（币种 / 精度 / locale 与本卡属性一致）；宿主框架里 `image` 建议用 `:image="url"` 绑定（字符串属性，不会被剥离）。

## 两种形态

- `layout="vertical"`（缺省）：图在上、内容在下，适合宫格列表。
- `layout="horizontal"`：图固定 104px 宽在行首、内容在行尾，适合「猜你喜欢」「购物车推荐」横排卡片。
- 图片比例用 `image-ratio` 控制（`16:9` / `4/3` / `1.75` 数字），纵向卡片下宽度撑满、高度按比例；横向卡片下宽度固定、高度按比例。

## 结构须知

`::part(card)` 是 column flex（horizontal 时切 row flex，`:host([layout='horizontal'])` 承载）。`::part(media)` 带内联 `aspect-ratio`；覆写 `::part(media)` 宽高时注意 `object-fit: cover` 的裁剪语义。`actions` 用 `margin-block-start: auto` 贴卡片底部，让不同标题行数（1 行 / 2 行截断）的卡片按钮对齐。
