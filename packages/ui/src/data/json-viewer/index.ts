import { registerDefaultMessages } from '@oas-ui/i18n/registry'
import { dataMessages } from '@oas-ui/i18n/slices/data'
registerDefaultMessages(dataMessages)
import { OASJsonViewer } from './oas-json-viewer.js'
import {
  buildJsonTree,
  collectAncestorPaths,
  encodeJsonPath,
  flattenVisible,
  parseJsonPath,
  searchJson,
  serializeJson,
  serializeValue,
} from './json-model.js'
import type { JsonKind, JsonNode, JsonRow, JsonValue } from './json-model.js'

if (!customElements.get('oas-json-viewer')) {
  customElements.define('oas-json-viewer', OASJsonViewer)
}

export {
  OASJsonViewer,
  buildJsonTree,
  collectAncestorPaths,
  encodeJsonPath,
  flattenVisible,
  parseJsonPath,
  searchJson,
  serializeJson,
  serializeValue,
}
export type { JsonKind, JsonNode, JsonRow, JsonValue }
export type {
  JsonViewerToggleDetail,
  JsonViewerExpandedChangeDetail,
  JsonViewerSearchChangeDetail,
  JsonViewerParseErrorDetail,
  JsonViewerCopyDetail,
} from './oas-json-viewer.js'
