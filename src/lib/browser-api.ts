/**
 * Cross-browser API compatibility layer
 *
 * Provides a unified API that works across Chrome, Edge, and Firefox.
 * Firefox uses the 'browser' namespace while Chromium-based browsers use 'chrome'.
 * This module detects the correct namespace and exports a consistent API.
 *
 * Browser-specific behavior notes:
 * - Firefox: Service workers have stricter lifecycle management (may terminate faster)
 * - Firefox: Notification buttons are supported but may have reduced interactivity
 * - Chrome/Edge: Full notification button support with interactive callbacks
 */

/**
 * Detect the browser API namespace.
 * Firefox provides 'browser' (with Promises), Chrome provides 'chrome' (with callbacks).
 * Firefox also provides 'chrome' for compatibility, so we prefer 'browser' if available.
 */
declare global {
  var browser: typeof chrome | undefined;
}
const browserAPI = (globalThis.browser ?? chrome) as typeof chrome;

/**
 * Unified browser extension API
 * Exports the appropriate namespace for the current browser
 */
export const api = {
  /** Extension runtime API for messaging and lifecycle events */
  runtime: browserAPI.runtime,

  /** Tab management API */
  tabs: browserAPI.tabs,

  /** Local storage API */
  storage: browserAPI.storage,

  /** Notifications API - Note: Button behavior may differ between browsers */
  notifications: browserAPI.notifications,

  /** Context menu API */
  contextMenus: browserAPI.contextMenus,

  /** Script injection API */
  scripting: browserAPI.scripting,

  /** Permissions API for optional permission requests */
  permissions: browserAPI.permissions,
};
