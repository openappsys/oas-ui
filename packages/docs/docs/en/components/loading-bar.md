# LoadingBar

A global loading progress bar at the top of the page, driven by an imperative API.

## Basic usage

<DemoBlock title="Start & finish">
  <oas-space>
    <oas-button type="primary" onclick="loadingBar.start(); setTimeout(() => loadingBar.finish(), 2000)">Start loading</oas-button>
    <oas-button onclick="loadingBar.finish()">Finish now</oas-button>
  </oas-space>
</DemoBlock>

## Error state

<DemoBlock title="Error state">
  <oas-space>
    <oas-button type="danger" onclick="loadingBar.start(); setTimeout(() => loadingBar.error(), 2000)">Simulate load failure</oas-button>
  </oas-space>
</DemoBlock>

## Clear

<DemoBlock title="Clear">
  <oas-space>
    <oas-button onclick="loadingBar.start()">Start</oas-button>
    <oas-button onclick="destroyAllLoadingBar()">Remove loading bar</oas-button>
  </oas-space>
</DemoBlock>

<script setup>
import { onMounted } from 'vue'
onMounted(async () => {
  const { loadingBar, destroyAllLoadingBar } = await import('@oas-ui/ui')
  window.loadingBar = loadingBar
  window.destroyAllLoadingBar = destroyAllLoadingBar
})
</script>

## API

### Methods

| Method                   | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| `loadingBar.start()`     | Start loading; the progress automatically advances to 90% |
| `loadingBar.finish()`    | Finish and remove                                         |
| `loadingBar.error()`     | Fail (red) and remove                                     |
| `destroyAllLoadingBar()` | Remove the current loading bar                            |

The bar uses `role="progressbar"` with progress synced via `aria-valuenow`.
