// @Architecture(descriptionShort="Public facade re-exporting module surface")
export {
  useGlobalSearchController,
  type GlobalSearchController,
} from './private/global-search-controller.js'
export {
  postGlobalFindRequest,
  consumeGlobalFindRequest,
  subscribeGlobalFindRequests,
  clearGlobalFindRequest,
  type GlobalFindRequest,
} from './private/global-find-request-mailbox.js'
