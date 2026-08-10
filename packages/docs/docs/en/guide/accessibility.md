# Accessibility (A11y)

OAS-UI targets WCAG 2.1 AA and is continuously audited with axe.

## Automated audits

Playwright + axe-core audit every component demo page; zero serious violations
is the passing standard:

```bash
pnpm test:e2e
```

The audits cover the `wcag2a` / `wcag2aa` / `wcag21aa` rule sets and only check
the component demo area (`.demo`).

## Keyboard flow regression matrix

| Component                                   | Keyboard behavior                    | Role/ARIA                           |
| ------------------------------------------- | ------------------------------------ | ----------------------------------- |
| Button                                      | Enter/Space triggers                 | `button`                            |
| Input / Textarea                            | Native input                         | `textbox` + `label`                 |
| Checkbox / Radio / Switch                   | Space toggles, arrow keys (Radio)    | `checkbox` / `radio` / `switch`     |
| Slider                                      | Arrow keys + Home/End                | `slider` (`aria-valuenow`)          |
| InputNumber                                 | Arrow keys inc/dec, Home/End         | `spinbutton`                        |
| Rate                                        | Arrow keys, Enter confirms           | `radiogroup` + `radio`              |
| Select / AutoComplete / Cascader / TreeSelect | Arrow navigation, Enter selects, Esc closes | `combobox` + `listbox`/`tree` |
| Menu / Dropdown / ContextMenu               | Arrow keys, Home/End, Enter          | `menu` + `menuitemradio`            |
| Tabs                                        | Arrow keys cycle                     | `tablist` + `tab` + `aria-selected` |
| Tree                                        | Arrow keys + Left/Right expand/collapse | `tree` + `treeitem`              |
| Modal / Drawer / Confirm                    | Tab focus trapped, Esc closes        | `dialog` + `aria-modal`             |
| Tooltip / Popover / HoverCard               | Esc closes                           | `tooltip` / `dialog`                |
| Pagination                                  | Tab to page buttons                  | Semantic buttons + `aria-current`   |
| Carousel                                    | Indicators tabbable                  | `role="tablist"` + `role="tab"`     |
| Collapse                                    | Header tabbable + Enter/Space toggles | Button semantics                   |
| Splitter                                    | Arrow keys adjust                    | `separator` + `aria-orientation`    |

## Semantic principles

- Every form control has an accessible name (`aria-label` or an associated label)
- Overlay components provide `role` + `aria-modal` + Esc to close
- Dynamic regions (loading / opening dialogs) provide `aria-live` or focus management
- Colors only use semantic tokens to keep contrast valid in both themes
