# oas-category 分类

左类右品双栏分类导航（commerce 族）：左侧多级类目树，右侧当前类子类宫格 / 商品位，联动高亮。

## 设计前必答

1. **取消路径**：纯选择组件，无提交与中间态；折叠与选中互相独立，无孤儿浮层。
2. **属性默认值 / 空态**：`categories` 缺省 / 非法 JSON → 空树 + 空态文案；`active-key` 无效时回落第一个根类目。
3. **多步交互失败点**：点击商品位只派发 `oas-select`，由宿主处理后续（加购 / 跳转）；没有异步加载，失败点仅为数据缺失（空态兜底）。
4. **破坏性选项**：无；展开 / 选中可逆，外部受控写入会自动展开路径便于定位。
5. **键盘 / ARIA**：`role="tree"` + 每项 `role="treeitem"`，`aria-level` / `aria-expanded` / `aria-selected` 同步；`↑` / `↓` 移动、`→` 展开或进入首个子类、`←` 收起或回父类、`Enter` / `Space` 选中；roving tabindex。
6. **受控 / 非受控**：`active-key` 受控（点击回写）；展开态为组件内部状态（不对外暴露），保证受控宿主只需关心当前类目。

## 数据契约（宿主注入）

```json
[
  {
    "key": "digital",
    "label": "数码",
    "children": [{ "key": "phone", "label": "手机", "items": [{ "key": "p1", "label": "蓝牙耳机", "meta": "热卖" }] }]
  }
]
```

- `key` 全局唯一（缺省回落 `id` / `label` / `name`）
- `items` 为叶子商品位；商品 key 与类目 key 不要重名（重名时按类目处理）

## 事件

| 事件 | detail |
| --- | --- |
| `oas-change` | `{ key, path, node }` — 左侧选中 / 右侧进入子类 |
| `oas-select` | `{ key, item, path }` — 点击商品位 |

## property 通道

`categories` 另有同名 get/set：赋数组时序列化后反射成 attribute（读取返回解析后的节点数组），
字符串原样写入。宿主框架的静态数据绑定因此不必手写 `JSON.stringify`，SPA 下也不会因
「`'categories' in el` 为真但无 setter」而丢数据。

- 命名纪律：attribute 的 camelCase 不得与实例方法/字段同名（`active-key` 的解析方法叫
  `resolveActiveKey`，不叫 `activeKey`）——同名会被 property 写入遮蔽，`update()` 直接 TypeError。
- 无障碍：树子级挂在 `role="group"` 容器里（ARIA tree 模式），重建树/面板后保留焦点；
  收起箭头在 `:dir(rtl)` 下镜像 180°。

