// @Architecture(descriptionShort="Public facade re-exporting module surface")
export {
  folderKeyFromDocumentPath,
  orderIdentity,
  orderIdentityFromCache,
} from './private/document-order-identity.js'
export {
  rankSortByOrder,
  reconcileFolderOrder,
  rebuildDocumentOrder,
} from './private/document-order-rank.js'
export {
  remapDocumentOrder,
  type DocumentOrderRemaps,
} from './private/document-order-remap.js'
