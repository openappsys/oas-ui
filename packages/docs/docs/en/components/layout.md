# Layout

A classic page skeleton of header + sider + content + footer, used with semantic child components.

## Basic usage

<DemoBlock title="Sider + header + content + footer">
  <oas-layout style="height: 300px; width: 100%">
    <oas-header slot="header">Header area</oas-header>
    <oas-sider slot="sider">Sider</oas-sider>
    <oas-content slot="content">
      <oas-space direction="vertical" style="width: 100%">
        <p>Main content area; place any content here.</p>
        <oas-tag type="primary">flex 1</oas-tag>
      </oas-space>
    </oas-content>
    <oas-footer slot="footer">Footer info</oas-footer>
  </oas-layout>
</DemoBlock>

## Without sider

<DemoBlock title="Header + content + footer">
  <oas-layout style="height: 260px; width: 100%">
    <oas-header slot="header">Header area</oas-header>
    <oas-content slot="content">A layout with only the header and footer.</oas-content>
    <oas-footer slot="footer">Footer info</oas-footer>
  </oas-layout>
</DemoBlock>

## Collapsible sider

<DemoBlock title="Collapsible sider (collapsed)">
  <oas-space direction="vertical" style="width: 100%">
    <oas-button size="small" onclick="document.querySelector('#layout-sider').toggleAttribute('collapsed')">Toggle sider collapse</oas-button>
    <oas-layout style="height: 260px; width: 100%">
      <oas-header slot="header">Header area</oas-header>
      <oas-sider id="layout-sider" slot="sider">Sider</oas-sider>
      <oas-content slot="content">Click the button above to collapse / expand the sider.</oas-content>
      <oas-footer slot="footer">Footer info</oas-footer>
    </oas-layout>
  </oas-space>
</DemoBlock>

## Viewport-locked layout

`viewport`: the admin-console mode — the layout locks to the viewport height, **header/footer stay fixed while the sider and content scroll independently** (the page itself never scrolls). Without the attribute, the default is the full-page scrolling model (the page grows as tall as its content).

The height defaults to `100dvh` (mobile address-bar friendly, cascading back to `100vh` when unsupported) and can be changed via `--oas-layout-height` to `100%` / `calc(...)` etc. (locked to 320px below for demo purposes).

<DemoBlock title="Viewport lock (viewport) + nested sidebar">
  <oas-layout id="layout-viewport" viewport style="--oas-layout-height: 320px; width: 100%">
    <oas-header slot="header">Header fixed (does not scroll with content)</oas-header>
    <oas-sider slot="sider">
      <oas-sidebar id="layout-viewport-sidebar" collapsible items='[
        {"label":"Dashboard","value":"1","icon":"star"},
        {"label":"Orders","value":"2","icon":"edit"},
        {"label":"Products","value":"3","icon":"heart"},
        {"label":"Users","value":"4","icon":"user"},
        {"label":"Marketing","value":"5","icon":"mail"},
        {"label":"Finance","value":"6","icon":"lock"},
        {"label":"Reports","value":"7","icon":"calendar"},
        {"label":"Shipping","value":"8","icon":"upload"},
        {"label":"Messages","value":"9","icon":"info"},
        {"label":"Access","value":"10","icon":"filter"},
        {"label":"Audit log","value":"11","icon":"clock"},
        {"label":"Settings","value":"12","icon":"gear"}
      ]'></oas-sidebar>
    </oas-sider>
    <oas-content slot="content">
      <div id="layout-viewport-content" style="padding: var(--oas-space-4)">
        <p>The content area scrolls independently — scroll the long content below and watch the sider and header stay put.</p>
        <p>Paragraph 1: in viewport-locked mode the sider and content each scroll within their own region.</p>
        <p>Paragraph 2: the page (body) never gets a scrollbar.</p>
        <p>Paragraph 3: the nested sidebar fills the sider track automatically.</p>
        <p>Paragraph 4: when you scroll this far, the header is still visible.</p>
        <p>Paragraph 5: keep scrolling...</p>
        <p>Paragraph 6: however long the content, only the content region scrolls.</p>
        <p>Paragraph 7: menu items overflowing the viewport scroll inside the sider.</p>
        <p>Paragraph 8: a fitting skeleton for admin systems.</p>
        <p>Paragraph 9: the classic fixed-header + dual independent-scroll combo.</p>
        <p>Paragraph 10: bottom of the demo.</p>
      </div>
    </oas-content>
    <oas-footer slot="footer">Footer fixed</oas-footer>
  </oas-layout>
</DemoBlock>

> Nested-width contract: `oas-sider` owns the track width (`--oas-sider-width`, default 200px, 64px collapsed); a nested `oas-sidebar` fills the track automatically (its own default 220px no longer applies and the track padding is removed). A standalone `oas-sidebar` still uses `--oas-sidebar-width` (default 220px). Two variables, two scopes: **sider owns the track, sidebar owns the standalone case** — change either side and they never misalign.

## API

| Component    | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `oas-layout` | Layout container (lays out horizontally when a sider is present)         |
| `oas-header` | Top bar, renders as `<header>`                                           |
| `oas-sider`  | Sider; the `collapsed` attribute collapses it to a narrow bar; renders as `<aside aria-label="侧边栏">` |
| `oas-content`| Content area, renders as `<main>`                                        |
| `oas-footer` | Footer, renders as `<footer>`                                            |

Child components must carry the matching `slot` attribute (`header` / `sider` / `content` / `footer`).

### oas-layout

| Attribute | Description | Type | Default |
| --- | --- | --- | --- |
| `viewport` | Viewport-locked mode: locks the layout to the viewport height (100dvh by default, cascading back to 100vh; overridable via `--oas-layout-height` to 100%/calc()), header/footer fixed while the sider and content scroll independently; default is the full-page scrolling model | `boolean` | — |

| Name | Description |
| --- | --- |
| `content` | — |
| `footer` | — |
| `header` | — |
| `sider` | — |

### oas-header

| Name | Description |
| --- | --- |
| default | — |

### oas-sider

| Name | Description |
| --- | --- |
| default | — |

### oas-content

| Name | Description |
| --- | --- |
| default | — |

### oas-footer

| Name | Description |
| --- | --- |
| default | — |
