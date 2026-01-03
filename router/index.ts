/**
 * Zenith Router
 * 
 * File-based SPA router for Zenith framework.
 * Includes routing, navigation, and ZenLink components.
 * 
 * @example
 * ```ts
 * import { navigate, isActive, prefetch } from 'zenith/router'
 * 
 * // Navigate programmatically
 * navigate('/about')
 * 
 * // Check active state
 * if (isActive('/blog')) {
 *   console.log('On blog section')
 * }
 * ```
 */

// Core router types and utilities
export * from "./types"
export * from "./manifest"

// Router runtime (core router implementation)
// These are the primary exports for router functionality
export {
  initRouter,
  resolveRoute,
  navigate,
  getRoute,
  onRouteChange,
  beforeEach,
  afterEach,
  isActive,
  prefetch,
  isPrefetched
} from "./runtime"

// Navigation utilities (additional helpers and zen* prefixed exports)
// Note: Some functions like navigate, isActive, prefetch are also in runtime
// We export runtime's versions above, and navigation's unique functions here
export {
  // Navigation API (zen* prefixed names)
  zenNavigate,
  zenBack,
  zenForward,
  zenGo,
  zenIsActive,
  zenPrefetch,
  zenIsPrefetched,
  zenGetRoute,
  zenGetParam,
  zenGetQuery,
  createZenLink,
  zenLink,
  // Additional navigation utilities (not in runtime)
  back,
  forward,
  go,
  getParam,
  getQuery,
  isExternalUrl,
  shouldUseSPANavigation,
  normalizePath,
  setGlobalTransition,
  getGlobalTransition,
  createTransitionContext
} from "./navigation/index"

// Navigation-specific types
export type {
  ZenLinkProps,
  TransitionContext,
  TransitionHandler
} from "./navigation/index"
