# 废弃 API 台账

> 生成物：`pnpm deprecations:gen`。禁止手改；改 `docs/deprecations.json` 后重新生成。
> 当前版本：2.6.3。`removeIn` 为空表示长期兼容或尚未排期；非空必须是高于当前版本的 major。

| ID | 组件/入口 | 面 | 旧写法 | 迁移目标 | 状态 | 移除版本 |
| --- | --- | --- | --- | --- | --- | --- |
| `DEP-ATTR-0001` | `oas-input` | attribute | `prefix` | `prefix-text` | silent-compat | 未定 |
| `DEP-ATTR-0002` | `oas-input` | attribute | `suffix` | `suffix-text` | silent-compat | 未定 |
| `DEP-ATTR-0003` | `oas-input-number` | attribute | `prefix` | `prefix-text` | silent-compat | 未定 |
| `DEP-ATTR-0004` | `oas-input-number` | attribute | `suffix` | `suffix-text` | silent-compat | 未定 |
| `DEP-ATTR-0005` | `oas-tree-select` | attribute | `prefix` | `prefix-text` | silent-compat | 未定 |
| `DEP-ATTR-0006` | `oas-tree-select` | attribute | `suffix` | `suffix-text` | silent-compat | 未定 |
| `DEP-ATTR-0007` | `oas-statistic` | attribute | `prefix` | `prefix-text` | silent-compat | 未定 |
| `DEP-ATTR-0008` | `oas-statistic` | attribute | `suffix` | `suffix-text` | silent-compat | 未定 |
| `DEP-ATTR-0009` | `oas-countdown` | attribute | `prefix` | `prefix-text` | silent-compat | 未定 |
| `DEP-ATTR-0010` | `oas-countdown` | attribute | `suffix` | `suffix-text` | silent-compat | 未定 |
| `DEP-ATTR-0011` | `oas-mentions` | attribute | `prefix` | `trigger` | silent-compat | 未定 |
| `DEP-EVENT-0001` | `oas-modal` | event | `oas-closed` | `oas-after-close` | announced | 未定 |
| `DEP-EVENT-0002` | `oas-modal` | event | `oas-opened` | `oas-after-open` | announced | 未定 |
| `DEP-EVENT-0003` | `oas-drawer` | event | `oas-closed` | `oas-after-close` | announced | 未定 |
| `DEP-EVENT-0004` | `oas-drawer` | event | `oas-opened` | `oas-after-open` | announced | 未定 |
| `DEP-EVENT-0005` | `oas-upload` | event | `oas-exceed` | `oas-exceed-limit` | announced | 未定 |
| `DEP-REMOVED-0001` | `oas-popover` | attribute | `arrow-point-at-center` | — | removed | 未定 |
| `DEP-REMOVED-0002` | `oas-table` | method | `exportFileName` | `export-file-name / exportData(format, { fileName })` | removed | 未定 |
| `DEP-REMOVED-0003` | `@oas-ui/icons` | export | `iconRegistry / iconNames (root entry)` | `@oas-ui/icons/registry` | removed | 未定 |
| `DEP-REMOVED-0004` | `@oas-ui/theme` | css-var | `--oas-glass-refraction` | — | removed | 未定 |
