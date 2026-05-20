/**
 * Sidebar drop logic — deep module for drag-and-drop position calculation and execution.
 *
 * Do not import from private/ directly. All consumers must import from this index.
 * The private/ folder contains implementation helpers; the public interface lives here.
 */
export type { RowGeometry } from './private/drop-position'
export { calculateDropPosition } from './private/drop-position'
export { executeDrop } from './private/drop-execution'
export type { ExecuteDropInput } from './private/drop-execution'
export { buildRowGeometries } from './private/tree-geometry'
export {
  handleFileCrossFolderDrop,
  handleFileSameFolderReorder,
} from './private/file-reorder'
export {
  createContainerDragOverHandler,
  createContainerDropHandler,
} from './private/container-handlers'
