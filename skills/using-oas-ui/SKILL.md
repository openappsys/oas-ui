---
name: using-oas-ui
description: Use when building UI with OAS-UI web components in HTML, React, Vue, Nuxt, or Next.js, or when choosing OAS-UI packages, wiring oas-* events, theming/dark mode, SSR, icons, or debugging custom-element behavior.
license: MIT OR Apache-2.0
---

# Using OAS-UI

OAS-UI is a framework-agnostic **Web Components** library. Every `oas-*` tag is a native custom element, not a React/Vue component. Render it as a tag, style it with CSS variables, and listen for `oas-*` CustomEvents.

## Install and register

```bash
pnpm add @oas-ui/ui @oas-ui/theme
```

```ts
import '@oas-ui/theme' // tokens + light/dark/high-contrast
import '@oas-ui/ui/basic/button' // preferred: only the component you use
```

`@oas-ui/ui` registers everything (large); use subpath imports for production. Do not import internal files such as `@oas-ui/ui/dist/basic/button/oas-button.js` — those export definitions but do not self-register.

CDN: load `@oas-ui/theme/index.css` + `@oas-ui/ui/dist/cdn.js` (or a group file such as `cdn/basic.js`) before using tags.

Icons referenced by name (for example `icon="check"`) need `import '@oas-ui/icons/register'` unless you use the full CDN bundle or provide an icon slot.

## Framework events

| Host | Correct |
| --- | --- |
| React 19 | `onoas-click={handler}` (`"on" + exact event name`, all lowercase) |
| React 17/18 | `ref` + `addEventListener('oas-click', …)` in `useEffect` |
| Vue | `@oas-click="handler"` |
| Plain DOM | `el.addEventListener('oas-click', handler)` |

```tsx
<oas-button type="primary" onoas-click={(e) => console.log(e.detail.originalEvent)}>
  Save
</oas-button>
```

`onOasClick` is **not** bound to `oas-click`; `onClick` only receives the native click. Event handlers receive a `CustomEvent`; read `event.detail`, not a React SyntheticEvent.

## Attributes, properties, and control

- HTML attributes are strings: `<oas-button type="primary" disabled>`.
- Arrays/objects and post-upgrade values use **properties**: `el.items = [...]`, `el.value = ...`. Set them after the element is upgraded (`customElements.whenDefined` if needed).
- Only JSON-stringify when the component's API documents a JSON attribute.
- Controlled usage: listen to `oas-change`/`oas-input`, then write the new value back. Do not treat the attribute as the live value when a property channel exists.

## Data components (gantt / resource / scheduler)

- `oas-gantt`: `tasks` (property/JSON) with `parent`/`children` WBS, dependencies, `deadline`, `baseline { start, end, progress }`, `constraint`; `show-baseline`, `show-float` (total/free float), `show-critical-path`. Use `computeVariance(tasks)` for baseline deltas. Multi-project = project root summary tasks with children (one tree, not multiple gantt instances).
- `oas-resource`: `resources` (`workdays` 0=Sunday…6=Saturday, `holidays`, `capacityOverrides`, `skills`) and `tasks` (`priority`, `requiredSkills`, `project`); `levelResources(resources, tasks, { respectSkills, projectOrder })` is a pure deterministic leveling helper (shift/reassign).
- `oas-scheduler`: `view` month/week/day/agenda/resource/resource-week; `repeat` (RRULE subset incl. `count`/`byDay`), `endDate` for multi-day all-day events; `windowed` + `total` + `window-start` for server-side resource rows with `oas-window-request`; `exportIcs()` / `downloadIcs()` and `eventsToIcs(events, options)` (timeMode floating/utc/tzid).
- Windowed contracts: feed only the loaded slice; listen for `oas-window-request` and update `window-start` + data. For host-expanded repeats, strip `repeat` from the base event and send unique occurrence ids.

## Theme and SSR

- Dark: add `class="dark"` to `<html>` or set `data-theme="dark"`. `data-theme="high-contrast"` is also supported.
- Optional: `@oas-ui/theme/skins.css` (`data-skin`), `@oas-ui/theme/glass.css` + `glass-fluid.js` (`data-glass`).
- Nuxt/Next: use `@oas-ui/nuxt` / `@oas-ui/next` for registration and SSR. Otherwise register components on the client; do not assume custom elements render meaningfully on the server without the SSR path.

## Do not

- Invent props or enum values. Read the component's `## API` section or `llms.txt`; e.g. button uses `type`/`size`, not a guessed `variant`.
- Use `onClick`/`onOasClick` for OAS events.
- Assume `@oas-ui/react` is published; it is an in-repo adapter and not required for React 19.
- Assume the tag works before its side-effect import has registered it.

## References

- AI docs: `https://oas-ui.dev/llms.txt` and `/llms-full.txt`
- Component API/demo: `https://oas-ui.dev/components/<name>`
- Getting started: `https://oas-ui.dev/guide/getting-started`
