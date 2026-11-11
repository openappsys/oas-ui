# Navigation Patterns

Composition recipes for cross-component navigation shapes: **the library ships no single "dual-rail sidebar" component** — a dual rail is a composition of existing parts (`oas-sidebar` and friends), with scale, zoning and wiring left to the host. This page collects six shapes, each a live demo.

## Dual-rail split sidebar {#shape-dual}

**Scenario**: the "workspace + navigation" two-tier structure of back-office products — a narrow icon rail on the far left carries workspace identity, and the adjacent column is the navigation panel of the current workspace (grouped menu + a footer account/capacity zone). Switching workspace on the rail switches the panel's title, default page and canvas title in sync. Two `oas-sidebar` instances, no new component.

<DemoBlock title="Dual-rail split sidebar (rail switches workspace)">
  <div class="np-shell">
    <oas-sidebar
      id="np-rail"
      class="np-rail"
      collapsed
      hide-toggle
      mobile-breakpoint="1"
      active="am"
      items='[{"label":"OAS Studio","value":"am","avatarText":"OS"},{"label":"OAS Team","value":"eu","avatarText":"OT"},{"label":"New workspace","value":"add","icon":"plus"}]'
    >
      <div slot="footer" class="np-rail__foot">
        <oas-avatar size="32">WL</oas-avatar>
      </div>
    </oas-sidebar>
    <oas-sidebar
      id="np-workspace-panel"
      class="np-panel"
      hide-toggle
      mobile-breakpoint="1"
      active="live"
      items='[{"label":"Daily board","value":"live","group":"Pinned views"},{"label":"Growth radar","value":"pulse","group":"Pinned views"},{"label":"Sales overview","value":"teams","group":"Pinned views","badge":5},{"label":"Catalog view","value":"catalog","group":"Data assets"},{"label":"Batch records","value":"batches","group":"Data assets"},{"label":"Billing trail","value":"ledger","group":"Data assets"}]'
    >
      <oas-dropdown
        slot="header"
        id="np-workspace-switch"
        placement="bottom-start"
        items='[{"label":"Rename workspace","value":"rename"},{"label":"Manage members","value":"members"}]'
        style="display: block; width: 100%"
      >
        <button type="button" class="np-workspace">
          <span class="np-workspace__text">
            <span class="np-workspace__name" id="np-ws-name">OAS Console</span>
            <span class="np-workspace__tier" id="np-ws-tier">Enterprise plan</span>
          </span>
          <oas-icon name="chevron-down" size="16" class="np-workspace__chevron"></oas-icon>
        </button>
      </oas-dropdown>
      <div slot="footer" class="np-panel__foot">
        <div class="np-storage">
          <div class="np-storage__row">
            <span class="np-storage__title">Storage</span>
            <oas-link href="#" class="np-storage__manage">Manage</oas-link>
          </div>
          <oas-progress value="21" no-text label="4.2 GB of 20 GB"></oas-progress>
          <span class="np-storage__meta">4.2 GB of 20 GB</span>
        </div>
        <div class="np-panel__account">
          <button type="button" class="np-bell" id="np-bell" aria-label="Notifications">
            <oas-badge dot id="np-bell-badge">
              <oas-icon size="20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
                  <path d="M10 18a2 2 0 0 0 4 0" />
                </svg>
              </oas-icon>
            </oas-badge>
          </button>
          <oas-avatar size="28">WL</oas-avatar>
        </div>
      </div>
    </oas-sidebar>
    <div class="np-main">
      <p class="np-main__eyebrow">Current view</p>
      <h4 class="np-main__title" id="np-main-title">Daily board</h4>
      <p class="np-main__desc">The dual rail only owns navigation; the canvas stays the host's business.</p>
      <div class="np-main__cards">
        <div class="np-main__card">
          <span class="np-main__label">Monthly revenue</span>
          <strong>$286,400</strong>
        </div>
        <div class="np-main__card">
          <span class="np-main__label">Active members</span>
          <strong>46</strong>
        </div>
        <div class="np-main__card">
          <span class="np-main__label">Open tasks</span>
          <strong>9</strong>
        </div>
      </div>
    </div>
  </div>
  <p id="np-status" role="status" class="np-status">Workspace: OAS Studio → OAS Console (Enterprise plan)</p>
</DemoBlock>

**Pattern notes**:

1. **Rail = `collapsed` icon strip**: under `collapsed` the component keeps only items with a leading avatar or icon (items without either are auto-hidden); the strip width comes from `--oas-sidebar-collapsed-width` (68px here — the component default is 64px, and the extra 4px give the rail avatars breathing room). In collapsed mode the component hides head / body / foot by default, so the rail footer must be re-exposed explicitly (the `#np-rail::part(foot)` override in this page's styles) — otherwise the bottom avatar never shows. `hide-toggle` removes the bottom collapse button: in a dual rail the track width is a layout decision
2. **Panel = a second `oas-sidebar`**: `group` declares section headers (rendered before a group's first item, auto-hidden when collapsed); the `header` / `footer` named slots carry the workspace switcher and the account zone; width comes from `--oas-sidebar-width` (272px). The footer avatar uses `oas-avatar`'s text channel — by contract it renders **only the first character** (`WL` shows as `W`); use `src` for full initials
3. **Both rails are controlled highlights**: `active` is a controlled attribute — clicking an item only emits `oas-select` (`detail` shape `{ value, label, group? }`, see the Sidebar page), and the host must write `active` back. Rail writes the rail, panel writes the panel: two independent state slots
4. **The workspace mapping lives in the host**: rail value → panel title copy + default page value is an ordinary lookup table. The component knows nothing about "workspaces" — exactly where this belongs in a composition
5. **The container owns scale**: outer flex row + fixed height (520px here) + rounded border + `overflow: hidden`; both columns fill it and the footer sticks to the bottom. Everything outside navigation is the host's own canvas

> A dual rail only holds up on desktop: this recipe pins the desktop shape with `mobile-breakpoint="1"` (on narrow screens a dual rail should collapse back to a single rail + drawer, see the mobile drawer on the Sidebar page).

**Shapes on this page**: [Dual-rail split sidebar](#shape-dual) · [Floating top bar](#shape-floating) · [Classic light top bar](#shape-classic) · [Expanded sidebar 272px](#shape-expanded) · [Slim icon rail 68px](#shape-rail) · [Dark enterprise sidebar 272px](#shape-dark)

## Floating top bar (horizontal-floating) {#shape-floating}

**Scenario**: a SaaS product's floating navigation bar — a rounded island hovering above the page, packing logo + menu + search + notifications + account into one bar; menu switching and notification read-state both give instant visible feedback. One `oas-app-bar` (`position="floating"` + `elevated`), layout owned by the host.

<DemoBlock title="Floating top bar (rounded island + controlled menu + notification read-state + account menu)">
  <div class="npf-shell">
    <oas-app-bar id="npf-bar" position="floating" elevated>
      <div slot="leading" class="npf-brand">
        <span class="np-logo-mark np-logo-mark--bar" aria-hidden="true"><oas-icon name="star-filled" size="13"></oas-icon></span>
        <span class="npf-brand__name">OAS</span>
      </div>
      <nav slot="title" class="np-menu" id="npf-menu" aria-label="Main navigation">
        <button type="button" class="np-menu__item active" data-value="dashboard" aria-current="page">Home</button>
        <button type="button" class="np-menu__item" data-value="analytics">Stats</button>
        <button type="button" class="np-menu__item" data-value="orders">Orders</button>
        <button type="button" class="np-menu__item" data-value="invoices">Bills</button>
      </nav>
      <!-- Search and bell are two independent slotted children: overflow collection is
           computed per element, so if the bar ever overflows only the tail element folds,
           keeping the bell directly clickable. The floating bar drops ⌘K (inset + account
           block leave too little room in the ~574px content column — Orders/Bills were
           clipped by the search box); the full ⌘K combo lives in the expanded sidebar -->
      <div class="npf-search" slot="actions">
        <oas-input id="npf-search" placeholder="Search" suffix-icon="search" clearable></oas-input>
      </div>
      <button type="button" class="np-bell" slot="actions" id="npf-bell" aria-label="Notifications">
        <oas-badge dot id="npf-bell-badge">
          <oas-icon size="20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
          </oas-icon>
        </oas-badge>
      </button>
      <div slot="trailing" class="npf-user">
        <oas-dropdown
          id="npf-user-menu"
          placement="bottom-end"
          items='[{"label":"Profile settings","value":"profile"},{"label":"Sign out","value":"signout"}]'
        >
          <button type="button" class="npf-user__btn">
            <oas-avatar size="24">WL</oas-avatar>
            <span class="npf-user__meta">
              <span class="npf-user__name">Wren Lin</span>
              <span class="npf-user__tier">Trial</span>
            </span>
            <oas-icon name="chevron-down" size="12" class="npf-user__chevron"></oas-icon>
          </button>
        </oas-dropdown>
      </div>
    </oas-app-bar>
    <div class="npf-canvas">
      <p class="np-canvas__eyebrow">Current page</p>
      <h4 class="np-canvas__title" id="npf-canvas-title">Home</h4>
      <p class="np-canvas__desc">The island only owns navigation: page content is the host's business, floating above the canvas.</p>
      <div class="np-canvas__cards">
        <div class="np-canvas__card"><span>MRR</span><strong>$86,240</strong></div>
        <div class="np-canvas__card"><span>Trials</span><strong>312</strong></div>
        <div class="np-canvas__card"><span>Churn</span><strong>1.8%</strong></div>
      </div>
    </div>
  </div>
  <p id="npf-status" role="status" class="np-status">Current page: Home</p>
</DemoBlock>

**Pattern notes**:

1. **`position="floating"` is a component shape**: rounded corners + border + constant shadow (`elevated`) + inset on all sides (`--oas-app-bar-inset`, 12px by default) all come from the component; the host only provides a light page backdrop (the canvas) so the island's shadow has something to fall on
2. **The floating stage re-pins via `absolute`**: the component's floating is `position: fixed` (viewport-relative); the demo stage declares `position: relative` and the host overrides `#npf-bar { position: absolute }` (document rules beat shadow `:host` rules), so the island floats relative to the stage — corners/shadow/inset untouched, and **unlike** a `transform: translateZ(0)` containing-block hack it does not drag the account dropdown panel (a `position: fixed` element inside shadow DOM, positioned from viewport coordinates) into the container's coordinate system
3. **The menu is a controlled highlight**: menu items are host-drawn buttons (in `slot="title"`, the flex:1 strut); on click the host writes back the `active` class and `aria-current` — the component knows nothing about "pages"
4. **The actions zone is an overflow collector**: search (`oas-input` + `oas-kbd` ⌘K) and the bell live in `slot="actions"`; when space runs out the component folds overflowing items into a "···" panel (this container is wide enough not to trigger it, but it kicks in on real narrow windows). The bell's unread dot rides `oas-badge`'s `dot` channel; clicking toggles read state
5. **Account menu = `oas-dropdown`**: the trigger button (avatar + name + tier) sits in `slot="trailing"`; `oas-select` only reports the chosen value — what opens is the host's call

## Classic light top bar (horizontal-classic) {#shape-classic}

**Scenario**: a tooling product's default top bar — full-bleed, one bottom divider, no rounded corners or shadow; main navigation in the middle, search + notifications + account on the right. Same anatomy as the floating bar, only `position` changes: **the shape difference is expressed entirely by a component attribute, the host layout code is untouched**.

<DemoBlock title="Classic light top bar (static full-bleed + bottom divider + controlled menu)">
  <div class="npc-shell">
    <oas-app-bar id="npc-bar">
      <div slot="leading" class="npf-brand">
        <span class="np-logo-mark np-logo-mark--bar" aria-hidden="true"><oas-icon name="star-filled" size="13"></oas-icon></span>
        <span class="npf-brand__name">OAS</span>
      </div>
      <nav slot="title" class="np-menu" id="npc-menu" aria-label="Main navigation">
        <button type="button" class="np-menu__item active" data-value="dashboard" aria-current="page">Home</button>
        <button type="button" class="np-menu__item" data-value="analytics">Stats</button>
        <button type="button" class="np-menu__item" data-value="orders">Orders</button>
        <button type="button" class="np-menu__item" data-value="invoices">Bills</button>
      </nav>
      <div class="npf-search" slot="actions">
        <oas-input placeholder="Search" suffix-icon="search" clearable></oas-input>
        <oas-kbd keys="cmd k" size="small"></oas-kbd>
      </div>
      <button type="button" class="np-bell" slot="actions" aria-label="Notifications">
        <oas-badge dot>
          <oas-icon size="20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
          </oas-icon>
        </oas-badge>
      </button>
      <div slot="trailing" class="npc-user">
        <oas-avatar size="24">WL</oas-avatar>
      </div>
    </oas-app-bar>
    <div class="npc-canvas">
      <p class="np-canvas__eyebrow">Current page</p>
      <h4 class="np-canvas__title" id="npc-canvas-title">Home</h4>
      <p class="np-canvas__desc">Static shape: full-bleed, in normal flow; the bottom divider is one border the host adds.</p>
    </div>
  </div>
  <p id="npc-status" role="status" class="np-status">Current page: Home</p>
</DemoBlock>

**Pattern notes**:

1. **Classic is the default shape**: no `position` (static) means full-bleed, no rounded corners, no shadow; the component ships no bottom divider (classic design languages differ here), so the host adds `border-bottom`
2. **Item-by-item contrast with the floating bar**: the same leading / title / actions / trailing anatomy, `position="floating" elevated` ↔ default static — changing shape only changes an attribute. That is the direct payoff of "shapes belong to components, layout belongs to the host"
3. **Controlled highlight works like the floating bar**: click a menu item → the host writes back the active class + `aria-current` + canvas title, with the `role="status"` line announcing it

## Expanded sidebar 272px (sidebar-expanded) {#shape-expanded}

**Scenario**: a back-office workspace sidebar — logo + global search + grouped menu (inbox carries a badge) + a footer trial-upgrade card and preference zone; the collapse button folds the whole column into an icon rail and back; a Dark mode switch flips the demo stage's theme scope. One `oas-sidebar` with header/footer slots carries everything.

<DemoBlock title="Expanded sidebar (272px + search + badge menu + trial card + Dark mode switch + collapse/expand)">
  <div class="npe-shell" id="npe-shell">
    <oas-sidebar
      id="npe-sidebar"
      class="npe-sidebar"
      hide-toggle
      mobile-breakpoint="1"
      active="dashboard"
      items='[{"label":"Messages","value":"inbox","icon":"mail","badge":7},{"label":"Alerts","value":"notifications","icon":"alert-circle","badge":"3+"},{"label":"Home","value":"dashboard","icon":"tree","group":"NAV"},{"label":"Analytics","value":"analytics","icon":"sort","group":"NAV"},{"label":"Reports","value":"reporting","icon":"calendar","group":"NAV"},{"label":"Orders","value":"orders","icon":"copy","group":"NAV"},{"label":"Invoices","value":"invoices","icon":"form","group":"NAV"},{"label":"Team space","value":"manufactures","icon":"organization","group":"NAV"},{"label":"Trash","value":"trash","icon":"trash","group":"NAV"}]'
    >
      <div slot="header" class="npe-head">
        <div class="npe-head__brand">
          <span class="np-logo-mark" aria-hidden="true"><oas-icon name="star-filled" size="15"></oas-icon></span>
          <span class="npe-head__name">OAS Console</span>
          <button type="button" class="np-icon-btn" id="npe-collapse-btn" aria-label="Collapse sidebar" aria-expanded="true">
            <oas-icon name="chevron-left" size="16"></oas-icon>
          </button>
        </div>
        <div class="npe-search">
          <oas-input placeholder="Search" suffix-icon="search" clearable></oas-input>
          <oas-kbd keys="cmd k"></oas-kbd>
        </div>
      </div>
      <div slot="footer" class="npe-foot">
        <div class="npe-pro">
          <div class="npe-pro__row">
            <span class="npe-pro__title">Trial plan</span>
            <span class="npe-pro__meta">6 days left</span>
          </div>
          <oas-button id="npe-upgrade" size="small" type="primary">Upgrade</oas-button>
        </div>
        <div class="npe-foot__links">
          <button type="button" class="np-foot-row" data-value="preferences">
            <oas-icon name="gear" size="16"></oas-icon><span>Preferences</span>
          </button>
          <div class="np-foot-row np-foot-row--switch">
            <oas-switch id="npe-dark-switch" size="small" label="Dark mode" label-position="start"></oas-switch>
          </div>
          <button type="button" class="np-foot-row" data-value="themes">
            <oas-icon name="eye" size="16"></oas-icon><span>Themes</span>
          </button>
          <button type="button" class="np-foot-row" data-value="help">
            <oas-icon name="info" size="16"></oas-icon><span>Help center</span>
          </button>
        </div>
        <!-- Expand button lives in the footer slot (attached to the rail it controls,
             not floating in the canvas); visibility is pure CSS: hidden when expanded,
             shown via ::part(foot) when collapsed, other footer children hidden -->
        <button type="button" class="np-icon-btn npe-expand" id="npe-expand-btn" aria-label="Expand sidebar" aria-expanded="false">
          <oas-icon name="chevron-right" size="16"></oas-icon>
        </button>
      </div>
    </oas-sidebar>
    <div class="npe-canvas">
      <div class="npe-canvas__toolbar">
        <div>
          <p class="np-canvas__eyebrow">Workspace</p>
          <h4 class="np-canvas__title" id="npe-canvas-title">Home</h4>
        </div>
      </div>
      <p class="np-canvas__desc">Collapsing folds the column into a 64px icon rail (head/footer content hides with it); the expand button tucks into the bottom of the rail — attached to the element it controls.</p>
    </div>
  </div>
  <p id="npe-status" role="status" class="np-status">Current page: Home</p>
</DemoBlock>

**Pattern notes**:

1. **Width rides the variable**: `--oas-sidebar-width: 272px` overrides the component default of 220px; `group` declares the MENU section header, and the `badge` channel accepts numbers (Inbox 12) and strings (Notifications "15+")
2. **Preferences / Dark mode / Themes / Help live in the footer slot**, not items: they are a "preference zone", not page navigation, and should not join the `active` selection semantics; `oas-switch`'s `label` attribute renders a visible label (label-position=start puts it on the left), and the Dark mode switch flips the demo stage's `data-theme` scope — container-level token switching re-dresses the whole demo, and doubles as the smallest proof that "any container can set `data-theme`"
3. **Collapse/expand is a controlled attribute**: the header button writes the `collapsed` attribute; the collapsed component hides head/body/foot (a narrow rail cannot fit that content), and the host supplies the "expand" button in the **footer slot** — visibility is pure CSS (a `[collapsed]` attribute selector + `::part(foot)` to surface only that one button), so the button stays attached to the rail it controls instead of floating in the canvas; in real products this usually lives in the top bar's hamburger slot, but it is the same "host writes `collapsed` back" move
4. **The trial card is free-form footer content**: `oas-button` (size=small, type=primary) + copy; the component only pins the footer to the bottom (sticky), the card's layout is the host's
5. **When content exceeds one screen the sidebar scrolls within its panel**: the footer stays pinned (sticky) and menu items pass beneath it (established component semantics) — this recipe deliberately fills the column to showcase every zone; scroll to reach the remaining menu items

## Slim icon rail 68px (sidebar-rail) {#shape-rail}

**Scenario**: navigation for a space-tight tooling product — a 68px icon rail parked at the edge, labels temporarily unfolding on hover without disturbing layout, the account avatar pinned at the bottom. A composition of two component attributes: `collapsed` + `expand-on-hover`.

<DemoBlock title="Slim icon rail (collapsed 68px + expand-on-hover + controlled active)">
  <div class="npr-shell">
    <oas-sidebar
      id="npr-rail"
      class="npr-rail"
      collapsed
      expand-on-hover
      hide-toggle
      mobile-breakpoint="1"
      active="dashboard"
      items='[{"label":"Home","value":"dashboard","icon":"tree"},{"label":"Analytics","value":"analytics","icon":"sort"},{"label":"Reports","value":"reporting","icon":"calendar"},{"label":"Orders","value":"orders","icon":"copy"},{"label":"Invoices","value":"invoices","icon":"form"},{"label":"Settings","value":"settings","icon":"gear"}]'
    >
      <div slot="footer" class="npr-foot">
        <oas-avatar size="32">WL</oas-avatar>
      </div>
    </oas-sidebar>
    <div class="npr-canvas">
      <p class="np-canvas__eyebrow">Current page</p>
      <h4 class="np-canvas__title" id="npr-canvas-title">Home</h4>
      <p class="np-canvas__desc">Hover the rail to unfold labels temporarily; keyboard focus gets the built-in tooltip (component-provided, not part of this recipe).</p>
    </div>
  </div>
  <p id="npr-status" role="status" class="np-status">Current page: Home</p>
</DemoBlock>

**Pattern notes**:

1. **68px = `--oas-sidebar-collapsed-width`**: the component default is 64px; the extra 4px give the icons breathing room. `collapsed` is controlled; items without an icon auto-hide in the collapsed state
2. **`expand-on-hover` is purely visual**: hovering temporarily expands to `--oas-sidebar-width` (240px) revealing labels with a shadow, without rewriting the controlled `collapsed` value — the rail returns on mouse-out. Want it narrower than the 220px default when expanded? Turn that variable down too
3. **The collapsed footer re-exposure reuses the first recipe**: the collapsed component hides the foot; a `::part(foot)` host-level override puts the avatar back at the rail's bottom — the established "component hides by default, recipe re-exposes on demand" move
4. **Tooltips are built into the component**: collapsed icon items ship a tooltip (with `trigger="focus"` for keyboard focus), so the recipe does not build its own floating layer

## Dark enterprise sidebar 272px (sidebar-dark) {#shape-dark}

**Scenario**: an enterprise workspace sidebar under the dark theme — dark surface + primary badges + primary selection state + a trial-upgrade card and account row. The mechanism matches other demo containers on this site: **set `data-theme="dark"` on the container to switch the token scope** (same as the skin gallery); components follow along and the demo hard-codes zero color values.

<DemoBlock title="Dark enterprise sidebar (data-theme=dark scope + primary badges + account row)">
  <div class="npd-shell" data-theme="dark">
    <oas-sidebar
      id="npd-sidebar"
      class="npd-sidebar"
      hide-toggle
      mobile-breakpoint="1"
      active="dashboard"
      items='[{"label":"Messages","value":"inbox","icon":"mail","badge":7},{"label":"Alerts","value":"notifications","icon":"alert-circle","badge":"2"},{"label":"Home","value":"dashboard","icon":"tree","group":"NAV"},{"label":"Analytics","value":"analytics","icon":"sort","group":"NAV"},{"label":"Reports","value":"reporting","icon":"calendar","group":"NAV"},{"label":"Orders","value":"orders","icon":"copy","group":"NAV"},{"label":"Invoices","value":"invoices","icon":"form","group":"NAV"},{"label":"Appearance","value":"themes","icon":"eye","group":"NAV"}]'
    >
      <div slot="header" class="npd-head">
        <div class="npe-head__brand">
          <span class="np-logo-mark" aria-hidden="true"><oas-icon name="star-filled" size="15"></oas-icon></span>
          <span class="npe-head__name">OAS Console</span>
        </div>
        <div class="npe-search">
          <oas-input placeholder="Search" suffix-icon="search" clearable></oas-input>
          <oas-kbd keys="cmd k"></oas-kbd>
        </div>
      </div>
      <div slot="footer" class="npd-foot">
        <div class="npd-pro">
          <div class="npe-pro__row">
            <span class="npe-pro__title">Trial plan</span>
            <span class="npe-pro__meta">6 days left</span>
          </div>
          <oas-button size="small" type="primary">Upgrade</oas-button>
        </div>
        <div class="npd-account">
          <oas-avatar size="30">WL</oas-avatar>
          <span class="npd-account__meta">
            <span class="npd-account__name">Wren Lin</span>
            <span class="npd-account__mail">wren@oas.dev</span>
          </span>
        </div>
      </div>
    </oas-sidebar>
    <div class="npd-canvas">
      <p class="np-canvas__eyebrow">Workspace</p>
      <h4 class="np-canvas__title" id="npd-canvas-title">Home</h4>
      <p class="np-canvas__desc">Container data-theme=dark: every color, component or host-drawn, comes from dark tokens — nothing hard-coded on either end.</p>
    </div>
  </div>
  <p id="npd-status" role="status" class="np-status">Current page: Home</p>
</DemoBlock>

**Pattern notes**:

1. **The dark mechanism = container `data-theme="dark"`**: same as the skin gallery's preview container — token variables flip wholesale within the container's scope; `oas-sidebar` / `oas-input` / `oas-button` / `oas-avatar` and host-drawn text all follow automatically, no per-component dimming
2. **Badge and selection are primary-colored by default**: the sidebar badge rides `--oas-sidebar-badge-bg` (falling back to `--oas-color-primary`) and the active item gets a light primary fill + primary text — dark contrast is guaranteed by theme tokens. A "left accent bar" is a private structure inside the component (`::part` cannot filter by active state), and the composition layer refuses shadow-piercing hacks; accent-bar shapes belong in component-level requests
3. **Dark card and account row**: the footer trial card uses `--oas-color-bg-elevated` (one step lighter than the dark surface) + a border for layering; the account row is an `oas-avatar` text channel (first character) + email secondary text, all token colors
4. **Contrast gates**: the dark demo passes the same axe run and perceptual-contrast baseline as the light ones — secondary text on the dark surface uses `--oas-color-text-secondary`, readable at both tiers by theme guarantee

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const rail = document.getElementById('np-rail')
  const panel = document.getElementById('np-workspace-panel')
  const wsName = document.getElementById('np-ws-name')
  const wsTier = document.getElementById('np-ws-tier')
  const mainTitle = document.getElementById('np-main-title')
  const status = document.getElementById('np-status')
  const switcher = document.getElementById('np-workspace-switch')
  if (!rail || !panel || !wsName || !wsTier) return

  // Host-side workspace map: rail value → panel title + default page (the component has no notion of workspaces)
  const WORKSPACES = {
    am: { label: 'OAS Studio', name: 'OAS Console', tier: 'Enterprise plan', page: 'live', pageLabel: 'Daily board' },
    eu: { label: 'OAS Team', name: 'OAS Console Lite', tier: 'Team plan', page: 'pulse', pageLabel: 'Growth radar' },
  }
  const say = (text) => {
    if (status) status.textContent = text
  }
  const applyWorkspace = (value) => {
    const ws = WORKSPACES[value]
    if (!ws) return
    rail.setAttribute('active', value) // controlled highlight: the host writes it back
    wsName.textContent = ws.name
    wsTier.textContent = ws.tier
    panel.setAttribute('active', ws.page) // controlled default page
    if (mainTitle) mainTitle.textContent = ws.pageLabel
    say(`Workspace: ${ws.label} → ${ws.name} (${ws.tier})`)
  }

  // Rail: oas-select → switch the panel ("Add workspace" is an entry point the host owns)
  rail.addEventListener('oas-select', (e) => {
    const value = e.detail.value
    if (value === 'add') {
      say('"Add workspace" is only an entry point: the host opens its create-workspace flow here')
      return
    }
    applyWorkspace(value)
  })

  // Panel: items also only emit oas-select; the host must write active back
  panel.addEventListener('oas-select', (e) => {
    panel.setAttribute('active', e.detail.value)
    if (mainTitle) mainTitle.textContent = e.detail.label
    say(`Current page: ${e.detail.label}`)
  })

  // Header workspace dropdown: feedback only — a real product opens rename / member management here
  switcher?.addEventListener('oas-select', (e) => {
    say(`Workspace action: ${e.detail.value === 'rename' ? 'Rename workspace' : 'Manage members'}`)
  })

  // Bell: one click marks the unread dot as read (oas-badge's dot attribute channel) — visible feedback
  const bell = document.getElementById('np-bell')
  const bellBadge = document.getElementById('np-bell-badge')
  bell?.addEventListener('click', () => {
    const unread = bellBadge?.hasAttribute('dot') ?? false
    bellBadge?.toggleAttribute('dot', !unread)
    say(unread ? 'Notifications: all marked as read' : 'Notifications: 1 unread item')
  })

  applyWorkspace('am')
})

// ===== Second batch: floating top bar / classic top bar / expanded sidebar / icon rail / dark enterprise =====
// Same mechanics as the first batch: onMounted + component events (oas-select / oas-change etc.),
// active/status written back by the host.
onMounted(() => {
  const say = (el, text) => {
    if (el) el.textContent = text
  }

  // —— Floating top bar: controlled menu highlight + notification read-state + account menu + search enter ——
  const npfMenu = document.getElementById('npf-menu')
  const npfCanvasTitle = document.getElementById('npf-canvas-title')
  const npfStatus = document.getElementById('npf-status')
  const npfBar = document.getElementById('npf-bar')
  if (npfMenu && npfBar) {
    const items = [...npfMenu.querySelectorAll('.np-menu__item')]
    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        items.forEach((b) => {
          b.classList.toggle('active', b === btn)
          if (b === btn) b.setAttribute('aria-current', 'page')
          else b.removeAttribute('aria-current')
        })
        const label = btn.textContent ?? ''
        if (npfCanvasTitle) npfCanvasTitle.textContent = label
        say(npfStatus, `Current page: ${label}`)
      })
    })
    // Bell read-state toggle (oas-badge's dot channel)
    const bell = document.getElementById('npf-bell')
    const bellBadge = document.getElementById('npf-bell-badge')
    bell?.addEventListener('click', () => {
      const unread = bellBadge?.hasAttribute('dot') ?? false
      bellBadge?.toggleAttribute('dot', !unread)
      say(npfStatus, unread ? 'Notifications: all marked as read' : 'Notifications: 1 unread item')
    })
    // Account dropdown: feedback only — a real product opens the actual flow here
    document.getElementById('npf-user-menu')?.addEventListener('oas-select', (e) => {
      say(npfStatus, `Account action: ${e.detail.value === 'profile' ? 'Profile settings' : 'Sign out'}`)
    })
    // Search enter (oas-input's oas-enter)
    document.getElementById('npf-search')?.addEventListener('oas-enter', (e) => {
      say(npfStatus, `Search: ${e.detail.value || '(empty)'}`)
    })
  }

  // —— Classic top bar: same controlled menu (static full-bleed) ——
  const npcMenu = document.getElementById('npc-menu')
  const npcCanvasTitle = document.getElementById('npc-canvas-title')
  const npcStatus = document.getElementById('npc-status')
  if (npcMenu) {
    const items = [...npcMenu.querySelectorAll('.np-menu__item')]
    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        items.forEach((b) => {
          b.classList.toggle('active', b === btn)
          if (b === btn) b.setAttribute('aria-current', 'page')
          else b.removeAttribute('aria-current')
        })
        const label = btn.textContent ?? ''
        if (npcCanvasTitle) npcCanvasTitle.textContent = label
        say(npcStatus, `Current page: ${label}`)
      })
    })
  }

  // —— Expanded sidebar: controlled menu + collapse/expand + Dark mode scope + preference rows ——
  const npeSidebar = document.getElementById('npe-sidebar')
  const npeCanvasTitle = document.getElementById('npe-canvas-title')
  const npeStatus = document.getElementById('npe-status')
  const npeShell = document.getElementById('npe-shell')
  const npeCollapseBtn = document.getElementById('npe-collapse-btn')
  const npeExpandBtn = document.getElementById('npe-expand-btn')
  if (npeSidebar && npeShell) {
    npeSidebar.addEventListener('oas-select', (e) => {
      npeSidebar.setAttribute('active', e.detail.value) // controlled: the host writes it back
      if (npeCanvasTitle) npeCanvasTitle.textContent = e.detail.label
      say(npeStatus, `Current page: ${e.detail.label}`)
    })
    // Collapse: head/footer hide with the collapsed state (a narrow rail cannot fit them);
    // the expand button lives in the footer slot and its visibility is pure CSS
    // (host [collapsed] attribute selector) — the script only writes the controlled value
    npeCollapseBtn?.addEventListener('click', () => {
      npeSidebar.setAttribute('collapsed', '')
      npeCollapseBtn.setAttribute('aria-expanded', 'false')
      say(npeStatus, 'Sidebar collapsed to an icon rail (expand button tucks to the rail bottom)')
    })
    npeExpandBtn?.addEventListener('click', () => {
      npeSidebar.removeAttribute('collapsed')
      npeCollapseBtn?.setAttribute('aria-expanded', 'true')
      say(npeStatus, 'Sidebar expanded back to 272px')
    })
    // Dark mode switch: flips the demo stage's data-theme scope (container-level token swap)
    document.getElementById('npe-dark-switch')?.addEventListener('oas-change', (e) => {
      const dark = !!e.detail.checked
      npeShell.setAttribute('data-theme', dark ? 'dark' : 'light')
      say(npeStatus, dark ? 'Dark mode: this demo container switched to the dark token scope' : 'Dark mode: this demo container switched back to light')
    })
    // Preference rows / upgrade button: entry placeholders (a real product opens its panels here)
    document.getElementById('npe-upgrade')?.addEventListener('oas-click', () => {
      say(npeStatus, 'Upgrade: the host opens its upgrade flow here')
    })
    npeShell.querySelectorAll('.np-foot-row[data-value]').forEach((row) => {
      row.addEventListener('click', () => {
        say(npeStatus, `Preference zone: ${row.dataset.value}`)
      })
    })
  }

  // —— Icon rail: controlled active + canvas title sync ——
  const nprRail = document.getElementById('npr-rail')
  const nprCanvasTitle = document.getElementById('npr-canvas-title')
  const nprStatus = document.getElementById('npr-status')
  if (nprRail) {
    nprRail.addEventListener('oas-select', (e) => {
      nprRail.setAttribute('active', e.detail.value) // controlled: the host writes it back
      if (nprCanvasTitle) nprCanvasTitle.textContent = e.detail.label
      say(nprStatus, `Current page: ${e.detail.label}`)
    })
  }

  // —— Dark enterprise: controlled active + status line ——
  const npdSidebar = document.getElementById('npd-sidebar')
  const npdCanvasTitle = document.getElementById('npd-canvas-title')
  const npdStatus = document.getElementById('npd-status')
  if (npdSidebar) {
    npdSidebar.addEventListener('oas-select', (e) => {
      npdSidebar.setAttribute('active', e.detail.value) // controlled: the host writes it back
      if (npdCanvasTitle) npdCanvasTitle.textContent = e.detail.label
      say(npdStatus, `Current page: ${e.detail.label}`)
    })
  }
})
</script>

<style>
/* —— Dual-rail shell: row container + fixed height + rounded border (the container owns scale, columns fill it) —— */
.np-shell {
  display: flex;
  gap: 0;
  width: 100%;
  height: 520px;
  overflow: hidden;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
/* Left rail: collapsed icon strip, 68px wide */
.np-rail {
  flex: 0 0 auto;
  --oas-sidebar-collapsed-width: 68px;
}
/* Collapsed mode hides head / body / foot; this recipe re-exposes the footer so the
   account avatar stays pinned to the bottom of the rail (a container-level ::part override, page-scoped) */
#np-rail::part(foot) {
  display: flex;
  justify-content: center;
}
.np-rail__foot {
  display: flex;
  justify-content: center;
  line-height: 0;
}
/* Right panel: 272px wide, one divider between the rails */
.np-panel {
  flex: 0 0 auto;
  --oas-sidebar-width: 272px;
  --oas-sidebar-bg: var(--oas-color-bg);
  border-inline-start: 1px solid var(--oas-color-border);
  /* Badge contrast fix: same as .npe-sidebar (default primary+white text rides the 4.5 edge,
     deepened primary keeps it passing) */
  --oas-sidebar-badge-bg: color-mix(in srgb, var(--oas-color-primary) 75%, black);
  --oas-sidebar-badge-color: var(--oas-color-text-on-primary);
}
/* Header workspace switcher: name + subtitle + dropdown chevron */
.np-workspace {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
  width: 100%;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: inherit;
  font-family: inherit;
  text-align: start;
  cursor: pointer;
}
.np-workspace:hover {
  background: color-mix(in srgb, var(--oas-color-text-primary) 6%, transparent);
}
.np-workspace:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* Bell: icon + unread dot; clicking marks it read (keyboard reachable) */
.np-bell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  cursor: pointer;
  line-height: 0;
}
.np-bell:hover {
  background: var(--oas-color-bg-hover);
}
.np-bell:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.np-workspace__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}
.np-workspace__name {
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-workspace__tier {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.np-workspace__chevron {
  flex-shrink: 0;
  color: var(--oas-color-text-secondary);
}
/* Footer: storage card + account row */
.np-panel__foot {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
}
.np-storage {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  /* Elevated surface: 12px secondary text on bg-hover measures 4.39 < 4.5 in light mode */
  background: var(--oas-color-bg-elevated);
}
.np-storage__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
.np-storage__title {
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-primary);
}
.np-storage__meta {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.np-panel__account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
/* Canvas: only grounds the dual rail in a real context, not the point of this recipe */
.np-main {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-3);
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-5);
  overflow: hidden;
  background: var(--oas-color-bg);
}
.np-main__eyebrow {
  margin: 0;
  font-size: var(--oas-font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
.np-main__title {
  margin: 0;
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.np-main__desc {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.np-main__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--oas-space-3);
}
.np-main__card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
}
.np-main__label {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.np-main__card strong {
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.np-status {
  margin: 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
@media (max-width: 720px) {
  /* On narrow screens keep the rails themselves (they are the subject of this recipe) */
  .np-shell {
    height: 460px;
  }
  .np-main {
    display: none;
  }
}

/* ===== Second batch: floating top bar / classic top bar / expanded sidebar / icon rail / dark enterprise ===== */

/* —— Shared small parts (used by multiple shapes) —— */
/* Brand logo tile: primary surface + on-primary icon color */
.np-logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-primary);
  color: var(--oas-color-text-on-primary);
  flex-shrink: 0;
}
/* Top bar menu (slot="title"): controlled active + aria-current written back by the host.
   The docs content area is only ~574px wide — every top-bar element (brand + 4 menu items +
   search + kbd + bell + account) must stay compact: the actions zone (flex-shrink 0) would
   otherwise squeeze the title menu, which overflows title-wrap and overlaps the search field
   (a second narrow-container artifact besides the overflow collector) */
.np-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.np-menu__item {
  appearance: none;
  border: none;
  padding: 2px 8px;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-secondary);
  font-size: var(--oas-font-size-xs);
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
}
.np-menu__item:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.np-menu__item:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.np-menu__item.active {
  color: var(--oas-color-primary-text);
  background: color-mix(in srgb, var(--oas-color-primary) 12%, transparent);
  font-weight: 500;
}
/* No row-padding overrides: earlier rounds of hand-tuned 8/24/32px values had no
   real basis — the reference's generous whitespace is a product of its ~1100px-wide
   bar; at the docs' ~574px content column the component's default spacing ratio is
   the most harmonious choice. The demo keeps only recipe-level decisions: the
   floating inset and the classic bar's bottom border. */
.np-logo-mark--bar {
  width: 22px;
  height: 22px;
}
/* Top bar bell (floating/classic share it): icon + unread dot */
.np-bell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--oas-space-1);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-primary);
  font-family: inherit;
  cursor: pointer;
  line-height: 0;
}
.np-bell:hover {
  background: var(--oas-color-bg-hover);
}
.np-bell:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* Search field + kbd group (compact: input 88px + kbd size=small, keeps the actions zone
   from squeezing the title menu) */
.npf-search {
  display: inline-flex;
  align-items: center;
  gap: var(--oas-space-2);
  min-width: 0;
}
.npf-search oas-input {
  width: 116px;
}
/* Expand button (inside the footer slot): hidden when expanded; when collapsed the
   whole footer surfaces via ::part(foot) and the host attribute selector hides the
   other footer children (trial card / preference rows), leaving only this centered
   button attached to the rail it controls. The double-class selector overrides the
   .np-icon-btn display declared later (equal-specificity class selectors follow
   source order, and the icon-btn rule comes after this one) */
.npe-expand.np-icon-btn {
  display: none;
}
#npe-sidebar[collapsed]::part(foot) {
  display: flex;
  justify-content: center;
}
#npe-sidebar[collapsed] .npe-foot > :not(.npe-expand) {
  display: none;
}
#npe-sidebar[collapsed] .npe-expand {
  display: inline-flex;
}
/* Small icon button (collapse/expand) */
.np-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
  color: var(--oas-color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  line-height: 0;
}
.np-icon-btn:hover {
  color: var(--oas-color-text-primary);
  background: var(--oas-color-bg-hover);
}
.np-icon-btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
/* Footer preference rows (expanded sidebar footer): primary text — secondary on the sidebar
   surface measures 4.39 < 4.5 */
.np-foot-row {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  width: 100%;
  padding: var(--oas-space-1) var(--oas-space-2);
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: var(--oas-color-text-primary);
  font-size: var(--oas-font-size-sm);
  font-family: inherit;
  text-align: start;
  cursor: pointer;
}
.np-foot-row:hover {
  background: var(--oas-color-bg-hover);
}
.np-foot-row:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.np-foot-row--switch {
  cursor: default;
}
.np-foot-row--switch:hover {
  background: none;
}
/* Canvas typography shared by floating/classic/expanded/rail */
.np-canvas__eyebrow {
  margin: 0;
  font-size: var(--oas-font-size-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--oas-color-text-secondary);
}
.np-canvas__title {
  margin: var(--oas-space-1) 0 0;
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}
.np-canvas__desc {
  margin: var(--oas-space-2) 0 0;
  font-size: var(--oas-font-size-sm);
  color: var(--oas-color-text-secondary);
}
.np-canvas__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--oas-space-3);
  margin-top: var(--oas-space-4);
}
.np-canvas__card {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1);
  padding: var(--oas-space-3);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
}
.np-canvas__card span {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.np-canvas__card strong {
  font-size: var(--oas-font-size-lg);
  font-weight: 600;
  color: var(--oas-color-text-primary);
}

/* —— Floating top bar —— */
/* Stage: relative is the containing block for the absolutely-positioned island; the light
   page backdrop gives the island's shadow something to fall on. Do NOT use transform as the
   fixed containing block — that would drag the dropdown panel (fixed inside shadow DOM,
   viewport coordinates) into the container coordinate system and misplace it; the absolute
   re-pin only changes positioning, not the visual shape. */
.npf-shell {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 440px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
/* Document rules beat shadow :host rules: swap position only — the floating shape's
   corners/border/shadow/inset (the rest of the same rule) are all preserved.
   Inset 16px (component default 12px) — the floating bar's visual margin is
   inset + 8px row padding ≈ 24px, balancing the classic bar's 32px row padding
   in its own container (reference proportions) */
#npf-bar {
  position: absolute;
  --oas-app-bar-inset: 16px;
}
/* Canvas below the island clears the island height (56px main row + 12px top inset) */
.npf-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 100%;
  padding: 92px var(--oas-space-5) var(--oas-space-5);
}
.npf-brand {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.npf-brand__name {
  font-size: var(--oas-font-size-xs);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  white-space: nowrap;
}
.npf-user__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border: none;
  border-radius: var(--oas-radius-md);
  background: none;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
}
.npf-user__btn:hover {
  background: var(--oas-color-bg-hover);
}
.npf-user__btn:focus-visible {
  outline: none;
  box-shadow: var(--oas-focus-ring);
}
.npf-user__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  text-align: start;
  min-width: 0;
}
.npf-user__name {
  font-size: var(--oas-font-size-xs);
  font-weight: 500;
  color: var(--oas-color-text-primary);
  line-height: 1.2;
}
.npf-user__tier {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  line-height: 1.2;
}
.npf-user__chevron {
  color: var(--oas-color-text-secondary);
}

/* —— Classic light top bar —— */
.npc-shell {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  height: 400px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
/* The classic shape's divider is not built into the component (design languages differ),
   so the host adds one bottom border */
#npc-bar {
  border-bottom: 1px solid var(--oas-color-border);
}
.npc-user {
  display: flex;
  align-items: center;
}
.npc-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  padding: var(--oas-space-5);
}

/* —— Expanded sidebar 272px —— */
.npe-shell {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 520px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.npe-sidebar {
  flex: 0 0 auto;
  --oas-sidebar-width: 272px;
  /* Surface rides --oas-color-bg (same as canvas + a divider, same move as the first
     recipe's np-panel): the component default bg-hover surface measures secondary text
     at 4.39 < 4.5 (group titles / footer rows); the bg surface passes */
  --oas-sidebar-bg: var(--oas-color-bg);
  border-inline-start: 1px solid var(--oas-color-border);
  /* Badge contrast fix: the component's default badge color is hard-coded to #fff —
     primary-on-white text measures ~4.4x in light and collapses when dark turns primary
     bright. Re-themed per scope: light uses a deepened primary + white text, dark uses the
     bright primary + dark text (badge stays primary-colored, contrast guaranteed) */
  --oas-sidebar-badge-bg: color-mix(in srgb, var(--oas-color-primary) 75%, black);
  --oas-sidebar-badge-color: var(--oas-color-text-on-primary);
}
/* Under the site's dark theme primary turns bright: mixing black then yields a mid grey-blue
   that fails with dark text (~3.0) — use the original bright primary + dark on-primary */
.dark .np-panel,
.dark .npe-sidebar {
  --oas-sidebar-badge-bg: var(--oas-color-primary);
}
.npe-head {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npe-head__brand {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.npe-head__name {
  flex: 1 1 auto;
  font-size: var(--oas-font-size-md);
  font-weight: 600;
  color: var(--oas-color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.npe-search {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
}
.npe-search oas-input {
  flex: 1 1 auto;
  min-width: 0;
}
/* kbd guard: keycaps wrap into a vertical stack when squeezed — never shrink */
.npe-search oas-kbd {
  flex-shrink: 0;
}
.npe-foot {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npe-pro {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1_5);
  padding: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  /* Elevated surface: 12px secondary text on bg-hover measures 4.39 < 4.5 in light mode
     (same face as the first recipe's capacity card) */
  background: var(--oas-color-bg-elevated);
}
.npe-pro__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--oas-space-2);
}
.npe-pro__title {
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-primary);
}
.npe-pro__meta {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
}
.npe-foot__links {
  display: flex;
  flex-direction: column;
}
.npe-canvas {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-4) var(--oas-space-5);
}
.npe-canvas__toolbar {
  display: flex;
  align-items: flex-start;
  gap: var(--oas-space-3);
}

/* —— Slim icon rail 68px —— */
.npr-shell {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 480px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.npr-rail {
  flex: 0 0 auto;
  --oas-sidebar-collapsed-width: 68px;
  /* expand-on-hover's temporary expansion target width (a touch under the 220px default) */
  --oas-sidebar-width: 240px;
}
/* Collapsed mode hides head/body/foot by default; the recipe re-exposes the footer avatar
   explicitly (same move as the first recipe) */
#npr-rail::part(foot) {
  display: flex;
  justify-content: center;
}
.npr-foot {
  display: flex;
  justify-content: center;
  line-height: 0;
}
.npr-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-5);
}

/* —— Dark enterprise 272px —— */
/* Dark mechanism: container data-theme="dark" switches the token scope (same as the skin
   gallery's preview container); components and host-drawn content all follow — zero
   hard-coded color values here */
.npd-shell {
  display: flex;
  overflow: hidden;
  width: 100%;
  height: 520px;
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-lg);
  background: var(--oas-color-bg);
}
.npd-sidebar {
  flex: 0 0 auto;
  --oas-sidebar-width: 272px;
  /* Surface rides --oas-color-bg (dark bg, same as canvas + a divider): contrast fix as
     documented on .npe-sidebar */
  --oas-sidebar-bg: var(--oas-color-bg);
  border-inline-start: 1px solid var(--oas-color-border);
  /* Badge contrast fix (dark scope): bright primary surface + dark text (on-primary is dark
     in dark mode) — primary badge look preserved, contrast passes; see .npe-sidebar note */
  --oas-sidebar-badge-bg: var(--oas-color-primary);
  --oas-sidebar-badge-color: var(--oas-color-text-on-primary);
}
.npd-head {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npd-foot {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-2);
}
.npd-pro {
  display: flex;
  flex-direction: column;
  gap: var(--oas-space-1_5);
  padding: var(--oas-space-2);
  border: 1px solid var(--oas-color-border);
  border-radius: var(--oas-radius-md);
  background: var(--oas-color-bg-elevated);
}
.npd-account {
  display: flex;
  align-items: center;
  gap: var(--oas-space-2);
  padding: var(--oas-space-1) var(--oas-space-2);
}
.npd-account__meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.npd-account__name {
  font-size: var(--oas-font-size-sm);
  font-weight: 500;
  color: var(--oas-color-text-primary);
  line-height: 1.2;
}
.npd-account__mail {
  font-size: var(--oas-font-size-xs);
  color: var(--oas-color-text-secondary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.npd-canvas {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--oas-space-5);
}
</style>
