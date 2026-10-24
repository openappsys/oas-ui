import '@oas-ui/i18n'
import { OASDiffViewer } from './oas-diff-viewer.js'
import {
  buildDiffRows,
  buildSplitRows,
  diffLines,
  inlineSegments,
  layoutRows,
  layoutSplitRows,
  splitLines,
} from './diff-model.js'
import type {
  DiffFoldRow,
  DiffHunk,
  DiffLayout,
  DiffLine,
  DiffLineRow,
  DiffOp,
  DiffSegment,
  DiffStats,
  SplitLayout,
  SplitLineRow,
  SplitRow,
} from './diff-model.js'

if (!customElements.get('oas-diff-viewer')) {
  customElements.define('oas-diff-viewer', OASDiffViewer)
}

export {
  OASDiffViewer,
  buildDiffRows,
  buildSplitRows,
  diffLines,
  inlineSegments,
  layoutRows,
  layoutSplitRows,
  splitLines,
}
export type {
  DiffFoldRow,
  DiffHunk,
  DiffLayout,
  DiffLine,
  DiffLineRow,
  DiffOp,
  DiffSegment,
  DiffStats,
  SplitLayout,
  SplitLineRow,
  SplitRow,
}
export type { DiffViewerChangeDetail, DiffViewerHunkToggleDetail } from './oas-diff-viewer.js'
