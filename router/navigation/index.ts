/**
 * Zenith Navigation System
 * 
 * Provides SPA navigation utilities and the ZenLink API.
 * 
 * @example
 * ```ts
 * import { navigate, isActive, prefetch, zenLink } from 'zenith/core'
 * 
 * // Programmatic navigation
 * navigate('/about')
 * 
 * // Check active state
 * if (isActive('/blog')) {
 *   console.log('On blog section')
 * }
 * 
 * // Prefetch for faster navigation
 * prefetch('/dashboard')
 * 
 * // Create link programmatically
 * const link = zenLink({ href: '/contact', children: 'Contact' })
 * ```
 */

// Export all navigation utilities
export {
  // Navigation API
  zenNavigate,
  navigate,
  zenBack,
  back,
  zenForward,
  forward,
  zenGo,
  go,
  
  // Active state
  zenIsActive,
  isActive,
  
  // Prefetching
  zenPrefetch,
  prefetch,
  zenIsPrefetched,
  isPrefetched,
  
  // Transitions API
  setGlobalTransition,
  getGlobalTransition,
  createTransitionContext,
  
  // Route state
  zenGetRoute,
  getRoute,
  zenGetParam,
  getParam,
  zenGetQuery,
  getQuery,
  
  // ZenLink factory
  createZenLink,
  zenLink,
  
  // Utilities
  isExternalUrl,
  shouldUseSPANavigation,
  normalizePath
} from './zen-link'

// Export types
export type {
  ZenLinkProps,
  TransitionContext,
  TransitionHandler,
  NavigateOptions
} from './zen-link'

