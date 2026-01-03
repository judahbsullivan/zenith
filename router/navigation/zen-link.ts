/**
 * ZenLink Runtime Module
 * 
 * Provides programmatic navigation and ZenLink utilities.
 * This module can be imported in `.zen` files or TypeScript.
 * 
 * @example
 * ```ts
 * import { navigate, zenLink, isActive } from 'zenith/core'
 * 
 * // Programmatic navigation
 * navigate('/about')
 * 
 * // Check active state
 * if (isActive('/blog')) {
 *   console.log('On blog section')
 * }
 * ```
 */

// ============================================
// Types
// ============================================

/**
 * Props for ZenLink component
 */
export interface ZenLinkProps {
  /** Target URL path */
  href: string
  /** Optional CSS class(es) */
  class?: string
  /** Link target (_blank, _self, etc.) */
  target?: '_blank' | '_self' | '_parent' | '_top'
  /** Click handler (called before navigation) */
  onClick?: (event: MouseEvent) => void | boolean
  /** Preload the linked page on hover */
  preload?: boolean
  /** Future: Transition configuration */
  onTransition?: TransitionHandler
  /** Future: Disable page transition animation */
  noTransition?: boolean
  /** Match exact path for active state */
  exact?: boolean
  /** Additional aria attributes */
  ariaLabel?: string
  /** Replace history instead of push */
  replace?: boolean
  /** Link content (children) */
  children?: string | HTMLElement | HTMLElement[]
}

/**
 * Transition context for Transitions API
 */
export interface TransitionContext {
  /** Current page element */
  currentPage: HTMLElement | null
  /** Next page element (after load) */
  nextPage: HTMLElement | null
  /** Between/loading page element */
  betweenPage: HTMLElement | null
  /** Navigation direction */
  direction: 'forward' | 'back'
  /** Origin path */
  fromPath: string
  /** Destination path */
  toPath: string
  /** Route params */
  params: Record<string, string>
  /** Query params */
  query: Record<string, string>
}

/**
 * Transition handler function
 */
export type TransitionHandler = (context: TransitionContext) => void | Promise<void>

/**
 * Navigation options
 */
export interface NavigateOptions {
  /** Replace current history entry instead of pushing */
  replace?: boolean
  /** Scroll to top after navigation */
  scrollToTop?: boolean
  /** Transition handler for this navigation */
  onTransition?: TransitionHandler
  /** Skip transition animation */
  noTransition?: boolean
  /** State to pass to the next page */
  state?: Record<string, unknown>
}

// ============================================
// Internal State
// ============================================

/** Prefetched routes cache */
const prefetchedRoutes = new Set<string>()

/** Global transition handler (set at layout level) */
let globalTransitionHandler: TransitionHandler | null = null

/** Navigation in progress flag */
let isNavigating = false

// ============================================
// Utilities
// ============================================

/**
 * Check if URL is external (different origin)
 */
export function isExternalUrl(url: string): boolean {
  if (!url) return false
  
  // Protocol-relative or absolute URLs with different origin
  if (url.startsWith('//') || url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const linkUrl = new URL(url, window.location.origin)
      return linkUrl.origin !== window.location.origin
    } catch {
      return true
    }
  }
  
  // mailto:, tel:, javascript:, etc.
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
    return true
  }
  
  return false
}

/**
 * Check if link should use SPA navigation
 */
export function shouldUseSPANavigation(href: string, target?: string): boolean {
  // Don't use SPA for external links
  if (isExternalUrl(href)) return false
  
  // Don't use SPA if target is set (except _self)
  if (target && target !== '_self') return false
  
  // Don't use SPA for hash-only links on same page
  if (href.startsWith('#')) return false
  
  // Don't use SPA for download links or special protocols
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return false
  }
  
  return true
}

/**
 * Normalize a path
 */
export function normalizePath(path: string): string {
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    const currentDir = window.location.pathname.split('/').slice(0, -1).join('/')
    path = currentDir + '/' + path
  }
  
  // Remove trailing slash (except for root)
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1)
  }
  
  return path
}

// ============================================
// Navigation API
// ============================================

/**
 * Navigate to a new URL (SPA navigation)
 * 
 * This is the primary API for programmatic navigation.
 * 
 * @example
 * ```ts
 * // Simple navigation
 * navigate('/about')
 * 
 * // With options
 * navigate('/dashboard', { replace: true })
 * 
 * // With transition
 * navigate('/gallery', {
 *   onTransition: async (ctx) => {
 *     await animateOut(ctx.currentPage)
 *     await animateIn(ctx.nextPage)
 *   }
 * })
 * ```
 */
export async function zenNavigate(
  to: string,
  options: NavigateOptions = {}
): Promise<void> {
  // Prevent concurrent navigations
  if (isNavigating) {
    console.warn('[ZenLink] Navigation already in progress')
    return
  }
  
  isNavigating = true
  
  try {
    // Access global router
    const router = (window as any).__zenith_router
    
    if (router && router.navigate) {
      // Use router's navigate function
      await router.navigate(to, options)
    } else {
      // Fallback: use History API directly
      const normalizedPath = normalizePath(to)
      
      if (options.replace) {
        window.history.replaceState(options.state || null, '', normalizedPath)
      } else {
        window.history.pushState(options.state || null, '', normalizedPath)
      }
      
      // Dispatch popstate to trigger route resolution
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
    
    // Scroll to top if requested (default: true)
    if (options.scrollToTop !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } finally {
    isNavigating = false
  }
}

// Clean alias
export const navigate = zenNavigate

/**
 * Navigate back in history
 */
export function zenBack(): void {
  window.history.back()
}

export const back = zenBack

/**
 * Navigate forward in history
 */
export function zenForward(): void {
  window.history.forward()
}

export const forward = zenForward

/**
 * Navigate to a specific history index
 */
export function zenGo(delta: number): void {
  window.history.go(delta)
}

export const go = zenGo

// ============================================
// Active State
// ============================================

/**
 * Check if a path is currently active
 * 
 * @example
 * ```ts
 * // Check if on blog section
 * if (isActive('/blog')) {
 *   addClass(link, 'active')
 * }
 * 
 * // Exact match only
 * if (isActive('/blog', true)) {
 *   addClass(link, 'active-exact')
 * }
 * ```
 */
export function zenIsActive(path: string, exact: boolean = false): boolean {
  const router = (window as any).__zenith_router
  
  if (router && router.isActive) {
    return router.isActive(path, exact)
  }
  
  // Fallback: compare with current pathname
  const currentPath = window.location.pathname
  const normalizedPath = normalizePath(path)
  
  if (exact) {
    return currentPath === normalizedPath
  }
  
  // Root path special case
  if (normalizedPath === '/') {
    return currentPath === '/'
  }
  
  return currentPath.startsWith(normalizedPath)
}

export const isActive = zenIsActive

// ============================================
// Prefetching
// ============================================

/**
 * Prefetch a route for faster navigation
 * 
 * @example
 * ```ts
 * // Prefetch on hover
 * element.addEventListener('mouseenter', () => {
 *   prefetch('/about')
 * })
 * ```
 */
export async function zenPrefetch(path: string): Promise<void> {
  // Normalize path
  const normalizedPath = normalizePath(path)
  
  // Don't prefetch if already done
  if (prefetchedRoutes.has(normalizedPath)) {
    return
  }
  
  // Mark as prefetched
  prefetchedRoutes.add(normalizedPath)
  
  // Try router prefetch first
  const router = (window as any).__zenith_router
  
  if (router && router.prefetch) {
    try {
      await router.prefetch(normalizedPath)
    } catch {
      // Silently ignore prefetch errors
    }
    return
  }
  
  // Fallback: use link preload hint
  try {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = normalizedPath
    link.as = 'document'
    document.head.appendChild(link)
  } catch {
    // Ignore errors
  }
}

export const prefetch = zenPrefetch

/**
 * Check if a route has been prefetched
 */
export function zenIsPrefetched(path: string): boolean {
  return prefetchedRoutes.has(normalizePath(path))
}

export const isPrefetched = zenIsPrefetched

// ============================================
// Transitions API (Future Extension)
// ============================================

/**
 * Set global transition handler
 * 
 * This allows setting a layout-level transition that applies to all navigations.
 * 
 * @example
 * ```ts
 * // In layout component
 * setGlobalTransition(async (ctx) => {
 *   ctx.currentPage?.classList.add('fade-out')
 *   await delay(300)
 *   ctx.nextPage?.classList.add('fade-in')
 * })
 * ```
 */
export function setGlobalTransition(handler: TransitionHandler | null): void {
  globalTransitionHandler = handler
}

/**
 * Get current global transition handler
 */
export function getGlobalTransition(): TransitionHandler | null {
  return globalTransitionHandler
}

/**
 * Create a transition context
 */
export function createTransitionContext(
  fromPath: string,
  toPath: string,
  direction: 'forward' | 'back' = 'forward'
): TransitionContext {
  return {
    currentPage: document.querySelector('[data-zen-page]') as HTMLElement | null,
    nextPage: null,
    betweenPage: null,
    direction,
    fromPath,
    toPath,
    params: {},
    query: {}
  }
}

// ============================================
// Route State
// ============================================

/**
 * Get current route state
 */
export function zenGetRoute(): {
  path: string
  params: Record<string, string>
  query: Record<string, string>
} {
  const router = (window as any).__zenith_router
  
  if (router && router.getRoute) {
    return router.getRoute()
  }
  
  // Fallback
  const query: Record<string, string> = {}
  const params = new URLSearchParams(window.location.search)
  params.forEach((value, key) => {
    query[key] = value
  })
  
  return {
    path: window.location.pathname,
    params: {},
    query
  }
}

export const getRoute = zenGetRoute

/**
 * Get a route parameter
 */
export function zenGetParam(name: string): string | undefined {
  return zenGetRoute().params[name]
}

export const getParam = zenGetParam

/**
 * Get a query parameter
 */
export function zenGetQuery(name: string): string | undefined {
  return zenGetRoute().query[name]
}

export const getQuery = zenGetQuery

// ============================================
// ZenLink Factory (for programmatic creation)
// ============================================

/**
 * Create a ZenLink element programmatically
 * 
 * @example
 * ```ts
 * const link = createZenLink({
 *   href: '/about',
 *   class: 'nav-link',
 *   children: 'About Us'
 * })
 * container.appendChild(link)
 * ```
 */
export function createZenLink(props: ZenLinkProps): HTMLAnchorElement {
  const link = document.createElement('a')
  
  // Set href
  link.href = props.href
  
  // Set class
  const classes = ['zen-link']
  if (props.class) classes.push(props.class)
  if (zenIsActive(props.href, props.exact)) classes.push('zen-link-active')
  if (isExternalUrl(props.href)) classes.push('zen-link-external')
  link.className = classes.join(' ')
  
  // Set target
  if (props.target) {
    link.target = props.target
  } else if (isExternalUrl(props.href)) {
    link.target = '_blank'
  }
  
  // Set rel for security
  if (isExternalUrl(props.href) || props.target === '_blank') {
    link.rel = 'noopener noreferrer'
  }
  
  // Set aria-label
  if (props.ariaLabel) {
    link.setAttribute('aria-label', props.ariaLabel)
  }
  
  // Set content
  if (props.children) {
    if (typeof props.children === 'string') {
      link.textContent = props.children
    } else if (Array.isArray(props.children)) {
      props.children.forEach(child => link.appendChild(child))
    } else {
      link.appendChild(props.children)
    }
  }
  
  // Click handler
  link.addEventListener('click', (event: MouseEvent) => {
    // Allow modifier keys for native behavior
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    
    // Check if we should use SPA navigation
    if (!shouldUseSPANavigation(props.href, props.target)) {
      return
    }
    
    // Prevent default
    event.preventDefault()
    
    // Call user's onClick handler
    if (props.onClick) {
      const result = props.onClick(event)
      if (result === false) return
    }
    
    // Navigate
    zenNavigate(props.href, {
      replace: props.replace,
      onTransition: props.onTransition,
      noTransition: props.noTransition
    })
  })
  
  // Preload on hover
  if (props.preload) {
    link.addEventListener('mouseenter', () => {
      if (shouldUseSPANavigation(props.href, props.target)) {
        zenPrefetch(props.href)
      }
    })
  }
  
  return link
}

// Alias
export const zenLink = createZenLink

