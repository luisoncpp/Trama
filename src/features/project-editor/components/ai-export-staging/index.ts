/**
 * AI export staging — native picker integration, relative path hardening, and basket controls.
 *
 * Import only from this index. Do not import from private/.
 */
export { AiExportStagingController } from './private/staging-basket-controller'
export type { StagingBasketControllerOptions, StagingBasketFeedback } from './private/staging-basket-controller'
export {
  absoluteToProjectRelative,
  hardenAbsolutePaths,
  mergeIntoStagingBasket,
  formatStagingSkipMessage,
} from './private/relative-path-hardening'
export type { StagingHardenReport } from './private/relative-path-hardening'
export { handleStagingBasketKeyDown } from './private/staging-basket-keyboard'
